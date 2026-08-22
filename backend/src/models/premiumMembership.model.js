import mongoose from 'mongoose';

/*
 * ------------------------------------------------------------
 * RAFI FEATURE 3 - PREMIUM MEMBERSHIP MODEL
 * ------------------------------------------------------------
 *
 * This model answers an important question:
 *
 *   "Is this traveler currently a Premium user?"
 *
 * We intentionally keep Premium membership separate from the
 * shared User model.
 *
 * Why?
 *
 * User.js is shared authentication infrastructure used by all
 * project members.
 *
 * Rafi's Premium feature does not need to rewrite that shared
 * model merely to add:
 *
 *   isPremium
 *   rewardPoints
 *
 * Instead, a PremiumMembership document exists only for a
 * traveler who has successfully upgraded.
 *
 * Therefore:
 *
 * No PremiumMembership document
 *   -> normal traveler
 *
 * PremiumMembership document exists
 *   -> Premium traveler
 *
 * Later:
 *
 *   GET /api/v1/premium/me
 *
 * checks this collection and tells the frontend whether the
 * sidebar should display:
 *
 *   "Upgrade Account"
 *
 * or:
 *
 *   "Premium User"
 */


/*
 * Create the schema for one traveler's Premium membership.
 */
const premiumMembershipSchema =
  new mongoose.Schema(
    {
      /*
       * travelerId
       * ------------------------------------------------------
       *
       * This identifies the traveler who owns the membership.
       *
       * unique: true is extremely important.
       *
       * It means one traveler cannot accidentally receive two
       * different PremiumMembership documents.
       *
       * Conceptually:
       *
       * Traveler Rafi
       *   -> one Premium membership
       *
       * NOT:
       *
       * Traveler Rafi
       *   -> membership 1
       *   -> membership 2
       *   -> membership 3
       */
      travelerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'User',

        required: [
          true,
          'Traveler ID is required for Premium membership.',
        ],

        unique: true,

        index: true,

        immutable: true,
      },


      /*
       * upgradePaymentId
       * ------------------------------------------------------
       *
       * Premium membership must never be activated because the
       * frontend simply says:
       *
       *   "Payment succeeded."
       *
       * The backend first verifies the Premium payment with
       * SSLCOMMERZ.
       *
       * After successful verification, we create the membership
       * and remember WHICH PremiumPayment activated it.
       *
       * This gives us a clear relationship:
       *
       * PremiumPayment
       *       ↓
       * verified as paid
       *       ↓
       * PremiumMembership
       *
       * unique: true also prevents one Premium payment from
       * being reused to activate two memberships.
       */
      upgradePaymentId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'PremiumPayment',

        required: [
          true,
          'Premium upgrade payment ID is required.',
        ],

        unique: true,

        immutable: true,
      },


      /*
       * activatedAt
       * ------------------------------------------------------
       *
       * This stores the moment the traveler officially became
       * Premium.
       *
       * We intentionally do NOT store an expiry date because the
       * current Ghuraghuri design treats the 499 BDT payment as a
       * one-time Premium upgrade rather than a subscription.
       */
      activatedAt: {
        type: Date,

        required: [
          true,
          'Premium activation time is required.',
        ],

        default:
          Date.now,

        immutable: true,
      },


      /*
       * rewardPoints
       * ------------------------------------------------------
       *
       * This is the traveler's CURRENT spendable reward balance.
       *
       *
       * Example:
       *
       * Ten qualifying payments:
       *
       *   +100 × 10
       *   = 1000 points
       *
       * Traveler redeems:
       *
       *   -1000
       *
       * Current balance:
       *
       *   0
       *
       *
       * IMPORTANT:
       *
       * RewardLedger is the detailed history explaining WHY the
       * balance changed.
       *
       * rewardPoints is kept here as a convenient cached current
       * balance so normal Premium-page requests do not need to
       * manually interpret the complete reward history.
       *
       * Our reward reconciliation service will keep this value
       * synchronized with the ledger.
       */
      rewardPoints: {
        type: Number,

        required: [
          true,
          'Reward-point balance is required.',
        ],

        default: 0,

        min: [
          0,
          'Reward-point balance cannot be negative.',
        ],

        validate: {
          validator:
            Number.isInteger,

          message:
            'Reward-point balance must be a whole number.',
        },
      },


      /*
       * lifetimePointsEarned
       * ------------------------------------------------------
       *
       * rewardPoints answers:
       *
       *   "How many spendable points exist right now?"
       *
       * lifetimePointsEarned answers:
       *
       *   "How many points has this traveler ever earned?"
       *
       *
       * Example:
       *
       * Earned over lifetime:
       *
       *   2500
       *
       * Redeemed:
       *
       *   2000
       *
       * Current balance:
       *
       *   500
       */
      lifetimePointsEarned: {
        type: Number,

        required: [
          true,
          'Lifetime earned points are required.',
        ],

        default: 0,

        min: [
          0,
          'Lifetime earned points cannot be negative.',
        ],

        validate: {
          validator:
            Number.isInteger,

          message:
            'Lifetime earned points must be a whole number.',
        },
      },


      /*
       * lifetimePointsRedeemed
       * ------------------------------------------------------
       *
       * This is the total number of reward points that have
       * actually been consumed through successful discounted
       * payments.
       *
       *
       * Merely selecting:
       *
       *   "Use reward points"
       *
       * while creating a booking will NOT increase this value.
       *
       *
       * Our agreed flow is:
       *
       * booking created
       *       ↓
       * points selected/reserved
       *       ↓
       * payment succeeds
       *       ↓
       * points actually redeemed
       */
      lifetimePointsRedeemed: {
        type: Number,

        required: [
          true,
          'Lifetime redeemed points are required.',
        ],

        default: 0,

        min: [
          0,
          'Lifetime redeemed points cannot be negative.',
        ],

        validate: {
          validator:
            Number.isInteger,

          message:
            'Lifetime redeemed points must be a whole number.',
        },
      },


      /*
       * historicalRewardsInitializedAt
       * ------------------------------------------------------
       *
       * A traveler may already have successfully paid for hotel
       * bookings BEFORE becoming Premium.
       *
       * Our agreed rule says those previous successful payments
       * should count when Premium membership begins.
       *
       *
       * We do NOT want to recount that entire historical payment
       * history every time the Premium page opens.
       *
       *
       * Therefore:
       *
       * null:
       *
       *   The one-time historical reward initialization has not
       *   completed.
       *
       *
       * Date:
       *
       *   Historical payments have already been reconciled.
       *
       *
       * Once this value is filled, future synchronization can
       * focus only on payments made after the most recent reward
       * reconciliation.
       */
      historicalRewardsInitializedAt: {
        type: Date,

        default: null,
      },


      /*
       * lastRewardReconciledAt
       * ------------------------------------------------------
       *
       * This field is different from:
       *
       *   historicalRewardsInitializedAt
       *
       *
       * historicalRewardsInitializedAt tells us:
       *
       *   "Did the initial historical import happen?"
       *
       *
       * lastRewardReconciledAt tells us:
       *
       *   "Up to what moment have we checked for new successful
       *    booking payments?"
       *
       *
       * Example:
       *
       * 10:00 AM
       * Historical rewards initialized.
       *
       * lastRewardReconciledAt = 10:00 AM
       *
       *
       * 11:00 AM
       * Traveler successfully pays for another hotel booking.
       *
       *
       * 11:10 AM
       * Premium status loads again.
       *
       * Instead of scanning years of payment history, the reward
       * service can look approximately for:
       *
       *   paidAt > 10:00 AM
       *
       *
       * After processing:
       *
       * lastRewardReconciledAt = 11:10 AM
       *
       *
       * We initialize this as null because a new membership has
       * not performed any reward reconciliation yet.
       */
      lastRewardReconciledAt: {
        type: Date,

        default: null,
      },
    },
    {
      /*
       * Mongoose creates:
       *
       *   createdAt
       *   updatedAt
       *
       * createdAt and activatedAt will normally be very close,
       * but activatedAt represents the actual business event:
       *
       *   "Premium became active."
       */
      timestamps: true,
    }
  );


const PremiumMembership =
  mongoose.model(
    'PremiumMembership',
    premiumMembershipSchema
  );


export default PremiumMembership;