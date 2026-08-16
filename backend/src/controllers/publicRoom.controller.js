import mongoose from 'mongoose';

import JoinRequest from '../models/joinRequest.model.js';
import PublicRoom from '../models/publicRoom.model.js';

// ============================================================
// HELPER FUNCTIONS
// ============================================================
//
// These small functions perform repeated jobs for the controller.
//
// Keeping them here makes the main controller functions easier
// to read and easier to explain during a viva.

/**
 * Converts an incoming date value into a normalized JavaScript Date.
 *
 * @param {string|Date} value
 * A date received from the frontend/API.
 *
 * @returns {Date|null}
 * A valid normalized date or null when the input is invalid.
 */
function normalizeDate(value) {
  const date = new Date(value);

  // JavaScript can create an "Invalid Date" object.
  //
  // getTime() returns NaN for an invalid date.
  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  // For this feature we care about the calendar day,
  // not the exact hour/minute/second.
  //
  // Normalizing to midnight UTC makes comparisons more predictable.
  date.setUTCHours(
    0,
    0,
    0,
    0
  );

  return date;
}

/**
 * Escapes special regular-expression characters.
 *
 * MongoDB regex searches are useful for case-insensitive
 * destination and interest searching.
 *
 * We escape user input so characters like:
 *
 * .
 * *
 * +
 * ?
 *
 * behave like normal text instead of regex instructions.
 */
function escapeRegularExpression(
  value
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

/**
 * Cleans interest tags received from the frontend.
 *
 * Example input:
 *
 * [
 *   " Beach ",
 *   "Food",
 *   "",
 *   "Food"
 * ]
 *
 * becomes:
 *
 * [
 *   "Beach",
 *   "Food"
 * ]
 */
function normalizeInterestTags(
  value
) {
  // Someone could bypass the React frontend and send
  // completely different JSON directly to the API.
  //
  // Therefore we always check the type on the backend.
  if (!Array.isArray(value)) {
    return [];
  }

  const cleanedTags =
    value
      // Ignore anything that is not text.
      .filter(
        (tag) =>
          typeof tag ===
          'string'
      )

      // Remove spaces from the beginning/end.
      .map((tag) =>
        tag.trim()
      )

      // Remove empty strings.
      .filter(Boolean);

  // Set removes exact duplicate strings.
  const uniqueTags = [
    ...new Set(
      cleanedTags
    ),
  ];

  // The model allows a maximum of 10 tags.
  return uniqueTags.slice(
    0,
    10
  );
}

/**
 * Validates the data required to create one public room.
 *
 * Returning a string means validation failed.
 * Returning null means the data passed these checks.
 */
function getValidationError(
  body
) {
  if (
    typeof body.roomName !==
      'string' ||
    body.roomName
      .trim()
      .length < 2
  ) {
    return 'Room name must contain at least 2 characters.';
  }

  if (
    typeof body.destination !==
      'string' ||
    body.destination
      .trim()
      .length < 2
  ) {
    return 'Destination must contain at least 2 characters.';
  }

  const startDate =
    normalizeDate(
      body.startDate
    );

  const endDate =
    normalizeDate(
      body.endDate
    );

  if (
    !startDate ||
    !endDate
  ) {
    return 'Valid start and end dates are required.';
  }

  if (
    endDate <
    startDate
  ) {
    return 'End date cannot be before the start date.';
  }

  const estimatedBudget =
    Number(
      body.estimatedBudget
    );

  if (
    !Number.isFinite(
      estimatedBudget
    ) ||
    estimatedBudget < 0
  ) {
    return 'Estimated budget must be a non-negative number.';
  }

  const maxMembers =
    Number(
      body.maxMembers
    );

  if (
    !Number.isInteger(
      maxMembers
    ) ||
    maxMembers < 2 ||
    maxMembers > 100
  ) {
    return 'Maximum members must be a whole number between 2 and 100.';
  }

  if (
    typeof body.description !==
      'string' ||
    body.description
      .trim()
      .length < 10
  ) {
    return 'Description must contain at least 10 characters.';
  }

  const interestTags =
    normalizeInterestTags(
      body.interestTags
    );

  if (
    interestTags.length === 0
  ) {
    return 'Add at least one interest tag.';
  }

  return null;
}

/**
 * Creates the exact object that we want to save to MongoDB.
 *
 * Notice that we DO NOT simply write:
 *
 * PublicRoom.create(req.body)
 *
 * Instead, we explicitly choose the allowed fields.
 *
 * This is safer because unexpected fields sent from the
 * frontend are not silently stored.
 */
function buildRoomCreationData(
  body,
  creatorId
) {
  return {
    // Ownership comes from the authenticated user.
    creator:
      creatorId,

    roomName:
      body.roomName.trim(),

    destination:
      body.destination.trim(),

    startDate:
      normalizeDate(
        body.startDate
      ),

    endDate:
      normalizeDate(
        body.endDate
      ),

    estimatedBudget:
      Number(
        body.estimatedBudget
      ),

    maxMembers:
      Number(
        body.maxMembers
      ),

    description:
      body.description.trim(),

    interestTags:
      normalizeInterestTags(
        body.interestTags
      ),

    coverPhoto:
      typeof body.coverPhoto ===
      'string'
        ? body.coverPhoto.trim()
        : '',

    // Every creator automatically becomes the
    // first member of their own room.
    members: [
      creatorId,
    ],
  };
}

// ============================================================
// CREATE PUBLIC ROOM
// ============================================================

async function createPublicRoom(
  req,
  res,
  next
) {
  try {
    // First validate the browser-supplied room information.
    const validationError =
      getValidationError(
        req.body
      );

    if (validationError) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            validationError,
        });
    }

    // authenticateUser middleware has already loaded the
    // currently logged-in user's real database record.
    //
    // Therefore req.user._id is trustworthy for ownership.
    //
    // We DO NOT accept creatorId from req.body.
    const room =
      await PublicRoom.create(
        buildRoomCreationData(
          req.body,
          req.user._id
        )
      );

    // The MongoDB document stores User ObjectIds.
    //
    // populate() replaces those IDs in this response with
    // selected safe User information so the frontend can
    // display creator/member names.
    await room.populate([
      {
        path: 'creator',

        select:
          'name profileImageUrl',
      },
      {
        path: 'members',

        select:
          'name profileImageUrl',
      },
    ]);

    return res
      .status(201)
      .json({
        success: true,

        message:
          'Public event room created successfully.',

        data: room,
      });
  } catch (error) {
    // Unexpected errors go to the project's existing
    // centralized error middleware.
    return next(error);
  }
}

// ============================================================
// GET ROOMS CREATED BY CURRENT USER
// ============================================================

async function getMyPublicRooms(
  req,
  res,
  next
) {
  try {
    // Only fetch rooms whose creator ID matches
    // the currently authenticated traveler.
    const rooms =
      await PublicRoom.find({
        creator:
          req.user._id,
      })
        .populate(
          'members',
          'name profileImageUrl'
        )
        .sort({
          // Upcoming rooms appear first by their travel date.
          startDate: 1,

          // createdAt acts as a secondary sorting rule.
          createdAt: -1,
        })
        .lean();

    // Returning HTTP 200 with an empty array is correct here.
    //
    // "No rooms yet" is not an API error.
    if (
      rooms.length === 0
    ) {
      return res
        .status(200)
        .json({
          success: true,

          message:
            'No created rooms yet.',

          data: [],
        });
    }

    const roomIds =
      rooms.map(
        (room) =>
          room._id
      );

    // Your Figma dashboard contains a "Join Requests Pending"
    // summary.
    //
    // Instead of doing:
    //
    // Room 1 -> query requests
    // Room 2 -> query requests
    // Room 3 -> query requests
    //
    // we use one MongoDB aggregation for all rooms.
    const pendingCounts =
      await JoinRequest.aggregate([
        {
          // Only pending requests belonging to this creator's
          // public rooms are relevant.
          $match: {
            room: {
              $in: roomIds,
            },

            status:
              'pending',
          },
        },

        {
          // Group requests by room ID and count each group.
          $group: {
            _id: '$room',

            count: {
              $sum: 1,
            },
          },
        },
      ]);

    // A Map allows us to quickly find:
    //
    // room ID -> pending request count
    const pendingCountByRoom =
      new Map(
        pendingCounts.map(
          (item) => [
            item._id.toString(),
            item.count,
          ]
        )
      );

    // Add pendingJoinRequests to each response object.
    //
    // This field is calculated for the API response.
    // It does NOT need to be stored permanently in PublicRoom.
    const roomsWithCounts =
      rooms.map(
        (room) => ({
          ...room,

          pendingJoinRequests:
            pendingCountByRoom.get(
              room._id.toString()
            ) || 0,
        })
      );

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Created public rooms loaded successfully.',

        data:
          roomsWithCounts,
      });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// DISCOVER PUBLIC ROOMS
// ============================================================

async function getPublicRooms(
  req,
  res,
  next
) {
  try {
    // These values come from URL query parameters.
    //
    // Example:
    //
    // /api/v1/public-rooms
    //   ?destination=Dhaka
    //   &maxBudget=10000
    //   &interest=Food
    const {
      destination = '',
      startDate = '',
      endDate = '',
      minBudget = '',
      maxBudget = '',
      interest = '',
    } = req.query;

    // Discovery should show open rooms created by OTHER
    // travelers.
    //
    // The current traveler already sees their own rooms
    // in "Your Created Rooms".
    const filters = {
      status: 'open',

      creator: {
        $ne:
          req.user._id,
      },
    };

    // ----------------------------
    // Destination filter
    // ----------------------------

    if (
      typeof destination ===
        'string' &&
      destination.trim()
    ) {
      filters.destination = {
        // Regex allows partial matching.
        //
        // Searching "Cox" can therefore match
        // "Cox's Bazar".
        $regex:
          escapeRegularExpression(
            destination.trim()
          ),

        // "i" means case-insensitive.
        $options: 'i',
      };
    }

    // ----------------------------
    // Date filters
    // ----------------------------

    const requestedStartDate =
      startDate
        ? normalizeDate(
            startDate
          )
        : null;

    const requestedEndDate =
      endDate
        ? normalizeDate(
            endDate
          )
        : null;

    if (
      startDate &&
      !requestedStartDate
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Start-date filter is invalid.',
        });
    }

    if (
      endDate &&
      !requestedEndDate
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'End-date filter is invalid.',
        });
    }

    if (
      requestedStartDate &&
      requestedEndDate &&
      requestedEndDate <
        requestedStartDate
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Filter end date cannot be before the filter start date.',
        });
    }

    // Date filtering uses overlap logic.
    //
    // A room overlaps the requested date range when:
    //
    // room.startDate <= requestedEndDate
    //
    // AND
    //
    // room.endDate >= requestedStartDate
    //
    // This means the traveler can discover rooms whose trip
    // overlaps the dates they are interested in.

    if (
      requestedEndDate
    ) {
      filters.startDate = {
        $lte:
          requestedEndDate,
      };
    }

    if (
      requestedStartDate
    ) {
      filters.endDate = {
        $gte:
          requestedStartDate,
      };
    }

    // ----------------------------
    // Budget filters
    // ----------------------------

    const numericMinBudget =
      minBudget === ''
        ? null
        : Number(
            minBudget
          );

    const numericMaxBudget =
      maxBudget === ''
        ? null
        : Number(
            maxBudget
          );

    if (
      numericMinBudget !==
        null &&
      (
        !Number.isFinite(
          numericMinBudget
        ) ||
        numericMinBudget < 0
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Minimum budget must be a non-negative number.',
        });
    }

    if (
      numericMaxBudget !==
        null &&
      (
        !Number.isFinite(
          numericMaxBudget
        ) ||
        numericMaxBudget < 0
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Maximum budget must be a non-negative number.',
        });
    }

    if (
      numericMinBudget !==
        null &&
      numericMaxBudget !==
        null &&
      numericMinBudget >
        numericMaxBudget
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Minimum budget cannot be greater than maximum budget.',
        });
    }

    // Only create an estimatedBudget filter when the
    // traveler actually supplied at least one budget value.
    if (
      numericMinBudget !==
        null ||
      numericMaxBudget !==
        null
    ) {
      filters.estimatedBudget =
        {};

      if (
        numericMinBudget !==
        null
      ) {
        filters.estimatedBudget.$gte =
          numericMinBudget;
      }

      if (
        numericMaxBudget !==
        null
      ) {
        filters.estimatedBudget.$lte =
          numericMaxBudget;
      }
    }

    // ----------------------------
    // Interest filter
    // ----------------------------

    if (
      typeof interest ===
        'string' &&
      interest.trim()
    ) {
      // interestTags is an array of strings.
      //
      // MongoDB can match the regex against the individual
      // strings inside that array.
      filters.interestTags = {
        $regex:
          escapeRegularExpression(
            interest.trim()
          ),

        $options: 'i',
      };
    }

    // Finally run the MongoDB query.
    const rooms =
      await PublicRoom.find(
        filters
      )
        .populate(
          'creator',
          'name profileImageUrl'
        )
        .populate(
          'members',
          'name profileImageUrl'
        )
        .sort({
          startDate: 1,
          createdAt: -1,
        })
        .lean();

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Public rooms loaded successfully.',

        data: rooms,
      });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// GET ONE ROOM
// ============================================================

async function getPublicRoomById(
  req,
  res,
  next
) {
  try {
    const {
      roomId,
    } = req.params;

    // Checking the ID before calling MongoDB avoids
    // a Mongoose CastError for malformed IDs.
    if (
      !mongoose.isValidObjectId(
        roomId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Invalid public room ID.',
        });
    }

    const room =
      await PublicRoom.findById(
        roomId
      )
        .populate(
          'creator',
          'name profileImageUrl'
        )
        .populate(
          'members',
          'name profileImageUrl'
        )
        .lean();

    if (!room) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'Public room not found.',
        });
    }

    // --------------------------------------------------------
    // Work out how the currently logged-in traveler relates
    // to this room.
    // --------------------------------------------------------
    //
    // The frontend needs this so it knows whether to display:
    //
    // "You created this room"
    //
    // "You are a member"
    //
    // "Your request is pending"
    //
    // or
    //
    // "Request to Join"

    const currentUserId =
      req.user._id.toString();

    const creatorId =
      room.creator?._id
        ?.toString();

    const isCreator =
      creatorId ===
      currentUserId;

    const isMember =
      room.members.some(
        (member) =>
          member._id.toString() ===
          currentUserId
      );

    // "none" means there is no special relationship yet.
    let viewerStatus =
      'none';

    if (isCreator) {
      viewerStatus =
        'creator';
    } else if (isMember) {
      viewerStatus =
        'member';
    } else {
      // The traveler is neither the creator nor an existing
      // member, so check whether they already sent a request.
      const existingRequest =
        await JoinRequest.findOne({
          room: roomId,

          requester:
            req.user._id,
        })
          .select(
            'status'
          )
          .lean();

      if (existingRequest) {
        viewerStatus =
          existingRequest.status;
      }
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Public room loaded successfully.',

        data: {
          room,
          viewerStatus,
        },
      });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// REQUEST TO JOIN A ROOM
// ============================================================

async function requestToJoinPublicRoom(
  req,
  res,
  next
) {
  try {
    const {
      roomId,
    } = req.params;

    if (
      !mongoose.isValidObjectId(
        roomId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Invalid public room ID.',
        });
    }

    const room =
      await PublicRoom.findById(
        roomId
      );

    if (!room) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'Public room not found.',
        });
    }

    // Closed rooms must not accept new requests.
    if (
      room.status !==
      'open'
    ) {
      return res
        .status(409)
        .json({
          success: false,

          message:
            'This room is not accepting join requests.',
        });
    }

    const currentUserId =
      req.user._id.toString();

    // The creator is already a member, so they cannot
    // request to join their own room.
    if (
      room.creator.toString() ===
      currentUserId
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'You are already the creator of this room.',
        });
    }

    // Check whether this traveler is already inside
    // the members array.
    const isAlreadyMember =
      room.members.some(
        (memberId) =>
          memberId.toString() ===
          currentUserId
      );

    if (isAlreadyMember) {
      return res
        .status(409)
        .json({
          success: false,

          message:
            'You are already a member of this room.',
        });
    }

    // Do not accept requests when the room has already
    // reached its maximum member count.
    if (
      room.members.length >=
      room.maxMembers
    ) {
      return res
        .status(409)
        .json({
          success: false,

          message:
            'This room has already reached its member limit.',
        });
    }

    // Look for an existing request from this traveler
    // for this exact room.
    const existingRequest =
      await JoinRequest.findOne({
        room: roomId,

        requester:
          req.user._id,
      });

    if (existingRequest) {
      // Different messages make the API response easier
      // for the frontend/user to understand.
      const messageByStatus = {
        pending:
          'You already have a pending request for this room.',

        accepted:
          'Your request for this room has already been accepted.',

        rejected:
          'Your previous request for this room was rejected.',
      };

      return res
        .status(409)
        .json({
          success: false,

          message:
            messageByStatus[
              existingRequest
                .status
            ],
        });
    }

    // Finally create the real MongoDB request.
    //
    // Notice again that requester comes from req.user._id.
    //
    // The browser does not get to choose which user is
    // sending the request.
    const joinRequest =
      await JoinRequest.create({
        room:
          roomId,

        requester:
          req.user._id,
      });

    return res
      .status(201)
      .json({
        success: true,

        message:
          'Join request sent successfully.',

        data:
          joinRequest,
      });
  } catch (error) {
    // The model contains a unique database index for:
    //
    // room + requester
    //
    // In a rare case, two duplicate requests might arrive
    // almost simultaneously before findOne() notices either.
    //
    // MongoDB error code 11000 means the unique index caught it.
    if (
      error?.code ===
      11000
    ) {
      return res
        .status(409)
        .json({
          success: false,

          message:
            'You already have a request for this room.',
        });
    }

    return next(error);
  }
}

// ============================================================
// GET PENDING JOIN REQUESTS
// ============================================================
//
// This controller is part of Rafi's Module 2:
// Public Room Join Request & Member Management.
//
// Only the CREATOR of the selected room is allowed to see
// the pending requests.
//
// Accepted room members can see the room workspace later,
// but they cannot manage who enters the room.

async function getPendingJoinRequests(
  req,
  res,
  next
) {
  try {
    const {
      roomId,
    } = req.params;

    // --------------------------------------------------------
    // STEP 1: Validate the room ID
    // --------------------------------------------------------
    //
    // MongoDB ObjectIds have a particular format.
    //
    // Checking it before querying prevents Mongoose from
    // throwing a CastError when somebody sends something like:
    //
    // /public-rooms/not-a-real-id/join-requests

    if (
      !mongoose.isValidObjectId(
        roomId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Invalid public room ID.',
        });
    }

    // --------------------------------------------------------
    // STEP 2: Load the room
    // --------------------------------------------------------

    const room =
      await PublicRoom.findById(
        roomId
      )
        .select(
          'creator roomName'
        )
        .lean();

    if (!room) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'Public room not found.',
        });
    }

    // --------------------------------------------------------
    // STEP 3: Check CREATOR ownership
    // --------------------------------------------------------
    //
    // This is the important security rule.
    //
    // We do NOT trust the frontend to decide whether somebody
    // is allowed to see the requests.
    //
    // Even if a room member manually calls this API through
    // Postman or the browser console, the backend still checks:
    //
    // room.creator === req.user._id

    const isCreator =
      room.creator.toString() ===
      req.user._id.toString();

    if (!isCreator) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            'Only the room creator can view join requests.',
        });
    }

    // --------------------------------------------------------
    // STEP 4: Load only PENDING requests
    // --------------------------------------------------------
    //
    // Feature 2's management panel is specifically for
    // requests that still need a decision.
    //
    // Accepted/rejected requests therefore do not appear here.

    const joinRequests =
      await JoinRequest.find({
        room: roomId,

        status: 'pending',
      })
        // requester normally stores only a MongoDB User ID.
        //
        // populate() replaces that ID in this API response with
        // the basic profile information needed by the creator.
        //
        // We deliberately do NOT expose passwordHash, phone,
        // internal account data, etc.
        .populate(
          'requester',
          'name email profileImageUrl'
        )
        .sort({
          createdAt: 1,
        })
        .lean();

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Pending join requests loaded successfully.',

        data:
          joinRequests,
      });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// ACCEPT JOIN REQUEST
// ============================================================
//
// When the creator accepts a request:
//
// 1. Verify the room.
// 2. Verify that the logged-in user owns the room.
// 3. Verify the join request.
// 4. Make sure the room still has space.
// 5. Add the requester to PublicRoom.members.
// 6. Change the JoinRequest status to "accepted".
//
// After this, the traveler becomes a real room member.

async function acceptJoinRequest(
  req,
  res,
  next
) {
  try {
    const {
      roomId,
      requestId,
    } = req.params;

    // --------------------------------------------------------
    // STEP 1: Validate both MongoDB IDs
    // --------------------------------------------------------

    if (
      !mongoose.isValidObjectId(
        roomId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Invalid public room ID.',
        });
    }

    if (
      !mongoose.isValidObjectId(
        requestId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Invalid join request ID.',
        });
    }

    // --------------------------------------------------------
    // STEP 2: Load the room
    // --------------------------------------------------------

    const room =
      await PublicRoom.findById(
        roomId
      );

    if (!room) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'Public room not found.',
        });
    }

    // --------------------------------------------------------
    // STEP 3: Check that the logged-in traveler is the creator
    // --------------------------------------------------------

    const isCreator =
      room.creator.toString() ===
      req.user._id.toString();

    if (!isCreator) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            'Only the room creator can accept join requests.',
        });
    }

    // --------------------------------------------------------
    // STEP 4: Find the request
    // --------------------------------------------------------
    //
    // Notice that we search using BOTH:
    //
    // _id: requestId
    // room: roomId
    //
    // This prevents somebody from taking a request belonging
    // to Room A and trying to accept it through Room B's URL.

    const joinRequest =
      await JoinRequest.findOne({
        _id: requestId,

        room: roomId,
      });

    if (!joinRequest) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'Join request not found for this room.',
        });
    }

    // Only a pending request still requires a decision.
    if (
      joinRequest.status !==
      'pending'
    ) {
      return res
        .status(409)
        .json({
          success: false,

          message:
            'This join request has already been processed.',
        });
    }

    const requesterId =
      joinRequest.requester.toString();

    // --------------------------------------------------------
    // STEP 5: Check whether the traveler is already a member
    // --------------------------------------------------------
    //
    // This normally should not happen because Feature 1 blocks
    // members from creating new requests.
    //
    // We still protect against inconsistent data on the
    // backend.

    const isAlreadyMember =
      room.members.some(
        (memberId) =>
          memberId.toString() ===
          requesterId
      );

    if (!isAlreadyMember) {
      // ------------------------------------------------------
      // STEP 6: Check room capacity
      // ------------------------------------------------------

      if (
        room.members.length >=
        room.maxMembers
      ) {
        return res
          .status(409)
          .json({
            success: false,

            message:
              'This room has reached its maximum member limit.',
          });
      }

      // ------------------------------------------------------
      // STEP 7: Add the requester to the members array
      // ------------------------------------------------------
      //
      // addToSet() behaves like MongoDB's $addToSet.
      //
      // Unlike push(), it avoids inserting the same member ID
      // twice.

      room.members.addToSet(
        joinRequest.requester
      );

      await room.save();
    }

    // --------------------------------------------------------
    // STEP 8: Mark the request as accepted
    // --------------------------------------------------------

    joinRequest.status =
      'accepted';

    await joinRequest.save();

    // --------------------------------------------------------
    // STEP 9: Populate response information
    // --------------------------------------------------------
    //
    // Returning the updated room lets React immediately update
    // the Current Members section without requiring a browser
    // refresh.

    await room.populate([
      {
        path: 'creator',

        select:
          'name profileImageUrl',
      },
      {
        path: 'members',

        select:
          'name profileImageUrl',
      },
    ]);

    await joinRequest.populate(
      'requester',
      'name email profileImageUrl'
    );

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Join request accepted successfully.',

        data: {
          joinRequest,
          room,
        },
      });
  } catch (error) {
    return next(error);
  }
}

// ============================================================
// REJECT JOIN REQUEST
// ============================================================
//
// Rejecting is simpler than accepting.
//
// We do NOT add the traveler to PublicRoom.members.
//
// We only change:
//
// pending
//
// into:
//
// rejected

async function rejectJoinRequest(
  req,
  res,
  next
) {
  try {
    const {
      roomId,
      requestId,
    } = req.params;

    if (
      !mongoose.isValidObjectId(
        roomId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Invalid public room ID.',
        });
    }

    if (
      !mongoose.isValidObjectId(
        requestId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Invalid join request ID.',
        });
    }

    // Load the room first so ownership can be checked.
    const room =
      await PublicRoom.findById(
        roomId
      )
        .select(
          'creator'
        )
        .lean();

    if (!room) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'Public room not found.',
        });
    }

    // Only the creator may reject applicants.
    const isCreator =
      room.creator.toString() ===
      req.user._id.toString();

    if (!isCreator) {
      return res
        .status(403)
        .json({
          success: false,

          message:
            'Only the room creator can reject join requests.',
        });
    }

    // Find this exact request belonging to this exact room.
    const joinRequest =
      await JoinRequest.findOne({
        _id: requestId,

        room: roomId,
      });

    if (!joinRequest) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'Join request not found for this room.',
        });
    }

    if (
      joinRequest.status !==
      'pending'
    ) {
      return res
        .status(409)
        .json({
          success: false,

          message:
            'This join request has already been processed.',
        });
    }

    // Rejecting does not modify PublicRoom.members.
    joinRequest.status =
      'rejected';

    await joinRequest.save();

    await joinRequest.populate(
      'requester',
      'name email profileImageUrl'
    );

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Join request rejected successfully.',

        data:
          joinRequest,
      });
  } catch (error) {
    return next(error);
  }
}

export {
  acceptJoinRequest,
  createPublicRoom,
  getMyPublicRooms,
  getPendingJoinRequests,
  getPublicRoomById,
  getPublicRooms,
  rejectJoinRequest,
  requestToJoinPublicRoom,
};