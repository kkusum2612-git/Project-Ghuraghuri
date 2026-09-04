import mongoose from 'mongoose';

/*
 * ------------------------------------------------------------
 * HOTEL REVIEW MODEL
 * ------------------------------------------------------------
 *
 * A review belongs to one completed hotel booking.
 *
 * We keep hotel reviews in their own collection instead of
 * embedding them inside Hotel or Booking because:
 *
 * - reviews can be queried independently
 * - hotel rating summaries are easier to calculate
 * - the Hotel and Booking documents stay focused
 * - guide reviews can remain a separate teammate feature
 */
const hotelReviewSchema =
  new mongoose.Schema(
    {
      /*
       * One booking may create only one hotel review.
       *
       * unique: true also gives us a database-level safeguard
       * against duplicate reviews for the same stay.
       */
      bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: [
          true,
          'Booking ID is required.',
        ],
        unique: true,
      },

      /*
       * The reviewed hotel.
       */
      hotelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hotel',
        required: [
          true,
          'Hotel ID is required.',
        ],
        index: true,
      },

      /*
       * Hotel owner.
       *
       * Keeping vendorId directly on the review makes it easy
       * for a logged-in hotel vendor to retrieve reviews for
       * only their own listings.
       */
      vendorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [
          true,
          'Vendor ID is required.',
        ],
        index: true,
      },

      /*
       * Traveler who completed the booking and wrote the
       * review.
       */
      travelerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [
          true,
          'Traveler ID is required.',
        ],
        index: true,
      },

      /*
       * Star rating.
       *
       * Only whole-number ratings from 1 through 5 are valid.
       */
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
            return Number.isInteger(
              value
            );
          },
          message:
            'Rating must be a whole number.',
        },
      },

      /*
       * Written review required by the project specification.
       *
       * trim removes unnecessary whitespace and required
       * prevents an empty review from being saved.
       */
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

/*
 * These indexes support the three main review screens:
 *
 * - public hotel reviews
 * - hotel vendor reviews
 * - traveler's submitted reviews
 */
hotelReviewSchema.index({
  hotelId: 1,
  createdAt: -1,
});

hotelReviewSchema.index({
  vendorId: 1,
  createdAt: -1,
});

hotelReviewSchema.index({
  travelerId: 1,
  createdAt: -1,
});

const HotelReview =
  mongoose.model(
    'HotelReview',
    hotelReviewSchema
  );

export default HotelReview;