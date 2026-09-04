import Hotel from '../models/hotel.model.js';

import {
  findCheapestAvailableRoomOption,
  getRoomAvailabilityForHotel,
} from './hotel-availability.service.js';


/*
 * ============================================================
 * RAFI FEATURE 4 - AI HOTEL ENRICHMENT SERVICE
 * ============================================================
 *
 * Groq only gives us a broad overnight area such as:
 *
 * "Cox's Bazar"
 *
 * This service then uses REAL Ghuraghuri data to:
 *
 * 1. Find active hotels in that area.
 * 2. Check real booking availability for the required night.
 * 3. Check whether the rooms can fit the travel party.
 * 4. Pick a simple cheapest suitable option.
 * 5. Add the trusted hotel data to the AI result.
 *
 * If nothing suitable exists, Feature 4 falls back to:
 *
 * "Camping / Self-arranged stay"
 *
 * with BDT 0 accommodation cost.
 */


/*
 * ------------------------------------------------------------
 * ESCAPE REGEX TEXT
 * ------------------------------------------------------------
 *
 * stayArea comes from Groq.
 *
 * Hotel search already uses case-insensitive location matching,
 * but we should not allow special regex characters in AI text
 * to accidentally change the search meaning.
 */
function escapeRegex(
  value
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}


/*
 * ------------------------------------------------------------
 * CREATE ONE-NIGHT STAY RANGE
 * ------------------------------------------------------------
 *
 * Example:
 *
 * Day date:
 * 2026-08-28
 *
 * Hotel stay:
 * check-in  = 2026-08-28
 * check-out = 2026-08-29
 *
 * The final day may have requiresStay = false, in which case
 * this function will never be used.
 */
function createStayDates(
  dayDate
) {
  const checkInDate =
    new Date(dayDate);


  const checkOutDate =
    new Date(dayDate);


  checkOutDate.setUTCDate(
    checkOutDate.getUTCDate() +
      1
  );


  return {
    checkInDate,
    checkOutDate,
  };
}


/*
 * ------------------------------------------------------------
 * FIND ACTIVE HOTELS IN THE STAY AREA
 * ------------------------------------------------------------
 *
 * This follows Kusum's existing hotel-search convention:
 *
 * location.city
 * OR
 * location.address
 *
 * with case-insensitive matching.
 */
async function findHotelsForStayArea(
  stayArea
) {
  const cleanStayArea =
    typeof stayArea ===
      'string'
      ? stayArea.trim()
      : '';


  if (!cleanStayArea) {
    return [];
  }


  const escapedArea =
    escapeRegex(
      cleanStayArea
    );


  /*
   * Feature 4 only needs a small set of practical candidates.
   *
   * We are not building a complex hotel recommendation engine.
   */
  return Hotel.find({
    status:
      'active',

    $or: [
      {
        'location.city': {
          $regex:
            escapedArea,

          $options:
            'i',
        },
      },

      {
        'location.address': {
          $regex:
            escapedArea,

          $options:
            'i',
        },
      },
    ],
  })
    .sort({
      createdAt:
        -1,
    })
    .limit(10);
}


/*
 * ------------------------------------------------------------
 * CHECK ONE HOTEL
 * ------------------------------------------------------------
 *
 * A hotel is suitable only when at least one room type:
 *
 * - has rooms available for the requested night,
 * - has enough total capacity for the travel party.
 */
async function buildHotelCandidate({
  hotel,
  travelers,
  checkInDate,
  checkOutDate,
}) {
  const roomAvailability =
    await getRoomAvailabilityForHotel({
      hotel,
      checkInDate,
      checkOutDate,
    });


  const roomOption =
    findCheapestAvailableRoomOption(
      roomAvailability,
      travelers
    );


  if (!roomOption) {
    return null;
  }


  return {
    hotel,

    roomOption,

    /*
     * This is the estimated accommodation cost for the WHOLE
     * travel party for this one overnight stay.
     */
    accommodationEstimate:
      roomOption.totalNightlyCost,
  };
}


/*
 * ------------------------------------------------------------
 * FIND THE BEST SIMPLE HOTEL MATCH
 * ------------------------------------------------------------
 *
 * We deliberately keep the selection logic understandable:
 *
 * 1. Search real active Ghuraghuri hotels in the stay area.
 * 2. Remove hotels with no practical available room option.
 * 3. Choose the cheapest total accommodation estimate.
 *
 * This is enough for the course feature and easy to explain
 * during viva.
 */
async function findSuitableHotel({
  stayArea,
  travelers,
  checkInDate,
  checkOutDate,
}) {
  const hotels =
    await findHotelsForStayArea(
      stayArea
    );


  if (
    hotels.length ===
    0
  ) {
    return null;
  }


  /*
   * Availability checks are independent, so the small candidate
   * list can be checked together.
   */
  const candidates =
    await Promise.all(
      hotels.map(
        (hotel) =>
          buildHotelCandidate({
            hotel,
            travelers,
            checkInDate,
            checkOutDate,
          })
      )
    );


  const suitableCandidates =
    candidates.filter(Boolean);


  if (
    suitableCandidates.length ===
    0
  ) {
    return null;
  }


  suitableCandidates.sort(
    (
      firstCandidate,
      secondCandidate
    ) => {
      const costDifference =
        firstCandidate
          .accommodationEstimate -
        secondCandidate
          .accommodationEstimate;


      if (
        costDifference !==
        0
      ) {
        return costDifference;
      }


      /*
       * Stable secondary ordering makes results predictable
       * when two hotels have the same estimated cost.
       */
      return firstCandidate
        .hotel
        .name
        .localeCompare(
          secondCandidate
            .hotel
            .name
        );
    }
  );


  return suitableCandidates[0];
}


/*
 * ------------------------------------------------------------
 * HOTEL RESULT
 * ------------------------------------------------------------
 *
 * Convert the selected MongoDB hotel into the compact trusted
 * information needed by the AI result page.
 *
 * We intentionally do not copy the entire Hotel document into
 * AiTravelPlan.
 */
function buildHotelResult({
  candidate,
  checkInDate,
  checkOutDate,
}) {
  const {
    hotel,
    roomOption,
  } =
    candidate;


  return {
    hotelId:
      hotel._id,

    name:
      hotel.name,

    city:
      hotel.location?.city ||
      '',

    address:
      hotel.location?.address ||
      '',

    photo:
      Array.isArray(
        hotel.photos
      ) &&
      hotel.photos.length > 0
        ? hotel.photos[0]
        : '',

    /*
     * Card display:
     *
     * "From BDT 3,500 / room / night"
     *
     * This is a real room price from the selected available
     * room type.
     */
    startingPrice:
      roomOption.pricePerNight,

    checkInDate,

    checkOutDate,
  };
}


/*
 * ------------------------------------------------------------
 * ENRICH ONE DAY
 * ------------------------------------------------------------
 */
async function enrichDayWithHotel({
  day,
  travelers,
}) {
  /*
   * No overnight stay is required.
   *
   * Example:
   *
   * final return day.
   */
  if (
    !day.requiresStay
  ) {
    return {
      ...day,

      hotel:
        null,

      accommodationType:
        'none',

      accommodationEstimate:
        0,

      estimatedDayTotal:
        day.foodEstimate +
        day.transportEstimate +
        day.activityEstimate,
    };
  }


  /*
   * If Groq somehow provides an empty stay area despite the
   * structured validation, do not crash the whole plan.
   *
   * Use the safe self-arranged fallback instead.
   */
  if (
    !day.stayArea?.trim()
  ) {
    return {
      ...day,

      hotel:
        null,

      accommodationType:
        'self-arranged',

      accommodationEstimate:
        0,

      estimatedDayTotal:
        day.foodEstimate +
        day.transportEstimate +
        day.activityEstimate,
    };
  }


  const {
    checkInDate,
    checkOutDate,
  } =
    createStayDates(
      day.date
    );


  const candidate =
    await findSuitableHotel({
      stayArea:
        day.stayArea,

      travelers,

      checkInDate,

      checkOutDate,
    });


  /*
   * No matching hotel OR hotels exist but none are available.
   *
   * We do not invent a hotel.
   *
   * We also do not claim camping is legally free.
   *
   * BDT 0 simply means Ghuraghuri has no registered
   * accommodation cost to add to the estimate.
   */
  if (!candidate) {
    return {
      ...day,

      hotel:
        null,

      accommodationType:
        'self-arranged',

      accommodationEstimate:
        0,

      estimatedDayTotal:
        day.foodEstimate +
        day.transportEstimate +
        day.activityEstimate,
    };
  }


  const hotel =
    buildHotelResult({
      candidate,
      checkInDate,
      checkOutDate,
    });


  const accommodationEstimate =
    candidate
      .accommodationEstimate;


  return {
    ...day,

    hotel,

    accommodationType:
      'hotel',

    accommodationEstimate,

    estimatedDayTotal:
      day.foodEstimate +
      day.transportEstimate +
      day.activityEstimate +
      accommodationEstimate,
  };
}


/*
 * ============================================================
 * ENRICH COMPLETE AI PLAN
 * ============================================================
 *
 * Input:
 *
 * Neutral Groq-generated days.
 *
 * Output:
 *
 * Ghuraghuri-enriched days containing either:
 *
 * real hotel
 *
 * OR
 *
 * Camping / Self-arranged stay.
 */
async function enrichTravelPlanWithHotels({
  days,
  travelers,
}) {
  /*
   * Process days in order.
   *
   * Sequential processing makes the request behavior easier to
   * understand/debug during this course project and avoids
   * launching many hotel/booking queries at the same time.
   */
  const enrichedDays =
    [];


  for (
    const day of days
  ) {
    const enrichedDay =
      await enrichDayWithHotel({
        day,
        travelers,
      });


    enrichedDays.push(
      enrichedDay
    );
  }


  const estimatedTotal =
    enrichedDays.reduce(
      (
        total,
        day
      ) =>
        total +
        day.estimatedDayTotal,

      0
    );


  return {
    days:
      enrichedDays,

    estimatedTotal,
  };
}


export {
  enrichTravelPlanWithHotels,
};