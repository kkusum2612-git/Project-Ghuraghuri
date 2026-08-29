import mongoose from 'mongoose';

const guideReviewSchema =
  new mongoose.Schema(
    {
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GuideBooking',
        required: [
          true,
          'Guide booking ID is required.',
        ],
        unique: true,
      },

      guideId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Guide',
        required: [
          true,
          'Guide ID is required.',
        ],
        index: true,
      },

      travelerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [
          true,
          'Traveler ID is required.',
        ],
        index: true,
      },

      rating: {
        type: Number,
        required: [
          true,
          'Rating is required.',
        ],
        min: [
          1,
          'Rating must be at least 1 star.',
        ],
        max: [
          5,
          'Rating cannot exceed 5 stars.',
        ],
        validate: {
          validator(value) {
            return Number.isInteger(value);
          },

          message:
            'Rating must be a whole number.',
        },
      },

      comment: {
        type: String,
        required: [
          true,
          'Written review is required.',
        ],
        trim: true,
        maxlength: [
          1000,
          'Review cannot exceed 1000 characters.',
        ],
      },
    },
    {
      timestamps: true,
    }
  );

guideReviewSchema.index({
  guideId: 1,
  createdAt: -1,
});

guideReviewSchema.index({
  travelerId: 1,
  createdAt: -1,
});

const GuideReview =
  mongoose.model(
    'GuideReview',
    guideReviewSchema
  );

export default GuideReview;