import mongoose from 'mongoose';

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Destination name is required.'],
      trim: true,
    },

    latitude: {
      type: Number,
      min: [-90, 'Latitude cannot be less than -90.'],
      max: [90, 'Latitude cannot be greater than 90.'],
    },

    longitude: {
      type: Number,
      min: [-180, 'Longitude cannot be less than -180.'],
      max: [180, 'Longitude cannot be greater than 180.'],
    },
  },
  {
    _id: false,
  },
);

const tripSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Trip owner is required.'],
      index: true,
    },

    tripName: {
      type: String,
      required: [true, 'Trip name is required.'],
      trim: true,
      minlength: [2, 'Trip name must contain at least 2 characters.'],
      maxlength: [100, 'Trip name cannot exceed 100 characters.'],
    },

    destination: {
      type: destinationSchema,
      required: [true, 'Destination is required.'],
    },

    startDate: {
      type: Date,
      required: [true, 'Start date is required.'],
    },

    endDate: {
      type: Date,
      required: [true, 'End date is required.'],
    },

    coverPhoto: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  },
);

tripSchema.pre('validate', function validateTripDates() {
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate(
      'endDate',
      'End date must be the same as or later than the start date.',
    );
  }
});

const Trip = mongoose.model('Trip', tripSchema);

export default Trip;