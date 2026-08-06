import mongoose from 'mongoose';
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

function parsePrice(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue) || parsedValue < 0) {
    throw createHttpError(
      `${fieldName} must be a non-negative number.`,
      400
    );
  }

  return parsedValue;
}

async function createHotel(req, res, next) {
  try {
    const hotel = await Hotel.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Hotel listing created successfully.',
      data: {
        hotel,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getHotels(req, res, next) {
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
            $regex: location,
            $options: 'i',
          },
        },
        {
          'location.address': {
            $regex: location,
            $options: 'i',
          },
        },
      ];
    }

    const roomFilter = {};

    if (roomType) {
      roomFilter.name = {
        $regex: roomType,
        $options: 'i',
      };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      roomFilter.pricePerNight = {};

      if (minPrice !== undefined) {
        roomFilter.pricePerNight.$gte = parsePrice(
          minPrice,
          'Minimum price'
        );
      }

      if (maxPrice !== undefined) {
        roomFilter.pricePerNight.$lte = parsePrice(
          maxPrice,
          'Maximum price'
        );
      }

      if (
        roomFilter.pricePerNight.$gte !== undefined &&
        roomFilter.pricePerNight.$lte !== undefined &&
        roomFilter.pricePerNight.$gte > roomFilter.pricePerNight.$lte
      ) {
        throw createHttpError(
          'Minimum price cannot be greater than maximum price.',
          400
        );
      }
    }

    if (Object.keys(roomFilter).length > 0) {
      filter.roomTypes = {
        $elemMatch: roomFilter,
      };
    }

    const hotels = await Hotel.find(filter).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: 'Hotel listings retrieved successfully.',
      data: {
        count: hotels.length,
        hotels,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getVendorHotels(req, res, next) {
  try {
    const { vendorId } = req.params;

    validateObjectId(vendorId, 'Vendor ID');

    const hotels = await Hotel.find({
      vendorId,
    }).sort({
      createdAt: -1,
    });

    res.status(200).json({
      success: true,
      message: 'Vendor hotel listings retrieved successfully.',
      data: {
        count: hotels.length,
        hotels,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function getHotelById(req, res, next) {
  try {
    const { hotelId } = req.params;

    validateObjectId(hotelId, 'Hotel ID');

    const hotel = await Hotel.findById(hotelId);

    if (!hotel) {
      throw createHttpError('Hotel listing not found.', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Hotel listing retrieved successfully.',
      data: {
        hotel,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function updateHotel(req, res, next) {
  try {
    const { hotelId } = req.params;

    validateObjectId(hotelId, 'Hotel ID');

    const hotel = await Hotel.findByIdAndUpdate(
      hotelId,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    if (!hotel) {
      throw createHttpError('Hotel listing not found.', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Hotel listing updated successfully.',
      data: {
        hotel,
      },
    });
  } catch (error) {
    next(error);
  }
}

async function deleteHotel(req, res, next) {
  try {
    const { hotelId } = req.params;

    validateObjectId(hotelId, 'Hotel ID');

    const hotel = await Hotel.findByIdAndDelete(hotelId);

    if (!hotel) {
      throw createHttpError('Hotel listing not found.', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Hotel listing deleted successfully.',
      data: {
        deletedHotelId: hotel.id,
      },
    });
  } catch (error) {
    next(error);
  }
}

export {
  createHotel,
  deleteHotel,
  getHotelById,
  getHotels,
  getVendorHotels,
  updateHotel,
};