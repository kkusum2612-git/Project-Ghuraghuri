import mongoose from 'mongoose';

import User from '../models/User.js';

import {
  buildRewardSettingsResponse,
  getRewardSettings,
} from '../services/reward-settings.service.js';


/*
 * ============================================================
 * ADMIN CONTROLLER
 * ============================================================
 *
 * This file already handled hotel/guide provider approvals.
 *
 * Rafi Feature 3 adds two more administrator operations:
 *
 *   GET   current Premium/reward settings
 *   PATCH update Premium/reward settings
 *
 * Existing provider-approval behavior is intentionally kept
 * unchanged.
 */


// Hotel and guide accounts are the provider accounts that require
// administrator approval before they can use provider functionality.
const PROVIDER_ROLES = [
  'hotel',
  'guide',
];


/*
 * ------------------------------------------------------------
 * RAFI FEATURE 3 - REWARD SETTING FIELD RULES
 * ------------------------------------------------------------
 *
 * Only these fields may be changed through the admin endpoint.
 *
 * This prevents a frontend request from changing internal fields
 * such as:
 *
 *   _id
 *   key
 *   createdAt
 *   updatedAt
 */
const REWARD_SETTING_RULES = {
  premiumUpgradePrice: {
    integer: false,
    minimum: 10,
    maximum: null,
  },

  premiumBaseDiscountPercent: {
    integer: false,
    minimum: 0,
    maximum: 100,
  },

  pointsPerEligiblePayment: {
    integer: true,
    minimum: 0,
    maximum: null,
  },

  pointsPerDiscountStep: {
    integer: true,
    minimum: 1,
    maximum: null,
  },

  discountPercentPerStep: {
    integer: false,
    minimum: 0,
    maximum: 100,
  },

  maximumDiscountPercent: {
    integer: false,
    minimum: 0,
    maximum: 100,
  },
};


/*
 * Validate one administrator-provided numeric setting.
 *
 * MongoDB/Mongoose also validates the final document.
 *
 * We perform this earlier validation so the administrator receives
 * a clear HTTP 400 response instead of a confusing database cast
 * error.
 */
function parseRewardSettingValue(
  fieldName,
  rawValue
) {
  const rule =
    REWARD_SETTING_RULES[
      fieldName
    ];

  const numericValue =
    Number(rawValue);


  if (
    !Number.isFinite(
      numericValue
    )
  ) {
    const error =
      new Error(
        `${fieldName} must be a valid number.`
      );

    error.statusCode = 400;

    throw error;
  }


  if (
    rule.integer &&
    !Number.isInteger(
      numericValue
    )
  ) {
    const error =
      new Error(
        `${fieldName} must be a whole number.`
      );

    error.statusCode = 400;

    throw error;
  }


  if (
    numericValue <
    rule.minimum
  ) {
    const error =
      new Error(
        `${fieldName} must be at least ${rule.minimum}.`
      );

    error.statusCode = 400;

    throw error;
  }


  if (
    rule.maximum !== null &&
    numericValue >
      rule.maximum
  ) {
    const error =
      new Error(
        `${fieldName} cannot exceed ${rule.maximum}.`
      );

    error.statusCode = 400;

    throw error;
  }


  return numericValue;
}


/**
 * Returns all hotel and guide accounts that are waiting for approval.
 *
 * This endpoint is used by the administrator dashboard.
 *
 * Authentication and administrator-role checking are handled by the
 * admin router before this controller is reached.
 */
async function getPendingProviderApplications(
  req,
  res,
  next
) {
  try {
    const applications =
      await User.find({
        role: {
          $in:
            PROVIDER_ROLES,
        },

        approvalStatus:
          'pending',
      })
        .select(
          'name email phone role approvalStatus profileImageUrl createdAt updatedAt'
        )
        .sort({
          createdAt: 1,
        });


    return res.status(200).json({
      success: true,

      message:
        'Pending provider applications retrieved successfully.',

      data: {
        applications,
      },
    });
  } catch (error) {
    return next(error);
  }
}


/**
 * Approves a pending hotel or guide account.
 */
async function approveProviderApplication(
  req,
  res,
  next
) {
  try {
    const { userId } =
      req.params;


    if (
      !mongoose.isValidObjectId(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          'Invalid user ID.',

        errors: [
          {
            field:
              'userId',

            message:
              'A valid provider user ID is required.',
          },
        ],
      });
    }


    const user =
      await User.findById(
        userId
      );


    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          'Provider application not found.',

        errors: [
          {
            field:
              'userId',

            message:
              'No user was found with this ID.',
          },
        ],
      });
    }


    if (
      !PROVIDER_ROLES.includes(
        user.role
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          'This account does not require provider approval.',

        errors: [
          {
            field:
              'role',

            message:
              'Only hotel and guide accounts can be approved.',
          },
        ],
      });
    }


    if (
      user.approvalStatus !==
      'pending'
    ) {
      return res.status(409).json({
        success: false,

        message:
          'This application is no longer pending.',

        errors: [
          {
            field:
              'approvalStatus',

            message:
              `The application is currently ${user.approvalStatus}.`,
          },
        ],
      });
    }


    user.approvalStatus =
      'approved';

    await user.save();


    return res.status(200).json({
      success: true,

      message:
        'Provider application approved successfully.',

      data: {
        user,
      },
    });
  } catch (error) {
    return next(error);
  }
}


/**
 * Rejects a pending hotel or guide account.
 */
async function rejectProviderApplication(
  req,
  res,
  next
) {
  try {
    const { userId } =
      req.params;


    if (
      !mongoose.isValidObjectId(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          'Invalid user ID.',

        errors: [
          {
            field:
              'userId',

            message:
              'A valid provider user ID is required.',
          },
        ],
      });
    }


    const user =
      await User.findById(
        userId
      );


    if (!user) {
      return res.status(404).json({
        success: false,

        message:
          'Provider application not found.',

        errors: [
          {
            field:
              'userId',

            message:
              'No user was found with this ID.',
          },
        ],
      });
    }


    if (
      !PROVIDER_ROLES.includes(
        user.role
      )
    ) {
      return res.status(400).json({
        success: false,

        message:
          'This account does not require provider approval.',

        errors: [
          {
            field:
              'role',

            message:
              'Only hotel and guide accounts can be rejected.',
          },
        ],
      });
    }


    if (
      user.approvalStatus !==
      'pending'
    ) {
      return res.status(409).json({
        success: false,

        message:
          'This application is no longer pending.',

        errors: [
          {
            field:
              'approvalStatus',

            message:
              `The application is currently ${user.approvalStatus}.`,
          },
        ],
      });
    }


    user.approvalStatus =
      'rejected';

    await user.save();


    return res.status(200).json({
      success: true,

      message:
        'Provider application rejected successfully.',

      data: {
        user,
      },
    });
  } catch (error) {
    return next(error);
  }
}


/*
 * ============================================================
 * RAFI FEATURE 3 - GET GLOBAL REWARD SETTINGS
 * ============================================================
 *
 * Route:
 *
 *   GET /api/v1/admin/reward-settings
 *
 *
 * admin.routes.js already protects this route with:
 *
 *   authenticateUser
 *   authorizeRoles('admin')
 */
async function getAdminRewardSettings(
  req,
  res,
  next
) {
  try {
    /*
     * getRewardSettings() also creates the singleton settings
     * document with default values if the project has never
     * created it before.
     */
    const settings =
      await getRewardSettings();


    return res.status(200).json({
      success: true,

      message:
        'Premium and reward settings retrieved successfully.',

      data: {
        settings:
          buildRewardSettingsResponse(
            settings
          ),
      },
    });
  } catch (error) {
    return next(error);
  }
}


/*
 * ============================================================
 * RAFI FEATURE 3 - UPDATE GLOBAL REWARD SETTINGS
 * ============================================================
 *
 * Route:
 *
 *   PATCH /api/v1/admin/reward-settings
 *
 *
 * These settings are GLOBAL.
 *
 * We do NOT copy the percentages into every PremiumMembership.
 *
 * Therefore if the administrator changes:
 *
 *   base Premium discount 5% -> 7%
 *
 * every existing and future Premium traveler will use 7% the
 * next time their discount is calculated.
 */
async function updateAdminRewardSettings(
  req,
  res,
  next
) {
  try {
    /*
     * Load the singleton as a real Mongoose document.
     *
     * We intentionally modify and save the document rather than
     * using findOneAndUpdate().
     *
     * Why?
     *
     * rewardSettings.model.js contains document validation,
     * including the relationship:
     *
     * maximum discount >= Premium base discount
     *
     * settings.save() runs that validation correctly.
     */
    const settings =
      await getRewardSettings();


    let changedFieldCount =
      0;


    /*
     * Examine ONLY the fields Rafi's settings system allows.
     *
     * Unknown request properties are never copied to MongoDB.
     */
    for (
      const fieldName
      of Object.keys(
        REWARD_SETTING_RULES
      )
    ) {
      if (
        !Object.prototype.hasOwnProperty.call(
          req.body,
          fieldName
        )
      ) {
        continue;
      }


      settings[fieldName] =
        parseRewardSettingValue(
          fieldName,
          req.body[
            fieldName
          ]
        );


      changedFieldCount +=
        1;
    }


    if (
      changedFieldCount ===
      0
    ) {
      return res.status(400).json({
        success: false,

        message:
          'At least one Premium or reward setting must be provided.',
      });
    }


    /*
     * Keep a small audit reference showing which administrator
     * most recently changed the global policy.
     */
    settings.updatedByAdminId =
      req.user._id;


    await settings.save();


    return res.status(200).json({
      success: true,

      message:
        'Premium and reward settings updated successfully.',

      data: {
        settings:
          buildRewardSettingsResponse(
            settings
          ),
      },
    });
  } catch (error) {
    return next(error);
  }
}


export {
  approveProviderApplication,
  getAdminRewardSettings,
  getPendingProviderApplications,
  rejectProviderApplication,
  updateAdminRewardSettings,
};