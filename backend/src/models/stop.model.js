import mongoose from 'mongoose';

const stopSchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },

    day: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Day',
      required: true,
      index: true,
    },

    placeName: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: '',
    },

    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },

    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },

    visitTime: {
      type: String,
      trim: true,
      default: '',
    },

    estimatedDurationMinutes: {
      type: Number,
      min: 0,
      default: 0,
    },

    order: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

stopSchema.index(
  {
    day: 1,
    order: 1,
  },
  {
    unique: true,
  }
);

const Stop =
  mongoose.models.Stop ||
  mongoose.model('Stop', stopSchema);

export default Stop;