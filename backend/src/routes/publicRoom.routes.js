import {
  Router,
} from 'express';

import {
  acceptJoinRequest,
  createPublicRoom,
  getMyPublicRooms,
  getPendingJoinRequests,
  getPublicRoomById,
  getPublicRooms,
  rejectJoinRequest,
  requestToJoinPublicRoom,
} from '../controllers/publicRoom.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';

const router =
  Router();

// ============================================================
// SHARED PUBLIC-ROOM SECURITY
// ============================================================
//
// Every Public Room feature belongs to authenticated travelers.
//
// Frontend route protection is useful for user experience,
// but somebody could call the API directly using Postman,
// DevTools, curl, etc.
//
// Therefore the BACKEND independently verifies:
//
// 1. Is the user authenticated?
// 2. Is the user actually a traveler?

const travelerPublicRoomProtection =
  [
    authenticateUser,
    authorizeRoles(
      'traveler'
    ),
  ];

// ============================================================
// FEATURE 1 ROUTES
// ============================================================

// ------------------------------------------------------------
// POST /api/v1/public-rooms
//
// Create a Public Event Room.
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
// List rooms created by the logged-in traveler.
//
// "mine" must appear before /:roomId so Express does not
// interpret the word "mine" as a MongoDB room ID.
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
// ------------------------------------------------------------
router.get(
  '/',
  ...travelerPublicRoomProtection,
  getPublicRooms
);

// ------------------------------------------------------------
// POST /api/v1/public-rooms/:roomId/join-requests
//
// Feature 1:
// Another traveler sends a pending join request.
// ------------------------------------------------------------
router.post(
  '/:roomId/join-requests',
  ...travelerPublicRoomProtection,
  requestToJoinPublicRoom
);

// ============================================================
// FEATURE 2 ROUTES
// ============================================================

// ------------------------------------------------------------
// GET /api/v1/public-rooms/:roomId/join-requests
//
// ROOM CREATOR ONLY.
//
// Returns pending join requests with basic applicant profile
// information.
//
// The controller performs the creator ownership check.
// ------------------------------------------------------------
router.get(
  '/:roomId/join-requests',
  ...travelerPublicRoomProtection,
  getPendingJoinRequests
);

// ------------------------------------------------------------
// PATCH
// /api/v1/public-rooms/:roomId/join-requests/:requestId/accept
//
// ROOM CREATOR ONLY.
//
// Accepting:
// - changes request -> accepted
// - adds requester -> room.members
// ------------------------------------------------------------
router.patch(
  '/:roomId/join-requests/:requestId/accept',
  ...travelerPublicRoomProtection,
  acceptJoinRequest
);

// ------------------------------------------------------------
// PATCH
// /api/v1/public-rooms/:roomId/join-requests/:requestId/reject
//
// ROOM CREATOR ONLY.
//
// Rejecting:
// - changes request -> rejected
// - does NOT add requester to members
// ------------------------------------------------------------
router.patch(
  '/:roomId/join-requests/:requestId/reject',
  ...travelerPublicRoomProtection,
  rejectJoinRequest
);

// ------------------------------------------------------------
// GET /api/v1/public-rooms/:roomId
//
// Load one selected room.
//
// Keep this general dynamic route after the more specific
// join-request routes above.
// ------------------------------------------------------------
router.get(
  '/:roomId',
  ...travelerPublicRoomProtection,
  getPublicRoomById
);

export default router;