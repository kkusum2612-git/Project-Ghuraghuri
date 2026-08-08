import mongoose from 'mongoose';

const destinationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
      default: null,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      default: null,
      min: -180,
      max: 180,
    },
  },
  {
    _id: false,
  }
);

const tripSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    tripName: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },

    destination: {
      type: destinationSchema,
      required: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: {
      type: Date,
      required: true,
      validate: {
        validator(value) {
          if (!this.startDate || !value) {
            return true;
          }

          return value >= this.startDate;
        },
        message:
          'End date must be on or after the start date.',
      },
    },

    coverPhoto: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

tripSchema.index({
  owner: 1,
  startDate: 1,
});

const Trip =
  mongoose.models.Trip ||
  mongoose.model('Trip', tripSchema);

export default Trip;