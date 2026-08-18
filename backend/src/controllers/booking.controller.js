import mongoose from 'mongoose';

import Booking from '../models/booking.model.js';
import Hotel from '../models/hotel.model.js';

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

function parseBookingDate(value, fieldName) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(
      `${fieldName} is invalid.`,
      400
    );
  }

  return date;
}

/*
 * ------------------------------------------------------------
 * CREATE HOTEL BOOKING
 * ------------------------------------------------------------
 *
 * Traveler-only booking creation.
 *
 * Important existing behavior:
 *
 * - traveler comes from req.user._id
 * - price is calculated on the backend
 * - date-specific room availability is calculated from
 *   overlapping pending/confirmed bookings
 * - new bookings begin:
 *
 *   bookingStatus = pending
 *   paymentStatus = unpaid
 */
async function createBooking(req, res, next) {
  try {
    const {
      hotelId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      numberOfRooms,
      numberOfGuests,
    } = req.body;

    validateObjectId(
      hotelId,
      'Hotel ID'
    );

    validateObjectId(
      roomTypeId,
      'Room type ID'
    );

    const parsedNumberOfRooms =
      Number(numberOfRooms);

    const parsedNumberOfGuests =
      Number(numberOfGuests);

    if (
      !Number.isInteger(
        parsedNumberOfRooms
      ) ||
      parsedNumberOfRooms < 1
    ) {
      throw createHttpError(
        'Number of rooms must be a positive integer.',
        400
      );
    }

    if (
      !Number.isInteger(
        parsedNumberOfGuests
      ) ||
      parsedNumberOfGuests < 1
    ) {
      throw createHttpError(
        'Number of guests must be a positive integer.',
        400
      );
    }

    const parsedCheckInDate =
      parseBookingDate(
        checkInDate,
        'Check-in date'
      );

    const parsedCheckOutDate =
      parseBookingDate(
        checkOutDate,
        'Check-out date'
      );

    if (
      parsedCheckOutDate <=
      parsedCheckInDate
    ) {
      throw createHttpError(
        'Check-out date must be after the check-in date.',
        400
      );
    }

    const hotel =
      await Hotel.findById(
        hotelId
      );

    if (
      !hotel ||
      hotel.status !== 'active'
    ) {
      throw createHttpError(
        'Active hotel listing not found.',
        404
      );
    }

    const roomType =
      hotel.roomTypes.id(
        roomTypeId
      );

    if (!roomType) {
      throw createHttpError(
        'Room type not found in this hotel.',
        404
      );
    }

    /*
     * Existing booking overlaps requested stay when:
     *
     * existing.checkInDate < requested.checkOutDate
     *
     * AND
     *
     * existing.checkOutDate > requested.checkInDate
     *
     * Only pending and confirmed bookings reserve inventory.
     *
     * Declining/cancelling a booking therefore releases that
     * reservation automatically from future calculations.
     */
    const overlappingBookings =
      await Booking.find({
        hotelId:
          hotel._id,

        roomTypeId:
          roomType._id,

        bookingStatus: {
          $in: [
            'pending',
            'confirmed',
          ],
        },

        checkInDate: {
          $lt:
            parsedCheckOutDate,
        },

        checkOutDate: {
          $gt:
            parsedCheckInDate,
        },
      }).select(
        'numberOfRooms'
      );

    const reservedRooms =
      overlappingBookings.reduce(
        (
          total,
          existingBooking
        ) =>
          total +
          existingBooking.numberOfRooms,
        0
      );

    const availableRoomsForDates =
      roomType.availableRooms -
      reservedRooms;

    if (
      availableRoomsForDates <
      parsedNumberOfRooms
    ) {
      throw createHttpError(
        `Only ${Math.max(
          availableRoomsForDates,
          0
        )} room(s) are available for the selected dates.`,
        400
      );
    }

    const maximumGuests =
      roomType.capacity *
      parsedNumberOfRooms;

    if (
      parsedNumberOfGuests >
      maximumGuests
    ) {
      throw createHttpError(
        `The selected rooms can accommodate a maximum of ${maximumGuests} guests.`,
        400
      );
    }

    const millisecondsPerDay =
      1000 * 60 * 60 * 24;

    const numberOfNights =
      Math.ceil(
        (
          parsedCheckOutDate -
          parsedCheckInDate
        ) /
          millisecondsPerDay
      );

    /*
     * The traveler does NOT choose totalPrice.
     *
     * The backend calculates it from trusted hotel pricing.
     */
    const totalPrice =
      roomType.pricePerNight *
      parsedNumberOfRooms *
      numberOfNights;

    const booking =
      await Booking.create({
        hotelId:
          hotel.id,

        hotelName:
          hotel.name,

        vendorId:
          hotel.vendorId,

        travelerId:
          req.user._id,

        roomTypeId:
          roomType.id,

        roomTypeName:
          roomType.name,

        checkInDate:
          parsedCheckInDate,

        checkOutDate:
          parsedCheckOutDate,

        numberOfRooms:
          parsedNumberOfRooms,

        numberOfGuests:
          parsedNumberOfGuests,

        numberOfNights,

        pricePerNight:
          roomType.pricePerNight,

        totalPrice,

        bookingStatus:
          'pending',

        paymentStatus:
          'unpaid',
      });

    res.status(201).json({
      success: true,

      message:
        'Hotel booking created successfully.',

      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
}

/*
 * ------------------------------------------------------------
 * GET HOTEL VENDOR BOOKINGS
 * ------------------------------------------------------------
 *
 * An approved hotel vendor sees only bookings whose vendorId
 * matches the authenticated account.
 *
 * paymentStatus is already included automatically because we
 * return the Booking documents themselves.
 */
async function getVendorBookings(
  req,
  res,
  next
) {
  try {
    const bookings =
      await Booking.find({
        vendorId:
          req.user._id,
      })
        .populate(
          'travelerId',
          'name email phone profileImageUrl'
        )
        .sort({
          createdAt: -1,
        });

    res.status(200).json({
      success: true,

      message:
        'Vendor bookings retrieved successfully.',

      data: {
        count:
          bookings.length,

        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
}

/*
 * ------------------------------------------------------------
 * GET TRAVELER BOOKINGS
 * ------------------------------------------------------------
 */
async function getTravelerBookings(
  req,
  res,
  next
) {
  try {
    const bookings =
      await Booking.find({
        travelerId:
          req.user._id,
      }).sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,

      message:
        'Traveler bookings retrieved successfully.',

      data: {
        count:
          bookings.length,

        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
}

/*
 * ------------------------------------------------------------
 * GET ONE BOOKING
 * ------------------------------------------------------------
 *
 * Hotel:
 * may access only a booking belonging to that vendor.
 *
 * Traveler:
 * may access only their own booking.
 */
async function getBookingById(
  req,
  res,
  next
) {
  try {
    const { bookingId } =
      req.params;

    validateObjectId(
      bookingId,
      'Booking ID'
    );

    let filter = {
      _id:
        bookingId,
    };

    if (
      req.user.role ===
      'hotel'
    ) {
      filter = {
        ...filter,

        vendorId:
          req.user._id,
      };
    } else if (
      req.user.role ===
      'traveler'
    ) {
      filter = {
        ...filter,

        travelerId:
          req.user._id,
      };
    } else {
      throw createHttpError(
        'You are not allowed to access this booking.',
        403
      );
    }

    const booking =
      await Booking.findOne(
        filter
      ).populate(
        'travelerId',
        'name email phone profileImageUrl'
      );

    if (!booking) {
      throw createHttpError(
        'Booking not found.',
        404
      );
    }

    res.status(200).json({
      success: true,

      message:
        'Booking retrieved successfully.',

      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
}

/*
 * ------------------------------------------------------------
 * UPDATE BOOKING STATUS - HOTEL VENDOR
 * ------------------------------------------------------------
 *
 * Approved hotel vendors use this endpoint to manage incoming
 * reservation requests.
 *
 * Supported transitions:
 *
 * pending
 *   -> confirmed
 *   -> declined
 *
 * confirmed
 *   -> completed
 *
 * We intentionally prevent arbitrary jumps such as:
 *
 * pending -> completed
 * declined -> confirmed
 * completed -> pending
 *
 * This keeps the booking lifecycle predictable.
 */
async function updateVendorBookingStatus(
  req,
  res,
  next
) {
  try {
    const { bookingId } =
      req.params;

    const {
      bookingStatus,
    } = req.body;

    validateObjectId(
      bookingId,
      'Booking ID'
    );

    /*
     * Only statuses that a hotel vendor is allowed to set
     * through this endpoint are accepted.
     *
     * "cancelled" is intentionally not included here because
     * cancellation is conceptually a different action from
     * hotel approval/rejection/completion.
     */
    const vendorStatuses =
      new Set([
        'confirmed',
        'declined',
        'completed',
      ]);

    if (
      !vendorStatuses.has(
        bookingStatus
      )
    ) {
      throw createHttpError(
        'Booking status must be confirmed, declined, or completed.',
        400
      );
    }

    /*
     * Ownership protection:
     *
     * The query contains BOTH:
     *
     * booking ID
     * vendor ID
     *
     * Therefore one hotel vendor cannot modify another
     * vendor's booking by manually changing the URL.
     */
    const booking =
      await Booking.findOne({
        _id:
          bookingId,

        vendorId:
          req.user._id,
      });

    if (!booking) {
      throw createHttpError(
        'Booking not found.',
        404
      );
    }

    /*
     * Define exactly which state changes are allowed.
     */
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

    const allowedNextStatuses =
      allowedTransitions[
        booking.bookingStatus
      ] ?? [];

    if (
      !allowedNextStatuses.includes(
        bookingStatus
      )
    ) {
      throw createHttpError(
        `Booking cannot change from ${booking.bookingStatus} to ${bookingStatus}.`,
        409
      );
    }

    booking.bookingStatus =
      bookingStatus;

    await booking.save();

    /*
     * Populate traveler information again so the frontend can
     * update its table using the same shape returned by
     * getVendorBookings().
     */
    await booking.populate(
      'travelerId',
      'name email phone profileImageUrl'
    );

    res.status(200).json({
      success: true,

      message:
        `Booking ${bookingStatus} successfully.`,

      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
}

export {
  createBooking,
  getBookingById,
  getTravelerBookings,
  getVendorBookings,
  updateVendorBookingStatus,
};