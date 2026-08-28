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
    throw createHttpError(`${fieldName} is invalid.`, 400);
  }
}

function parseDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError('Tour date is invalid.', 400);
  }

  return date;
}

function getDateKey(dateValue) {
  return new Date(dateValue)
    .toISOString()
    .slice(0, 10);
}

/*
 * POST /api/v1/guide-bookings
 *
 * Traveler sends only the selected guide, package,
 * date and group size.
 *
 * Package price is always taken from the database.
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

    /*
     * A traveler can book only a publicly approved guide.
     */
    const guide = await Guide.findById(
      guideId
    ).populate({
      path: 'userId',
      select:
        'role accountStatus approvalStatus',
    });

    if (
      !guide ||
      !guide.userId ||
      guide.userId.role !== 'guide' ||
      guide.userId.accountStatus !==
        'active' ||
      guide.userId.approvalStatus !==
        'approved'
    ) {
      throw createHttpError(
        'Approved guide not found.',
        404
      );
    }

    const tourPackage =
      guide.tourPackages.id(
        packageId
      );

    if (!tourPackage) {
      throw createHttpError(
        'Tour package not found.',
        404
      );
    }

    if (
      tourPackage.status !== 'active'
    ) {
      throw createHttpError(
        'This tour package is not available.',
        400
      );
    }

    const parsedGroupSize =
      Number(groupSize);

    if (
      !Number.isInteger(
        parsedGroupSize
      ) ||
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

    /*
     * Compare dates without comparing time-of-day.
     */
    const selectedDateKey =
      getDateKey(parsedDate);

    const todayDateKey =
      getDateKey(new Date());

    if (
      selectedDateKey <
      todayDateKey
    ) {
      throw createHttpError(
        'Tour date cannot be in the past.',
        400
      );
    }

    const available =
      tourPackage.availableDates.some(
        (date) =>
          getDateKey(date) ===
          selectedDateKey
      );

    if (!available) {
      throw createHttpError(
        'Selected tour date is not available.',
        400
      );
    }

    /*
     * The frontend displays an estimated total,
     * but the backend calculates the trusted amount.
     */
    const totalPrice =
      tourPackage.pricePerPerson *
      parsedGroupSize;

    const booking =
      await GuideBooking.create({
        travelerId: req.user._id,
        guideId: guide._id,
        packageId:
          tourPackage._id,
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
 * GET /api/v1/guide-bookings/me
 */
async function getMyGuideBookings(
  req,
  res,
  next
) {
  try {
    const bookings =
      await GuideBooking.find({
        travelerId: req.user._id,
      })
        .populate({
          path: 'guideId',
          populate: {
            path: 'userId',
            select:
              'name email profileImageUrl',
          },
        })
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      message:
        'Traveler guide bookings retrieved successfully.',
      data: {
        bookings,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * GET /api/v1/guide-bookings/received
 */
async function getReceivedGuideBookings(
  req,
  res,
  next
) {
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
      message:
        'Guide booking requests retrieved successfully.',
      data: {
        bookings,
      },
    });
  } catch (error) {
    return next(error);
  }
}

/*
 * PATCH /api/v1/guide-bookings/:bookingId/status
 *
 * Allowed lifecycle:
 *
 * pending   -> confirmed
 * pending   -> declined
 * confirmed -> completed
 */
async function updateGuideBookingStatus(
  req,
  res,
  next
) {
  try {
    const {
      bookingId,
    } = req.params;

    validateObjectId(
      bookingId,
      'Booking ID'
    );

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

    /*
     * Ownership is checked directly in the query.
     * A guide cannot modify another guide's booking.
     */
    const booking =
      await GuideBooking.findOne({
        _id: bookingId,
        guideId: guide._id,
      });

    if (!booking) {
      throw createHttpError(
        'Booking not found.',
        404
      );
    }

    const {
      bookingStatus,
    } = req.body;

    const allowedTransitions = {
      pending: [
        'confirmed',
        'declined',
      ],

      confirmed: [
        'completed',
      ],

      declined: [],
      cancelled: [],
      completed: [],
    };

    if (
      !allowedTransitions[
        booking.bookingStatus
      ]?.includes(
        bookingStatus
      )
    ) {
      throw createHttpError(
        `Cannot change booking from ${booking.bookingStatus} to ${bookingStatus}.`,
        400
      );
    }

    booking.bookingStatus =
      bookingStatus;

    await booking.save();

    /*
     * Keep traveler information available after
     * the frontend updates a booking card.
     */
    await booking.populate(
      'travelerId',
      'name email phone'
    );

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