import Booking from '../models/booking.model.js';
import Payment from '../models/payment.model.js';
import PremiumMembership from '../models/premiumMembership.model.js';
import RewardLedger from '../models/rewardLedger.model.js';

import {
  getRewardSettings,
} from './reward-settings.service.js';


/*
 * ============================================================
 * RAFI FEATURE 3 - REWARD SERVICE
 * ============================================================
 *
 * This service is the accounting layer for reward points.
 *
 *
 * It handles:
 *
 * 1. Importing successful booking payments into rewards.
 *
 * 2. Making sure one payment earns points only once.
 *
 * 3. Turning a booking's reserved reward points into an actual
 *    redemption after successful payment.
 *
 * 4. Releasing reserved points when an unpaid booking becomes
 *    unusable, such as when the hotel declines it.
 *
 *
 * IMPORTANT:
 *
 * Fatema/Kusum's Payment model remains the source of truth for:
 *
 *   "Did a booking payment succeed?"
 *
 *
 * Rafi's RewardLedger is the source of truth for:
 *
 *   "Why did this traveler's reward balance change?"
 */


/*
 * ------------------------------------------------------------
 * PAYMENT EARNING SOURCE KEY
 * ------------------------------------------------------------
 *
 * Example:
 *
 * payment:68abc123:earning
 *
 *
 * RewardLedger.sourceKey is unique.
 *
 * Therefore the same successful payment cannot award points
 * twice.
 */
function buildPaymentEarningSourceKey(
  paymentId
) {
  return `payment:${paymentId}:earning`;
}


/*
 * ------------------------------------------------------------
 * BOOKING REDEMPTION SOURCE KEY
 * ------------------------------------------------------------
 *
 * Example:
 *
 * booking:68def456:redemption
 *
 *
 * This ensures one booking cannot consume its reserved points
 * twice even if the payment callback is received repeatedly.
 */
function buildBookingRedemptionSourceKey(
  bookingId
) {
  return `booking:${bookingId}:redemption`;
}


/*
 * ------------------------------------------------------------
 * CREATE PAYMENT-EARNING LEDGER ENTRY
 * ------------------------------------------------------------
 *
 * $setOnInsert makes this idempotent.
 *
 *
 * First call:
 *
 *   create +100
 *
 *
 * Repeated callback:
 *
 *   sourceKey already exists
 *   -> nothing new is created
 */
async function ensurePaymentEarningLedgerEntry({
  membership,
  payment,
  pointsPerEligiblePayment,
}) {
  if (
    !Number.isInteger(
      pointsPerEligiblePayment
    ) ||
    pointsPerEligiblePayment <= 0
  ) {
    return;
  }


  const sourceKey =
    buildPaymentEarningSourceKey(
      payment._id
    );


  try {
    await RewardLedger.updateOne(
      {
        sourceKey,
      },

      {
        $setOnInsert: {
          travelerId:
            membership.travelerId,

          membershipId:
            membership._id,

          eventType:
            'payment_earning',

          pointsChange:
            pointsPerEligiblePayment,

          sourceKey,

          paymentId:
            payment._id,

          bookingId:
            payment.bookingId,

          note:
            `Reward for successful ${payment.bookingType} booking payment.`,
        },
      },

      {
        upsert:
          true,
      }
    );
  } catch (error) {
    /*
     * MongoDB duplicate-key error.
     *
     * Another request may have created the same unique reward
     * entry at nearly the same moment.
     *
     * That is safe and should not create another reward.
     */
    if (
      error?.code !==
      11000
    ) {
      throw error;
    }
  }
}


/*
 * ------------------------------------------------------------
 * CREATE BOOKING-REDEMPTION LEDGER ENTRY
 * ------------------------------------------------------------
 *
 * Reward earnings are positive:
 *
 *   +100
 *
 *
 * Reward redemption is negative:
 *
 *   -1000
 *
 *
 * Example:
 *
 * traveler owns 2500
 *
 * booking reserved 2000
 *
 * payment succeeds
 *
 * ledger receives:
 *
 *   -2000
 */
async function ensureBookingRedemptionLedgerEntry({
  membership,
  booking,
}) {
  const pointsToRedeem =
    Number(
      booking.rewardPointsReserved ||
        0
    );


  if (
    !Number.isInteger(
      pointsToRedeem
    ) ||
    pointsToRedeem <= 0
  ) {
    return;
  }


  const sourceKey =
    buildBookingRedemptionSourceKey(
      booking._id
    );


  try {
    await RewardLedger.updateOne(
      {
        sourceKey,
      },

      {
        $setOnInsert: {
          travelerId:
            membership.travelerId,

          membershipId:
            membership._id,

          eventType:
            'booking_redemption',

          /*
           * Negative because points leave the spendable balance.
           */
          pointsChange:
            -pointsToRedeem,

          sourceKey,

          bookingId:
            booking._id,

          note:
            `Reward points redeemed for hotel booking ${booking._id}.`,
        },
      },

      {
        upsert:
          true,
      }
    );
  } catch (error) {
    if (
      error?.code !==
      11000
    ) {
      throw error;
    }
  }
}


/*
 * ------------------------------------------------------------
 * RECALCULATE ACTUAL REWARD TOTALS
 * ------------------------------------------------------------
 *
 * RewardLedger contains:
 *
 *   + earnings
 *   - redemptions
 *
 *
 * Example:
 *
 * +1000 historical earnings
 * +1500 later earnings
 * -2000 redemption
 * +100 latest payment reward
 *
 *
 * Current balance:
 *
 * 600
 *
 *
 * PremiumMembership keeps the resulting balance as a cached
 * value so the application does not have to calculate the whole
 * ledger every normal page request.
 */
async function recalculateMembershipRewardTotals(
  membership
) {
  const totals =
    await RewardLedger.aggregate([
      {
        $match: {
          membershipId:
            membership._id,
        },
      },

      {
        $group: {
          _id:
            null,

          currentBalance: {
            $sum:
              '$pointsChange',
          },

          lifetimeEarned: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    '$pointsChange',
                    0,
                  ],
                },

                '$pointsChange',

                0,
              ],
            },
          },

          lifetimeRedeemed: {
            $sum: {
              $cond: [
                {
                  $lt: [
                    '$pointsChange',
                    0,
                  ],
                },

                {
                  $abs:
                    '$pointsChange',
                },

                0,
              ],
            },
          },
        },
      },
    ]);


  const result =
    totals[0] || {
      currentBalance:
        0,

      lifetimeEarned:
        0,

      lifetimeRedeemed:
        0,
    };


  membership.rewardPoints =
    Math.max(
      0,
      Number(
        result.currentBalance
      ) || 0
    );


  membership.lifetimePointsEarned =
    Math.max(
      0,
      Number(
        result.lifetimeEarned
      ) || 0
    );


  membership.lifetimePointsRedeemed =
    Math.max(
      0,
      Number(
        result.lifetimeRedeemed
      ) || 0
    );


  return membership;
}


/*
 * ------------------------------------------------------------
 * RECALCULATE TEMPORARILY RESERVED POINTS
 * ------------------------------------------------------------
 *
 * Actual points come from RewardLedger.
 *
 * Reserved points come from bookings whose status is:
 *
 *   rewardRedemptionStatus = reserved
 *
 *
 * This gives us a useful self-repair mechanism.
 *
 *
 * Example:
 *
 * Booking A:
 *   reserved 1000
 *
 * Booking B:
 *   reserved 2000
 *
 * Booking C:
 *   redeemed 1000
 *
 *
 * Current reserved balance:
 *
 *   1000 + 2000
 *   = 3000
 *
 *
 * Redeemed/released bookings are not included.
 */
async function recalculateMembershipReservedPoints(
  membership
) {
  const result =
    await Booking.aggregate([
      {
        $match: {
          premiumMembershipId:
            membership._id,

          rewardRedemptionStatus:
            'reserved',
        },
      },

      {
        $group: {
          _id:
            null,

          totalReserved: {
            $sum:
              '$rewardPointsReserved',
          },
        },
      },
    ]);


  membership.reservedRewardPoints =
    Math.max(
      0,
      Number(
        result[0]
          ?.totalReserved ||
          0
      )
    );


  return membership;
}


/*
 * ============================================================
 * HISTORICAL / NEW PAYMENT RECONCILIATION
 * ============================================================
 *
 * This function already supports the Premium dashboard.
 *
 *
 * First Premium synchronization:
 *
 *   previous successful payments
 *       -> reward entries
 *
 *
 * Later synchronization:
 *
 *   only newer successful payments
 *       -> reward entries
 *
 *
 * Unique source keys prevent duplicate earnings.
 */
async function synchronizeRewardPointsForMembership({
  membership,
  settings,
}) {
  if (
    !membership?._id ||
    !membership?.travelerId
  ) {
    throw new Error(
      'Premium membership is required for reward synchronization.'
    );
  }


  if (!settings) {
    throw new Error(
      'Reward settings are required for reward synchronization.'
    );
  }


  /*
   * Capture the synchronization start time BEFORE querying.
   *
   * Payments completed after this instant will be collected by
   * the next synchronization instead of accidentally being
   * skipped.
   */
  const syncStartedAt =
    new Date();


  const pointsPerEligiblePayment =
    Number(
      settings.pointsPerEligiblePayment
    );


  if (
    !Number.isInteger(
      pointsPerEligiblePayment
    ) ||
    pointsPerEligiblePayment <
      0
  ) {
    throw new Error(
      'Points per eligible payment must be a non-negative whole number.'
    );
  }


  const paymentQuery = {
    travelerId:
      membership.travelerId,

    status:
      'paid',

    paidAt: {
      $lte:
        syncStartedAt,
    },
  };


  /*
   * Once historical initialization is complete, search only
   * after the previous synchronization cursor.
   */
  if (
    membership.historicalRewardsInitializedAt &&
    membership.lastRewardReconciledAt
  ) {
    paymentQuery.paidAt.$gt =
      membership.lastRewardReconciledAt;
  }


  const eligiblePayments =
    await Payment.find(
      paymentQuery
    )
      .select(
        '_id bookingId bookingType travelerId paidAt'
      )
      .sort({
        paidAt:
          1,

        _id:
          1,
      });


  for (
    const payment
    of eligiblePayments
  ) {
    await ensurePaymentEarningLedgerEntry({
      membership,

      payment,

      pointsPerEligiblePayment,
    });
  }


  await recalculateMembershipRewardTotals(
    membership
  );


  if (
    !membership.historicalRewardsInitializedAt
  ) {
    membership.historicalRewardsInitializedAt =
      syncStartedAt;
  }


  membership.lastRewardReconciledAt =
    syncStartedAt;


  await membership.save();


  return membership;
}


/*
 * ============================================================
 * SUCCESSFUL BOOKING PAYMENT SETTLEMENT
 * ============================================================
 *
 * This is called AFTER SSLCOMMERZ has been validated.
 *
 *
 * It performs two different reward actions:
 *
 *
 * ACTION 1
 * ------------------------------------------------------------
 *
 * If this booking reserved points:
 *
 *   reserved -> redeemed
 *
 * and create:
 *
 *   negative RewardLedger entry
 *
 *
 * ACTION 2
 * ------------------------------------------------------------
 *
 * Every eligible successful booking payment receives the current
 * configured reward earning:
 *
 *   +pointsPerEligiblePayment
 *
 *
 * Both operations use unique source keys.
 *
 * Therefore receiving the successful gateway callback again does
 * not duplicate either transaction.
 */
async function settleSuccessfulBookingPaymentRewards({
  payment,
  booking,
}) {
  /*
   * Never settle rewards from an unverified payment.
   */
  if (
    !payment ||
    payment.status !==
      'paid'
  ) {
    return null;
  }


  /*
   * Reward points belong only to PremiumMembership.
   *
   *
   * A normal traveler may successfully pay for a booking before
   * upgrading.
   *
   * In that case:
   *
   * - do nothing now
   * - when they later become Premium, historical reconciliation
   *   will import that successful payment
   */
  const membership =
    await PremiumMembership.findOne({
      travelerId:
        payment.travelerId,
    });


  if (!membership) {
    return null;
  }


  const currentBooking =
    booking ||
    (
      await Booking.findById(
        payment.bookingId
      )
    );


  if (!currentBooking) {
    throw new Error(
      'The booking required for reward settlement could not be found.'
    );
  }


  /*
   * ----------------------------------------------------------
   * REDEEM RESERVED POINTS
   * ----------------------------------------------------------
   *
   * We process:
   *
   * reserved
   *
   * and also:
   *
   * redeemed
   *
   *
   * Why include "redeemed"?
   *
   * It gives retry recovery.
   *
   * If an earlier request updated the booking state but stopped
   * before completing every reward operation, the unique ledger
   * upsert below safely recreates any missing accounting entry.
   */
  if (
    Number(
      currentBooking.rewardPointsReserved ||
        0
    ) >
      0 &&
    (
      currentBooking.rewardRedemptionStatus ===
        'reserved' ||
      currentBooking.rewardRedemptionStatus ===
        'redeemed'
    )
  ) {
    await ensureBookingRedemptionLedgerEntry({
      membership,

      booking:
        currentBooking,
    });


    /*
     * Change the reservation state only when it has not already
     * been redeemed.
     */
    if (
      currentBooking.rewardRedemptionStatus ===
      'reserved'
    ) {
      currentBooking.rewardRedemptionStatus =
        'redeemed';

      currentBooking.rewardRedeemedAt =
        currentBooking.rewardRedeemedAt ||
        new Date();


      await currentBooking.save();
    }
  }


  /*
   * ----------------------------------------------------------
   * AWARD POINTS FOR THIS SUCCESSFUL PAYMENT
   * ----------------------------------------------------------
   *
   * Read the CURRENT global earning policy.
   *
   * Example default:
   *
   *   +100
   */
  const settings =
    await getRewardSettings();


  const pointsPerEligiblePayment =
    Number(
      settings.pointsPerEligiblePayment
    );


  await ensurePaymentEarningLedgerEntry({
    membership,

    payment,

    pointsPerEligiblePayment,
  });


  /*
   * Rebuild the actual spendable balance from the accounting
   * ledger.
   *
   * This includes BOTH:
   *
   *   redemption
   *   earning
   */
  await recalculateMembershipRewardTotals(
    membership
  );


  /*
   * Rebuild the temporary reserved balance from bookings still
   * waiting for payment.
   *
   * Because the current booking is now "redeemed", it disappears
   * from this reserved total.
   */
  await recalculateMembershipReservedPoints(
    membership
  );


  await membership.save();


  return membership;
}


/*
 * ============================================================
 * RELEASE A BOOKING'S RESERVED REWARD POINTS
 * ============================================================
 *
 * Currently used when a hotel vendor declines an unpaid booking.
 *
 *
 * Example:
 *
 * Booking:
 *
 *   rewardPointsReserved = 1000
 *   rewardRedemptionStatus = reserved
 *
 *
 * Hotel declines:
 *
 *   rewardRedemptionStatus = released
 *
 *
 * No negative RewardLedger entry is created because the traveler
 * never actually spent those points.
 *
 *
 * rewardPoints therefore remains unchanged.
 */
async function releaseBookingRewardReservation(
  booking
) {
  if (
    !booking ||
    booking.rewardRedemptionStatus !==
      'reserved' ||
    Number(
      booking.rewardPointsReserved ||
        0
    ) <=
      0
  ) {
    return booking;
  }


  const membership =
    await PremiumMembership.findById(
      booking.premiumMembershipId
    );


  /*
   * Mark the booking reservation itself as released.
   */
  booking.rewardRedemptionStatus =
    'released';

  booking.rewardReleasedAt =
    booking.rewardReleasedAt ||
    new Date();


  await booking.save();


  /*
   * If the membership still exists, rebuild its temporary
   * reserved balance.
   *
   * No actual rewardPoints are removed.
   */
  if (membership) {
    await recalculateMembershipReservedPoints(
      membership
    );

    await membership.save();
  }


  return booking;
}


export {
  releaseBookingRewardReservation,
  settleSuccessfulBookingPaymentRewards,
  synchronizeRewardPointsForMembership,
};