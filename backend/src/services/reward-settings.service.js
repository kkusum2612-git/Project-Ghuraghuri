import RewardSettings, {
  GLOBAL_SETTINGS_KEY,
} from '../models/rewardSettings.model.js';

/*
 * ------------------------------------------------------------
 * RAFI FEATURE 3 - REWARD SETTINGS SERVICE
 * ------------------------------------------------------------
 *
 * The RewardSettings MODEL defines what the settings document
 * looks like in MongoDB.
 *
 * This SERVICE handles the logic for retrieving that document.
 *
 *
 * Why do we need a service instead of directly writing:
 *
 *   RewardSettings.findOne(...)
 *
 * inside every controller?
 *
 * Because many parts of Rafi's feature will need the exact
 * same global settings:
 *
 *   - Premium upgrade page
 *   - Premium payment creation
 *   - Reward-point calculation
 *   - Hotel-booking discount calculation
 *   - Premium status page
 *   - Admin reward settings page
 *   - Later, possibly the AI Premium feature
 *
 * If every controller implemented its own settings-loading
 * logic, we would duplicate code and make future changes harder.
 *
 * Instead, every part of the feature can call:
 *
 *   getRewardSettings()
 *
 * and receive the current global configuration.
 */


/*
 * ------------------------------------------------------------
 * getRewardSettings()
 * ------------------------------------------------------------
 *
 * This function returns the ONE global reward-settings document.
 *
 * There are two possible situations:
 *
 * CASE 1:
 * The document already exists.
 *
 * We simply return it.
 *
 *
 * CASE 2:
 * This is the very first time the reward system is being used
 * and MongoDB does not have a settings document yet.
 *
 * In that case, we automatically create it using the default
 * values defined inside rewardSettings.model.js.
 *
 *
 * The defaults currently are:
 *
 *   Premium upgrade price        = 499 BDT
 *   Premium base discount        = 5%
 *   Points per eligible payment  = 100
 *   Points per discount step     = 1000
 *   Discount per step            = 5%
 *   Maximum total discount       = 50%
 *
 *
 * Why use findOneAndUpdate() with upsert?
 *
 * "upsert" means:
 *
 *   Find the document.
 *
 *   If it exists:
 *      return it.
 *
 *   If it does NOT exist:
 *      create it.
 *
 *
 * This is safer than doing:
 *
 *   const settings = await RewardSettings.findOne(...)
 *
 *   if (!settings) {
 *     await RewardSettings.create(...)
 *   }
 *
 * because two requests arriving at almost exactly the same time
 * could both believe the settings do not exist and both try to
 * create the singleton document.
 *
 * The database-level upsert handles that situation much more
 * cleanly.
 */
async function getRewardSettings() {
  const settings =
    await RewardSettings.findOneAndUpdate(
      /*
       * Search for our one special global document.
       */
      {
        singletonKey:
          GLOBAL_SETTINGS_KEY,
      },

      /*
       * $setOnInsert means:
       *
       * Only set this value if MongoDB has to CREATE the
       * document.
       *
       * If the document already exists, this operation does not
       * overwrite any administrator-configured values.
       */
      {
        $setOnInsert: {
          singletonKey:
            GLOBAL_SETTINGS_KEY,
        },
      },

      {
        /*
         * upsert: true
         *
         * If no settings document exists, create one.
         */
        upsert: true,

        /*
         * new: true
         *
         * Return the document AFTER the operation.
         *
         * Without this, findOneAndUpdate may return the older
         * version of an updated document.
         */
        new: true,

        /*
         * setDefaultsOnInsert: true
         *
         * When the document is first created, apply all default
         * values from rewardSettings.model.js.
         *
         * That gives us the agreed default reward policy without
         * needing to manually repeat every value here.
         */
        setDefaultsOnInsert: true,

        /*
         * runValidators: true
         *
         * Make Mongoose apply schema validation rules during this
         * operation.
         */
        runValidators: true,
      }
    );

  return settings;
}


/*
 * ------------------------------------------------------------
 * buildRewardSettingsResponse()
 * ------------------------------------------------------------
 *
 * Controllers should ideally not decide independently which
 * fields from the database should be returned to the frontend.
 *
 * This helper converts the Mongoose RewardSettings document
 * into a clean plain object that the frontend can safely use.
 *
 *
 * Example result:
 *
 * {
 *   premiumUpgradePrice: 499,
 *   premiumBaseDiscountPercent: 5,
 *   pointsPerEligiblePayment: 100,
 *   pointsPerDiscountStep: 1000,
 *   discountPercentPerStep: 5,
 *   maximumDiscountPercent: 50
 * }
 *
 *
 * Notice:
 *
 * We do not need to expose internal fields such as:
 *
 *   singletonKey
 *   __v
 *
 * to a normal traveler.
 */
function buildRewardSettingsResponse(
  settings
) {
  /*
   * This guard makes mistakes easier to detect during
   * development.
   *
   * The normal code path should always provide a valid settings
   * document.
   */
  if (!settings) {
    throw new Error(
      'Reward settings are required to build the settings response.'
    );
  }

  return {
    premiumUpgradePrice:
      settings.premiumUpgradePrice,

    premiumBaseDiscountPercent:
      settings.premiumBaseDiscountPercent,

    pointsPerEligiblePayment:
      settings.pointsPerEligiblePayment,

    pointsPerDiscountStep:
      settings.pointsPerDiscountStep,

    discountPercentPerStep:
      settings.discountPercentPerStep,

    maximumDiscountPercent:
      settings.maximumDiscountPercent,
  };
}


export {
  buildRewardSettingsResponse,
  getRewardSettings,
};