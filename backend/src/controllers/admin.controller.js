import mongoose from 'mongoose';

import User from '../models/User.js';

// Hotel and guide accounts are the provider accounts that require
// administrator approval before they can use provider functionality.
const PROVIDER_ROLES = ['hotel', 'guide'];

/**
 * Returns all hotel and guide accounts that are waiting for approval.
 *
 * This endpoint is used by the administrator dashboard.
 *
 * Authentication and administrator-role checking are handled by the
 * admin router before this controller is reached.
 */
async function getPendingProviderApplications(req, res, next) {
  try {
    const applications = await User.find({
      role: {
        $in: PROVIDER_ROLES,
      },
      approvalStatus: 'pending',
    })
      .select(
        'name email phone role approvalStatus profileImageUrl createdAt updatedAt'
      )
      .sort({
        createdAt: 1,
      });

    return res.status(200).json({
      success: true,
      message: 'Pending provider applications retrieved successfully.',
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
 *
 * After approval, the existing requireApprovedProvider middleware will
 * immediately allow the provider to use protected provider functionality.
 */
async function approveProviderApplication(req, res, next) {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
        errors: [
          {
            field: 'userId',
            message: 'A valid provider user ID is required.',
          },
        ],
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Provider application not found.',
        errors: [
          {
            field: 'userId',
            message: 'No user was found with this ID.',
          },
        ],
      });
    }

    if (!PROVIDER_ROLES.includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'This account does not require provider approval.',
        errors: [
          {
            field: 'role',
            message: 'Only hotel and guide accounts can be approved.',
          },
        ],
      });
    }

    if (user.approvalStatus !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'This application is no longer pending.',
        errors: [
          {
            field: 'approvalStatus',
            message: `The application is currently ${user.approvalStatus}.`,
          },
        ],
      });
    }

    user.approvalStatus = 'approved';

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Provider application approved successfully.',
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
async function rejectProviderApplication(req, res, next) {
  try {
    const { userId } = req.params;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID.',
        errors: [
          {
            field: 'userId',
            message: 'A valid provider user ID is required.',
          },
        ],
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Provider application not found.',
        errors: [
          {
            field: 'userId',
            message: 'No user was found with this ID.',
          },
        ],
      });
    }

    if (!PROVIDER_ROLES.includes(user.role)) {
      return res.status(400).json({
        success: false,
        message: 'This account does not require provider approval.',
        errors: [
          {
            field: 'role',
            message: 'Only hotel and guide accounts can be rejected.',
          },
        ],
      });
    }

    if (user.approvalStatus !== 'pending') {
      return res.status(409).json({
        success: false,
        message: 'This application is no longer pending.',
        errors: [
          {
            field: 'approvalStatus',
            message: `The application is currently ${user.approvalStatus}.`,
          },
        ],
      });
    }

    user.approvalStatus = 'rejected';

    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Provider application rejected successfully.',
      data: {
        user,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export {
  approveProviderApplication,
  getPendingProviderApplications,
  rejectProviderApplication,
};