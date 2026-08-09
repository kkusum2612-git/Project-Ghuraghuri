import mongoose from 'mongoose';

import Guide from '../models/guide.model.js';
import User from '../models/User.js';

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function validateObjectId(id, fieldName) {
  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(`${fieldName} is invalid.`, 400);
  }
}

const GUIDE_MUTABLE_FIELDS = [
  'location',
  'languages',
  'specialties',
  'bio',
  'yearsOfExperience',
  'photos',
];

function pickGuideFields(body) {
  const data = {};

  GUIDE_MUTABLE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  });

  return data;
}

const PACKAGE_MUTABLE_FIELDS = [
  'name',
  'description',
  'location',
  'durationDays',
  'pricePerPerson',
  'maxGroupSize',
  'availableDates',
  'inclusions',
  'exclusions',
  'photos',
  'status',
];

function pickPackageFields(body) {
  const data = {};

  PACKAGE_MUTABLE_FIELDS.forEach((field) => {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  });

  return data;
}

function normalizeDatabaseError(error) {
  if (error?.name === 'ValidationError') {
    error.statusCode = 400;
  }

  if (error?.code === 11000) {
    error.statusCode = 409;
  }

  return error;
}

async function findCurrentGuide(userId) {
  const guide = await Guide.findOne({
    userId,
  });

  if (!guide) {
    throw createHttpError('Guide profile not found.', 404);
  }

  return guide;
}

/*
 * POST /api/v1/guides/me
 *
 * Creates the professional profile belonging to
 * the currently logged-in guide.
 */
async function createGuideProfile(req, res, next) {
  try {
    const existingGuide = await Guide.findOne({
      userId: req.user._id,
    });

    if (existingGuide) {
      throw createHttpError('A guide profile already exists for this account.', 409);
    }

    const guideData = pickGuideFields(req.body);

    const guide = await Guide.create({
      ...guideData,
      userId: req.user._id,
    });

    await guide.populate({
      path: 'userId',
      select: 'name email phone role approvalStatus profileImageUrl',
    });

    return res.status(201).json({
      success: true,
      message: 'Guide profile created successfully.',
      data: {
        guide,
      },
    });
  } catch (error) {
    return next(normalizeDatabaseError(error));
  }
}

/*
 * GET /api/v1/guides/me
 */
async function getMyGuideProfile(req, res, next) {
  try {
    const guide = await Guide.findOne({
      userId: req.user._id,
    }).populate({
      path: 'userId',
      select: 'name email phone role approvalStatus profileImageUrl',
    });

    if (!guide) {
      throw createHttpError('Guide profile not found.', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Guide profile retrieved successfully.',
      data: {
        guide,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * PATCH /api/v1/guides/me
 */
async function updateMyGuideProfile(req, res, next) {
  try {
    const updates = pickGuideFields(req.body);

    if (Object.keys(updates).length === 0) {
      throw createHttpError('Please provide at least one guide profile field to update.', 400);
    }

    const guide = await Guide.findOneAndUpdate(
      {
        userId: req.user._id,
      },
      updates,
      {
        new: true,
        runValidators: true,
      }
    ).populate({
      path: 'userId',
      select: 'name email phone role approvalStatus profileImageUrl',
    });

    if (!guide) {
      throw createHttpError('Guide profile not found.', 404);
    }

    return res.status(200).json({
      success: true,
      message: 'Guide profile updated successfully.',
      data: {
        guide,
      },
    });
  } catch (error) {
    return next(normalizeDatabaseError(error));
  }
}

/*
 * POST /api/v1/guides/me/packages
 */
async function createTourPackage(req, res, next) {
  try {
    const guide = await findCurrentGuide(req.user._id);

    const packageData = pickPackageFields(req.body);

    guide.tourPackages.push(packageData);

    await guide.save();

    const tourPackage = guide.tourPackages[guide.tourPackages.length - 1];

    return res.status(201).json({
      success: true,
      message: 'Tour package created successfully.',
      data: {
        tourPackage,
      },
    });
  } catch (error) {
    return next(normalizeDatabaseError(error));
  }
}

/*
 * PATCH /api/v1/guides/me/packages/:packageId
 */
async function updateTourPackage(req, res, next) {
  try {
    const { packageId } = req.params;

    validateObjectId(packageId, 'Tour package ID');

    const guide = await findCurrentGuide(req.user._id);

    const tourPackage = guide.tourPackages.id(packageId);

    if (!tourPackage) {
      throw createHttpError('Tour package not found.', 404);
    }

    const updates = pickPackageFields(req.body);

    if (Object.keys(updates).length === 0) {
      throw createHttpError('Please provide at least one tour package field to update.', 400);
    }

    Object.entries(updates).forEach(([field, value]) => {
      tourPackage[field] = value;
    });

    await guide.save();

    return res.status(200).json({
      success: true,
      message: 'Tour package updated successfully.',
      data: {
        tourPackage,
      },
    });
  } catch (error) {
    return next(normalizeDatabaseError(error));
  }
}

/*
 * DELETE /api/v1/guides/me/packages/:packageId
 */
async function deleteTourPackage(req, res, next) {
  try {
    const { packageId } = req.params;

    validateObjectId(packageId, 'Tour package ID');

    const guide = await findCurrentGuide(req.user._id);

    const tourPackage = guide.tourPackages.id(packageId);

    if (!tourPackage) {
      throw createHttpError('Tour package not found.', 404);
    }

    tourPackage.deleteOne();

    await guide.save();

    return res.status(200).json({
      success: true,
      message: 'Tour package deleted successfully.',
      data: {
        deletedTourPackageId: packageId,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * GET /api/v1/guides
 *
 * Public API.
 * Only approved, active guide accounts are shown.
 */
async function getPublicGuides(_req, res, next) {
  try {
    const guides = await Guide.find({
      userId: {
        $type: 'objectId',
      },
    })
      .populate({
        path: 'userId',
        match: {
          role: 'guide',
          accountStatus: 'active',
          approvalStatus: 'approved',
        },
        select: 'name role approvalStatus profileImageUrl',
      })
      .sort({
        createdAt: -1,
      })
      .lean();

    const approvedGuides = guides
      .filter((guide) => guide.userId)
      .map((guide) => ({
        ...guide,
        tourPackages: guide.tourPackages.filter((tourPackage) => tourPackage.status === 'active'),
      }));

    return res.status(200).json({
      success: true,
      message: 'Approved guide listings retrieved successfully.',
      data: {
        count: approvedGuides.length,
        guides: approvedGuides,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * GET /api/v1/guides/:guideId
 */
async function getPublicGuideById(req, res, next) {
  try {
    const { guideId } = req.params;

    validateObjectId(guideId, 'Guide ID');

    const guide = await Guide.findById(guideId)
      .populate({
        path: 'userId',
        match: {
          role: 'guide',
          accountStatus: 'active',
          approvalStatus: 'approved',
        },
        select: 'name role approvalStatus profileImageUrl',
      })
      .lean();

    if (!guide || !guide.userId) {
      throw createHttpError('Approved guide listing not found.', 404);
    }

    guide.tourPackages = guide.tourPackages.filter(
      (tourPackage) => tourPackage.status === 'active'
    );

    return res.status(200).json({
      success: true,
      message: 'Guide listing retrieved successfully.',
      data: {
        guide,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * GET /api/v1/guides/admin/pending
 */
async function getPendingGuideApplications(_req, res, next) {
  try {
    const guides = await Guide.find({
      userId: {
        $type: 'objectId',
      },
    })
      .populate({
        path: 'userId',
        match: {
          role: 'guide',
          accountStatus: 'active',
          approvalStatus: 'pending',
        },
        select: 'name email phone role approvalStatus profileImageUrl',
      })
      .sort({
        createdAt: 1,
      });

    const pendingGuides = guides.filter((guide) => guide.userId);

    return res.status(200).json({
      success: true,
      message: 'Pending guide applications retrieved successfully.',
      data: {
        count: pendingGuides.length,
        guides: pendingGuides,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * PATCH /api/v1/guides/admin/:guideId/approval
 *
 * Approval is stored in User.approvalStatus.
 */
async function updateGuideApprovalStatus(req, res, next) {
  try {
    const { guideId } = req.params;
    const { approvalStatus } = req.body;

    validateObjectId(guideId, 'Guide ID');

    if (!['approved', 'rejected'].includes(approvalStatus)) {
      throw createHttpError('Approval status must be approved or rejected.', 400);
    }

    const guide = await Guide.findOne({
      _id: guideId,
      userId: {
        $type: 'objectId',
      },
    });

    if (!guide) {
      throw createHttpError('Guide profile not found.', 404);
    }

    const user = await User.findOneAndUpdate(
      {
        _id: guide.userId,
        role: 'guide',
      },
      {
        approvalStatus,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!user) {
      throw createHttpError('Guide user account not found.', 404);
    }

    await guide.populate({
      path: 'userId',
      select: 'name email phone role approvalStatus profileImageUrl',
    });

    return res.status(200).json({
      success: true,
      message: `Guide application ${approvalStatus} successfully.`,
      data: {
        guide,
      },
    });
  } catch (error) {
    return next(normalizeDatabaseError(error));
  }
}

export {
  createGuideProfile,
  createTourPackage,
  deleteTourPackage,
  getMyGuideProfile,
  getPendingGuideApplications,
  getPublicGuideById,
  getPublicGuides,
  updateGuideApprovalStatus,
  updateMyGuideProfile,
  updateTourPackage,
};
