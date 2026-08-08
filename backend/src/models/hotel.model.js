import mongoose from 'mongoose';

const roomTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room type name is required.'],
      trim: true,
      maxlength: [80, 'Room type name cannot exceed 80 characters.'],
    },
    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required.'],
      min: [0, 'Price per night cannot be negative.'],
    },
    capacity: {
      type: Number,
      required: [true, 'Room capacity is required.'],
      min: [1, 'Room capacity must be at least 1.'],
    },
    availableRooms: {
      type: Number,
      required: [true, 'Available room count is required.'],
      min: [0, 'Available room count cannot be negative.'],
    },
  },
  {
    _id: true,
  }
);

const hotelSchema = new mongoose.Schema(
  {
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Vendor ID is required.'],
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Hotel name is required.'],
      trim: true,
      maxlength: [120, 'Hotel name cannot exceed 120 characters.'],
    },
    location: {
      city: {
        type: String,
        required: [true, 'Hotel city is required.'],
        trim: true,
      },
      address: {
        type: String,
        required: [true, 'Hotel address is required.'],
        trim: true,
      },
    },
    description: {
      type: String,
      required: [true, 'Hotel description is required.'],
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters.'],
    },
    photos: {
      type: [String],
      default: [],
    },
    amenities: {
      type: [String],
      default: [],
    },
    roomTypes: {
      type: [roomTypeSchema],
      required: [true, 'At least one room type is required.'],
      validate: {
        validator(roomTypes) {
          return Array.isArray(roomTypes) && roomTypes.length > 0;
        },
        message: 'At least one room type is required.',
      },
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive'],
        message: 'Status must be active or inactive.',
      },
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

hotelSchema.index({
  'location.city': 1,
  name: 1,
});

const Hotel = mongoose.model('Hotel', hotelSchema);

export default Hotel;