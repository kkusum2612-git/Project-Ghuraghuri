import apiClient from '../../../api/axiosClient';

// ============================================================
// PUBLIC ROOM API FUNCTIONS
// ============================================================
//
// This file is the frontend's connection to the Public Room
// endpoints that we created in the Express backend.
//
// We intentionally keep Axios calls OUT of React pages.
//
// Instead of writing this inside a page:
//
// apiClient.get('/public-rooms')
//
// the page can simply call:
//
// getPublicRooms()
//
// This follows the exact same architecture already used by
// Farhan's tripApi.js and Kusum's hotelApi.js.
//
// The flow becomes:
//
// React Page
//    ↓
// publicRoomApi.js
//    ↓
// shared axiosClient.js
//    ↓
// Express backend
//    ↓
// MongoDB
//
// The shared axiosClient already has:
//
// withCredentials: true
//
// so the browser automatically sends the HTTP-only login
// cookie with these requests.

// ------------------------------------------------------------
// GET /api/v1/public-rooms/mine
//
// Loads rooms created by the currently logged-in traveler.
// ------------------------------------------------------------
async function getMyPublicRooms() {
  const response = await apiClient.get(
    '/public-rooms/mine'
  );

  // Axios returns a large response object containing:
  //
  // status
  // headers
  // config
  // data
  // etc.
  //
  // Our React pages only need the JSON body returned by
  // Express, so we return response.data.
  return response.data;
}

// ------------------------------------------------------------
// GET /api/v1/public-rooms
//
// Loads public rooms created by OTHER travelers.
//
// "filters" is an optional JavaScript object.
//
// Example:
//
// {
//   destination: "Cox",
//   minBudget: 5000,
//   maxBudget: 15000,
//   interest: "Food"
// }
//
// Axios automatically converts this object into URL query
// parameters.
// ------------------------------------------------------------
async function getPublicRooms(
  filters = {}
) {
  const response = await apiClient.get(
    '/public-rooms',
    {
      params: filters,
    }
  );

  return response.data;
}

// ------------------------------------------------------------
// GET /api/v1/public-rooms/:roomId
//
// Loads one selected room and also returns viewerStatus.
//
// viewerStatus can tell us things such as:
//
// creator
// member
// pending
// rejected
// none
//
// The details page uses that status to decide whether the
// "Request to Join" button should be visible.
// ------------------------------------------------------------
async function getPublicRoomById(
  roomId
) {
  const response = await apiClient.get(
    `/public-rooms/${roomId}`
  );

  return response.data;
}

// ------------------------------------------------------------
// POST /api/v1/public-rooms
//
// Creates a new public event room.
//
// roomData contains only the form values.
//
// Notice that we do NOT send creatorId.
//
// The backend securely gets the creator from:
//
// req.user._id
//
// after authentication.
// ------------------------------------------------------------
async function createPublicRoom(
  roomData
) {
  const response = await apiClient.post(
    '/public-rooms',
    roomData
  );

  return response.data;
}

// ------------------------------------------------------------
// POST /api/v1/public-rooms/:roomId/join-requests
//
// Creates a pending request for the logged-in traveler.
//
// Again, requesterId is NOT sent from React.
//
// The backend gets the identity from the authentication
// cookie and req.user.
// ------------------------------------------------------------
async function requestToJoinRoom(
  roomId
) {
  const response = await apiClient.post(
    `/public-rooms/${roomId}/join-requests`
  );

  return response.data;
}

export {
  createPublicRoom,
  getMyPublicRooms,
  getPublicRoomById,
  getPublicRooms,
  requestToJoinRoom,
};