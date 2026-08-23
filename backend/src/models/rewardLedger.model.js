import mongoose from 'mongoose';

/*
 * ------------------------------------------------------------
 * RAFI FEATURE 3 - REWARD LEDGER MODEL
 * ------------------------------------------------------------
 *
 * PremiumMembership.rewardPoints tells us:
 *
 *   "How many points does the traveler have right now?"
 *
 * But that number alone cannot explain HOW the traveler reached
 * that balance.
 *
 * Example:
 *
 * rewardPoints = 300
 *
 * Without a history, we cannot tell whether that came from:
 *
 *   +100 payment
 *   +100 payment
 *   +100 payment
 *
 * or:
 *
 *   +1000 earned
 *   -700 redeemed
 *
 * Therefore we keep a RewardLedger.
 *
 * Think of the ledger like a bank-account statement.
 *
 * PremiumMembership.rewardPoints
 *   = current balance
 *
 * RewardLedger
 *   = history explaining each balance change
 *
 *
 * ------------------------------------------------------------
 * VERY IMPORTANT: IDEMPOTENCY
 * ------------------------------------------------------------
 *
 * Payment gateways and HTTP requests may occasionally be
 * processed more than once.
 *
 * We must NEVER do this:
 *
 * One successful hotel payment:
 *
 *   +100 points
 *   callback/reconciliation happens again
 *   +100 points AGAIN
 *
 * That would incorrectly give the traveler 200 points.
 *
 * Each ledger entry therefore has a unique "sourceKey".
 *
 * Example:
 *
 *   payment:68abc123:earning
 *
 * The same payment always produces the same sourceKey.
 *
 * MongoDB's unique rule then prevents a second copy.
 */


/*
 * There are currently two real reasons for a traveler's reward
 * balance to change.
 *
 * payment_earning:
 *
 *   An eligible booking payment succeeded.
 *   Points go UP.
 *
 * booking_redemption:
 *
 *   Reserved reward points were actually used after the
 *   discounted booking payment succeeded.
 *   Points go DOWN.
 *
 * Notice that "Premium upgrade" is intentionally absent.
 *
 * The ৳499 Premium purchase itself does NOT award reward points.
 */
const REWARD_EVENT_TYPES = [
  'payment_earning',
  'booking_redemption',
];


const rewardLedgerSchema =
  new mongoose.Schema(
    {
      /*
       * travelerId
       * ------------------------------------------------------
       *
       * The traveler whose balance changed.
       *
       * We store this directly even though the membership also
       * contains travelerId.
       *
       * This makes reward-history queries simple:
       *
       *   RewardLedger.find({
       *     travelerId: req.user._id
       *   })
       */
      travelerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'User',

        required: [
          true,
          'Traveler ID is required for a reward entry.',
        ],

        immutable: true,

        index: true,
      },


      /*
       * membershipId
       * ------------------------------------------------------
       *
       * This links the ledger entry to the PremiumMembership
       * whose point balance was changed.
       */
      membershipId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'PremiumMembership',

        required: [
          true,
          'Premium membership ID is required for a reward entry.',
        ],

        immutable: true,

        index: true,
      },


      /*
       * eventType
       * ------------------------------------------------------
       *
       * Explains WHY the point balance changed.
       */
      eventType: {
        type: String,

        enum: {
          values:
            REWARD_EVENT_TYPES,

          message:
            'Invalid reward-ledger event type.',
        },

        required: [
          true,
          'Reward event type is required.',
        ],

        immutable: true,
      },


      /*
       * pointsChange
       * ------------------------------------------------------
       *
       * This is a SIGNED number.
       *
       * Positive number:
       *
       *   points were earned
       *
       * Example:
       *
       *   +100
       *
       * Negative number:
       *
       *   points were spent
       *
       * Example:
       *
       *   -1000
       *
       * We deliberately use one signed field rather than separate
       * "pointsAdded" and "pointsRemoved" fields.
       *
       * That makes a ledger entry easy to understand:
       *
       *   pointsChange: 100
       *
       * means add 100.
       *
       *   pointsChange: -1000
       *
       * means subtract 1000.
       */
      pointsChange: {
        type: Number,

        required: [
          true,
          'Reward point change is required.',
        ],

        validate: [
          {
            /*
             * Reward points must remain whole numbers.
             */
            validator:
              Number.isInteger,

            message:
              'Reward point change must be a whole number.',
          },

          {
            /*
             * A ledger entry that changes the balance by exactly
             * zero has no meaning, so we reject it.
             */
            validator:
              (value) =>
                value !== 0,

            message:
              'Reward point change cannot be zero.',
          },
        ],

        immutable: true,
      },


      /*
       * sourceKey
       * ------------------------------------------------------
       *
       * This is one of the most important fields in the entire
       * reward system.
       *
       * It prevents duplicate rewards/redemptions.
       *
       * Examples:
       *
       * Payment earning:
       *
       *   payment:PAYMENT_ID:earning
       *
       * Booking redemption:
       *
       *   booking:BOOKING_ID:redemption
       *
       * unique: true tells MongoDB:
       *
       *   "This exact reward event may exist only once."
       *
       * Therefore, if our reward reconciliation runs twice for
       * the same successful payment, it can detect that the
       * reward was already processed.
       */
      sourceKey: {
        type: String,

        required: [
          true,
          'Reward source key is required.',
        ],

        trim: true,

        unique: true,

        index: true,

        immutable: true,
      },


      /*
       * paymentId
       * ------------------------------------------------------
       *
       * For:
       *
       *   eventType = "payment_earning"
       *
       * this points to Fatema's existing Payment document that
       * successfully completed.
       *
       * IMPORTANT:
       *
       * Rafi's feature is only READING that existing payment as
       * proof that an eligible transaction happened.
       *
       * We are not modifying Fatema's Payment model here.
       */
      paymentId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Payment',

        default: null,

        immutable: true,
      },


      /*
       * bookingId
       * ------------------------------------------------------
       *
       * For:
       *
       *   eventType = "booking_redemption"
       *
       * this identifies the booking where reward points were
       * actually consumed.
       *
       * It may also be useful alongside a payment earning so we
       * can quickly understand which booking produced the reward.
       */
      bookingId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: 'Booking',

        default: null,

        immutable: true,
      },


      /*
       * balanceAfter
       * ------------------------------------------------------
       *
       * This field is optional.
       *
       * When our future reward service successfully changes the
       * PremiumMembership balance, it may record the resulting
       * balance here.
       *
       * Example:
       *
       * Previous balance:
       *
       *   900
       *
       * pointsChange:
       *
       *   +100
       *
       * balanceAfter:
       *
       *   1000
       *
       * It is useful for readable history and debugging.
       *
       * We keep it optional because the authoritative current
       * balance remains PremiumMembership.rewardPoints.
       */
      balanceAfter: {
        type: Number,

        min: [
          0,
          'Reward balance after an event cannot be negative.',
        ],

        validate: {
          validator: (value) =>
            value === null ||
            value === undefined ||
            Number.isInteger(value),

          message:
            'Reward balance after an event must be a whole number.',
        },

        default: null,
      },


      /*
       * note
       * ------------------------------------------------------
       *
       * A short human-readable explanation can be stored here.
       *
       * Examples:
       *
       *   "Reward for successful hotel payment."
       *
       *   "1000 points redeemed on hotel booking."
       *
       * This is mainly useful when viewing database records,
       * debugging, or later displaying reward history.
       */
      note: {
        type: String,

        trim: true,

        maxlength: [
          300,
          'Reward ledger note cannot exceed 300 characters.',
        ],

        default: '',
      },
    },
    {
      /*
       * createdAt tells us exactly when the reward event was
       * recorded.
       *
       * updatedAt is also provided automatically.
       */
      timestamps: true,
    }
  );


/*
 * ------------------------------------------------------------
 * EVENT-SPECIFIC VALIDATION
 * ------------------------------------------------------------
 *
 * Some fields only make sense for certain event types.
 *
 * We validate those relationships before saving.
 */
rewardLedgerSchema.pre(
  'validate',
  function validateRewardLedgerEvent() {
    /*
     * A payment earning must:
     *
     *   - ADD points
     *   - identify the Payment that produced the reward
     */
    if (
      this.eventType ===
      'payment_earning'
    ) {
      if (
        this.pointsChange <= 0
      ) {
        this.invalidate(
          'pointsChange',
          'A payment earning must add a positive number of points.'
        );
      }

      if (
        !this.paymentId
      ) {
        this.invalidate(
          'paymentId',
          'A payment earning must reference the successful payment.'
        );
      }
    }


    /*
     * A booking redemption must:
     *
     *   - REMOVE points
     *   - identify the Booking where they were used
     */
    if (
      this.eventType ===
      'booking_redemption'
    ) {
      if (
        this.pointsChange >= 0
      ) {
        this.invalidate(
          'pointsChange',
          'A booking redemption must subtract reward points.'
        );
      }

      if (
        !this.bookingId
      ) {
        this.invalidate(
          'bookingId',
          'A booking redemption must reference the related booking.'
        );
      }
    }
  }
);


/*
 * Common reward-history query:
 *
 *   one traveler
 *   newest entries first
 */
rewardLedgerSchema.index({
  travelerId: 1,
  createdAt: -1,
});


/*
 * This helps us inspect the history of one Premium membership.
 */
rewardLedgerSchema.index({
  membershipId: 1,
  createdAt: -1,
});


const RewardLedger =
  mongoose.model(
    'RewardLedger',
    rewardLedgerSchema
  );


export {
  REWARD_EVENT_TYPES,
};

export default RewardLedger;