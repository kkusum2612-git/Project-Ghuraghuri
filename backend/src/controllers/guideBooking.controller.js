import mongoose from 'mongoose';

import Guide from '../models/guide.model.js';
import GuideBooking from '../models/guideBooking.model.js';


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


function parseDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(
      'Tour date is invalid.',
      400
    );
  }

  return date;
}


/*
 * ------------------------------------------------------------
 * CREATE GUIDE BOOKING
 *
 * Traveler only.
 *
 * POST /api/v1/guide-bookings
 * ------------------------------------------------------------
 */
async function createGuideBooking(req, res, next) {
  try {
    const {
      guideId,
      packageId,
      tourDate,
      groupSize,
    } = req.body;


    validateObjectId(
      guideId,
      'Guide ID'
    );


    validateObjectId(
      packageId,
      'Package ID'
    );


    const guide = await Guide.findById(
      guideId
    );


    if (!guide) {
      throw createHttpError(
        'Guide not found.',
        404
      );
    }


    const tourPackage =
      guide.tourPackages.id(packageId);


    if (!tourPackage) {
      throw createHttpError(
        'Tour package not found.',
        404
      );
    }


    if (tourPackage.status !== 'active') {
      throw createHttpError(
        'This tour package is not available.',
        400
      );
    }


    const parsedGroupSize =
      Number(groupSize);


    if (
      !Number.isInteger(parsedGroupSize) ||
      parsedGroupSize < 1
    ) {
      throw createHttpError(
        'Group size must be a positive integer.',
        400
      );
    }


    if (
      parsedGroupSize >
      tourPackage.maxGroupSize
    ) {
      throw createHttpError(
        'Group size exceeds the package limit.',
        400
      );
    }


    const parsedDate =
      parseDate(tourDate);


    const available =
      tourPackage.availableDates.some(
        (date) =>
          new Date(date).toISOString().slice(0, 10) ===
          parsedDate.toISOString().slice(0, 10)
      );


    if (!available) {
      throw createHttpError(
        'Selected tour date is not available.',
        400
      );
    }


    const totalPrice =
      tourPackage.pricePerPerson *
      parsedGroupSize;


    const booking =
      await GuideBooking.create({
        travelerId: req.user._id,

        guideId,

        packageId,

        packageName:
          tourPackage.name,

        pricePerPerson:
          tourPackage.pricePerPerson,

        tourDate:
          parsedDate,

        groupSize:
          parsedGroupSize,

        totalPrice,

        bookingStatus:
          'pending',

        paymentStatus:
          'unpaid',
      });


    return res.status(201).json({
      success: true,

      message:
        'Guide booking created successfully.',

      data: {
        booking,
      },
    });

  } catch (error) {
    return next(error);
  }
}


/*
 * ------------------------------------------------------------
 * GET TRAVELER BOOKINGS
 *
 * GET /api/v1/guide-bookings/me
 * ------------------------------------------------------------
 */
async function getMyGuideBookings(req, res, next) {
  try {
    const bookings =
      await GuideBooking.find({
        travelerId: req.user._id,
      })
        .populate({
          path: 'guideId',
          populate: {
            path: 'userId',
            select: 'name email profileImageUrl',
          },
        })
        .sort({
          createdAt: -1,
        });


    return res.status(200).json({
      success: true,

      data: {
        bookings,
      },
    });

  } catch (error) {
    return next(error);
  }
}


/*
 * ------------------------------------------------------------
 * GET GUIDE RECEIVED BOOKINGS
 *
 * GET /api/v1/guide-bookings/received
 * ------------------------------------------------------------
 */
async function getReceivedGuideBookings(req, res, next) {
  try {
    const guide =
      await Guide.findOne({
        userId: req.user._id,
      });


    if (!guide) {
      throw createHttpError(
        'Guide profile not found.',
        404
      );
    }


    const bookings =
      await GuideBooking.find({
        guideId: guide._id,
      })
        .populate(
          'travelerId',
          'name email phone'
        )
        .sort({
          createdAt: -1,
        });


    return res.status(200).json({
      success: true,

      data: {
        bookings,
      },
    });

  } catch (error) {
    return next(error);
  }
}


/*
 * ------------------------------------------------------------
 * UPDATE BOOKING STATUS
 *
 * PATCH /api/v1/guide-bookings/:bookingId/status
 * ------------------------------------------------------------
 */
async function updateGuideBookingStatus(req, res, next) {
  try {
    const {
      bookingId,
    } = req.params;


    validateObjectId(
      bookingId,
      'Booking ID'
    );


    const booking =
      await GuideBooking.findById(
        bookingId
      );


    if (!booking) {
      throw createHttpError(
        'Booking not found.',
        404
      );
    }


    const guide =
      await Guide.findOne({
        userId: req.user._id,
      });


    if (
      !guide ||
      !booking.guideId.equals(
        guide._id
      )
    ) {
      throw createHttpError(
        'You cannot update this booking.',
        403
      );
    }


    const {
      bookingStatus,
    } = req.body;


    const allowedStatuses = [
      'confirmed',
      'declined',
    ];


    if (
      !allowedStatuses.includes(
        bookingStatus
      )
    ) {
      throw createHttpError(
        'Invalid booking status.',
        400
      );
    }


    booking.bookingStatus =
      bookingStatus;


    await booking.save();


    return res.status(200).json({
      success: true,

      message:
        'Booking status updated successfully.',

      data: {
        booking,
      },
    });

  } catch (error) {
    return next(error);
  }
}


export {
  createGuideBooking,
  getMyGuideBookings,
  getReceivedGuideBookings,
  updateGuideBookingStatus,
};