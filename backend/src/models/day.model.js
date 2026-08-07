import mongoose from 'mongoose';

const daySchema = new mongoose.Schema(
  {
    trip: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trip',
      required: [true, 'Trip reference is required.'],
      index: true,
    },

    dayNumber: {
      type: Number,
      required: [true, 'Day number is required.'],
      min: [1, 'Day number must be at least 1.'],
    },

    date: {
      type: Date,
      required: [true, 'Day date is required.'],
    },
  },
  {
    timestamps: true,
  },
);

daySchema.index(
  {
    trip: 1,
    dayNumber: 1,
  },
  {
    unique: true,
  },
);

const Day = mongoose.model('Day', daySchema);

export default Day;