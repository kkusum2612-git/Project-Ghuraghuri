import PremiumMembership from '../models/premiumMembership.model.js';

import {
  buildRewardSettingsResponse,
  getRewardSettings,
} from './reward-settings.service.js';

import {
  synchronizeRewardPointsForMembership,
} from './reward.service.js';


/*
 * ------------------------------------------------------------
 * RAFI FEATURE 3 - PREMIUM MEMBERSHIP SERVICE
 * ------------------------------------------------------------
 *
 * This service handles business logic related to a traveler's
 * Premium membership.
 *
 *
 * It currently answers:
 *
 *   "Is this traveler Premium?"
 *
 *   "How many reward points do they have?"
 *
 *   "Have any new successful booking payments earned points?"
 *
 *   "What reward discount could they currently choose to use?"
 *
 *   "How far are they from their next reward step?"
 *
 *
 * This service still does NOT:
 *
 *   - contact SSLCOMMERZ
 *   - consume reward points
 *   - modify hotel bookings
 *
 *
 * Premium checkout belongs to:
 *
 *   premium-payment.service.js
 *
 *
 * Reward earning synchronization belongs to:
 *
 *   reward.service.js
 *
 *
 * Booking redemption will be implemented separately later.
 */


/*
 * ------------------------------------------------------------
 * GET PREMIUM MEMBERSHIP BY TRAVELER ID
 * ------------------------------------------------------------
 *
 * If the traveler is Premium:
 *
 *   return PremiumMembership
 *
 *
 * If the traveler is normal:
 *
 *   return null
 *
 *
 * Not finding a membership is NOT an error.
 */
async function getPremiumMembershipByTravelerId(
  travelerId
) {
  const membership =
    await PremiumMembership.findOne({
      travelerId,
    });

  return membership;
}


/*
 * ------------------------------------------------------------
 * CALCULATE REWARD AVAILABILITY
 * ------------------------------------------------------------
 *
 * This function performs mathematics only.
 *
 * It does not:
 *
 *   query MongoDB
 *   spend points
 *   change a booking
 *
 *
 * Example using default settings:
 *
 *   rewardPoints = 2300
 *
 *   1000 points = one reward step
 *   each step = 5%
 *
 *
 * Complete reward steps:
 *
 *   floor(2300 / 1000)
 *   = 2
 *
 *
 * Reward discount:
 *
 *   2 × 5%
 *   = 10%
 *
 *
 * Premium base:
 *
 *   5%
 *
 *
 * Potential combined discount:
 *
 *   15%
 *
 *
 * Remaining progress:
 *
 *   300 / 1000
 *
 *
 * Points until next step:
 *
 *   700
 */
function calculateRewardAvailability({
  rewardPoints,
  settings,
}) {
  /*
   * Convert to Number defensively.
   */
  const numericPoints =
    Number(rewardPoints);


  /*
   * Invalid values safely become zero.
   *
   * The MongoDB schema already prevents invalid persisted values,
   * but this keeps the helper reusable and predictable.
   */
  const safeRewardPoints =
    Number.isInteger(numericPoints) &&
    numericPoints >= 0
      ? numericPoints
      : 0;


  /*
   * Read the CURRENT global administrator settings.
   *
   * These are deliberately not frozen into each membership.
   */
  const pointsPerStep =
    Number(
      settings.pointsPerDiscountStep
    );

  const discountPerStep =
    Number(
      settings.discountPercentPerStep
    );

  const premiumBaseDiscount =
    Number(
      settings.premiumBaseDiscountPercent
    );

  const maximumDiscount =
    Number(
      settings.maximumDiscountPercent
    );


  /*
   * Avoid accidental division by zero.
   */
  const safePointsPerStep =
    Number.isInteger(pointsPerStep) &&
    pointsPerStep > 0
      ? pointsPerStep
      : 1;


  /*
   * Count only COMPLETE reward blocks.
   */
  const completeRewardSteps =
    Math.floor(
      safeRewardPoints /
      safePointsPerStep
    );


  /*
   * Example:
   *
   * 2 blocks × 5%
   * = 10%
   */
  const rawRewardDiscountPercent =
    completeRewardSteps *
    discountPerStep;


  /*
   * Example:
   *
   * maximum total = 50%
   * Premium base  = 5%
   *
   * Maximum reward contribution:
   *
   *   45%
   */
  const maximumRewardDiscountPercent =
    Math.max(
      0,
      maximumDiscount -
      premiumBaseDiscount
    );


  /*
   * Keep the reward portion inside the global maximum.
   */
  const usableRewardDiscountPercent =
    Math.min(
      rawRewardDiscountPercent,
      maximumRewardDiscountPercent
    );


  /*
   * Combine Premium + reward discount while respecting the cap.
   */
  const totalDiscountIfAllAvailableRewardsUsed =
    Math.min(
      maximumDiscount,
      premiumBaseDiscount +
        usableRewardDiscountPercent
    );


  /*
   * Example:
   *
   * 2300 % 1000
   * = 300 points of progress.
   */
  const pointsProgressTowardNextStep =
    safeRewardPoints %
    safePointsPerStep;


  /*
   * If progress is zero, the traveler needs another complete
   * block for the NEXT reward step.
   *
   * Example:
   *
   * exactly 2000 points
   *
   * progress = 0
   *
   * points until NEXT step = 1000
   */
  const pointsUntilNextStep =
    pointsProgressTowardNextStep === 0
      ? safePointsPerStep
      : safePointsPerStep -
        pointsProgressTowardNextStep;


  return {
    rewardPoints:
      safeRewardPoints,

    completeRewardSteps,

    pointsProgressTowardNextStep,

    pointsUntilNextStep,

    rawRewardDiscountPercent,

    usableRewardDiscountPercent,

    totalDiscountIfAllAvailableRewardsUsed,
  };
}


/*
 * ------------------------------------------------------------
 * GET PREMIUM STATUS FOR TRAVELER
 * ------------------------------------------------------------
 *
 * This is the main read function used by:
 *
 *   GET /api/v1/premium/me
 *
 *
 * NORMAL TRAVELER:
 *
 *   No PremiumMembership exists.
 *
 *   We return:
 *
 *   isPremium = false
 *
 * plus current upgrade/settings information.
 *
 *
 * PREMIUM TRAVELER:
 *
 *   A membership exists.
 *
 *   Before returning it, we reconcile successful eligible
 *   booking payments into Rafi's RewardLedger.
 *
 *
 * This is how:
 *
 *   old successful payments
 *
 * and:
 *
 *   newly successful payments
 *
 * become visible as reward points without changing Fatema's
 * payment controller.
 */
async function getPremiumStatusForTraveler(
  travelerId
) {
  /*
   * Membership lookup and settings lookup are independent, so
   * Promise.all() lets MongoDB begin both operations together.
   */
  const [
    membership,
    settings,
  ] = await Promise.all([
    getPremiumMembershipByTravelerId(
      travelerId
    ),

    getRewardSettings(),
  ]);


  const settingsResponse =
    buildRewardSettingsResponse(
      settings
    );


  /*
   * ----------------------------------------------------------
   * NORMAL TRAVELER
   * ----------------------------------------------------------
   *
   * There is no RewardLedger synchronization here.
   *
   * Why?
   *
   * The traveler is not Premium yet.
   *
   * Their old successful payments are intentionally left alone.
   *
   * After they successfully purchase Premium, the first Premium
   * status request performs the one-time historical import.
   */
  if (!membership) {
    return {
      isPremium: false,

      membership: null,

      rewards: null,

      settings:
        settingsResponse,
    };
  }


  /*
   * ----------------------------------------------------------
   * PREMIUM TRAVELER - SYNCHRONIZE REWARDS
   * ----------------------------------------------------------
   *
   * This call:
   *
   * 1. Imports historical successful payments once.
   *
   * 2. On later requests, checks only newer successful payments.
   *
   * 3. Creates missing RewardLedger entries.
   *
   * 4. Recalculates the membership's cached point totals.
   */
  const synchronizedMembership =
    await synchronizeRewardPointsForMembership({
      membership,

      settings,
    });


  /*
   * Calculate the discounts the traveler COULD choose to use.
   *
   * This does not spend anything.
   */
  const rewards =
    calculateRewardAvailability({
      rewardPoints:
        synchronizedMembership.rewardPoints,

      settings,
    });


  /*
   * Return a clean frontend-facing object.
   */
  return {
    isPremium: true,

    membership: {
      id:
        synchronizedMembership._id,

      activatedAt:
        synchronizedMembership.activatedAt,

      rewardPoints:
        synchronizedMembership.rewardPoints,

      lifetimePointsEarned:
        synchronizedMembership.lifetimePointsEarned,

      lifetimePointsRedeemed:
        synchronizedMembership.lifetimePointsRedeemed,

      historicalRewardsInitializedAt:
        synchronizedMembership.historicalRewardsInitializedAt,

      lastRewardReconciledAt:
        synchronizedMembership.lastRewardReconciledAt,
    },

    rewards,

    settings:
      settingsResponse,
  };
}


export {
  calculateRewardAvailability,
  getPremiumMembershipByTravelerId,
  getPremiumStatusForTraveler,
};