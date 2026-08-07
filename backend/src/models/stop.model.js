import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required.'],
      index: true,
    },

    day: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Day',
      required: [true, 'Day reference is required.'],
      index: true,
    },

    placeName: {
      type: String,
      required: [true, 'Place name is required.'],
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    latitude: {
      type: Number,
      required: [true, 'Latitude is required.'],
      min: [-90, 'Latitude cannot be less than -90.'],
      max: [90, 'Latitude cannot be greater than 90.'],
    },

    longitude: {
      type: Number,
      required: [true, 'Longitude is required.'],
      min: [-180, 'Longitude cannot be less than -180.'],
      max: [180, 'Longitude cannot be greater than 180.'],
    },

    visitTime: {
      type: String,
      trim: true,
      default: '',
    },

    estimatedDurationMinutes: {
      type: Number,
      min: [0, 'Estimated duration cannot be negative.'],
      default: 0,
    },

    order: {
      type: Number,
      required: [true, 'Stop order is required.'],
      min: [1, 'Stop order must be at least 1.'],
    },
  },
  {
    timestamps: true,
  },
);

stopSchema.index(
  {
    day: 1,
    order: 1,
  },
  {
    unique: true,
  },
);

const Stop = mongoose.model('Stop', stopSchema);

export default Stop;