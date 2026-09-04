import mongoose from 'mongoose';


/*
 * ============================================================
 * HOTEL BOOKING MODEL
 * ============================================================
 *
 * This model belongs to the project's shared hotel-booking
 * system.
 *
 *
 * RAFI FEATURE 3 adds OPTIONAL Premium/reward information.
 *
 * Existing bookings and normal travelers remain compatible
 * because all newly-added fields have safe defaults.
 *
 *
 * IMPORTANT:
 *
 * totalPrice keeps its original meaning:
 *
 *   "The final amount the traveler must pay."
 *
 *
 * Therefore Fatema/Kusum's existing payment feature can continue
 * doing:
 *
 *   Payment.amount = booking.totalPrice
 *
 * without learning how Premium discounts were calculated.
 */


const bookingSchema =
  new mongoose.Schema(
    {
      hotelId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Hotel',

        required: [
          true,
          'Hotel ID is required.',
        ],

        index:
          true,
      },


      hotelName: {
        type:
          String,

        required: [
          true,
          'Hotel name is required.',
        ],

        trim:
          true,
      },


      vendorId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'User',

        required: [
          true,
          'Vendor ID is required.',
        ],

        index:
          true,
      },


      travelerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'User',

        required: [
          true,
          'Traveler ID is required.',
        ],

        index:
          true,
      },


      roomTypeId: {
        type:
          mongoose.Schema.Types.ObjectId,

        required: [
          true,
          'Room type ID is required.',
        ],
      },


      roomTypeName: {
        type:
          String,

        required: [
          true,
          'Room type name is required.',
        ],

        trim:
          true,
      },


      checkInDate: {
        type:
          Date,

        required: [
          true,
          'Check-in date is required.',
        ],
      },


      checkOutDate: {
        type:
          Date,

        required: [
          true,
          'Check-out date is required.',
        ],
      },


      numberOfRooms: {
        type:
          Number,

        required: [
          true,
          'Number of rooms is required.',
        ],

        min: [
          1,
          'At least one room must be booked.',
        ],
      },


      numberOfGuests: {
        type:
          Number,

        required: [
          true,
          'Number of guests is required.',
        ],

        min: [
          1,
          'At least one guest is required.',
        ],
      },


      numberOfNights: {
        type:
          Number,

        required: [
          true,
          'Number of nights is required.',
        ],

        min: [
          1,
          'The booking must be for at least one night.',
        ],
      },


      pricePerNight: {
        type:
          Number,

        required: [
          true,
          'Price per night is required.',
        ],

        min: [
          0,
          'Price per night cannot be negative.',
        ],
      },


      /*
       * ======================================================
       * RAFI FEATURE 3 - ORIGINAL PRICE
       * ======================================================
       *
       * Before Premium/reward discounts:
       *
       * originalTotalPrice =
       *
       *   pricePerNight
       *   × numberOfRooms
       *   × numberOfNights
       *
       *
       * Older bookings may not have this field, so it is NOT
       * required.
       *
       * Their existing totalPrice continues working normally.
       */
      originalTotalPrice: {
        type:
          Number,

        default:
          null,

        min: [
          0,
          'Original total price cannot be negative.',
        ],
      },


      /*
       * ======================================================
       * FINAL PAYABLE PRICE
       * ======================================================
       *
       * This field already existed before Rafi Feature 3.
       *
       *
       * Normal traveler:
       *
       *   totalPrice = originalTotalPrice
       *
       *
       * Premium traveler:
       *
       *   totalPrice =
       *     originalTotalPrice - discounts
       *
       *
       * Fatema's existing SSLCOMMERZ payment code continues to
       * charge THIS value.
       */
      totalPrice: {
        type:
          Number,

        required: [
          true,
          'Total price is required.',
        ],

        min: [
          0,
          'Total price cannot be negative.',
        ],
      },


      /*
       * ======================================================
       * RAFI FEATURE 3 - PREMIUM PRICING SNAPSHOT
       * ======================================================
       *
       * These values describe the policy that was actually used
       * when THIS booking was created.
       *
       *
       * Why snapshot them?
       *
       * Suppose:
       *
       * Monday:
       * admin Premium base = 5%
       *
       * traveler creates booking
       *
       * Tuesday:
       * admin changes base = 7%
       *
       *
       * We must NOT silently change Monday's already-created
       * booking from one payable amount to another.
       *
       *
       * New bookings use the new global rule.
       *
       * Existing bookings keep their original calculated price.
       */


      /*
       * Was the traveler Premium when this booking was created?
       */
      isPremiumBooking: {
        type:
          Boolean,

        default:
          false,
      },


      /*
       * Reference to the PremiumMembership used for this booking.
       *
       * Normal bookings simply store null.
       */
      premiumMembershipId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'PremiumMembership',

        default:
          null,
      },


      /*
       * Automatic Premium base discount applied to this booking.
       *
       * Example:
       *
       * 5
       *
       * means:
       *
       * 5%
       */
      premiumBaseDiscountPercent: {
        type:
          Number,

        default:
          0,

        min:
          0,

        max:
          100,
      },


      /*
       * Additional percentage created by reward-point redemption.
       *
       * Example:
       *
       * 1000 points = 5%
       *
       * rewardDiscountPercent = 5
       */
      rewardDiscountPercent: {
        type:
          Number,

        default:
          0,

        min:
          0,

        max:
          100,
      },


      /*
       * Premium base + reward discount after applying the global
       * maximum cap.
       */
      totalDiscountPercent: {
        type:
          Number,

        default:
          0,

        min:
          0,

        max:
          100,
      },


      /*
       * Actual money removed from originalTotalPrice.
       */
      discountAmount: {
        type:
          Number,

        default:
          0,

        min:
          0,
      },


      /*
       * ======================================================
       * RAFI FEATURE 3 - REWARD RESERVATION
       * ======================================================
       *
       * If the traveler chooses:
       *
       *   "Use reward points"
       *
       * we calculate how many complete reward blocks can be used
       * and temporarily reserve those points.
       *
       *
       * Example:
       *
       * traveler owns 1500
       *
       * rule:
       * 1000 points = 5%
       *
       *
       * rewardPointsReserved = 1000
       *
       *
       * The points still exist in membership.rewardPoints until
       * payment succeeds.
       */
      rewardPointsReserved: {
        type:
          Number,

        default:
          0,

        min:
          0,

        validate: {
          validator:
            Number.isInteger,

          message:
            'Reserved reward points must be a whole number.',
        },
      },


      /*
       * Tracks the lifecycle of the booking-level point hold.
       *
       *
       * none
       * ------------------------------------------------------
       * No reward points were selected.
       *
       *
       * reserved
       * ------------------------------------------------------
       * Points are held for this unpaid booking.
       *
       *
       * redeemed
       * ------------------------------------------------------
       * Payment succeeded and points were actually consumed.
       *
       *
       * released
       * ------------------------------------------------------
       * Booking became non-payable before successful payment,
       * so the held points became available again.
       */
      rewardRedemptionStatus: {
        type:
          String,

        enum: {
          values: [
            'none',
            'reserved',
            'redeemed',
            'released',
          ],

          message:
            'Invalid reward redemption status.',
        },

        default:
          'none',

        index:
          true,
      },


      rewardReservedAt: {
        type:
          Date,

        default:
          null,
      },


      rewardRedeemedAt: {
        type:
          Date,

        default:
          null,
      },


      rewardReleasedAt: {
        type:
          Date,

        default:
          null,
      },


      /*
       * ======================================================
       * EXISTING BOOKING STATUS
       * ======================================================
       */
      bookingStatus: {
        type:
          String,

        enum: {
          values: [
            'pending',
            'confirmed',
            'declined',
            'cancelled',
            'completed',
          ],

          message:
            'Invalid booking status.',
        },

        default:
          'pending',
      },


      /*
       * ======================================================
       * EXISTING PAYMENT STATUS
       * ======================================================
       */
      paymentStatus: {
        type:
          String,

        enum: {
          values: [
            'unpaid',
            'paid',
            'failed',
            'refunded',
          ],

          message:
            'Invalid payment status.',
        },

        default:
          'unpaid',
      },
    },

    {
      timestamps:
        true,
    }
  );


/*
 * Existing indexes.
 */
bookingSchema.index({
  vendorId: 1,
  createdAt: -1,
});


bookingSchema.index({
  travelerId: 1,
  createdAt: -1,
});


/*
 * Rafi Feature 3.
 *
 * Makes it efficient to locate a traveler's currently reserved
 * reward bookings when synchronization/recovery is needed.
 */
bookingSchema.index({
  travelerId: 1,
  rewardRedemptionStatus: 1,
});


const Booking =
  mongoose.model(
    'Booking',
    bookingSchema
  );


export default Booking;