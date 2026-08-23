import Groq from 'groq-sdk';


/*
 * ============================================================
 * RAFI FEATURE 4 - AI TRAVEL PLAN SERVICE
 * ============================================================
 *
 * This service is the ONLY part of Feature 4 that communicates
 * directly with Groq.
 *
 * The controller will:
 *
 * 1. verify the logged-in Premium traveler,
 * 2. validate the planner form,
 * 3. call this service,
 * 4. enrich the AI draft with trusted Ghuraghuri hotel/map data.
 *
 * Important boundary:
 *
 * Groq suggests the travel plan.
 * Ghuraghuri provides trusted application data.
 *
 * Therefore Groq must never invent:
 *
 * - Ghuraghuri hotel IDs,
 * - authoritative hotel prices,
 * - hotel availability,
 * - bookings,
 * - payments,
 * - trusted map coordinates.
 */


const DEFAULT_GROQ_MODEL =
  'openai/gpt-oss-20b';


/*
 * Create an HTTP-style error that can later be passed through
 * the project's existing centralized error middleware.
 */
function createServiceError(
  message,
  statusCode = 500
) {
  const error =
    new Error(message);

  error.statusCode =
    statusCode;

  return error;
}


/*
 * Read the API key only from the backend environment.
 *
 * We deliberately do not create the Groq client at module-load
 * time. This produces a clearer error if GROQ_API_KEY is missing.
 */
function createGroqClient() {
  const apiKey =
    process.env.GROQ_API_KEY?.trim();


  if (!apiKey) {
    throw createServiceError(
      'AI Travel Planner is not configured on the server.',
      500
    );
  }


  return new Groq({
    apiKey,
  });
}


/*
 * The model can be changed later through backend/.env without
 * rewriting Feature 4 code.
 */
function getGroqModel() {
  return (
    process.env.GROQ_MODEL?.trim() ||
    DEFAULT_GROQ_MODEL
  );
}


/*
 * ------------------------------------------------------------
 * STRUCTURED OUTPUT SCHEMA
 * ------------------------------------------------------------
 *
 * Groq must return JSON that React and the rest of Ghuraghuri
 * can reliably work with.
 *
 * Notice that there are NO hotel fields and NO coordinates.
 *
 * Those will come from trusted Ghuraghuri data later.
 */
const TRAVEL_PLAN_SCHEMA = {
  type:
    'object',

  properties: {
    tripTitle: {
      type:
        'string',
    },

    summary: {
      type:
        'string',
    },

    days: {
      type:
        'array',

      items: {
        type:
          'object',

        properties: {
          day: {
            type:
              'integer',
          },

          date: {
            type:
              'string',
          },

          startArea: {
            type:
              'string',
          },

          endArea: {
            type:
              'string',
          },

          /*
           * Places are stored as readable names.
           *
           * We do NOT ask Groq for trusted coordinates.
           *
           * Later, Feature 4 will pass these names through
           * Farhan's existing location/geocoding flow before
           * showing them as trusted map stops.
           */
          places: {
            type:
              'array',

            items: {
              type:
                'string',
            },
          },

          requiresStay: {
            type:
              'boolean',
          },

          /*
           * A return day may not need accommodation.
           *
           * In that case stayArea is null.
           */
          stayArea: {
            type: [
              'string',
              'null',
            ],
          },

          foodEstimate: {
            type:
              'number',
          },

          transportEstimate: {
            type:
              'number',
          },

          activityEstimate: {
            type:
              'number',
          },
        },

        required: [
          'day',
          'date',
          'startArea',
          'endArea',
          'places',
          'requiresStay',
          'stayArea',
          'foodEstimate',
          'transportEstimate',
          'activityEstimate',
        ],

        additionalProperties:
          false,
      },
    },
  },

  required: [
    'tripTitle',
    'summary',
    'days',
  ],

  additionalProperties:
    false,
};


/*
 * ------------------------------------------------------------
 * BUILD THE GROQ PROMPT
 * ------------------------------------------------------------
 *
 * The input has already been validated by the controller before
 * it reaches this function.
 *
 * Cost estimates mean the estimated TOTAL for the whole travel
 * party for that day, not a per-person amount.
 *
 * We also give Groq strong geographical instructions here.
 *
 * During our first real test, Groq produced valid JSON but mixed
 * attractions from unrelated districts into the same route.
 *
 * Therefore these rules now tell Groq to keep each day's places
 * geographically realistic.
 *
 * This improves the AI draft, but Ghuraghuri will still verify
 * map locations later instead of blindly trusting the AI.
 */
function buildTravelPlanPrompt({
  origin,
  destination,
  startDate,
  duration,
  travelers,
  budget,
  interests,
}) {
  const interestText =
    Array.isArray(interests) &&
    interests.length > 0
      ? interests.join(', ')
      : 'No specific interests provided';


  return `
Create a realistic Bangladesh travel itinerary using the following information.

Trip information:
- Current location: ${origin}
- Destination: ${destination}
- Start date: ${startDate}
- Duration: ${duration} day(s)
- Number of travelers: ${travelers}
- Total trip budget: BDT ${budget}
- Interests/preferences: ${interestText}

General rules:

1. Return exactly ${duration} day object(s).

2. Day numbers must begin at 1 and continue sequentially.

3. The first day must use ${startDate} as its date.

4. Dates must use YYYY-MM-DD format and continue one calendar day at a time.

5. Keep recommendations realistic for travel in Bangladesh.

6. Give each day an ordered list of human-readable places to visit.

7. startArea and endArea must describe the actual travel direction for that day.

8. If overnight accommodation is sensible after that day, set requiresStay to true and provide a broad stayArea such as "Cox's Bazar".

9. If no overnight accommodation is required, set requiresStay to false and stayArea to null.

10. Food, transport and activity estimates must be non-negative BDT amounts.

11. Those three estimates must represent the total estimated cost for ALL ${travelers} traveler(s) for that day.

12. Try to keep the complete trip reasonably close to the supplied BDT ${budget} budget.

Geographical accuracy rules:

13. Only recommend real, well-known places that you are reasonably confident actually exist.

14. Every recommended place for a day must be geographically connected to that day's startArea, endArea or practical route between them.

15. Do NOT include tourist attractions from unrelated districts simply because they are popular destinations in Bangladesh.

16. Keep consecutive places close enough that visiting them in the same day is reasonably practical.

17. If the traveler spends a day mainly inside ${destination}, prefer attractions that are actually located in or near ${destination}.

18. On the final return day, recommend only stops that reasonably fit the route from the trip area back toward ${origin}.

19. Do not invent obscure attraction names. Prefer established landmarks, beaches, parks, markets, museums, food areas or other recognizable destinations.

20. Do not force extra attractions into a day if doing so would make the route geographically unrealistic.

Ghuraghuri data rules:

21. Do NOT invent or recommend a hotel by name.

22. Do NOT provide hotel IDs, hotel prices, hotel availability, room types, bookings or payment information.

23. Do NOT provide latitude or longitude coordinates.

24. Ghuraghuri will independently match stayArea against its real hotel database.

25. Ghuraghuri will independently resolve and verify place locations before using them on the map.

26. Keep the summary short and suitable for displaying at the top of a travel-planner result page.
`.trim();
}


/*
 * ------------------------------------------------------------
 * VALIDATE THE GENERATED PLAN
 * ------------------------------------------------------------
 *
 * JSON Schema checks the structure of Groq's response.
 *
 * These additional checks protect business rules that depend
 * on the user's request.
 */
function validateGeneratedPlan(
  plan,
  expectedDuration
) {
  if (
    !plan ||
    !Array.isArray(
      plan.days
    )
  ) {
    throw createServiceError(
      'The AI returned an invalid travel plan. Please try again.',
      502
    );
  }


  /*
   * Example:
   *
   * User asks for 3 days.
   *
   * Groq must return exactly 3 day objects.
   */
  if (
    plan.days.length !==
    expectedDuration
  ) {
    throw createServiceError(
      'The AI returned an incomplete travel plan. Please try again.',
      502
    );
  }


  for (
    let index = 0;
    index < plan.days.length;
    index += 1
  ) {
    const day =
      plan.days[index];


    const expectedDayNumber =
      index + 1;


    /*
     * Day numbers must remain:
     *
     * 1, 2, 3, ...
     *
     * rather than an unexpected AI-generated order.
     */
    if (
      day.day !==
      expectedDayNumber
    ) {
      throw createServiceError(
        'The AI returned an invalid day sequence. Please try again.',
        502
      );
    }


    /*
     * A useful itinerary should contain at least one place.
     *
     * We keep this check simple because exact map verification
     * will happen separately.
     */
    if (
      !Array.isArray(
        day.places
      ) ||
      day.places.length ===
        0
    ) {
      throw createServiceError(
        'The AI returned a day without any places to visit. Please try again.',
        502
      );
    }


    const estimates = [
      day.foodEstimate,
      day.transportEstimate,
      day.activityEstimate,
    ];


    /*
     * Cost estimates cannot be negative or non-numeric.
     */
    if (
      estimates.some(
        (value) =>
          !Number.isFinite(
            Number(value)
          ) ||
          Number(value) < 0
      )
    ) {
      throw createServiceError(
        'The AI returned an invalid cost estimate. Please try again.',
        502
      );
    }


    /*
     * If an overnight stay is required, Groq must tell
     * Ghuraghuri which broad area should be searched for a hotel.
     */
    if (
      day.requiresStay &&
      (
        typeof day.stayArea !==
          'string' ||
        day.stayArea.trim() ===
          ''
      )
    ) {
      throw createServiceError(
        'The AI returned an invalid overnight stay area. Please try again.',
        502
      );
    }
  }


  return plan;
}


/*
 * ============================================================
 * GENERATE AI TRAVEL PLAN
 * ============================================================
 *
 * This function performs one Groq request and returns the
 * neutral AI-generated draft.
 *
 * It does NOT:
 *
 * - query MongoDB hotels,
 * - check room availability,
 * - create Trips,
 * - create Public Rooms,
 * - create Bookings,
 * - trust AI coordinates.
 *
 * Those responsibilities remain separate.
 */
async function generateTravelPlanWithGroq(
  plannerInput
) {
  const groq =
    createGroqClient();


  const model =
    getGroqModel();


  const prompt =
    buildTravelPlanPrompt(
      plannerInput
    );


  try {
    const completion =
      await groq.chat.completions.create({
        model,

        /*
         * Low reasoning is enough for this structured itinerary
         * task and keeps generation reasonably responsive.
         */
        reasoning_effort:
          'low',

        messages: [
          {
            role:
              'system',

            /*
             * The system instruction reinforces the important
             * separation between AI suggestions and trusted
             * Ghuraghuri application data.
             */
            content:
              'You are the itinerary-generation engine for Ghuraghuri, a Bangladesh travel application. Create geographically realistic Bangladesh travel routes, follow the requested JSON schema exactly, and never invent Ghuraghuri application data.',
          },

          {
            role:
              'user',

            content:
              prompt,
          },
        ],

        /*
         * Strict Structured Outputs gives us predictable JSON.
         *
         * Without this, Groq might return Markdown paragraphs
         * that would be difficult for React, hotel matching and
         * trip conversion to reuse reliably.
         */
        response_format: {
          type:
            'json_schema',

          json_schema: {
            name:
              'ghuraghuri_travel_plan',

            strict:
              true,

            schema:
              TRAVEL_PLAN_SCHEMA,
          },
        },
      });


    const content =
      completion
        ?.choices
        ?.[0]
        ?.message
        ?.content;


    /*
     * A successful provider request is not enough.
     *
     * We also need an actual plan inside the response.
     */
    if (
      typeof content !==
        'string' ||
      content.trim() ===
        ''
    ) {
      throw createServiceError(
        'The AI did not return a travel plan. Please try again.',
        502
      );
    }


    let generatedPlan;


    /*
     * Structured output should be valid JSON.
     *
     * We still catch parsing problems so one bad provider
     * response cannot crash the backend.
     */
    try {
      generatedPlan =
        JSON.parse(content);
    } catch {
      throw createServiceError(
        'The AI returned an unreadable travel plan. Please try again.',
        502
      );
    }


    return validateGeneratedPlan(
      generatedPlan,
      plannerInput.duration
    );
  } catch (error) {
    /*
     * Errors we intentionally created above already have a safe
     * message and status code.
     *
     * Preserve them rather than replacing them with a generic
     * provider error.
     */
    if (
      error?.statusCode
    ) {
      throw error;
    }


    /*
     * HTTP 429 means the Groq account has temporarily reached
     * its free-tier usage or rate limit.
     *
     * Feature 4 has a strict zero-cost requirement, so we do
     * NOT automatically switch to a paid service.
     */
    if (
      error?.status === 429
    ) {
      throw createServiceError(
        'The temporary AI usage limit has been reached. Please try again later.',
        429
      );
    }


    /*
     * Never expose provider internals, secret configuration or
     * the Groq API key to the React frontend.
     */
    throw createServiceError(
      'The AI Travel Planner is temporarily unavailable. Please try again.',
      503
    );
  }
}


export {
  generateTravelPlanWithGroq,
};