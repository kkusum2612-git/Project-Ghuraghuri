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
    throw createHttpError(`${fieldName} is invalid.`, 400);
  }
}

function parseBookingDate(value, fieldName) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createHttpError(`${fieldName} is invalid.`, 400);
  }

  return date;
}

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

    validateObjectId(hotelId, 'Hotel ID');
    validateObjectId(roomTypeId, 'Room type ID');

    const parsedNumberOfRooms = Number(numberOfRooms);
    const parsedNumberOfGuests = Number(numberOfGuests);

    if (
      !Number.isInteger(parsedNumberOfRooms) ||
      parsedNumberOfRooms < 1
    ) {
      throw createHttpError(
        'Number of rooms must be a positive integer.',
        400
      );
    }

    if (
      !Number.isInteger(parsedNumberOfGuests) ||
      parsedNumberOfGuests < 1
    ) {
      throw createHttpError(
        'Number of guests must be a positive integer.',
        400
      );
    }

    const parsedCheckInDate = parseBookingDate(
      checkInDate,
      'Check-in date'
    );

    const parsedCheckOutDate = parseBookingDate(
      checkOutDate,
      'Check-out date'
    );

    if (parsedCheckOutDate <= parsedCheckInDate) {
      throw createHttpError(
        'Check-out date must be after the check-in date.',
        400
      );
    }

    const hotel = await Hotel.findById(hotelId);

    if (!hotel || hotel.status !== 'active') {
      throw createHttpError(
        'Active hotel listing not found.',
        404
      );
    }

    const roomType = hotel.roomTypes.id(roomTypeId);

    if (!roomType) {
      throw createHttpError(
        'Room type not found in this hotel.',
        404
      );
    }

    const overlappingBookings = await Booking.find({
      hotelId: hotel._id,
      roomTypeId: roomType._id,

      bookingStatus: {
        $in: [
          'pending',
          'confirmed',
        ],
      },

      // Existing booking begins before the requested stay ends.
      checkInDate: {
        $lt: parsedCheckOutDate,
      },

      // Existing booking ends after the requested stay begins.
      checkOutDate: {
        $gt: parsedCheckInDate,
      },
    }).select('numberOfRooms');

    const reservedRooms = overlappingBookings.reduce(
      (total, existingBooking) =>
        total + existingBooking.numberOfRooms,
      0
    );

    const availableRoomsForDates =
      roomType.availableRooms - reservedRooms;

    if (
      availableRoomsForDates < parsedNumberOfRooms
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
      roomType.capacity * parsedNumberOfRooms;

    if (parsedNumberOfGuests > maximumGuests) {
      throw createHttpError(
        `The selected rooms can accommodate a maximum of ${maximumGuests} guests.`,
        400
      );
    }

    const millisecondsPerDay = 1000 * 60 * 60 * 24;

    const numberOfNights = Math.ceil(
      (parsedCheckOutDate - parsedCheckInDate) /
        millisecondsPerDay
    );

    const totalPrice =
      roomType.pricePerNight *
      parsedNumberOfRooms *
      numberOfNights;

    const booking = await Booking.create({
      hotelId: hotel.id,
      hotelName: hotel.name,
      vendorId: hotel.vendorId,

      // Traveler now comes from authentication.
      travelerId: req.user._id,

      roomTypeId: roomType.id,
      roomTypeName: roomType.name,
      checkInDate: parsedCheckInDate,
      checkOutDate: parsedCheckOutDate,
      numberOfRooms: parsedNumberOfRooms,
      numberOfGuests: parsedNumberOfGuests,
      numberOfNights,
      pricePerNight: roomType.pricePerNight,
      totalPrice,
      bookingStatus: 'pending',
      paymentStatus: 'unpaid',
    });

    res.status(201).json({
      success: true,
      message: 'Hotel booking created successfully.',
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getVendorBookings(req, res, next) {
  try {
    const bookings = await Booking.find({
      vendorId: req.user._id,
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
      message: 'Vendor bookings retrieved successfully.',
      data: {
        count: bookings.length,
        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getTravelerBookings(req, res, next) {
  try {
    const bookings = await Booking.find({
      travelerId: req.user._id,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: 'Traveler bookings retrieved successfully.',
      data: {
        count: bookings.length,
        bookings,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getBookingById(req, res, next) {
  try {
    const { bookingId } = req.params;

    validateObjectId(bookingId, 'Booking ID');

    let filter = {
      _id: bookingId,
    };

    if (req.user.role === 'hotel') {
      filter = {
        ...filter,
        vendorId: req.user._id,
      };
    } else if (req.user.role === 'traveler') {
      filter = {
        ...filter,
        travelerId: req.user._id,
      };
    } else {
      throw createHttpError(
        'You are not allowed to access this booking.',
        403
      );
    }

    const booking = await Booking.findOne(filter).populate(
      'travelerId',
      'name email phone profileImageUrl'
    );

    if (!booking) {
      throw createHttpError('Booking not found.', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Booking retrieved successfully.',
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
};