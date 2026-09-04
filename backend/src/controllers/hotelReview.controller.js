import mongoose from 'mongoose';

import Booking from '../models/booking.model.js';
import Hotel from '../models/hotel.model.js';
import HotelReview from '../models/hotelReview.model.js';

function createHttpError(
  message,
  statusCode
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
}

function validateObjectId(
  id,
  fieldName
) {
  if (
    !mongoose.isValidObjectId(
      id
    )
  ) {
    throw createHttpError(
      `${fieldName} is invalid.`,
      400
    );
  }
}

/*
 * ------------------------------------------------------------
 * HOTEL RATING SUMMARY
 * ------------------------------------------------------------
 *
 * Reviews remain the source of truth.
 *
 * We calculate:
 *
 * - averageRating
 * - reviewCount
 *
 * instead of permanently storing those values inside Hotel.
 */
async function getHotelRatingSummary(
  hotelId
) {
  const summary =
    await HotelReview.aggregate([
      {
        $match: {
          hotelId:
            new mongoose.Types.ObjectId(
              hotelId
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

  if (
    summary.length === 0
  ) {
    return {
      averageRating: 0,
      reviewCount: 0,
    };
  }

  return {
    averageRating:
      Number(
        summary[0].averageRating.toFixed(
          1
        )
      ),

    reviewCount:
      summary[0].reviewCount,
  };
}

/*
 * ------------------------------------------------------------
 * CREATE HOTEL REVIEW
 * ------------------------------------------------------------
 *
 * Traveler sends:
 *
 * - bookingId
 * - rating
 * - comment
 *
 * The frontend does NOT choose:
 *
 * - travelerId
 * - hotelId
 * - vendorId
 *
 * Those values are taken from authentication and the booking.
 */
async function createHotelReview(
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
      'Booking ID'
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

    /*
     * The query contains travelerId as well as bookingId.
     *
     * Therefore a traveler cannot submit a review using
     * another traveler's booking ID.
     */
    const booking =
      await Booking.findOne({
        _id: bookingId,

        travelerId:
          req.user._id,
      });

    if (!booking) {
      throw createHttpError(
        'Booking not found.',
        404
      );
    }

    /*
     * Only a completed hotel stay can be reviewed.
     */
    if (
      booking.bookingStatus !==
      'completed'
    ) {
      throw createHttpError(
        'You can review a hotel only after the booking is completed.',
        409
      );
    }

    /*
     * Make sure the hotel associated with the historical
     * booking still exists.
     */
    const hotel =
      await Hotel.findById(
        booking.hotelId
      );

    if (!hotel) {
      throw createHttpError(
        'Hotel listing not found.',
        404
      );
    }

    /*
     * Friendly duplicate check.
     *
     * The model also has a unique index on bookingId, so
     * MongoDB provides an additional database-level safeguard.
     */
    const existingReview =
      await HotelReview.findOne({
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
      await HotelReview.create({
        bookingId:
          booking._id,

        hotelId:
          booking.hotelId,

        vendorId:
          booking.vendorId,

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
      await getHotelRatingSummary(
        booking.hotelId
      );

    res.status(201).json({
      success: true,

      message:
        'Hotel review submitted successfully.',

      data: {
        review,

        ...ratingSummary,
      },
    });
  } catch (error) {
    /*
     * If two duplicate requests somehow arrive at almost the
     * same time, the unique bookingId index still prevents a
     * second review.
     */
    if (
      error?.code === 11000
    ) {
      next(
        createHttpError(
          'You have already reviewed this booking.',
          409
        )
      );

      return;
    }

    next(error);
  }
}

/*
 * ------------------------------------------------------------
 * GET PUBLIC REVIEWS FOR ONE HOTEL
 * ------------------------------------------------------------
 *
 * Anyone may read reviews for an active hotel.
 */
async function getHotelReviews(
  req,
  res,
  next
) {
  try {
    const { hotelId } =
      req.params;

    validateObjectId(
      hotelId,
      'Hotel ID'
    );

    const hotel =
      await Hotel.findOne({
        _id: hotelId,
        status: 'active',
      }).select(
        'name'
      );

    if (!hotel) {
      throw createHttpError(
        'Hotel listing not found.',
        404
      );
    }

    const reviews =
      await HotelReview.find({
        hotelId:
          hotel._id,
      })
        .populate(
          'travelerId',
          'name profileImageUrl'
        )
        .sort({
          createdAt: -1,
        });

    const ratingSummary =
      await getHotelRatingSummary(
        hotel._id
      );

    res.status(200).json({
      success: true,

      message:
        'Hotel reviews retrieved successfully.',

      data: {
        hotel: {
          _id:
            hotel._id,

          name:
            hotel.name,
        },

        ...ratingSummary,

        reviews,
      },
    });
  } catch (error) {
    next(error);
  }
}

/*
 * ------------------------------------------------------------
 * GET TRAVELER'S OWN REVIEWS
 * ------------------------------------------------------------
 *
 * This will also help the My Bookings page determine whether
 * a completed booking has already been reviewed.
 */
async function getTravelerHotelReviews(
  req,
  res,
  next
) {
  try {
    const reviews =
      await HotelReview.find({
        travelerId:
          req.user._id,
      })
        .populate(
          'hotelId',
          'name location photos'
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,

      message:
        'Traveler hotel reviews retrieved successfully.',

      data: {
        count:
          reviews.length,

        reviews,
      },
    });
  } catch (error) {
    next(error);
  }
}

/*
 * ------------------------------------------------------------
 * GET HOTEL VENDOR REVIEWS
 * ------------------------------------------------------------
 *
 * vendorId comes from the authenticated hotel account.
 *
 * A vendor therefore sees reviews associated only with their
 * own hotel listings.
 */
async function getVendorHotelReviews(
  req,
  res,
  next
) {
  try {
    const reviews =
      await HotelReview.find({
        vendorId:
          req.user._id,
      })
        .populate(
          'hotelId',
          'name location photos'
        )
        .populate(
          'travelerId',
          'name profileImageUrl'
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,

      message:
        'Vendor hotel reviews retrieved successfully.',

      data: {
        count:
          reviews.length,

        reviews,
      },
    });
  } catch (error) {
    next(error);
  }
}

export {
  createHotelReview,
  getHotelReviews,
  getTravelerHotelReviews,
  getVendorHotelReviews,
};