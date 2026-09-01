import Day from '../models/day.model.js';
import Stop from '../models/stop.model.js';
import Trip from '../models/trip.model.js';


/*
 * ============================================================
 * RAFI FEATURE 4 - AI PLAN TO MY TRIP CONVERSION
 * ============================================================
 *
 * Converts a saved AiTravelPlan into Farhan's existing:
 *
 * Trip -> Day -> Stop
 *
 * structure.
 *
 * Groq is NOT called again here.
 *
 * Nominatim is used only because normal Stops require trusted
 * latitude and longitude.
 */


const NOMINATIM_URL =
  'https://nominatim.openstreetmap.org/search';


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
 * Public Nominatim requests should be spaced apart.
 */
function wait(
  milliseconds
) {
  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}


/*
 * ------------------------------------------------------------
 * LOCATION LOOKUP
 * ------------------------------------------------------------
 */
async function findCoordinates(
  placeName,
  area = ''
) {
  const searchText =
    area
      ? `${placeName}, ${area}`
      : placeName;


  const query =
    new URLSearchParams({
      q:
        searchText,

      format:
        'jsonv2',

      limit:
        '1',

      countrycodes:
        'bd',
    });


  let response;


  try {
    response =
      await fetch(
        `${NOMINATIM_URL}?${query.toString()}`,
        {
          headers: {
            Accept:
              'application/json',

            'User-Agent':
              'Ghuraghuri-CSE471-Project/1.0',
          },
        }
      );
  } catch {
    return null;
  }


  if (!response.ok) {
    return null;
  }


  let results;


  try {
    results =
      await response.json();
  } catch {
    return null;
  }


  if (
    !Array.isArray(
      results
    ) ||
    results.length ===
      0
  ) {
    return null;
  }


  const latitude =
    Number(
      results[0].lat
    );


  const longitude =
    Number(
      results[0].lon
    );


  if (
    !Number.isFinite(
      latitude
    ) ||
    latitude < -90 ||
    latitude > 90 ||
    !Number.isFinite(
      longitude
    ) ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }


  return {
    latitude,
    longitude,
  };
}


/*
 * Try several useful versions of the place name.
 *
 * Example:
 *
 * Laboni Beach, Cox's Bazar
 *
 * is more useful than searching only:
 *
 * Laboni Beach
 */
async function resolvePlace(
  placeName,
  day,
  destination
) {
  const areas =
    [
      day.endArea,
      day.stayArea,
      destination,
      '',
    ];


  for (
    const area
    of areas
  ) {
    const coordinates =
      await findCoordinates(
        placeName,
        area
      );


    if (coordinates) {
      return coordinates;
    }


    await wait(
      1100
    );
  }


  return null;
}


/*
 * ------------------------------------------------------------
 * CLEANUP
 * ------------------------------------------------------------
 *
 * Removes only records created for an incomplete conversion.
 */
async function removeIncompleteTrip(
  tripId
) {
  await Stop.deleteMany({
    trip:
      tripId,
  });


  await Day.deleteMany({
    trip:
      tripId,
  });


  await Trip.findByIdAndDelete(
    tripId
  );
}


/*
 * ============================================================
 * CONVERT AI PLAN TO NORMAL TRIP
 * ============================================================
 */
async function convertAiPlanToTrip({
  aiTravelPlan,
  travelerId,
}) {
  /*
   * ----------------------------------------------------------
   * 1. DUPLICATE PROTECTION
   * ----------------------------------------------------------
   */
  if (
    aiTravelPlan.convertedTripId
  ) {
    const existingTrip =
      await Trip.findOne({
        _id:
          aiTravelPlan.convertedTripId,

        owner:
          travelerId,
      });


    if (existingTrip) {
      return {
        trip:
          existingTrip,

        wasAlreadyConverted:
          true,

        skippedPlaces:
          [],
      };
    }


    /*
     * The old Trip may have been manually deleted.
     *
     * Clear the stale reference so conversion can happen again.
     */
    aiTravelPlan.convertedTripId =
      null;


    await aiTravelPlan.save();
  }


  const startDate =
    new Date(
      aiTravelPlan.startDate
    );


  const lastAiDay =
    aiTravelPlan.days[
      aiTravelPlan.days.length -
        1
    ];


  const endDate =
    new Date(
      lastAiDay.date
    );


  let trip;


  try {
    /*
     * --------------------------------------------------------
     * 2. CREATE NORMAL TRIP
     * --------------------------------------------------------
     *
     * Destination coordinates are optional on Trip.
     */
    trip =
      await Trip.create({
        owner:
          travelerId,

        tripName:
          aiTravelPlan
            .tripTitle
            .slice(
              0,
              100
            ),

        destination: {
          name:
            aiTravelPlan
              .destination,

          latitude:
            null,

          longitude:
            null,
        },

        startDate,

        endDate,

        collaborators:
          [],

        coverPhoto:
          '',
      });


    /*
     * --------------------------------------------------------
     * 3. CREATE NORMAL DAYS
     * --------------------------------------------------------
     */
    const dayDocuments =
      aiTravelPlan.days.map(
        (
          aiDay,
          index
        ) => ({
          trip:
            trip._id,

          dayNumber:
            index + 1,

          date:
            aiDay.date,
        })
      );


    const createdDays =
      await Day.insertMany(
        dayDocuments
      );


    /*
     * --------------------------------------------------------
     * 4. CREATE NORMAL STOPS
     * --------------------------------------------------------
     */
    const skippedPlaces =
      [];


    let createdStopCount =
      0;


    for (
      let dayIndex = 0;
      dayIndex <
        aiTravelPlan.days.length;
      dayIndex += 1
    ) {
      const aiDay =
        aiTravelPlan.days[
          dayIndex
        ];


      const createdDay =
        createdDays[
          dayIndex
        ];


      let stopOrder =
        1;


      for (
        const rawPlaceName
        of aiDay.places
      ) {
        const placeName =
          typeof rawPlaceName ===
            'string'
            ? rawPlaceName.trim()
            : '';


        if (!placeName) {
          continue;
        }


        const coordinates =
          await resolvePlace(
            placeName,
            aiDay,
            aiTravelPlan.destination
          );


        if (!coordinates) {
          skippedPlaces.push({
            day:
              dayIndex + 1,

            placeName,
          });

          continue;
        }


        await Stop.create({
          trip:
            trip._id,

          day:
            createdDay._id,

          placeName,

          description:
            'Suggested by AI Travel Planner.',

          latitude:
            coordinates.latitude,

          longitude:
            coordinates.longitude,

          visitTime:
            '',

          estimatedDurationMinutes:
            0,

          order:
            stopOrder,
        });


        stopOrder +=
          1;


        createdStopCount +=
          1;


        await wait(
          1100
        );
      }
    }


    /*
     * --------------------------------------------------------
     * 5. DO NOT SAVE AN EMPTY ITINERARY
     * --------------------------------------------------------
     *
     * Some unresolved places are acceptable.
     *
     * But if ZERO places could be resolved, creating an empty
     * My Trip would be misleading.
     *
     * Throwing here sends execution to the cleanup block below.
     */
    if (
      createdStopCount ===
      0
    ) {
      throw createHttpError(
        'None of the AI itinerary places could be matched to trusted locations. Please generate another plan and try again.',
        422
      );
    }


    /*
     * --------------------------------------------------------
     * 6. RECORD SUCCESSFUL CONVERSION
     * --------------------------------------------------------
     */
    aiTravelPlan.convertedTripId =
      trip._id;


    await aiTravelPlan.save();


    return {
      trip,

      wasAlreadyConverted:
        false,

      skippedPlaces,
    };
  } catch (error) {
    /*
     * Never leave behind an incomplete Trip.
     */
    if (trip?._id) {
      try {
        await removeIncompleteTrip(
          trip._id
        );
      } catch (
        cleanupError
      ) {
        console.error(
          'Failed to clean up incomplete AI trip:',
          cleanupError
        );
      }
    }


    throw error;
  }
}


export {
  convertAiPlanToTrip,
};