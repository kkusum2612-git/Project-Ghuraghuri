import mongoose from 'mongoose';

import AiTravelPlan from '../models/aiTravelPlan.model.js';

import {
  enrichTravelPlanWithHotels,
} from '../services/ai-hotel-enrichment.service.js';

import {
  generateTravelPlanWithGroq,
} from '../services/ai-travel-plan.service.js';

import {
  getPremiumMembershipByTravelerId,
} from '../services/premium-membership.service.js';


/*
 * ============================================================
 * RAFI FEATURE 4 - AI TRAVEL PLAN CONTROLLER
 * ============================================================
 *
 * Generation flow:
 *
 * 1. Validate planner input.
 * 2. Confirm the traveler is Premium.
 * 3. Ask Groq for a structured neutral trip draft.
 * 4. Normalize the AI-generated data.
 * 5. Match overnight days with real Ghuraghuri hotels.
 * 6. Calculate the combined trip estimate.
 * 7. Save the enriched neutral AI draft in MongoDB.
 *
 * The saved result is still neither:
 *
 * - a normal My Trip,
 * - nor a Public Room.
 *
 * Those conversions happen only when the traveler explicitly
 * chooses one of those actions later.
 */


const ONE_DAY_IN_MILLISECONDS =
  24 * 60 * 60 * 1000;


/*
 * Create an error that works with the project's existing
 * centralized error middleware.
 */
function createHttpError(
  message,
  statusCode
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
}


/*
 * ------------------------------------------------------------
 * DATE NORMALIZATION
 * ------------------------------------------------------------
 *
 * Feature 4 works with calendar dates rather than exact times.
 *
 * Normalizing to midnight UTC keeps generated days and later
 * hotel availability checks predictable.
 */
function normalizeDate(value) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }


  date.setUTCHours(
    0,
    0,
    0,
    0
  );


  return date;
}


/*
 * Ghuraghuri already knows the correct calendar sequence from
 * the user's selected start date.
 *
 * Therefore we do not need to trust Groq's date arithmetic.
 */
function createDayDate(
  startDate,
  dayIndex
) {
  return new Date(
    startDate.getTime() +
      dayIndex *
        ONE_DAY_IN_MILLISECONDS
  );
}


/*
 * ------------------------------------------------------------
 * TEXT NORMALIZATION
 * ------------------------------------------------------------
 */
function normalizeText(
  value
) {
  if (
    typeof value !==
    'string'
  ) {
    return '';
  }


  return value.trim();
}


/*
 * Clean interests before sending them to Groq and storing them.
 *
 * Example:
 *
 * [
 *   " Beach ",
 *   "Food",
 *   "",
 *   "Beach"
 * ]
 *
 * becomes:
 *
 * [
 *   "Beach",
 *   "Food"
 * ]
 */
function normalizeInterests(
  value
) {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }


  const cleanedInterests =
    value
      .filter(
        (interest) =>
          typeof interest ===
          'string'
      )
      .map(
        (interest) =>
          interest.trim()
      )
      .filter(Boolean);


  const uniqueInterests =
    [];

  const seenInterests =
    new Set();


  cleanedInterests.forEach(
    (interest) => {
      const normalizedKey =
        interest.toLowerCase();


      if (
        seenInterests.has(
          normalizedKey
        )
      ) {
        return;
      }


      seenInterests.add(
        normalizedKey
      );

      uniqueInterests.push(
        interest
      );
    }
  );


  /*
   * Ten interests are more than enough for this course planner
   * and keep the prompt reasonably small.
   */
  return uniqueInterests.slice(
    0,
    10
  );
}


/*
 * ------------------------------------------------------------
 * PLANNER INPUT VALIDATION
 * ------------------------------------------------------------
 *
 * Frontend validation is only for user convenience.
 *
 * Anyone can bypass React and call the API manually, so every
 * important value is checked again here.
 */
function validatePlannerInput(
  body
) {
  const origin =
    normalizeText(
      body.origin
    );


  const destination =
    normalizeText(
      body.destination
    );


  if (
    origin.length < 2 ||
    origin.length > 120
  ) {
    throw createHttpError(
      'Current location must contain between 2 and 120 characters.',
      400
    );
  }


  if (
    destination.length < 2 ||
    destination.length > 120
  ) {
    throw createHttpError(
      'Destination must contain between 2 and 120 characters.',
      400
    );
  }


  const startDate =
    normalizeDate(
      body.startDate
    );


  if (!startDate) {
    throw createHttpError(
      'A valid trip start date is required.',
      400
    );
  }


  const duration =
    Number(
      body.duration
    );


  if (
    !Number.isInteger(
      duration
    ) ||
    duration < 1 ||
    duration > 14
  ) {
    throw createHttpError(
      'Trip duration must be a whole number between 1 and 14 days.',
      400
    );
  }


  const travelers =
    Number(
      body.travelers
    );


  if (
    !Number.isInteger(
      travelers
    ) ||
    travelers < 1 ||
    travelers > 50
  ) {
    throw createHttpError(
      'Traveler count must be a whole number between 1 and 50.',
      400
    );
  }


  const budget =
    Number(
      body.budget
    );


  if (
    !Number.isFinite(
      budget
    ) ||
    budget <= 0
  ) {
    throw createHttpError(
      'Budget must be a positive number.',
      400
    );
  }


  const interests =
    normalizeInterests(
      body.interests
    );


  if (
    interests.length ===
    0
  ) {
    throw createHttpError(
      'Select at least one travel interest or preference.',
      400
    );
  }


  return {
    origin,
    destination,
    startDate,
    duration,
    travelers,
    budget,
    interests,
  };
}


/*
 * ------------------------------------------------------------
 * PREMIUM AUTHORIZATION
 * ------------------------------------------------------------
 *
 * The route will already require:
 *
 * authenticateUser
 * authorizeRoles('traveler')
 *
 * Feature 4 also independently checks PremiumMembership before
 * Groq is contacted.
 */
async function requirePremiumMembership(
  travelerId
) {
  const membership =
    await getPremiumMembershipByTravelerId(
      travelerId
    );


  if (!membership) {
    throw createHttpError(
      'AI Travel Planner is a Premium feature. Upgrade your account first.',
      403
    );
  }


  return membership;
}


/*
 * ------------------------------------------------------------
 * NORMALIZE GROQ DAY DATA
 * ------------------------------------------------------------
 *
 * Groq controls:
 *
 * - travel direction,
 * - places,
 * - stay area,
 * - non-hotel cost estimates.
 *
 * Ghuraghuri controls:
 *
 * - actual calendar dates,
 * - real hotels,
 * - availability,
 * - accommodation price.
 */
function buildNeutralPlanDays(
  generatedDays,
  startDate
) {
  return generatedDays.map(
    (
      generatedDay,
      index
    ) => {
      const foodEstimate =
        Number(
          generatedDay.foodEstimate
        );


      const transportEstimate =
        Number(
          generatedDay.transportEstimate
        );


      const activityEstimate =
        Number(
          generatedDay.activityEstimate
        );


      const places =
        Array.isArray(
          generatedDay.places
        )
          ? generatedDay.places
              .filter(
                (place) =>
                  typeof place ===
                  'string'
              )
              .map(
                (place) =>
                  place.trim()
              )
              .filter(Boolean)
          : [];


      /*
       * Accommodation begins at zero only during the neutral
       * stage.
       *
       * Immediately after this function, the hotel-enrichment
       * service replaces it with either:
       *
       * - trusted hotel accommodation,
       * - or the BDT 0 self-arranged fallback.
       */
      const accommodationEstimate =
        0;


      return {
        day:
          index + 1,


        /*
         * Calculate the date from the user's real start date
         * rather than trusting an AI-calculated date.
         */
        date:
          createDayDate(
            startDate,
            index
          ),


        startArea:
          normalizeText(
            generatedDay.startArea
          ),


        endArea:
          normalizeText(
            generatedDay.endArea
          ),


        places,


        requiresStay:
          Boolean(
            generatedDay.requiresStay
          ),


        stayArea:
          generatedDay.requiresStay
            ? normalizeText(
                generatedDay.stayArea
              )
            : '',


        foodEstimate,

        transportEstimate,

        activityEstimate,


        /*
         * Trusted hotel data is still empty here.
         */
        hotel:
          null,

        accommodationType:
          'none',

        accommodationEstimate,


        /*
         * Temporary pre-enrichment total.
         */
        estimatedDayTotal:
          foodEstimate +
          transportEstimate +
          activityEstimate,
      };
    }
  );
}


/*
 * ============================================================
 * POST /api/v1/ai/travel-plan
 * ============================================================
 *
 * Generate, enrich and save one neutral AI travel plan.
 */
async function generateTravelPlan(
  req,
  res,
  next
) {
  try {
    /*
     * Never accept traveler ownership from req.body.
     *
     * Authentication middleware provides the real user.
     */
    const travelerId =
      req.user._id;


    /*
     * Security check happens BEFORE Groq.
     *
     * A normal traveler therefore cannot bypass the frontend
     * Premium lock and consume the AI API directly.
     */
    await requirePremiumMembership(
      travelerId
    );


    const plannerInput =
      validatePlannerInput(
        req.body
      );


    /*
     * Groq receives the calendar date as YYYY-MM-DD.
     */
    const groqInput = {
      ...plannerInput,

      startDate:
        plannerInput
          .startDate
          .toISOString()
          .slice(
            0,
            10
          ),
    };


    /*
     * --------------------------------------------------------
     * STEP 1 - GROQ
     * --------------------------------------------------------
     *
     * Generate the neutral itinerary:
     *
     * places
     * stay areas
     * food/transport/activity estimates
     *
     * No hotel is trusted from AI.
     */
    const generatedPlan =
      await generateTravelPlanWithGroq(
        groqInput
      );


    const neutralDays =
      buildNeutralPlanDays(
        generatedPlan.days,
        plannerInput.startDate
      );


    /*
     * --------------------------------------------------------
     * STEP 2 - GHURAGHURI HOTEL ENRICHMENT
     * --------------------------------------------------------
     *
     * For every overnight day:
     *
     * stayArea
     *    ↓
     * real active hotels
     *    ↓
     * real date availability
     *    ↓
     * traveler capacity
     *    ↓
     * cheapest practical option
     *
     * If nothing is suitable:
     *
     * Camping / Self-arranged stay
     * accommodation estimate = BDT 0
     */
    const {
      days,
      estimatedTotal,
    } =
      await enrichTravelPlanWithHotels({
        days:
          neutralDays,

        travelers:
          plannerInput.travelers,
      });


    /*
     * --------------------------------------------------------
     * STEP 3 - SAVE NEUTRAL ENRICHED DRAFT
     * --------------------------------------------------------
     *
     * The result is now suitable for displaying on the combined
     * AI Planner page.
     *
     * It is still NOT automatically converted into a normal
     * Trip or Public Room.
     */
    const aiTravelPlan =
      await AiTravelPlan.create({
        travelerId,

        origin:
          plannerInput.origin,

        destination:
          plannerInput.destination,

        startDate:
          plannerInput.startDate,

        duration:
          plannerInput.duration,

        travelers:
          plannerInput.travelers,

        budget:
          plannerInput.budget,

        interests:
          plannerInput.interests,

        tripTitle:
          normalizeText(
            generatedPlan.tripTitle
          ),

        summary:
          normalizeText(
            generatedPlan.summary
          ),

        days,

        estimatedTotal,
      });


    res.status(201).json({
      success:
        true,

      message:
        'AI travel plan generated successfully.',

      data: {
        plan:
          aiTravelPlan,
      },
    });
  } catch (error) {
    next(error);
  }
}


/*
 * ============================================================
 * GET /api/v1/ai/travel-plan/:planId
 * ============================================================
 *
 * Reload a previously generated AI result.
 *
 * Persistence means a browser refresh does not immediately
 * destroy the generated plan.
 */
async function getTravelPlanById(
  req,
  res,
  next
) {
  try {
    const {
      planId,
    } =
      req.params;


    if (
      !mongoose.isValidObjectId(
        planId
      )
    ) {
      throw createHttpError(
        'AI travel plan ID is invalid.',
        400
      );
    }


    const travelerId =
      req.user._id;


    /*
     * Saved AI planner results remain Premium-only.
     */
    await requirePremiumMembership(
      travelerId
    );


    /*
     * Ownership protection:
     *
     * A traveler may load only an AI plan belonging to their
     * own authenticated user ID.
     */
    const aiTravelPlan =
      await AiTravelPlan.findOne({
        _id:
          planId,

        travelerId,
      });


    if (!aiTravelPlan) {
      throw createHttpError(
        'AI travel plan not found.',
        404
      );
    }


    res.status(200).json({
      success:
        true,

      message:
        'AI travel plan retrieved successfully.',

      data: {
        plan:
          aiTravelPlan,
      },
    });
  } catch (error) {
    next(error);
  }
}


export {
  generateTravelPlan,
  getTravelPlanById,
};