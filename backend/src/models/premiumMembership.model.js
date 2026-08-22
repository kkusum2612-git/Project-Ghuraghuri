import mongoose from 'mongoose';


/*
 * ============================================================
 * RAFI FEATURE 3 - PREMIUM MEMBERSHIP MODEL
 * ============================================================
 *
 * A PremiumMembership document exists only after a traveler has
 * successfully upgraded to Premium.
 *
 *
 * No document:
 *
 *   normal traveler
 *
 *
 * Document exists:
 *
 *   Premium traveler
 *
 *
 * We intentionally keep this information outside User.js so
 * Rafi's feature does not unnecessarily modify the project's
 * shared authentication model.
 */


const premiumMembershipSchema =
  new mongoose.Schema(
    {
      /*
       * ------------------------------------------------------
       * TRAVELER
       * ------------------------------------------------------
       *
       * Every Premium traveler may have exactly one membership.
       */
      travelerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'User',

        required: [
          true,
          'Traveler ID is required for Premium membership.',
        ],

        unique:
          true,

        index:
          true,

        immutable:
          true,
      },


      /*
       * ------------------------------------------------------
       * PREMIUM UPGRADE PAYMENT
       * ------------------------------------------------------
       *
       * This remembers the verified PremiumPayment that originally
       * activated the membership.
       */
      upgradePaymentId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'PremiumPayment',

        required: [
          true,
          'Premium upgrade payment ID is required.',
        ],

        unique:
          true,

        immutable:
          true,
      },


      /*
       * When the traveler officially became Premium.
       *
       * Premium currently has no expiration date because our
       * agreed system uses a one-time upgrade rather than a
       * subscription.
       */
      activatedAt: {
        type:
          Date,

        required: [
          true,
          'Premium activation time is required.',
        ],

        default:
          Date.now,

        immutable:
          true,
      },


      /*
       * ======================================================
       * ACTUAL REWARD BALANCE
       * ======================================================
       *
       * rewardPoints is the traveler's real reward balance.
       *
       * Example:
       *
       * +100
       * +100
       * +100
       *
       * rewardPoints = 300
       *
       *
       * Selecting points during an unpaid booking does NOT
       * immediately subtract from this value.
       *
       * Actual subtraction happens only after successful payment.
       */
      rewardPoints: {
        type:
          Number,

        required: [
          true,
          'Reward-point balance is required.',
        ],

        default:
          0,

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
       * ======================================================
       * RESERVED REWARD BALANCE
       * ======================================================
       *
       * This field solves an important problem.
       *
       *
       * Suppose the traveler owns:
       *
       *   rewardPoints = 1000
       *
       *
       * They create Booking A and choose:
       *
       *   Use reward points
       *
       *
       * We must NOT deduct the 1000 yet because payment has not
       * succeeded.
       *
       * But we must ALSO prevent the traveler from creating:
       *
       *   Booking B
       *
       * and selecting those same 1000 points again.
       *
       *
       * Therefore:
       *
       * rewardPoints = 1000
       * reservedRewardPoints = 1000
       *
       *
       * Actual available points:
       *
       *   rewardPoints - reservedRewardPoints
       *
       *   1000 - 1000
       *   = 0
       *
       *
       * If Booking A payment succeeds:
       *
       *   actual rewardPoints are redeemed.
       *
       *
       * If Booking A is declined/cancelled:
       *
       *   the reservation is released.
       *
       *
       * This is NOT a second reward balance.
       *
       * It is only a temporary hold.
       */
      reservedRewardPoints: {
        type:
          Number,

        required: [
          true,
          'Reserved reward-point balance is required.',
        ],

        default:
          0,

        min: [
          0,
          'Reserved reward points cannot be negative.',
        ],

        validate: {
          validator:
            Number.isInteger,

          message:
            'Reserved reward points must be a whole number.',
        },
      },


      /*
       * Total number of points ever earned.
       *
       * This does not decrease when points are redeemed.
       */
      lifetimePointsEarned: {
        type:
          Number,

        required: [
          true,
          'Lifetime earned points are required.',
        ],

        default:
          0,

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
       * Total number of points ever successfully redeemed.
       *
       * A reservation does NOT increase this value.
       *
       * Successful payment does.
       */
      lifetimePointsRedeemed: {
        type:
          Number,

        required: [
          true,
          'Lifetime redeemed points are required.',
        ],

        default:
          0,

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
       * ------------------------------------------------------
       * HISTORICAL REWARD INITIALIZATION
       * ------------------------------------------------------
       *
       * null:
       *
       *   Previous successful booking payments have not yet been
       *   imported into the reward system.
       *
       *
       * Date:
       *
       *   The one-time historical initialization completed.
       */
      historicalRewardsInitializedAt: {
        type:
          Date,

        default:
          null,
      },


      /*
       * ------------------------------------------------------
       * REWARD RECONCILIATION CURSOR
       * ------------------------------------------------------
       *
       * Helps the reward synchronization service search mainly
       * for newer successful booking payments rather than
       * repeatedly scanning the complete payment history.
       */
      lastRewardReconciledAt: {
        type:
          Date,

        default:
          null,
      },
    },

    {
      timestamps:
        true,
    }
  );


const PremiumMembership =
  mongoose.model(
    'PremiumMembership',
    premiumMembershipSchema
  );


export default PremiumMembership;