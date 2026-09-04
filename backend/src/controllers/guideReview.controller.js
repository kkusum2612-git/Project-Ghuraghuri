import mongoose from 'mongoose';

import Guide from '../models/guide.model.js';
import GuideBooking from '../models/guideBooking.model.js';
import GuideReview from '../models/guideReview.model.js';

function createHttpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;

  return error;
}

function validateObjectId(id, fieldName) {
  if (!mongoose.isValidObjectId(id)) {
    throw createHttpError(
      `${fieldName} is invalid.`,
      400
    );
  }
}

async function updateGuideRatingSummary(
  guideId
) {
  const summary =
    await GuideReview.aggregate([
      {
        $match: {
          guideId:
            new mongoose.Types.ObjectId(
              guideId
            ),
        },
      },
      {
        $group: {
          _id: null,

          averageRating: {
            $avg: '$rating',
          },

          reviewCount: {
            $sum: 1,
          },
        },
      },
    ]);

  const averageRating =
    summary.length > 0
      ? Number(
          summary[0].averageRating.toFixed(
            1
          )
        )
      : 0;

  const reviewCount =
    summary.length > 0
      ? summary[0].reviewCount
      : 0;

  await Guide.findByIdAndUpdate(
    guideId,
    {
      averageRating,
      reviewCount,
    }
  );

  return {
    averageRating,
    reviewCount,
  };
}

/*
 * POST /api/v1/guide-reviews
 */
async function createGuideReview(
  req,
  res,
  next
) {
  try {
    const {
      bookingId,
      rating,
      comment,
    } = req.body;

    validateObjectId(
      bookingId,
      'Guide booking ID'
    );

    const parsedRating =
      Number(rating);

    if (
      !Number.isInteger(
        parsedRating
      ) ||
      parsedRating < 1 ||
      parsedRating > 5
    ) {
      throw createHttpError(
        'Rating must be a whole number from 1 to 5.',
        400
      );
    }

    if (
      typeof comment !==
        'string' ||
      !comment.trim()
    ) {
      throw createHttpError(
        'Written review is required.',
        400
      );
    }

    const trimmedComment =
      comment.trim();

    if (
      trimmedComment.length >
      1000
    ) {
      throw createHttpError(
        'Review cannot exceed 1000 characters.',
        400
      );
    }

    const booking =
      await GuideBooking.findOne({
        _id: bookingId,
        travelerId:
          req.user._id,
      });

    if (!booking) {
      throw createHttpError(
        'Guide booking not found.',
        404
      );
    }

    if (
      booking.bookingStatus !==
      'completed'
    ) {
      throw createHttpError(
        'You can review a guide only after the booking is completed.',
        409
      );
    }

    const guide =
      await Guide.findById(
        booking.guideId
      );

    if (!guide) {
      throw createHttpError(
        'Guide profile not found.',
        404
      );
    }

    const existingReview =
      await GuideReview.findOne({
        bookingId:
          booking._id,
      });

    if (existingReview) {
      throw createHttpError(
        'You have already reviewed this booking.',
        409
      );
    }

    const review =
      await GuideReview.create({
        bookingId:
          booking._id,

        guideId:
          booking.guideId,

        travelerId:
          req.user._id,

        rating:
          parsedRating,

        comment:
          trimmedComment,
      });

    await review.populate(
      'travelerId',
      'name profileImageUrl'
    );

    const ratingSummary =
      await updateGuideRatingSummary(
        booking.guideId
      );

    return res.status(201).json({
      success: true,

      message:
        'Guide review submitted successfully.',

      data: {
        review,
        ...ratingSummary,
      },
    });
  } catch (error) {
    if (
      error?.code === 11000
    ) {
      return next(
        createHttpError(
          'You have already reviewed this booking.',
          409
        )
      );
    }

    return next(error);
  }
}

/*
 * GET /api/v1/guide-reviews/guide/:guideId
 */
async function getGuideReviews(
  req,
  res,
  next
) {
  try {
    const {
      guideId,
    } = req.params;

    validateObjectId(
      guideId,
      'Guide ID'
    );

    const guide =
      await Guide.findById(
        guideId
      ).populate({
        path: 'userId',
        match: {
          role: 'guide',
          accountStatus: 'active',
          approvalStatus: 'approved',
        },
        select:
          'name profileImageUrl',
      });

    if (
      !guide ||
      !guide.userId
    ) {
      throw createHttpError(
        'Approved guide not found.',
        404
      );
    }

    const reviews =
      await GuideReview.find({
        guideId:
          guide._id,
      })
        .populate(
          'travelerId',
          'name profileImageUrl'
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,

      message:
        'Guide reviews retrieved successfully.',

      data: {
        guide: {
          _id:
            guide._id,

          name:
            guide.userId.name,
        },

        averageRating:
          guide.averageRating || 0,

        reviewCount:
          guide.reviewCount || 0,

        reviews,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * GET /api/v1/guide-reviews/traveler/me
 */
async function getTravelerGuideReviews(
  req,
  res,
  next
) {
  try {
    const reviews =
      await GuideReview.find({
        travelerId:
          req.user._id,
      })
        .populate({
          path: 'guideId',
          populate: {
            path: 'userId',
            select:
              'name profileImageUrl',
          },
        })
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,

      message:
        'Traveler guide reviews retrieved successfully.',

      data: {
        count:
          reviews.length,

        reviews,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * GET /api/v1/guide-reviews/me
 */
async function getMyGuideReviews(
  req,
  res,
  next
) {
  try {
    const guide =
      await Guide.findOne({
        userId:
          req.user._id,
      });

    if (!guide) {
      throw createHttpError(
        'Guide profile not found.',
        404
      );
    }

    const reviews =
      await GuideReview.find({
        guideId:
          guide._id,
      })
        .populate(
          'travelerId',
          'name profileImageUrl'
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,

      message:
        'Guide reviews retrieved successfully.',

      data: {
        averageRating:
          guide.averageRating || 0,

        reviewCount:
          guide.reviewCount || 0,

        reviews,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * GET /api/v1/guide-reviews/analytics/me
 */
async function getMyGuideAnalytics(
  req,
  res,
  next
) {
  try {
    const guide =
      await Guide.findOne({
        userId:
          req.user._id,
      });

    if (!guide) {
      throw createHttpError(
        'Guide profile not found.',
        404
      );
    }

    const bookings =
      await GuideBooking.find({
        guideId:
          guide._id,
      }).lean();

    const completedBookings =
      bookings.filter(
        (booking) =>
          booking.bookingStatus ===
          'completed'
      );

    const totalTours =
      completedBookings.length;

    const totalRevenue =
      completedBookings.reduce(
        (
          total,
          booking
        ) =>
          total +
          Number(
            booking.totalPrice || 0
          ),
        0
      );

    const travelerTourCounts =
      new Map();

    completedBookings.forEach(
      (booking) => {
        const travelerKey =
          String(
            booking.travelerId
          );

        travelerTourCounts.set(
          travelerKey,
          (
            travelerTourCounts.get(
              travelerKey
            ) || 0
          ) + 1
        );
      }
    );

    const repeatTravelerCount =
      Array.from(
        travelerTourCounts.values()
      ).filter(
        (count) => count > 1
      ).length;

    const performance = {
      pending:
        bookings.filter(
          (booking) =>
            booking.bookingStatus ===
            'pending'
        ).length,

      confirmed:
        bookings.filter(
          (booking) =>
            booking.bookingStatus ===
            'confirmed'
        ).length,

      completed:
        totalTours,

      declined:
        bookings.filter(
          (booking) =>
            booking.bookingStatus ===
            'declined'
        ).length,

      cancelled:
        bookings.filter(
          (booking) =>
            booking.bookingStatus ===
            'cancelled'
        ).length,
    };

    return res.status(200).json({
      success: true,

      message:
        'Guide analytics retrieved successfully.',

      data: {
        totalTours,
        totalRevenue,

        averageRating:
          guide.averageRating || 0,

        reviewCount:
          guide.reviewCount || 0,

        repeatTravelerCount,

        performance,
      },
    });
  } catch (error) {
    return next(error);
  }
}

export {
  createGuideReview,
  getGuideReviews,
  getMyGuideAnalytics,
  getMyGuideReviews,
  getTravelerGuideReviews,
};