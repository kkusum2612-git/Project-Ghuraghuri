import mongoose from 'mongoose';

/*
 * ------------------------------------------------------------
 * RAFI FEATURE 3 - REWARD SETTINGS MODEL
 * ------------------------------------------------------------
 *
 * This model stores the GLOBAL configuration for the Premium
 * Membership and Reward Points System.
 *
 * Why do we need a separate settings document?
 *
 * Suppose we directly write values such as:
 *
 *   Premium discount = 5%
 *   1000 points = 5% discount
 *   Maximum discount = 50%
 *
 * inside the controller code.
 *
 * If the administrator later wanted to change 5% to 7%, we
 * would have to edit source code and restart/redeploy the
 * application.
 *
 * That would not be a proper admin-configurable system.
 *
 * Instead, these values are stored in MongoDB.
 *
 * The administrator will later receive a page where they can
 * update these settings.
 *
 * Every Premium traveler uses the CURRENT global settings.
 *
 * This is important because Rafi and the team decided:
 *
 * If the administrator changes the Premium discount rules,
 * the new rules apply to BOTH:
 *
 *   - existing Premium users
 *   - future Premium users
 *
 * Therefore we do NOT copy the permanent Premium percentage
 * into every individual PremiumMembership document.
 *
 * We keep the policy here in one central place.
 */


/*
 * We only want ONE reward-settings document for the whole
 * Ghuraghuri application.
 *
 * We use the fixed value "global" as a simple singleton key.
 *
 * Later, when our service needs the settings, it can search:
 *
 *   RewardSettings.findOne({ singletonKey: 'global' })
 *
 * If the document does not exist yet, the service will create
 * it using the defaults defined below.
 */
const GLOBAL_SETTINGS_KEY = 'global';


/*
 * ------------------------------------------------------------
 * SCHEMA
 * ------------------------------------------------------------
 *
 * A Mongoose schema describes what fields a MongoDB document
 * is allowed to contain and what rules those fields follow.
 */
const rewardSettingsSchema = new mongoose.Schema(
  {
    /*
     * singletonKey prevents us from accidentally creating many
     * independent reward configuration documents.
     *
     * Every real settings document should use:
     *
     *   singletonKey: "global"
     *
     * unique: true means MongoDB will not allow another
     * document with the same key.
     */
    singletonKey: {
      type: String,

      enum: {
        values: [
          GLOBAL_SETTINGS_KEY,
        ],

        message:
          'Reward settings must use the global settings key.',
      },

      default:
        GLOBAL_SETTINGS_KEY,

      unique: true,

      immutable: true,
    },


    /*
     * premiumUpgradePrice
     * --------------------------------------------------------
     *
     * This is the amount the traveler pays to become Premium.
     *
     * Our agreed initial price is:
     *
     *   499 BDT
     *
     * IMPORTANT:
     *
     * The frontend will NOT be trusted to decide this price.
     *
     * When we later create the Premium payment controller, the
     * backend will read this value from MongoDB.
     *
     * This prevents somebody from editing the browser request
     * and trying to purchase Premium for something like 1 BDT.
     *
     * We store this value in settings even though we do not
     * necessarily need to expose it as an admin-editable field
     * immediately.
     */
    premiumUpgradePrice: {
      type: Number,

      required: [
        true,
        'Premium upgrade price is required.',
      ],

      default: 499,

      /*
       * SSLCOMMERZ has a minimum transaction amount.
       *
       * Keeping our Premium price at least 10 BDT also prevents
       * obviously invalid configuration values such as 0 or -5.
       */
      min: [
        10,
        'Premium upgrade price must be at least 10 BDT.',
      ],
    },


    /*
     * premiumBaseDiscountPercent
     * --------------------------------------------------------
     *
     * Every Premium traveler receives this percentage even when
     * they decide NOT to redeem any reward points.
     *
     * Default:
     *
     *   5%
     *
     * Example:
     *
     * Normal booking price = 10,000 BDT
     *
     * Premium base discount = 5%
     *
     * Discount:
     *
     *   10,000 × 0.05 = 500 BDT
     *
     * Final price before any reward-point discount:
     *
     *   10,000 - 500 = 9,500 BDT
     */
    premiumBaseDiscountPercent: {
      type: Number,

      required: [
        true,
        'Premium base discount percentage is required.',
      ],

      default: 5,

      min: [
        0,
        'Premium base discount cannot be negative.',
      ],

      max: [
        100,
        'Premium base discount cannot exceed 100%.',
      ],
    },


    /*
     * pointsPerEligiblePayment
     * --------------------------------------------------------
     *
     * This determines how many reward points a Premium traveler
     * earns after an ELIGIBLE payment succeeds.
     *
     * Our current rule:
     *
     *   successful booking payment = 100 points
     *
     * Default:
     *
     *   100
     *
     * The Premium-upgrade payment itself is NOT an eligible
     * payment and therefore will never award these points.
     *
     * Later, the reward service will decide which successful
     * payments qualify.
     */
    pointsPerEligiblePayment: {
      type: Number,

      required: [
        true,
        'Points per eligible payment are required.',
      ],

      default: 100,

      min: [
        0,
        'Points per eligible payment cannot be negative.',
      ],

      /*
       * Reward points should always be whole numbers.
       *
       * Valid:
       *
       *   100
       *   250
       *
       * Invalid:
       *
       *   100.5
       */
      validate: {
        validator:
          Number.isInteger,

        message:
          'Points per eligible payment must be a whole number.',
      },
    },


    /*
     * pointsPerDiscountStep
     * --------------------------------------------------------
     *
     * This tells us how many reward points are required before
     * another reward-discount step becomes available.
     *
     * Default:
     *
     *   1000 points
     *
     * Example:
     *
     * pointsPerDiscountStep = 1000
     *
     * User has 900 points:
     *
     *   floor(900 / 1000) = 0 reward steps
     *
     * User has 1000 points:
     *
     *   floor(1000 / 1000) = 1 reward step
     *
     * User has 2300 points:
     *
     *   floor(2300 / 1000) = 2 reward steps
     *
     * The leftover 300 points remain available for later.
     */
    pointsPerDiscountStep: {
      type: Number,

      required: [
        true,
        'Points required per discount step are required.',
      ],

      default: 1000,

      min: [
        1,
        'At least 1 point must be required for a discount step.',
      ],

      validate: {
        validator:
          Number.isInteger,

        message:
          'Points per discount step must be a whole number.',
      },
    },


    /*
     * discountPercentPerStep
     * --------------------------------------------------------
     *
     * Each complete points block gives this much extra discount.
     *
     * Default:
     *
     *   1000 points = 5%
     *
     * Therefore:
     *
     *   1000 points -> 5%
     *   2000 points -> 10%
     *   3000 points -> 15%
     *
     * This is ONLY the reward-points portion.
     *
     * The permanent Premium base discount is added separately.
     */
    discountPercentPerStep: {
      type: Number,

      required: [
        true,
        'Discount percentage per reward step is required.',
      ],

      default: 5,

      min: [
        0,
        'Reward discount percentage cannot be negative.',
      ],

      max: [
        100,
        'Reward discount percentage cannot exceed 100%.',
      ],
    },


    /*
     * maximumDiscountPercent
     * --------------------------------------------------------
     *
     * This is the final safety cap after BOTH discounts have
     * been combined.
     *
     * Default:
     *
     *   50%
     *
     * Example:
     *
     * Premium base discount = 5%
     * Reward discount       = 45%
     *
     * Total                 = 50%
     *
     * That is allowed.
     *
     * If the calculated reward discount tried to produce:
     *
     * Premium base = 5%
     * Reward       = 50%
     * Raw total    = 55%
     *
     * then the application would cap the final discount at:
     *
     *   50%
     */
    maximumDiscountPercent: {
      type: Number,

      required: [
        true,
        'Maximum total discount percentage is required.',
      ],

      default: 50,

      min: [
        0,
        'Maximum discount cannot be negative.',
      ],

      max: [
        100,
        'Maximum discount cannot exceed 100%.',
      ],
    },


    /*
     * updatedByAdminId
     * --------------------------------------------------------
     *
     * Later, when an administrator changes the reward policy,
     * we can store the administrator's User ID here.
     *
     * This gives us a simple audit trail:
     *
     *   "Which admin last changed the reward settings?"
     *
     * The field is optional because the first settings document
     * may be automatically created using default values before
     * any administrator edits it.
     */
    updatedByAdminId: {
      type:
        mongoose.Schema.Types.ObjectId,

      ref: 'User',

      default: null,
    },
  },
  {
    /*
     * Mongoose automatically creates:
     *
     *   createdAt
     *   updatedAt
     *
     * updatedAt is particularly useful here because it tells us
     * when the global reward policy was last changed.
     */
    timestamps: true,
  }
);


/*
 * ------------------------------------------------------------
 * CROSS-FIELD VALIDATION
 * ------------------------------------------------------------
 *
 * Individual fields can already validate themselves using
 * min/max.
 *
 * But some rules depend on comparing TWO fields.
 *
 * Example of an invalid configuration:
 *
 *   Premium base discount = 60%
 *   Maximum discount      = 50%
 *
 * The permanent discount alone would already exceed the maximum
 * allowed total.
 *
 * This validation prevents that contradictory configuration.
 */
rewardSettingsSchema.pre(
  'validate',
  function validateRewardSettingsBeforeSaving() {
    if (
      this.maximumDiscountPercent <
      this.premiumBaseDiscountPercent
    ) {
      /*
       * this.invalidate() tells Mongoose that the document is
       * invalid and gives a useful validation message.
       */
      this.invalidate(
        'maximumDiscountPercent',
        'Maximum total discount cannot be smaller than the Premium base discount.'
      );
    }
  }
);


/*
 * Create the Mongoose model.
 *
 * Model:
 *
 *   RewardSettings
 *
 * MongoDB collection:
 *
 *   rewardsettings
 *
 * Later we will use methods such as:
 *
 *   RewardSettings.findOne(...)
 *   RewardSettings.create(...)
 *   RewardSettings.findOneAndUpdate(...)
 */
const RewardSettings =
  mongoose.model(
    'RewardSettings',
    rewardSettingsSchema
  );


/*
 * Export both the model and the key.
 *
 * The model is needed for database operations.
 *
 * GLOBAL_SETTINGS_KEY is exported so our future service does
 * not have to repeat the literal string "global" in many files.
 */
export {
  GLOBAL_SETTINGS_KEY,
};

export default RewardSettings;