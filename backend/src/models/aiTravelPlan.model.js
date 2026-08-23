import mongoose from 'mongoose';


/*
 * ============================================================
 * RAFI FEATURE 4 - AI TRAVEL PLAN MODEL
 * ============================================================
 *
 * This model stores the neutral AI-generated draft.
 *
 * At this stage the plan is NOT:
 *
 * - a normal My Trip,
 * - a Public Room,
 * - a hotel booking.
 *
 * The traveler first reviews the generated result.
 * Later they can choose:
 *
 * 1. Save as My Trip
 * 2. Create Public Room
 */


const aiPlanHotelSchema =
  new mongoose.Schema(
    {
      /*
       * Trusted hotel data comes from Ghuraghuri MongoDB,
       * not from Groq.
       */
      hotelId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Hotel',

        default:
          null,
      },

      name: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      city: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      address: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      photo: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      /*
       * This is the real starting available room price
       * calculated from the existing hotel data.
       */
      startingPrice: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },

      /*
       * These dates are useful later when View & Book
       * opens the existing hotel booking page.
       */
      checkInDate: {
        type:
          Date,

        default:
          null,
      },

      checkOutDate: {
        type:
          Date,

        default:
          null,
      },
    },
    {
      _id:
        false,
    }
  );


const aiPlanDaySchema =
  new mongoose.Schema(
    {
      day: {
        type:
          Number,

        required:
          true,

        min:
          1,
      },

      date: {
        type:
          Date,

        required:
          true,
      },

      startArea: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      endArea: {
        type:
          String,

        required:
          true,

        trim:
          true,
      },

      places: {
        type:
          [String],

        default:
          [],
      },

      requiresStay: {
        type:
          Boolean,

        required:
          true,
      },

      /*
       * stayArea comes from Groq.
       *
       * It is only the broad area where accommodation
       * should be searched.
       *
       * Example:
       *
       * "Cox's Bazar"
       *
       * Groq does NOT choose the actual hotel.
       */
      stayArea: {
        type:
          String,

        trim:
          true,

        default:
          '',
      },

      /*
       * These three values are AI estimates.
       *
       * They are kept separate from accommodation because
       * accommodation must use trusted Ghuraghuri hotel data.
       */
      foodEstimate: {
        type:
          Number,

        required:
          true,

        min:
          0,
      },

      transportEstimate: {
        type:
          Number,

        required:
          true,

        min:
          0,
      },

      activityEstimate: {
        type:
          Number,

        required:
          true,

        min:
          0,
      },

      /*
       * If the backend finds a suitable real hotel,
       * this object stores its trusted data.
       *
       * null means no suitable hotel was found.
       */
      hotel: {
        type:
          aiPlanHotelSchema,

        default:
          null,
      },

      /*
       * When no hotel is available, Feature 4 uses:
       *
       * Camping / Self-arranged stay
       *
       * with BDT 0 accommodation cost.
       */
      accommodationType: {
        type:
          String,

        enum: [
          'hotel',
          'self-arranged',
          'none',
        ],

        required:
          true,

        default:
          'none',
      },

      accommodationEstimate: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },

      /*
       * Combined estimated cost for this day.
       *
       * AI estimates:
       * food + transport + activities
       *
       * Trusted application data:
       * accommodation
       */
      estimatedDayTotal: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },
    },
    {
      _id:
        false,
    }
  );


const aiTravelPlanSchema =
  new mongoose.Schema(
    {
      /*
       * The authenticated Premium traveler who generated
       * this plan.
       *
       * Never accept this value from the frontend.
       */
      travelerId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'User',

        required:
          true,

        index:
          true,
      },

      /*
       * Original planner form input.
       */
      origin: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,
      },

      destination: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          120,
      },

      startDate: {
        type:
          Date,

        required:
          true,
      },

      duration: {
        type:
          Number,

        required:
          true,

        min:
          1,

        max:
          14,

        validate: {
          validator:
            Number.isInteger,

          message:
            'Trip duration must be a whole number.',
        },
      },

      travelers: {
        type:
          Number,

        required:
          true,

        min:
          1,

        max:
          50,

        validate: {
          validator:
            Number.isInteger,

          message:
            'Traveler count must be a whole number.',
        },
      },

      budget: {
        type:
          Number,

        required:
          true,

        min:
          1,
      },

      interests: {
        type:
          [String],

        default:
          [],
      },

      /*
       * Main Groq-generated summary fields.
       */
      tripTitle: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          150,
      },

      summary: {
        type:
          String,

        required:
          true,

        trim:
          true,

        maxlength:
          1000,
      },

      /*
       * Structured day-by-day result.
       *
       * Groq creates the itinerary fields.
       * Ghuraghuri later enriches each overnight day
       * with trusted hotel information.
       */
      days: {
        type:
          [aiPlanDaySchema],

        required:
          true,

        validate: {
          validator(days) {
            return (
              Array.isArray(days) &&
              days.length > 0
            );
          },

          message:
            'AI travel plan must contain at least one day.',
        },
      },

      /*
       * Final combined estimate:
       *
       * AI non-hotel estimates
       * +
       * real accommodation estimates.
       */
      estimatedTotal: {
        type:
          Number,

        min:
          0,

        default:
          0,
      },

      /*
       * These conversion IDs help prevent accidental duplicate
       * creation from repeated button clicks.
       *
       * They remain null until the traveler chooses one of the
       * conversion actions.
       */
      convertedTripId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'Trip',

        default:
          null,
      },

      convertedPublicRoomId: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref:
          'PublicRoom',

        default:
          null,
      },
    },
    {
      timestamps:
        true,
    }
  );


/*
 * Common query:
 *
 * "Show/reload this traveler's generated AI plans."
 */
aiTravelPlanSchema.index({
  travelerId:
    1,

  createdAt:
    -1,
});


const AiTravelPlan =
  mongoose.models.AiTravelPlan ||
  mongoose.model(
    'AiTravelPlan',
    aiTravelPlanSchema
  );


export default AiTravelPlan;