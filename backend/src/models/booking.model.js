import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema(
  {
    hotelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hotel',
      required: [true, 'Hotel ID is required.'],
      index: true,
    },

    hotelName: {
      type: String,
      required: [true, 'Hotel name is required.'],
      trim: true,
    },

    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Vendor ID is required.'],
      index: true,
    },

    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Traveler ID is required.'],
      index: true,
    },

    roomTypeId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Room type ID is required.'],
    },

    roomTypeName: {
      type: String,
      required: [true, 'Room type name is required.'],
      trim: true,
    },

    checkInDate: {
      type: Date,
      required: [true, 'Check-in date is required.'],
    },

    checkOutDate: {
      type: Date,
      required: [true, 'Check-out date is required.'],
    },

    numberOfRooms: {
      type: Number,
      required: [true, 'Number of rooms is required.'],
      min: [1, 'At least one room must be booked.'],
    },

    numberOfGuests: {
      type: Number,
      required: [true, 'Number of guests is required.'],
      min: [1, 'At least one guest is required.'],
    },

    numberOfNights: {
      type: Number,
      required: [true, 'Number of nights is required.'],
      min: [1, 'The booking must be for at least one night.'],
    },

    pricePerNight: {
      type: Number,
      required: [true, 'Price per night is required.'],
      min: [0, 'Price per night cannot be negative.'],
    },

    totalPrice: {
      type: Number,
      required: [true, 'Total price is required.'],
      min: [0, 'Total price cannot be negative.'],
    },

    bookingStatus: {
      type: String,
      enum: {
        values: [
          'pending',
          'confirmed',
          'declined',
          'cancelled',
          'completed',
        ],
        message: 'Invalid booking status.',
      },
      default: 'pending',
    },

    paymentStatus: {
      type: String,
      enum: {
        values: ['unpaid', 'paid', 'failed', 'refunded'],
        message: 'Invalid payment status.',
      },
      default: 'unpaid',
    },
  },
  {
    timestamps: true,
  }
);

bookingSchema.index({
  vendorId: 1,
  createdAt: -1,
});

bookingSchema.index({
  travelerId: 1,
  createdAt: -1,
});

const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;