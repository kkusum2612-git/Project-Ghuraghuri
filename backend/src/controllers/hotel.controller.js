import mongoose from 'mongoose';

import Booking from '../models/booking.model.js';
import Hotel from '../models/hotel.model.js';
import HotelReview from '../models/hotelReview.model.js';

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

function parsePrice(value, fieldName) {
  const parsedValue = Number(value);

  if (
    !Number.isFinite(parsedValue) ||
    parsedValue < 0
  ) {
    throw createHttpError(
      `${fieldName} must be a non-negative number.`,
      400
    );
  }

  return parsedValue;
}

/*
 * ------------------------------------------------------------
 * HOTEL RATING SUMMARY
 * ------------------------------------------------------------
 *
 * Reviews are stored separately in HotelReview.
 *
 * Rather than saving duplicated average-rating values inside
 * Hotel, we calculate the current average from actual reviews.
 *
 * This keeps the Review collection as the source of truth.
 */
async function getRatingSummariesForHotels(
  hotelIds
) {
  if (
    !Array.isArray(hotelIds) ||
    hotelIds.length === 0
  ) {
    return new Map();
  }

  const summaries =
    await HotelReview.aggregate([
      {
        $match: {
          hotelId: {
            $in: hotelIds,
          },
        },
      },
      {
        $group: {
          _id: '$hotelId',

          averageRating: {
            $avg: '$rating',
          },

          reviewCount: {
            $sum: 1,
          },
        },
      },
    ]);

  const summaryMap =
    new Map();

  summaries.forEach(
    (summary) => {
      summaryMap.set(
        String(summary._id),
        {
          averageRating:
            Number(
              summary.averageRating.toFixed(
                1
              )
            ),

          reviewCount:
            summary.reviewCount,
        }
      );
    }
  );

  return summaryMap;
}

/*
 * Add averageRating and reviewCount to hotel responses
 * without changing the Hotel database schema.
 */
function addRatingSummary(
  hotel,
  summaryMap
) {
  const hotelObject =
    hotel.toObject();

  const ratingSummary =
    summaryMap.get(
      String(hotel._id)
    ) || {
      averageRating: 0,
      reviewCount: 0,
    };

  return {
    ...hotelObject,
    ...ratingSummary,
  };
}

const HOTEL_MUTABLE_FIELDS = [
  'name',
  'location',
  'description',
  'photos',
  'amenities',
  'roomTypes',
  'status',
];

function pickHotelFields(body) {
  const hotelData = {};

  HOTEL_MUTABLE_FIELDS.forEach(
    (field) => {
      if (
        body[field] !==
        undefined
      ) {
        hotelData[field] =
          body[field];
      }
    }
  );

  return hotelData;
}

async function createHotel(
  req,
  res,
  next
) {
  try {
    const hotelData =
      pickHotelFields(
        req.body
      );

    const hotel =
      await Hotel.create({
        ...hotelData,

        // Never trust a vendor ID supplied by the frontend.
        // The authenticated hotel account becomes the owner.
        vendorId:
          req.user._id,
      });

    res.status(201).json({
      success: true,
      message:
        'Hotel listing created successfully.',
      data: {
        hotel,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getHotels(
  req,
  res,
  next
) {
  try {
    const {
      location,
      roomType,
      minPrice,
      maxPrice,
    } = req.query;

    const filter = {
      status: 'active',
    };

    if (location) {
      filter.$or = [
        {
          'location.city': {
            $regex:
              location,

            $options:
              'i',
          },
        },
        {
          'location.address': {
            $regex:
              location,

            $options:
              'i',
          },
        },
      ];
    }

    const roomFilter = {};

    if (roomType) {
      roomFilter.name = {
        $regex:
          roomType,

        $options:
          'i',
      };
    }

    if (
      minPrice !==
        undefined ||
      maxPrice !==
        undefined
    ) {
      roomFilter.pricePerNight =
        {};

      if (
        minPrice !==
        undefined
      ) {
        roomFilter.pricePerNight.$gte =
          parsePrice(
            minPrice,
            'Minimum price'
          );
      }

      if (
        maxPrice !==
        undefined
      ) {
        roomFilter.pricePerNight.$lte =
          parsePrice(
            maxPrice,
            'Maximum price'
          );
      }

      if (
        roomFilter
          .pricePerNight
          .$gte !==
          undefined &&
        roomFilter
          .pricePerNight
          .$lte !==
          undefined &&
        roomFilter
          .pricePerNight
          .$gte >
          roomFilter
            .pricePerNight
            .$lte
      ) {
        throw createHttpError(
          'Minimum price cannot be greater than maximum price.',
          400
        );
      }
    }

    if (
      Object.keys(
        roomFilter
      ).length > 0
    ) {
      filter.roomTypes = {
        $elemMatch:
          roomFilter,
      };
    }

    const hotels =
      await Hotel.find(
        filter
      ).sort({
        createdAt: -1,
      });

    /*
     * Fetch rating summaries for every hotel in one aggregate
     * query instead of making one database query per hotel.
     */
    const ratingSummaryMap =
      await getRatingSummariesForHotels(
        hotels.map(
          (hotel) =>
            hotel._id
        )
      );

    const hotelsWithRatings =
      hotels.map(
        (hotel) =>
          addRatingSummary(
            hotel,
            ratingSummaryMap
          )
      );

    res.status(200).json({
      success: true,

      message:
        'Hotel listings retrieved successfully.',

      data: {
        count:
          hotelsWithRatings.length,

        hotels:
          hotelsWithRatings,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getVendorHotels(
  req,
  res,
  next
) {
  try {
    const hotels =
      await Hotel.find({
        vendorId:
          req.user._id,
      }).sort({
        createdAt: -1,
      });

    res.status(200).json({
      success: true,

      message:
        'Vendor hotel listings retrieved successfully.',

      data: {
        count:
          hotels.length,

        hotels,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getVendorHotelById(
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

        vendorId:
          req.user._id,
      });

    if (!hotel) {
      throw createHttpError(
        'Hotel listing not found.',
        404
      );
    }

    res.status(200).json({
      success: true,

      message:
        'Vendor hotel listing retrieved successfully.',

      data: {
        hotel,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getHotelById(
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

        status:
          'active',
      });

    if (!hotel) {
      throw createHttpError(
        'Hotel listing not found.',
        404
      );
    }

    const ratingSummaryMap =
      await getRatingSummariesForHotels(
        [hotel._id]
      );

    const hotelWithRating =
      addRatingSummary(
        hotel,
        ratingSummaryMap
      );

    res.status(200).json({
      success: true,

      message:
        'Hotel listing retrieved successfully.',

      data: {
        hotel:
          hotelWithRating,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getHotelAvailability(
  req,
  res,
  next
) {
  try {
    const { hotelId } =
      req.params;

    const {
      checkInDate,
      checkOutDate,
    } = req.query;

    validateObjectId(
      hotelId,
      'Hotel ID'
    );

    if (
      !checkInDate ||
      !checkOutDate
    ) {
      throw createHttpError(
        'Check-in date and check-out date are required.',
        400
      );
    }

    const parsedCheckInDate =
      new Date(
        checkInDate
      );

    const parsedCheckOutDate =
      new Date(
        checkOutDate
      );

    if (
      Number.isNaN(
        parsedCheckInDate.getTime()
      )
    ) {
      throw createHttpError(
        'Check-in date is invalid.',
        400
      );
    }

    if (
      Number.isNaN(
        parsedCheckOutDate.getTime()
      )
    ) {
      throw createHttpError(
        'Check-out date is invalid.',
        400
      );
    }

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
      await Hotel.findOne({
        _id: hotelId,

        status:
          'active',
      });

    if (!hotel) {
      throw createHttpError(
        'Hotel listing not found.',
        404
      );
    }

    const overlappingBookings =
      await Booking.find({
        hotelId:
          hotel._id,

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
        'roomTypeId numberOfRooms'
      );

    const reservedRoomsByType =
      {};

    overlappingBookings.forEach(
      (booking) => {
        const roomTypeId =
          booking.roomTypeId.toString();

        reservedRoomsByType[
          roomTypeId
        ] =
          (
            reservedRoomsByType[
              roomTypeId
            ] || 0
          ) +
          booking.numberOfRooms;
      }
    );

    const roomTypes =
      hotel.roomTypes.map(
        (roomType) => {
          const reservedRooms =
            reservedRoomsByType[
              roomType._id.toString()
            ] || 0;

          return {
            roomTypeId:
              roomType._id,

            name:
              roomType.name,

            pricePerNight:
              roomType.pricePerNight,

            capacity:
              roomType.capacity,

            totalRooms:
              roomType.availableRooms,

            reservedRooms,

            availableRooms:
              Math.max(
                roomType.availableRooms -
                  reservedRooms,
                0
              ),
          };
        }
      );

    res.status(200).json({
      success: true,

      message:
        'Hotel room availability retrieved successfully.',

      data: {
        hotelId:
          hotel._id,

        checkInDate:
          parsedCheckInDate,

        checkOutDate:
          parsedCheckOutDate,

        roomTypes,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateHotel(
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

    const updates =
      pickHotelFields(
        req.body
      );

    const hotel =
      await Hotel.findOneAndUpdate(
        {
          _id:
            hotelId,

          vendorId:
            req.user._id,
        },

        updates,

        {
          new: true,
          runValidators: true,
        }
      );

    if (!hotel) {
      throw createHttpError(
        'Hotel listing not found.',
        404
      );
    }

    res.status(200).json({
      success: true,

      message:
        'Hotel listing updated successfully.',

      data: {
        hotel,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteHotel(
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
      await Hotel.findOneAndDelete({
        _id:
          hotelId,

        vendorId:
          req.user._id,
      });

    if (!hotel) {
      throw createHttpError(
        'Hotel listing not found.',
        404
      );
    }

    res.status(200).json({
      success: true,

      message:
        'Hotel listing deleted successfully.',

      data: {
        deletedHotelId:
          hotel.id,
      },
    });
  } catch (error) {
    next(error);
  }
}

export {
  createHotel,
  deleteHotel,
  getHotelAvailability,
  getHotelById,
  getHotels,
  getVendorHotelById,
  getVendorHotels,
  updateHotel,
};