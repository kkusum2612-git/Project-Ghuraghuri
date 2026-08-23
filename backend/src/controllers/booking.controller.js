import mongoose from 'mongoose';

import Booking from '../models/booking.model.js';
import Hotel from '../models/hotel.model.js';

/*
 * ============================================================
 * RAFI FEATURE 3 - PREMIUM BOOKING PRICING
 * ============================================================
 *
 * The hotel booking controller remains responsible for creating
 * the Booking document.
 *
 * Rafi's booking-reward service is responsible only for deciding:
 *
 *   - whether the traveler is Premium
 *   - whether the Premium base discount applies
 *   - whether reward points should be used
 *   - how many points must be temporarily reserved
 *   - what the final payable total should be
 *
 *
 * Keeping this logic inside a separate service prevents the
 * existing hotel-booking controller from becoming overloaded
 * with reward mathematics.
 */
import {
  prepareBookingRewardPricing,
  releasePreparedRewardReservation,
} from '../services/booking-reward.service.js';

import {
  releaseBookingRewardReservation,
} from '../services/reward.service.js';


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


function parseBookingDate(
  value,
  fieldName
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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
 *
 * EXISTING BEHAVIOR THAT REMAINS UNCHANGED:
 *
 * - traveler comes from req.user._id
 * - room price comes from the Hotel document
 * - dates are validated on the backend
 * - room availability is calculated from overlapping bookings
 * - guest capacity is validated
 * - new bookings begin:
 *
 *     bookingStatus = pending
 *     paymentStatus = unpaid
 *
 *
 * RAFI FEATURE 3 ADDS:
 *
 * - Premium membership detection
 * - Premium base discount
 * - optional reward-point use
 * - temporary reward-point reservation
 * - pricing snapshot stored inside Booking
 *
 *
 * IMPORTANT:
 *
 * The frontend NEVER sends the final price.
 *
 * The backend still calculates everything from trusted data.
 */
async function createBooking(
  req,
  res,
  next
) {
  /*
   * ----------------------------------------------------------
   * RAFI FEATURE 3 - ROLLBACK INFORMATION
   * ----------------------------------------------------------
   *
   * Reward points may be temporarily reserved BEFORE the Booking
   * document itself is inserted.
   *
   *
   * Example:
   *
   * 1. Reserve 1000 reward points.
   * 2. MongoDB Booking.create() unexpectedly fails.
   *
   *
   * If we did nothing, those 1000 points would remain reserved
   * even though no booking exists.
   *
   * Therefore we keep the prepared pricing result outside the
   * try block so the catch block can safely undo the reservation.
   */
  let preparedPricing =
    null;


  try {
    const {
      hotelId,
      roomTypeId,
      checkInDate,
      checkOutDate,
      numberOfRooms,
      numberOfGuests,

      /*
       * Rafi Feature 3.
       *
       * The frontend will later send:
       *
       *   useRewardPoints: true
       *
       * only when a Premium traveler explicitly chooses to use
       * reward points.
       *
       *
       * If the current frontend does not send this field yet,
       * it is undefined and therefore behaves exactly like false.
       */
      useRewardPoints = false,
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


    /*
     * --------------------------------------------------------
     * LOAD TRUSTED HOTEL INFORMATION
     * --------------------------------------------------------
     *
     * The frontend cannot invent:
     *
     *   hotel price
     *   room capacity
     *   available room quantity
     *
     * Everything comes from MongoDB.
     */
    const hotel =
      await Hotel.findById(
        hotelId
      );


    if (
      !hotel ||
      hotel.status !==
        'active'
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
     * ========================================================
     * EXISTING ROOM AVAILABILITY LOGIC
     * ========================================================
     *
     * This logic belongs to Kusum/Fatema's hotel booking feature
     * and remains unchanged.
     *
     *
     * Existing booking overlaps requested stay when:
     *
     * existing.checkInDate < requested.checkOutDate
     *
     * AND
     *
     * existing.checkOutDate > requested.checkInDate
     *
     *
     * Only:
     *
     * pending
     * confirmed
     *
     * bookings reserve inventory.
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


    /*
     * Existing room-capacity validation.
     */
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


    /*
     * --------------------------------------------------------
     * NUMBER OF NIGHTS
     * --------------------------------------------------------
     *
     * This is the same calculation used previously.
     */
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
     * ========================================================
     * RAFI FEATURE 3 - ORIGINAL TRUSTED BOOKING PRICE
     * ========================================================
     *
     * Previously this value was immediately stored as:
     *
     *   totalPrice
     *
     *
     * Now we first call it:
     *
     *   originalTotalPrice
     *
     *
     * because Premium discounts may reduce the final payable
     * totalPrice.
     *
     *
     * The calculation itself remains exactly the same:
     *
     * price per night
     * × rooms
     * × nights
     */
    const originalTotalPrice =
      roomType.pricePerNight *
      parsedNumberOfRooms *
      numberOfNights;


    /*
     * ========================================================
     * RAFI FEATURE 3 - PREPARE PREMIUM / REWARD PRICING
     * ========================================================
     *
     * Possible results:
     *
     *
     * NORMAL TRAVELER
     * --------------------------------------------------------
     *
     * originalTotalPrice = 10000
     * totalPrice         = 10000
     * discount           = 0
     *
     *
     * PREMIUM WITHOUT REWARD USE
     * --------------------------------------------------------
     *
     * originalTotalPrice = 10000
     * Premium base       = 5%
     * totalPrice         = 9500
     *
     *
     * PREMIUM WITH REWARD USE
     * --------------------------------------------------------
     *
     * originalTotalPrice = 10000
     * Premium base       = 5%
     * reward discount    = 10%
     * total              = 15%
     * totalPrice         = 8500
     *
     *
     * Any reward points required for that discount are only
     * TEMPORARILY reserved here.
     */
    preparedPricing =
      await prepareBookingRewardPricing({
        travelerId:
          req.user._id,

        originalTotalPrice,

        /*
         * Only the literal boolean true activates reward use.
         *
         * A malformed value such as:
         *
         * "true"
         *
         * does not silently activate point redemption.
         */
        useRewardPoints:
          useRewardPoints ===
          true,
      });


    /*
     * ========================================================
     * CREATE BOOKING
     * ========================================================
     *
     * Existing hotel-booking information is preserved.
     *
     * Rafi's new fields simply describe the pricing calculation
     * used for this booking.
     */
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


        /*
         * ----------------------------------------------
         * RAFI FEATURE 3 - PRICE SNAPSHOT
         * ----------------------------------------------
         */
        originalTotalPrice:
          preparedPricing.originalTotalPrice,

        totalPrice:
          preparedPricing.totalPrice,

        isPremiumBooking:
          preparedPricing.isPremiumBooking,

        premiumMembershipId:
          preparedPricing.premiumMembershipId,

        premiumBaseDiscountPercent:
          preparedPricing.premiumBaseDiscountPercent,

        rewardDiscountPercent:
          preparedPricing.rewardDiscountPercent,

        totalDiscountPercent:
          preparedPricing.totalDiscountPercent,

        discountAmount:
          preparedPricing.discountAmount,


        /*
         * ----------------------------------------------
         * RAFI FEATURE 3 - REWARD RESERVATION SNAPSHOT
         * ----------------------------------------------
         */
        rewardPointsReserved:
          preparedPricing.rewardPointsReserved,

        rewardRedemptionStatus:
          preparedPricing.rewardRedemptionStatus,

        rewardReservedAt:
          preparedPricing.rewardReservedAt,


        /*
         * Existing booking lifecycle remains unchanged.
         */
        bookingStatus:
          'pending',

        paymentStatus:
          'unpaid',
      });


    /*
     * --------------------------------------------------------
     * SUCCESS
     * --------------------------------------------------------
     *
     * We return the complete Booking document just like before.
     *
     * The frontend can therefore later display:
     *
     *   originalTotalPrice
     *   discountAmount
     *   totalPrice
     *   rewardPointsReserved
     *
     * without another pricing request.
     */
    return res.status(201).json({
      success: true,

      message:
        'Hotel booking created successfully.',

      data: {
        booking,
      },
    });
  } catch (error) {
    /*
     * ========================================================
     * RAFI FEATURE 3 - RESERVATION ROLLBACK
     * ========================================================
     *
     * We only need rollback when:
     *
     *   prepareBookingRewardPricing()
     *
     * successfully reserved points, but something later failed
     * before the Booking document was created.
     *
     *
     * Example:
     *
     * membership:
     *
     * reservedRewardPoints
     * 0 -> 1000
     *
     * Booking.create()
     *      ↓
     * unexpected database failure
     *
     *
     * We release:
     *
     * 1000 -> 0
     *
     *
     * The original booking error should still be reported.
     */
    if (
      preparedPricing
        ?.reservationWasCreated &&
      preparedPricing
        ?.reservationMembershipId &&
      preparedPricing
        ?.rewardPointsReserved >
        0
    ) {
      try {
        await releasePreparedRewardReservation({
          membershipId:
            preparedPricing
              .reservationMembershipId,

          pointsToRelease:
            preparedPricing
              .rewardPointsReserved,
        });
      } catch (
        rollbackError
      ) {
        /*
         * Do not replace the ORIGINAL booking error with a
         * secondary rollback error.
         *
         * We log it so the issue is still visible during
         * development.
         */
        console.error(
          'Failed to roll back reward-point reservation:',
          rollbackError
        );
      }
    }


    return next(error);
  }
}


/*
 * ------------------------------------------------------------
 * GET HOTEL VENDOR BOOKINGS
 * ------------------------------------------------------------
 *
 * Existing behavior remains unchanged.
 *
 * The newly-added Premium pricing fields are automatically
 * included because Booking documents are returned normally.
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


    return res.status(200).json({
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
    return next(error);
  }
}


/*
 * ------------------------------------------------------------
 * GET TRAVELER BOOKINGS
 * ------------------------------------------------------------
 *
 * Existing behavior remains unchanged.
 *
 * Premium pricing information is automatically available inside
 * each returned Booking document.
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


    return res.status(200).json({
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
    return next(error);
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
 *
 * This existing authorization logic remains unchanged.
 */
async function getBookingById(
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


    return res.status(200).json({
      success: true,

      message:
        'Booking retrieved successfully.',

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
 * UPDATE BOOKING STATUS - HOTEL VENDOR
 * ------------------------------------------------------------
 *
 * Existing vendor-booking behavior is preserved in this step.
 *
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
 *
 * Reward reservation RELEASE for a declined booking will be
 * connected during Step 11 together with successful-payment
 * settlement.
 *
 * Keeping both settlement directions together makes the reward
 * lifecycle easier to understand:
 *
 * reserved
 *    -> redeemed on successful payment
 *
 * reserved
 *    -> released if the booking can no longer be paid
 */
async function updateVendorBookingStatus(
  req,
  res,
  next
) {
  try {
    const {
      bookingId,
    } = req.params;


    const {
      bookingStatus,
    } = req.body;


    validateObjectId(
      bookingId,
      'Booking ID'
    );


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
     * The query contains both:
     *
     * booking ID
     * vendor ID
     *
     * so one vendor cannot change another vendor's reservation.
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
     *
     * This existing booking lifecycle remains unchanged.
     */
    const allowedTransitions = {
      pending: [
        'confirmed',
        'declined',
      ],

      confirmed: [
        'completed',
      ],

      declined:
        [],

      cancelled:
        [],

      completed:
        [],
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
 * ========================================================
 * RAFI FEATURE 3 - RELEASE RESERVED POINTS ON DECLINE
 * ========================================================
 *
 * A declined booking can no longer proceed to payment.
 *
 *
 * Therefore if it had:
 *
 *   rewardRedemptionStatus = reserved
 *
 * those temporary points must become available again.
 *
 *
 * IMPORTANT:
 *
 * We do NOT create a negative RewardLedger entry.
 *
 * The traveler never actually spent the points.
 */
if (
  bookingStatus ===
  'declined'
) {
  await releaseBookingRewardReservation(
    booking
  );
}


/*
 * Populate traveler information again so the frontend can
 * update its table using the same shape returned by
 * getVendorBookings().
 */
await booking.populate(
  'travelerId',
  'name email phone profileImageUrl'
);


    /*
     * Populate traveler information again so the frontend can
     * update its table using the same shape returned by
     * getVendorBookings().
     */
    await booking.populate(
      'travelerId',
      'name email phone profileImageUrl'
    );


    return res.status(200).json({
      success: true,

      message:
        `Booking ${bookingStatus} successfully.`,

      data: {
        booking,
      },
    });
  } catch (error) {
    return next(error);
  }
}


export {
  createBooking,
  getBookingById,
  getTravelerBookings,
  getVendorBookings,
  updateVendorBookingStatus,
};