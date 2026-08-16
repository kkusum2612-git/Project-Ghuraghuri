import {
  Router,
} from 'express';

import {
  createPublicRoom,
  getMyPublicRooms,
  getPublicRoomById,
  getPublicRooms,
  requestToJoinPublicRoom,
} from '../controllers/publicRoom.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';

const router =
  Router();

// Public Event Rooms belong to travelers.
//
// Frontend route protection is useful for user experience,
// but it is NOT enough for security.
//
// Somebody can call an API directly without using our React UI.
//
// Therefore every public-room API also checks:
//
// 1. Is the user authenticated?
// 2. Is the user a traveler?
const travelerPublicRoomProtection =
  [
    authenticateUser,
    authorizeRoles(
      'traveler'
    ),
  ];

// ------------------------------------------------------------
// POST /api/v1/public-rooms
//
// Create a new Public Event Room.
//
// The authenticated traveler automatically becomes:
// - creator
// - first member
// ------------------------------------------------------------
router.post(
  '/',
  ...travelerPublicRoomProtection,
  createPublicRoom
);

// ------------------------------------------------------------
// GET /api/v1/public-rooms/mine
//
// Return only rooms created by the logged-in traveler.
//
// IMPORTANT:
//
// This route appears BEFORE:
//
// /:roomId
//
// Otherwise Express could interpret:
//
// "mine"
//
// as if it were a room ID.
// ------------------------------------------------------------
router.get(
  '/mine',
  ...travelerPublicRoomProtection,
  getMyPublicRooms
);

// ------------------------------------------------------------
// GET /api/v1/public-rooms
//
// Discover open rooms created by other travelers.
//
// Optional query parameters will support:
// - destination
// - dates
// - min/max budget
// - interest
// ------------------------------------------------------------
router.get(
  '/',
  ...travelerPublicRoomProtection,
  getPublicRooms
);

// ------------------------------------------------------------
// POST /api/v1/public-rooms/:roomId/join-requests
//
// Creates a pending join request.
//
// Feature 1 needs the request to be created.
//
// Feature 2 will later add:
// - viewing pending requests
// - Accept
// - Reject
// - adding accepted traveler to members
// ------------------------------------------------------------
router.post(
  '/:roomId/join-requests',
  ...travelerPublicRoomProtection,
  requestToJoinPublicRoom
);

// ------------------------------------------------------------
// GET /api/v1/public-rooms/:roomId
//
// Loads complete information for the selected room.
//
// It also tells the frontend whether the current traveler is:
// - creator
// - member
// - pending
// - rejected
// - none
// ------------------------------------------------------------
router.get(
  '/:roomId',
  ...travelerPublicRoomProtection,
  getPublicRoomById
);

export default router;