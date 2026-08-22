import Payment from '../models/payment.model.js';
import RewardLedger from '../models/rewardLedger.model.js';


/*
 * ============================================================
 * RAFI FEATURE 3 - REWARD SERVICE
 * ============================================================
 *
 * This service connects Rafi's Reward Points System with the
 * project's ALREADY EXISTING successful booking payments.
 *
 *
 * IMPORTANT OWNERSHIP BOUNDARY
 * ------------------------------------------------------------
 *
 * Fatema's Payment model already tells the project:
 *
 *   "Was this booking payment successfully verified?"
 *
 *
 * Rafi does NOT change that answer.
 *
 * Rafi also does NOT modify:
 *
 *   payment.controller.js
 *   payment.routes.js
 *   payment.model.js
 *
 *
 * Instead, this service READS successful Payment documents:
 *
 *   Payment.status === "paid"
 *
 * and creates Rafi-owned RewardLedger entries from them.
 *
 *
 * Therefore:
 *
 * Fatema's responsibility:
 *
 *   Verify payment correctly.
 *
 *
 * Rafi's responsibility:
 *
 *   Observe the verified payment and award loyalty points once.
 *
 *
 * This is a clean integration because the payment feature does
 * not need to know that the reward system exists.
 */


/*
 * ------------------------------------------------------------
 * CREATE AN EARNING SOURCE KEY
 * ------------------------------------------------------------
 *
 * Every successful eligible booking payment may award reward
 * points exactly ONCE.
 *
 *
 * We use the payment's MongoDB ID to construct a unique key.
 *
 *
 * Example:
 *
 *   payment:68abc123:earning
 *
 *
 * RewardLedger.sourceKey has a UNIQUE database index.
 *
 * Therefore the same successful Payment cannot accidentally
 * create two independent earning records.
 */
function buildPaymentEarningSourceKey(
  paymentId
) {
  return `payment:${paymentId}:earning`;
}


/*
 * ------------------------------------------------------------
 * CREATE ONE REWARD ENTRY IF IT DOES NOT EXIST
 * ------------------------------------------------------------
 *
 * This function receives:
 *
 *   membership
 *   payment
 *   pointsPerEligiblePayment
 *
 *
 * and ensures that one successful Payment has exactly one
 * corresponding:
 *
 *   payment_earning
 *
 * ledger record.
 *
 *
 * We use an upsert rather than:
 *
 *   find()
 *   then create()
 *
 * because two requests could theoretically perform reward
 * reconciliation at nearly the same time.
 */
async function ensurePaymentEarningLedgerEntry({
  membership,
  payment,
  pointsPerEligiblePayment,
}) {
  const sourceKey =
    buildPaymentEarningSourceKey(
      payment._id
    );


  try {
    /*
     * $setOnInsert means:
     *
     * If this sourceKey does not exist:
     *   create the ledger entry.
     *
     * If this sourceKey already exists:
     *   do not change the previous reward.
     *
     *
     * This is important if the administrator later changes:
     *
     *   pointsPerEligiblePayment
     *
     * A reward that was already earned should remain the value it
     * had when it was recorded.
     *
     * New eligible payments use the current setting.
     */
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

          /*
           * This points to Fatema's existing Payment record.
           *
           * We reference it.
           * We do not modify it.
           */
          paymentId:
            payment._id,

          /*
           * Payment already stores bookingId.
           *
           * Saving it here makes reward history easier to read.
           */
          bookingId:
            payment.bookingId,

          note:
            `Reward for successful ${payment.bookingType} booking payment.`,
        },
      },

      {
        upsert: true,
      }
    );
  } catch (error) {
    /*
     * sourceKey is protected by a UNIQUE MongoDB index.
     *
     * If two reconciliation requests race each other, one may
     * theoretically encounter duplicate-key error code 11000.
     *
     * That duplicate simply means:
     *
     *   "Another request already created this exact reward."
     *
     * In that particular case, there is nothing else to do.
     *
     * Any unrelated database error must still be thrown.
     */
    if (
      error?.code !== 11000
    ) {
      throw error;
    }
  }
}


/*
 * ------------------------------------------------------------
 * RECALCULATE MEMBERSHIP TOTALS FROM THE REWARD LEDGER
 * ------------------------------------------------------------
 *
 * RewardLedger is our detailed accounting history.
 *
 *
 * Example:
 *
 *   +100 payment earning
 *   +100 payment earning
 *   +100 payment earning
 *   -200 redemption
 *
 *
 * Current balance:
 *
 *   100 + 100 + 100 - 200
 *   = 100
 *
 *
 * Why calculate from RewardLedger during reconciliation?
 *
 * Because it gives us a self-repairing design.
 *
 * PremiumMembership.rewardPoints is a convenient cached balance.
 *
 * RewardLedger explains every actual earning/redemption event.
 *
 * If those cached counters ever become stale because of an
 * interrupted request, the next reconciliation can rebuild the
 * correct values from the ledger.
 *
 *
 * Importantly, we are NOT recounting the user's hotel bookings
 * here.
 *
 * We are reading Rafi's dedicated reward accounting records.
 */
async function recalculateMembershipRewardTotals(
  membership
) {
  /*
   * MongoDB aggregation lets the database calculate the totals
   * efficiently.
   */
  const totals =
    await RewardLedger.aggregate([
      /*
       * Only include ledger entries belonging to this Premium
       * membership.
       */
      {
        $match: {
          membershipId:
            membership._id,
        },
      },


      /*
       * Produce three totals:
       *
       * currentBalance
       *   Sum of ALL positive and negative changes.
       *
       * lifetimeEarned
       *   Sum only positive changes.
       *
       * lifetimeRedeemed
       *   Convert negative redemption values into positive totals
       *   representing how many points were spent.
       */
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


  /*
   * A brand-new Premium traveler may have no ledger entries yet.
   *
   * In that case MongoDB returns an empty array.
   *
   * We safely use zero for all totals.
   */
  const result =
    totals[0] || {
      currentBalance: 0,
      lifetimeEarned: 0,
      lifetimeRedeemed: 0,
    };


  /*
   * A negative spendable balance should never happen because our
   * future redemption code will prevent spending more points
   * than the traveler owns.
   *
   * Math.max() gives us an additional defensive safeguard.
   */
  membership.rewardPoints =
    Math.max(
      0,
      result.currentBalance
    );

  membership.lifetimePointsEarned =
    Math.max(
      0,
      result.lifetimeEarned
    );

  membership.lifetimePointsRedeemed =
    Math.max(
      0,
      result.lifetimeRedeemed
    );


  return membership;
}


/*
 * ------------------------------------------------------------
 * SYNCHRONIZE ELIGIBLE PAYMENT REWARDS
 * ------------------------------------------------------------
 *
 * This is the main function in this service.
 *
 *
 * The caller provides:
 *
 *   PremiumMembership
 *   current RewardSettings
 *
 *
 * We then perform:
 *
 * FIRST PREMIUM SYNCHRONIZATION:
 *
 *   Find ALL successful eligible booking payments made before
 *   the synchronization started.
 *
 *
 * LATER SYNCHRONIZATIONS:
 *
 *   Find only successful payments whose paidAt value is newer
 *   than the previous synchronization cursor.
 *
 *
 * This gives us the behavior Rafi requested:
 *
 * Old successful bookings count when Premium begins,
 * but we do not keep recounting all old bookings forever.
 */
async function synchronizeRewardPointsForMembership({
  membership,
  settings,
}) {
  /*
   * Defensive checks make errors easier to understand if this
   * service is accidentally called incorrectly.
   */
  if (
    !membership?._id ||
    !membership?.travelerId
  ) {
    throw new Error(
      'Premium membership is required for reward synchronization.'
    );
  }


  if (
    !settings
  ) {
    throw new Error(
      'Reward settings are required for reward synchronization.'
    );
  }


  /*
   * Capture the START time before querying Payment.
   *
   *
   * This detail prevents a subtle synchronization bug.
   *
   * Imagine:
   *
   * 10:00:00
   * reward synchronization starts
   *
   * 10:00:01
   * another booking payment becomes paid
   *
   * 10:00:02
   * synchronization finishes
   *
   *
   * If we simply stored 10:00:02 as our cursor, the payment from
   * 10:00:01 might accidentally be skipped forever because it
   * happened after our query but before the cursor was saved.
   *
   *
   * Instead:
   *
   * syncStartedAt = 10:00:00
   *
   * We only process payments with:
   *
   *   paidAt <= 10:00:00
   *
   *
   * Then we save:
   *
   *   lastRewardReconciledAt = 10:00:00
   *
   *
   * The payment from 10:00:01 will therefore be picked up during
   * the NEXT synchronization.
   */
  const syncStartedAt =
    new Date();


  /*
   * The current administrator-configured number of points awarded
   * for a qualifying successful payment.
   *
   * Default:
   *
   *   100
   */
  const pointsPerEligiblePayment =
    Number(
      settings.pointsPerEligiblePayment
    );


  /*
   * rewardSettings.model.js already validates this value.
   *
   * This defensive check protects the service if it is ever
   * called with malformed plain data.
   */
  if (
    !Number.isInteger(
      pointsPerEligiblePayment
    ) ||
    pointsPerEligiblePayment < 0
  ) {
    throw new Error(
      'Points per eligible payment must be a non-negative whole number.'
    );
  }


  /*
   * ----------------------------------------------------------
   * BASE ELIGIBILITY QUERY
   * ----------------------------------------------------------
   *
   * A reward is based on a SUCCESSFULLY VERIFIED payment.
   *
   * Therefore:
   *
   * booking exists but unpaid
   *      -> no points
   *
   * initiated payment
   *      -> no points
   *
   * failed payment
   *      -> no points
   *
   * cancelled payment
   *      -> no points
   *
   * paid payment
   *      -> eligible
   *
   *
   * PremiumPayment records are in a completely different
   * collection, so the 499 BDT account-upgrade payment cannot
   * accidentally earn these booking reward points.
   */
  const paymentQuery = {
    travelerId:
      membership.travelerId,

    status:
      'paid',

    paidAt: {
      /*
       * Do not process payments that become successful after this
       * synchronization started.
       *
       * They will be safely collected next time.
       */
      $lte:
        syncStartedAt,
    },
  };


  /*
   * ----------------------------------------------------------
   * FIRST SYNCHRONIZATION VS LATER SYNCHRONIZATION
   * ----------------------------------------------------------
   *
   * historicalRewardsInitializedAt === null
   *
   * means:
   *
   *   This traveler just became Premium and previous successful
   *   booking payments need to be imported.
   *
   *
   * Once historical initialization is complete, we only query
   * payments newer than lastRewardReconciledAt.
   */
  const hasHistoricalInitialization =
    Boolean(
      membership.historicalRewardsInitializedAt
    );


  if (
    hasHistoricalInitialization &&
    membership.lastRewardReconciledAt
  ) {
    paymentQuery.paidAt.$gt =
      membership.lastRewardReconciledAt;
  }


  /*
   * Find qualifying Payment records.
   *
   * We select only the fields Rafi's reward system needs.
   *
   * This avoids loading unnecessary gateway/session information.
   */
  const eligiblePayments =
    await Payment.find(
      paymentQuery
    )
      .select(
        '_id bookingId bookingType travelerId paidAt'
      )
      .sort({
        paidAt: 1,
        _id: 1,
      });


  /*
   * ----------------------------------------------------------
   * CREATE MISSING LEDGER ENTRIES
   * ----------------------------------------------------------
   *
   * Each payment receives one unique sourceKey.
   *
   * Re-running this code is safe because existing entries are not
   * duplicated.
   */
  for (
    const payment
    of eligiblePayments
  ) {
    /*
     * If an administrator configured zero points per payment, a
     * zero-point ledger record would violate our ledger schema
     * and would not represent a real balance change.
     *
     * In that unusual configuration, successful payments simply
     * award nothing.
     */
    if (
      pointsPerEligiblePayment === 0
    ) {
      continue;
    }


    await ensurePaymentEarningLedgerEntry({
      membership,

      payment,

      pointsPerEligiblePayment,
    });
  }


  /*
   * ----------------------------------------------------------
   * REBUILD CACHED MEMBERSHIP TOTALS
   * ----------------------------------------------------------
   *
   * The ledger is now up to date for all payments included in
   * this synchronization window.
   */
  await recalculateMembershipRewardTotals(
    membership
  );


  /*
   * ----------------------------------------------------------
   * MARK HISTORICAL INITIALIZATION COMPLETE
   * ----------------------------------------------------------
   *
   * This is written only once.
   *
   * It tells future synchronizations:
   *
   *   "Do not scan the entire old payment history again."
   */
  if (
    !membership.historicalRewardsInitializedAt
  ) {
    membership.historicalRewardsInitializedAt =
      syncStartedAt;
  }


  /*
   * Store our synchronization cursor.
   *
   * Remember:
   *
   * This is syncStartedAt, NOT the current time after all work
   * finished.
   *
   * That protects payments completed while synchronization was
   * running from being skipped.
   */
  membership.lastRewardReconciledAt =
    syncStartedAt;


  await membership.save();


  /*
   * Return the refreshed membership so the caller immediately
   * sees the newly calculated balance.
   */
  return membership;
}


export {
  synchronizeRewardPointsForMembership,
};