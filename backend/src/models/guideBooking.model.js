import mongoose from 'mongoose';

/*
 * ------------------------------------------------------------
 * GUIDE BOOKING MODEL
 * ------------------------------------------------------------
 *
 * Stores traveler bookings for guide tour packages.
 *
 * Guide packages are embedded inside Guide documents, so this
 * model stores references to:
 *
 * - traveler
 * - guide
 * - selected package
 *
 * Snapshot fields are stored because guides may change package
 * information later.
 * ------------------------------------------------------------
 */

const BOOKING_STATUSES = [
  'pending',
  'confirmed',
  'declined',
  'cancelled',
  'completed',
];

const PAYMENT_STATUSES = [
  'unpaid',
  'paid',
  'failed',
  'refunded',
];


const guideBookingSchema = new mongoose.Schema(
  {
    travelerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Traveler ID is required.'],
    },

    guideId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Guide',
      required: [true, 'Guide ID is required.'],
    },

    packageId: {
      type: mongoose.Schema.Types.ObjectId,
      required: [true, 'Package ID is required.'],
    },

    /*
     * Snapshot information.
     *
     * Keeps old bookings accurate even if a guide edits
     * package details later.
     */
    packageName: {
      type: String,
      required: [true, 'Package name is required.'],
      trim: true,
    },

    pricePerPerson: {
      type: Number,
      required: [true, 'Price per person is required.'],
      min: [0, 'Price cannot be negative.'],
    },

    tourDate: {
      type: Date,
      required: [true, 'Tour date is required.'],
    },

    groupSize: {
      type: Number,
      required: [true, 'Group size is required.'],
      min: [1, 'Group size must be at least 1.'],
    },

    totalPrice: {
      type: Number,
      required: [true, 'Total price is required.'],
      min: [0, 'Total price cannot be negative.'],
    },

    bookingStatus: {
      type: String,
      enum: {
        values: BOOKING_STATUSES,
        message: '`{VALUE}` is not a supported booking status.',
      },
      default: 'pending',
    },

    paymentStatus: {
      type: String,
      enum: {
        values: PAYMENT_STATUSES,
        message: '`{VALUE}` is not a supported payment status.',
      },
      default: 'unpaid',
    },
  },
  {
    timestamps: true,
  }
);


guideBookingSchema.index({
  travelerId: 1,
});

guideBookingSchema.index({
  guideId: 1,
});


const GuideBooking = mongoose.model(
  'GuideBooking',
  guideBookingSchema
);


export default GuideBooking;