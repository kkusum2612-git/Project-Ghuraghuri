import mongoose from 'mongoose';

const daySchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: true,
      index: true,
    },

    dayNumber: {
      type: Number,
      required: true,
      min: 1,
    },

    date: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

daySchema.index(
  {
    trip: 1,
    dayNumber: 1,
  },
  {
    unique: true,
  }
);

const Day =
  mongoose.models.Day ||
  mongoose.model('Day', daySchema);

export default Day;
