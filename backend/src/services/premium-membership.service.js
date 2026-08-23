import PremiumMembership from '../models/premiumMembership.model.js';

import {
  buildRewardSettingsResponse,
  getRewardSettings,
} from './reward-settings.service.js';

import {
  synchronizeRewardPointsForMembership,
} from './reward.service.js';


/*
 * ============================================================
 * RAFI FEATURE 3 - PREMIUM MEMBERSHIP SERVICE
 * ============================================================
 *
 * This service answers:
 *
 * - Is the traveler Premium?
 * - How many reward points do they own?
 * - How many points are currently reserved by unpaid bookings?
 * - How many points are actually available for a new booking?
 * - What reward discount is currently available?
 */


/*
 * Find the PremiumMembership belonging to one traveler.
 *
 * No membership means the traveler is still a normal user.
 */
async function getPremiumMembershipByTravelerId(
  travelerId
) {
  return PremiumMembership.findOne({
    travelerId,
  });
}


/*
 * ------------------------------------------------------------
 * CALCULATE REWARD AVAILABILITY
 * ------------------------------------------------------------
 *
 * rewardPoints:
 *
 *   actual owned point balance
 *
 *
 * reservedRewardPoints:
 *
 *   points temporarily held by unpaid bookings
 *
 *
 * availableRewardPoints:
 *
 *   rewardPoints - reservedRewardPoints
 *
 *
 * Only AVAILABLE points may be offered to another booking.
 */
function calculateRewardAvailability({
  rewardPoints,
  reservedRewardPoints = 0,
  settings,
}) {
  const numericRewardPoints =
    Number(rewardPoints);


  const safeRewardPoints =
    Number.isInteger(
      numericRewardPoints
    ) &&
    numericRewardPoints >= 0
      ? numericRewardPoints
      : 0;


  const numericReservedPoints =
    Number(
      reservedRewardPoints
    );


  /*
   * Never allow the reported reserved balance to exceed the
   * actual reward balance.
   *
   * Under normal operation this should not happen, but this
   * keeps the response safe if old/test data is inconsistent.
   */
  const safeReservedRewardPoints =
    Number.isInteger(
      numericReservedPoints
    ) &&
    numericReservedPoints >= 0
      ? Math.min(
          numericReservedPoints,
          safeRewardPoints
        )
      : 0;


  const availableRewardPoints =
    Math.max(
      0,
      safeRewardPoints -
        safeReservedRewardPoints
    );


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


  const safePointsPerStep =
    Number.isInteger(
      pointsPerStep
    ) &&
    pointsPerStep > 0
      ? pointsPerStep
      : 1;


  /*
   * IMPORTANT:
   *
   * Reward discount is calculated from AVAILABLE points,
   * not from all owned points.
   *
   * Points already reserved for Booking A cannot also be offered
   * to Booking B.
   */
  const completeRewardSteps =
    Math.floor(
      availableRewardPoints /
        safePointsPerStep
    );


  const rawRewardDiscountPercent =
    completeRewardSteps *
    discountPerStep;


  const maximumRewardDiscountPercent =
    Math.max(
      0,
      maximumDiscount -
        premiumBaseDiscount
    );


  const usableRewardDiscountPercent =
    Math.min(
      rawRewardDiscountPercent,
      maximumRewardDiscountPercent
    );


  const totalDiscountIfAllAvailableRewardsUsed =
    Math.min(
      maximumDiscount,
      premiumBaseDiscount +
        usableRewardDiscountPercent
    );


  const pointsProgressTowardNextStep =
    availableRewardPoints %
    safePointsPerStep;


  const pointsUntilNextStep =
    pointsProgressTowardNextStep === 0
      ? safePointsPerStep
      : safePointsPerStep -
        pointsProgressTowardNextStep;


  return {
    /*
     * Total balance owned by the traveler.
     */
    rewardPoints:
      safeRewardPoints,


    /*
     * Temporarily locked by unpaid bookings.
     */
    reservedRewardPoints:
      safeReservedRewardPoints,


    /*
     * Balance currently usable on a NEW booking.
     */
    availableRewardPoints,

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
 * GET PREMIUM STATUS
 * ------------------------------------------------------------
 *
 * Used by:
 *
 *   GET /api/v1/premium/me
 *
 *
 * Premium travelers first receive reward reconciliation so the
 * response contains the newest successful-payment earnings.
 */
async function getPremiumStatusForTraveler(
  travelerId
) {
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
   * Normal traveler.
   */
  if (!membership) {
    return {
      isPremium:
        false,

      membership:
        null,

      rewards:
        null,

      settings:
        settingsResponse,
    };
  }


  /*
   * Update reward earnings from successful booking payments
   * before showing the balance.
   */
  const synchronizedMembership =
    await synchronizeRewardPointsForMembership({
      membership,

      settings,
    });


  const rewards =
    calculateRewardAvailability({
      rewardPoints:
        synchronizedMembership.rewardPoints,

      reservedRewardPoints:
        synchronizedMembership.reservedRewardPoints,

      settings,
    });


  return {
    isPremium:
      true,

    membership: {
      id:
        synchronizedMembership._id,

      activatedAt:
        synchronizedMembership.activatedAt,

      rewardPoints:
        synchronizedMembership.rewardPoints,

      /*
       * Rafi Feature 3:
       *
       * expose the temporary reservation amount so the frontend
       * can distinguish:
       *
       * owned points
       *
       * from:
       *
       * currently usable points.
       */
      reservedRewardPoints:
        synchronizedMembership.reservedRewardPoints,

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