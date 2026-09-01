import PublicRoom from '../models/publicRoom.model.js';

import {
  convertAiPlanToTrip,
} from './ai-trip-conversion.service.js';


/*
 * ============================================================
 * RAFI FEATURE 4 - AI PLAN TO PUBLIC ROOM CONVERSION
 * ============================================================
 *
 * The same AI plan can become:
 *
 * AI Plan
 *    ↓
 * normal Trip
 *    ↓
 * PublicRoom wrapper
 *
 * Groq is NOT called again.
 *
 * Existing Public Room:
 *
 * - discovery,
 * - join requests,
 * - members,
 * - chat
 *
 * continue working normally.
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


function normalizeText(
  value
) {
  return typeof value ===
    'string'
    ? value.trim()
    : '';
}


function normalizeDate(
  value
) {
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
 * Public Rooms support up to 10 interest tags.
 */
function normalizeInterestTags(
  value
) {
  if (
    !Array.isArray(
      value
    )
  ) {
    return [];
  }


  const result =
    [];


  const seen =
    new Set();


  value.forEach(
    (item) => {
      if (
        typeof item !==
        'string'
      ) {
        return;
      }


      const tag =
        item.trim();


      if (!tag) {
        return;
      }


      const key =
        tag.toLowerCase();


      if (
        seen.has(
          key
        )
      ) {
        return;
      }


      seen.add(
        key
      );


      result.push(
        tag
      );
    }
  );


  return result.slice(
    0,
    10
  );
}


/*
 * ============================================================
 * CONVERT AI PLAN TO PUBLIC ROOM
 * ============================================================
 */
async function convertAiPlanToPublicRoom({
  aiTravelPlan,
  travelerId,
  roomData = {},
}) {
  /*
   * ----------------------------------------------------------
   * 1. DUPLICATE PROTECTION
   * ----------------------------------------------------------
   */
  if (
    aiTravelPlan
      .convertedPublicRoomId
  ) {
    const existingRoom =
      await PublicRoom.findOne({
        _id:
          aiTravelPlan
            .convertedPublicRoomId,

        creator:
          travelerId,
      });


    if (existingRoom) {
      await existingRoom.populate([
        {
          path:
            'creator',

          select:
            'name profileImageUrl',
        },

        {
          path:
            'members',

          select:
            'name profileImageUrl',
        },
      ]);


      return {
        room:
          existingRoom,

        trip:
          null,

        wasAlreadyConverted:
          true,

        tripWasAlreadyConverted:
          true,

        skippedPlaces:
          [],
      };
    }


    /*
     * The Public Room may have been deleted later.
     *
     * Clear the stale reference so another room can be created.
     */
    aiTravelPlan
      .convertedPublicRoomId =
      null;


    await aiTravelPlan.save();
  }


  /*
   * ----------------------------------------------------------
   * 2. REUSE OR CREATE THE NORMAL TRIP
   * ----------------------------------------------------------
   *
   * If Save as My Trip was already used, this immediately
   * returns the existing Trip.
   *
   * Otherwise it creates Trip -> Day -> Stop now.
   */
  const {
    trip,
    wasAlreadyConverted:
      tripWasAlreadyConverted,
    skippedPlaces,
  } =
    await convertAiPlanToTrip({
      aiTravelPlan,

      travelerId,
    });


  /*
   * ----------------------------------------------------------
   * 3. BUILD PUBLIC ROOM METADATA
   * ----------------------------------------------------------
   *
   * Most values already exist in the reviewed AI plan.
   *
   * roomData remains optional so the frontend can later allow
   * customization without changing this API again.
   */


  let roomName =
    normalizeText(
      roomData.roomName
    ) ||
    normalizeText(
      aiTravelPlan.tripTitle
    );


  roomName =
    roomName.slice(
      0,
      100
    );


  if (
    roomName.length <
    2
  ) {
    throw createHttpError(
      'Public room name must contain at least 2 characters.',
      400
    );
  }


  let description =
    normalizeText(
      roomData.description
    ) ||
    normalizeText(
      aiTravelPlan.summary
    );


  /*
   * Existing PublicRoom requires at least 10 characters.
   */
  if (
    description.length <
    10
  ) {
    description =
      `${roomName} public travel plan.`;
  }


  description =
    description.slice(
      0,
      2000
    );


  const interestTags =
    normalizeInterestTags(
      Array.isArray(
        roomData.interestTags
      )
        ? roomData.interestTags
        : aiTravelPlan.interests
    );


  if (
    interestTags.length ===
    0
  ) {
    throw createHttpError(
      'The Public Room requires at least one interest tag.',
      400
    );
  }


  /*
   * By default, the AI planner's traveler count becomes the
   * Public Room member limit.
   *
   * PublicRoom requires at least 2 members because the creator
   * counts as member #1.
   *
   * roomData.maxMembers can override this later.
   */
  const requestedMaxMembers =
    roomData.maxMembers !==
      undefined
      ? Number(
          roomData.maxMembers
        )
      : Math.max(
          2,
          Number(
            aiTravelPlan.travelers
          ) || 2
        );


  if (
    !Number.isInteger(
      requestedMaxMembers
    ) ||
    requestedMaxMembers <
      2 ||
    requestedMaxMembers >
      100
  ) {
    throw createHttpError(
      'Maximum members must be a whole number between 2 and 100.',
      400
    );
  }


  const estimatedBudget =
    roomData.estimatedBudget !==
      undefined
      ? Number(
          roomData.estimatedBudget
        )
      : Number(
          aiTravelPlan.budget
        );


  if (
    !Number.isFinite(
      estimatedBudget
    ) ||
    estimatedBudget <
      0
  ) {
    throw createHttpError(
      'Estimated budget must be a non-negative number.',
      400
    );
  }


  const startDate =
    normalizeDate(
      aiTravelPlan.startDate
    );


  const lastAiDay =
    aiTravelPlan.days[
      aiTravelPlan.days.length -
        1
    ];


  const endDate =
    normalizeDate(
      lastAiDay?.date
    );


  if (
    !startDate ||
    !endDate
  ) {
    throw createHttpError(
      'The saved AI plan contains invalid travel dates.',
      500
    );
  }


  const coverPhoto =
    normalizeText(
      roomData.coverPhoto
    );


  let room =
    null;


  try {
    /*
     * --------------------------------------------------------
     * 4. CREATE NORMAL PUBLIC ROOM
     * --------------------------------------------------------
     *
     * Existing authorization expectations remain unchanged:
     *
     * creator = logged-in traveler
     * members = creator initially
     */
    room =
      await PublicRoom.create({
        creator:
          travelerId,

        tripId:
          trip._id,

        roomName,

        destination:
          normalizeText(
            aiTravelPlan.destination
          ),

        startDate,

        endDate,

        estimatedBudget,

        maxMembers:
          requestedMaxMembers,

        description,

        interestTags,

        coverPhoto,

        members: [
          travelerId,
        ],

        status:
          'open',
      });


    /*
     * --------------------------------------------------------
     * 5. RECORD PUBLIC ROOM CONVERSION
     * --------------------------------------------------------
     */
    aiTravelPlan
      .convertedPublicRoomId =
      room._id;


    await aiTravelPlan.save();


    await room.populate([
      {
        path:
          'creator',

        select:
          'name profileImageUrl',
      },

      {
        path:
          'members',

        select:
          'name profileImageUrl',
      },
    ]);


    return {
      room,

      trip,

      wasAlreadyConverted:
        false,

      tripWasAlreadyConverted,

      skippedPlaces,
    };
  } catch (error) {
    /*
     * If the room was created but recording its conversion
     * failed, remove only that incomplete Public Room.
     *
     * The underlying Trip stays available and can safely be
     * reused on another attempt.
     */
    if (
      room?._id &&
      !aiTravelPlan
        .convertedPublicRoomId
    ) {
      try {
        await PublicRoom.findByIdAndDelete(
          room._id
        );
      } catch (
        cleanupError
      ) {
        console.error(
          'Failed to clean up incomplete AI Public Room:',
          cleanupError
        );
      }
    }


    throw error;
  }
}


export {
  convertAiPlanToPublicRoom,
};