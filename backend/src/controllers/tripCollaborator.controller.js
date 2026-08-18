import mongoose from 'mongoose';

import Trip from '../models/trip.model.js';
import User from '../models/User.js';

/*
 * FEATURE 3 — TRIP COLLABORATORS
 *
 * This controller contains only collaborator-management logic.
 *
 * Keeping it separate from trip.controller.js makes the feature
 * easier to maintain and prevents the main Trip controller from
 * becoming even larger.
 *
 * There are two permission levels:
 *
 * 1. Trip owner
 *    - Can view collaborators.
 *    - Can add collaborators.
 *    - Can remove collaborators.
 *
 * 2. Trip collaborator
 *    - Can view the collaborator/member list.
 *    - Cannot add or remove other collaborators.
 *
 * Access to itinerary editing will be handled in the existing
 * trip.controller.js in a later step.
 */


/*
 * ObjectIds are objects, so comparing them with === is unreliable.
 *
 * Converting both values to strings gives us a safe comparison.
 *
 * This helper also supports populated references where the value
 * may look like:
 *
 * {
 *   _id: "...",
 *   name: "...",
 *   email: "..."
 * }
 */
function isSameObjectId(
  firstValue,
  secondValue
) {
  if (
    !firstValue ||
    !secondValue
  ) {
    return false;
  }

  const firstId =
    firstValue._id ||
    firstValue;

  const secondId =
    secondValue._id ||
    secondValue;

  return (
    firstId.toString() ===
    secondId.toString()
  );
}


/*
 * A "trip member" means:
 *
 * - the trip owner, OR
 * - a traveler whose User ID exists inside collaborators[].
 *
 * This query is used when an action is allowed for both.
 */
function buildTripMemberQuery(
  tripId,
  userId
) {
  return {
    _id: tripId,

    $or: [
      {
        owner: userId,
      },

      {
        collaborators:
          userId,
      },
    ],
  };
}


/*
 * The frontend needs to know whether the logged-in traveler
 * owns the trip or is viewing it as a collaborator.
 *
 * We return:
 *
 * owner
 *
 * OR
 *
 * collaborator
 */
function getAccessType(
  trip,
  currentUserId
) {
  return isSameObjectId(
    trip.owner,
    currentUserId
  )
    ? 'owner'
    : 'collaborator';
}


/*
 * GET /api/v1/trips/:tripId/collaborators
 *
 * Both the owner and existing collaborators can use this endpoint.
 *
 * The response includes:
 *
 * - owner information
 * - collaborator information
 * - current user's accessType
 *
 * Passwords and other private User fields are never returned.
 */
async function getTripCollaborators(
  req,
  res,
  next
) {
  try {
    const {
      tripId,
    } = req.params;

    if (
      !mongoose.isValidObjectId(
        tripId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'Invalid trip ID.',
        });
    }

    /*
     * Find the trip only when the logged-in traveler is either:
     *
     * - its owner
     * - one of its collaborators
     */
    const trip =
      await Trip.findOne(
        buildTripMemberQuery(
          tripId,
          req.user._id
        )
      )
        .populate({
          path: 'owner',

          /*
           * Only fields needed by the Collaborators page
           * are returned.
           */
          select:
            'name email profileImageUrl',
        })
        .populate({
          path:
            'collaborators',

          select:
            'name email profileImageUrl',
        })
        .lean();

    if (!trip) {
      return res
        .status(404)
        .json({
          success: false,
          message:
            'Trip not found.',
        });
    }

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Trip collaborators fetched successfully.',

        data: {
          owner:
            trip.owner,

          collaborators:
            Array.isArray(
              trip.collaborators
            )
              ? trip.collaborators
              : [],

          accessType:
            getAccessType(
              trip,
              req.user._id
            ),
        },
      });
  } catch (error) {
    return next(error);
  }
}


/*
 * POST /api/v1/trips/:tripId/collaborators
 *
 * Request body:
 *
 * {
 *   "email": "traveler@example.com"
 * }
 *
 * Only the trip owner can add collaborators.
 *
 * The email is used only to FIND the registered user.
 *
 * After finding that person, their MongoDB User ObjectId is stored
 * inside the Trip collaborators[] array.
 */
async function addTripCollaborator(
  req,
  res,
  next
) {
  try {
    const {
      tripId,
    } = req.params;

    const {
      email,
    } = req.body;

    if (
      !mongoose.isValidObjectId(
        tripId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'Invalid trip ID.',
        });
    }

    /*
     * Make sure an email was actually supplied.
     */
    if (
      typeof email !==
        'string' ||
      email.trim() === ''
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'Collaborator email is required.',
        });
    }

    /*
     * User emails are stored in lowercase in User.js.
     *
     * Normalizing here means:
     *
     * FARHAN@GMAIL.COM
     *
     * and
     *
     * farhan@gmail.com
     *
     * are treated as the same address.
     */
    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    /*
     * IMPORTANT:
     *
     * Adding collaborators is OWNER-ONLY.
     *
     * We deliberately do NOT use buildTripMemberQuery() here.
     *
     * A collaborator must not be able to invite more people
     * into somebody else's trip.
     */
    const trip =
      await Trip.findOne({
        _id: tripId,
        owner:
          req.user._id,
      });

    if (!trip) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'Trip not found or you are not its owner.',
        });
    }

    /*
     * Search the registered users collection using the supplied
     * email address.
     */
    const collaborator =
      await User.findOne({
        email:
          normalizedEmail,
      }).select(
        '_id name email role accountStatus profileImageUrl'
      );

    /*
     * The official feature requires the email to belong to a
     * registered user.
     */
    if (!collaborator) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'No registered user was found with that email address.',
        });
    }

    /*
     * Trips belong to the traveler workspace.
     *
     * Hotel vendors, guides, and administrators should therefore
     * not be added as trip collaborators.
     */
    if (
      collaborator.role !==
      'traveler'
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Only traveler accounts can be added as trip collaborators.',
        });
    }

    /*
     * Suspended or disabled travelers should not receive new
     * access to shared trips.
     */
    if (
      collaborator.accountStatus !==
      'active'
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'This traveler account is not active.',
        });
    }

    /*
     * The owner already has full membership in their own trip.
     *
     * Therefore they cannot add themselves again as a collaborator.
     */
    if (
      isSameObjectId(
        collaborator._id,
        req.user._id
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'You are already the owner of this trip.',
        });
    }

    /*
     * Older Trip documents may not physically contain the new
     * collaborators field yet.
     *
     * Treat those documents as having an empty collaborator list.
     */
    const collaboratorIds =
      Array.isArray(
        trip.collaborators
      )
        ? trip.collaborators
        : [];

    /*
     * Prevent the same traveler from being added twice.
     */
    const alreadyCollaborator =
      collaboratorIds.some(
        (
          collaboratorId
        ) =>
          isSameObjectId(
            collaboratorId,
            collaborator._id
          )
      );

    if (
      alreadyCollaborator
    ) {
      return res
        .status(409)
        .json({
          success: false,

          message:
            'This traveler is already a collaborator on the trip.',
        });
    }

    /*
     * Store only the User ObjectId in the Trip.
     *
     * We do NOT store another copy of their email or name.
     *
     * Their latest profile information can always be obtained
     * from the User collection using populate().
     */
    trip.collaborators.push(
      collaborator._id
    );

    await trip.save();

    return res
      .status(201)
      .json({
        success: true,

        message:
          'Collaborator added successfully.',

        data: {
          _id:
            collaborator._id,

          name:
            collaborator.name,

          email:
            collaborator.email,

          profileImageUrl:
            collaborator.profileImageUrl,
        },
      });
  } catch (error) {
    return next(error);
  }
}


/*
 * DELETE /api/v1/trips/:tripId/collaborators/:userId
 *
 * Only the trip owner can remove collaborators.
 */
async function removeTripCollaborator(
  req,
  res,
  next
) {
  try {
    const {
      tripId,
      userId,
    } = req.params;

    if (
      !mongoose.isValidObjectId(
        tripId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            'Invalid trip ID.',
        });
    }

    if (
      !mongoose.isValidObjectId(
        userId
      )
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            'Invalid collaborator user ID.',
        });
    }

    /*
     * Removing collaborators is OWNER-ONLY.
     */
    const trip =
      await Trip.findOne({
        _id: tripId,
        owner:
          req.user._id,
      });

    if (!trip) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'Trip not found or you are not its owner.',
        });
    }

    const collaboratorIds =
      Array.isArray(
        trip.collaborators
      )
        ? trip.collaborators
        : [];

    /*
     * Find which position in collaborators[] contains the User ID
     * supplied in the URL.
     */
    const collaboratorIndex =
      collaboratorIds.findIndex(
        (
          collaboratorId
        ) =>
          isSameObjectId(
            collaboratorId,
            userId
          )
      );

    if (
      collaboratorIndex ===
      -1
    ) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            'This user is not a collaborator on the trip.',
        });
    }

    /*
     * Save the removed User ID before deleting it from the array
     * so we can return useful information in the API response.
     */
    const [
      removedCollaboratorId,
    ] =
      collaboratorIds.splice(
        collaboratorIndex,
        1
      );

    trip.collaborators =
      collaboratorIds;

    await trip.save();

    /*
     * Fetch basic profile information for the response.
     *
     * If the User document no longer exists, the trip cleanup
     * still succeeds and we simply return the removed ObjectId.
     */
    const removedUser =
      await User.findById(
        removedCollaboratorId
      )
        .select(
          'name email profileImageUrl'
        )
        .lean();

    return res
      .status(200)
      .json({
        success: true,

        message:
          'Collaborator removed successfully.',

        data:
          removedUser || {
            _id:
              removedCollaboratorId,
          },
      });
  } catch (error) {
    return next(error);
  }
}

export {
  addTripCollaborator,
  getTripCollaborators,
  removeTripCollaborator,
};