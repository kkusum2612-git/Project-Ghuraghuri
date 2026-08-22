import PremiumMembership from '../models/premiumMembership.model.js';

import {
  getRewardSettings,
} from './reward-settings.service.js';

import {
  synchronizeRewardPointsForMembership,
} from './reward.service.js';


/*
 * ============================================================
 * RAFI FEATURE 3 - BOOKING REWARD SERVICE
 * ============================================================
 *
 * This service answers:
 *
 *   "How much should this hotel booking cost for this traveler?"
 *
 *
 * It handles:
 *
 *   - normal traveler pricing
 *   - Premium base discount
 *   - optional reward discount
 *   - maximum-discount cap
 *   - temporary point reservation
 *
 *
 * It does NOT:
 *
 *   - create the hotel booking itself
 *   - contact SSLCOMMERZ
 *   - mark payments as successful
 *   - permanently redeem reward points
 *
 *
 * Those responsibilities remain separated.
 */


/*
 * Create errors that the project's shared error middleware can
 * convert into useful HTTP responses.
 */
function createHttpError(
  message,
  statusCode
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
}


/*
 * ------------------------------------------------------------
 * MONEY ROUNDING
 * ------------------------------------------------------------
 *
 * JavaScript floating-point arithmetic can produce values such as:
 *
 *   949.999999999
 *
 * for calculations that logically mean:
 *
 *   950.00
 *
 *
 * Booking/payment amounts therefore use two decimal places.
 */
function roundMoney(
  value
) {
  return (
    Math.round(
      (
        Number(value) +
        Number.EPSILON
      ) *
        100
    ) / 100
  );
}


/*
 * ------------------------------------------------------------
 * NORMAL TRAVELER PRICING
 * ------------------------------------------------------------
 *
 * This keeps the old booking behavior unchanged.
 */
function buildNormalPricing(
  originalTotalPrice
) {
  const safeOriginalPrice =
    roundMoney(
      originalTotalPrice
    );


  return {
    isPremiumBooking:
      false,

    premiumMembershipId:
      null,

    originalTotalPrice:
      safeOriginalPrice,

    premiumBaseDiscountPercent:
      0,

    rewardDiscountPercent:
      0,

    totalDiscountPercent:
      0,

    discountAmount:
      0,

    totalPrice:
      safeOriginalPrice,

    rewardPointsReserved:
      0,

    rewardRedemptionStatus:
      'none',

    rewardReservedAt:
      null,

    /*
     * Internal helper data.
     *
     * booking.controller.js uses these values only if it needs
     * to undo a reservation after Booking.create() unexpectedly
     * fails.
     */
    reservationMembershipId:
      null,

    reservationWasCreated:
      false,
  };
}


/*
 * ------------------------------------------------------------
 * RESERVE POINTS AT MEMBERSHIP LEVEL
 * ------------------------------------------------------------
 *
 * This is one of the most important pieces of Feature 3.
 *
 *
 * Assume:
 *
 * rewardPoints = 1000
 * reservedRewardPoints = 0
 *
 *
 * Booking A wants to reserve:
 *
 * 1000
 *
 *
 * MongoDB changes:
 *
 * reservedRewardPoints:
 *
 *   0 -> 1000
 *
 *
 * The actual rewardPoints remains:
 *
 *   1000
 *
 *
 * Therefore points have NOT been redeemed yet.
 *
 *
 * ------------------------------------------------------------
 * WHY USE ONE ATOMIC MONGODB UPDATE?
 * ------------------------------------------------------------
 *
 * Imagine Booking A and Booking B are created almost
 * simultaneously.
 *
 * If both requests simply did:
 *
 *   read available points
 *   then save later
 *
 * both might incorrectly believe the same 1000 points are
 * available.
 *
 *
 * Instead the database itself checks:
 *
 *   rewardPoints - reservedRewardPoints >= requested points
 *
 * and increments reservedRewardPoints in the SAME atomic update.
 *
 *
 * Only a request that still has enough available points succeeds.
 */
async function reserveMembershipRewardPoints({
  membershipId,
  pointsToReserve,
}) {
  if (
    pointsToReserve <= 0
  ) {
    return null;
  }


  const membership =
    await PremiumMembership.findOneAndUpdate(
      {
        _id:
          membershipId,

        /*
         * $expr allows MongoDB to compare two fields while also
         * including the requested reservation value.
         *
         * Equivalent idea:
         *
         * rewardPoints - reservedRewardPoints
         *     >=
         * pointsToReserve
         */
        $expr: {
          $gte: [
            {
              $subtract: [
  '$rewardPoints',

  /*
   * Older PremiumMembership test documents may have been
   * created before reservedRewardPoints existed.
   *
   * Treat a missing value as zero.
   */
  {
    $ifNull: [
      '$reservedRewardPoints',
      0,
    ],
  },
],
            },

            pointsToReserve,
          ],
        },
      },

      {
        /*
         * IMPORTANT:
         *
         * We increase only the temporary reservation.
         *
         * rewardPoints itself is untouched here.
         */
        $inc: {
          reservedRewardPoints:
            pointsToReserve,
        },
      },

      {
        new:
          true,

        runValidators:
          true,
      }
    );


  if (
    !membership
  ) {
    throw createHttpError(
      'Your available reward-point balance changed. Please try creating the booking again.',
      409
    );
  }


  return membership;
}


/*
 * ------------------------------------------------------------
 * RELEASE A TEMPORARY RESERVATION
 * ------------------------------------------------------------
 *
 * This helper is mainly used as rollback protection.
 *
 *
 * Example:
 *
 * 1. We successfully reserve 1000 points.
 * 2. MongoDB then fails while creating the Booking document.
 *
 *
 * Without rollback:
 *
 * those points would remain unnecessarily reserved.
 *
 *
 * Therefore booking.controller.js can call this helper inside
 * its catch block when Booking.create() fails after reservation.
 */
async function releasePreparedRewardReservation({
  membershipId,
  pointsToRelease,
}) {
  if (
    !membershipId ||
    !Number.isInteger(
      pointsToRelease
    ) ||
    pointsToRelease <= 0
  ) {
    return;
  }


  /*
   * Only update if the membership currently has at least that
   * many reserved points.
   *
   * This prevents an accidental negative reserved balance.
   */
  await PremiumMembership.updateOne(
    {
      _id:
        membershipId,

      reservedRewardPoints: {
        $gte:
          pointsToRelease,
      },
    },

    {
      $inc: {
        reservedRewardPoints:
          -pointsToRelease,
      },
    }
  );
}


/*
 * ------------------------------------------------------------
 * PREPARE BOOKING PRICING
 * ------------------------------------------------------------
 *
 * This is the main function booking.controller.js will call.
 *
 *
 * Input:
 *
 * travelerId
 * originalTotalPrice
 * useRewardPoints
 *
 *
 * Output:
 *
 * All pricing fields that should be stored inside Booking.
 */
async function prepareBookingRewardPricing({
  travelerId,
  originalTotalPrice,
  useRewardPoints = false,
}) {
  const safeOriginalPrice =
    roundMoney(
      originalTotalPrice
    );


  if (
    !Number.isFinite(
      safeOriginalPrice
    ) ||
    safeOriginalPrice < 0
  ) {
    throw createHttpError(
      'Original booking price is invalid.',
      400
    );
  }


  /*
   * Load:
   *
   * - this traveler's Premium membership
   * - current global administrator policy
   *
   *
   * They are independent queries, so Promise.all() starts them
   * together.
   */
  const [
    membership,
    settings,
  ] = await Promise.all([
    PremiumMembership.findOne({
      travelerId,
    }),

    getRewardSettings(),
  ]);


  /*
   * ----------------------------------------------------------
   * NORMAL TRAVELER
   * ----------------------------------------------------------
   *
   * A malicious frontend could send:
   *
   * {
   *   useRewardPoints: true
   * }
   *
   * even for a non-Premium account.
   *
   * We simply ignore it.
   *
   * Premium membership is always verified on the backend.
   */
  if (
    !membership
  ) {
    return buildNormalPricing(
      safeOriginalPrice
    );
  }


  /*
   * ----------------------------------------------------------
   * SYNCHRONIZE REWARD BALANCE FIRST
   * ----------------------------------------------------------
   *
   * The traveler may have recently completed a successful
   * booking payment.
   *
   * Before calculating available reward points, make sure those
   * successful payments have been reconciled into RewardLedger.
   */
  const synchronizedMembership =
    await synchronizeRewardPointsForMembership({
      membership,

      settings,
    });


  /*
   * Read current administrator rules.
   */
  const configuredBaseDiscount =
    Number(
      settings.premiumBaseDiscountPercent
    ) || 0;


  const maximumDiscount =
    Number(
      settings.maximumDiscountPercent
    ) || 0;


  const pointsPerDiscountStep =
    Number(
      settings.pointsPerDiscountStep
    );


  const discountPercentPerStep =
    Number(
      settings.discountPercentPerStep
    ) || 0;


  /*
   * The settings model already validates:
   *
   * maximumDiscount >= Premium base discount
   *
   * but this defensive Math.min() keeps the calculation safe even
   * if malformed data somehow reaches this service.
   */
  const premiumBaseDiscountPercent =
    Math.min(
      configuredBaseDiscount,
      maximumDiscount
    );


  /*
   * ----------------------------------------------------------
   * AVAILABLE POINTS
   * ----------------------------------------------------------
   *
   * Example:
   *
   * actual owned points:
   *   2500
   *
   * already reserved by another unpaid booking:
   *   1000
   *
   * currently available:
   *   1500
   */
  const availableRewardPoints =
    Math.max(
      0,

      Number(
        synchronizedMembership.rewardPoints
      ) -
        Number(
          synchronizedMembership.reservedRewardPoints ||
            0
        )
    );


  let rewardPointsReserved =
    0;


  let rewardDiscountPercent =
    0;


  /*
   * ----------------------------------------------------------
   * OPTIONAL REWARD REDEMPTION
   * ----------------------------------------------------------
   *
   * Premium base discount always applies.
   *
   * Reward discount applies only when the traveler explicitly
   * chooses:
   *
   *   useRewardPoints = true
   */
  if (
    useRewardPoints ===
      true &&
    availableRewardPoints >
      0 &&
    Number.isInteger(
      pointsPerDiscountStep
    ) &&
    pointsPerDiscountStep >
      0 &&
    discountPercentPerStep >
      0
  ) {
    /*
     * How many COMPLETE reward blocks can the traveler afford?
     *
     *
     * Example:
     *
     * available = 2500
     * step = 1000
     *
     * floor(2500 / 1000)
     * = 2 complete steps
     */
    const availableRewardSteps =
      Math.floor(
        availableRewardPoints /
          pointsPerDiscountStep
      );


    /*
     * Work out how much room remains before the maximum total
     * discount.
     *
     *
     * Example:
     *
     * max = 50%
     * Premium base = 5%
     *
     * reward portion may use at most:
     *
     * 45%
     */
    const maximumRewardDiscount =
      Math.max(
        0,

        maximumDiscount -
          premiumBaseDiscountPercent
      );


    /*
     * Reward discounts come only in COMPLETE configured steps.
     *
     *
     * Example:
     *
     * 5% per step
     * maximum remaining reward room = 45%
     *
     * 45 / 5 = 9 usable steps
     */
    const maximumRewardStepsByCap =
      Math.floor(
        (
          maximumRewardDiscount +
          Number.EPSILON
        ) /
          discountPercentPerStep
      );


    /*
     * The actual number of steps is limited by BOTH:
     *
     * - points the traveler owns
     * - global maximum-discount policy
     */
    const rewardStepsToUse =
      Math.min(
        availableRewardSteps,
        maximumRewardStepsByCap
      );


    rewardPointsReserved =
      rewardStepsToUse *
      pointsPerDiscountStep;


    rewardDiscountPercent =
      rewardStepsToUse *
      discountPercentPerStep;
  }


  /*
   * Combined discount.
   *
   * The final Math.min() is another defensive safety check.
   */
  const totalDiscountPercent =
    Math.min(
      maximumDiscount,

      premiumBaseDiscountPercent +
        rewardDiscountPercent
    );


  /*
   * Convert percentage into money.
   *
   *
   * Example:
   *
   * original = 10,000
   * discount = 10%
   *
   * discountAmount = 1,000
   */
  const discountAmount =
    roundMoney(
      safeOriginalPrice *
        (
          totalDiscountPercent /
          100
        )
    );


  const finalTotalPrice =
    roundMoney(
      Math.max(
        0,

        safeOriginalPrice -
          discountAmount
      )
    );


  /*
   * ----------------------------------------------------------
   * CREATE THE TEMPORARY POINT HOLD
   * ----------------------------------------------------------
   */
  if (
    rewardPointsReserved >
    0
  ) {
    await reserveMembershipRewardPoints({
      membershipId:
        synchronizedMembership._id,

      pointsToReserve:
        rewardPointsReserved,
    });
  }


  return {
    isPremiumBooking:
      true,

    premiumMembershipId:
      synchronizedMembership._id,

    originalTotalPrice:
      safeOriginalPrice,

    premiumBaseDiscountPercent,

    rewardDiscountPercent,

    totalDiscountPercent,

    discountAmount,

    totalPrice:
      finalTotalPrice,

    rewardPointsReserved,

    rewardRedemptionStatus:
      rewardPointsReserved > 0
        ? 'reserved'
        : 'none',

    rewardReservedAt:
      rewardPointsReserved > 0
        ? new Date()
        : null,


    /*
     * Internal rollback information.
     *
     * These two properties are NOT intended to be saved as
     * Booking fields.
     */
    reservationMembershipId:
      synchronizedMembership._id,

    reservationWasCreated:
      rewardPointsReserved > 0,
  };
}


export {
  prepareBookingRewardPricing,
  releasePreparedRewardReservation,
};