import apiClient from '../../../api/axiosClient';

/*
 * This file is the frontend API layer for the Trip feature.
 *
 * React pages/components should call these functions instead of
 * writing Axios requests directly.
 *
 * This keeps all Trip API URLs in one place and makes the frontend
 * easier to maintain.
 */

async function getTrips() {
  const response = await apiClient.get(
    '/trips'
  );

  return response.data;
}

async function getTripById(tripId) {
  const response = await apiClient.get(
    `/trips/${tripId}`
  );

  return response.data;
}

async function createTrip(tripData) {
  const response = await apiClient.post(
    '/trips',
    tripData
  );

  return response.data;
}

async function updateTrip(
  tripId,
  tripData
) {
  const response = await apiClient.patch(
    `/trips/${tripId}`,
    tripData
  );

  return response.data;
}

async function deleteTrip(tripId) {
  const response =
    await apiClient.delete(
      `/trips/${tripId}`
    );

  return response.data;
}


/*
 * ------------------------------------------------------------
 * FEATURE 3 — TRIP COLLABORATORS
 * ------------------------------------------------------------
 */


/*
 * Gets the owner and collaborator list for one trip.
 *
 * Backend permission:
 * - Owner can view it.
 * - Collaborators can also view it.
 *
 * The backend also returns accessType:
 *
 * "owner"
 *
 * or
 *
 * "collaborator"
 *
 * The frontend can use that value to decide whether management
 * controls such as Add or Remove should be shown.
 */
async function getTripCollaborators(
  tripId
) {
  const response = await apiClient.get(
    `/trips/${tripId}/collaborators`
  );

  return response.data;
}


/*
 * Adds a registered traveler to the trip using their email.
 *
 * Example:
 *
 * addTripCollaborator(
 *   tripId,
 *   'kusum@gmail.com'
 * )
 *
 * The backend looks up that email and stores the matching User
 * ObjectId inside the Trip document.
 *
 * Only the trip owner is allowed to use this endpoint.
 */
async function addTripCollaborator(
  tripId,
  email
) {
  const response = await apiClient.post(
    `/trips/${tripId}/collaborators`,
    {
      email,
    }
  );

  return response.data;
}


/*
 * Removes one collaborator from the trip.
 *
 * userId is the MongoDB User ID of the collaborator being removed,
 * not their email address.
 *
 * Only the trip owner is allowed to use this endpoint.
 */
async function removeTripCollaborator(
  tripId,
  userId
) {
  const response =
    await apiClient.delete(
      `/trips/${tripId}/collaborators/${userId}`
    );

  return response.data;
}


/*
 * ------------------------------------------------------------
 * ITINERARY DAYS AND STOPS
 * ------------------------------------------------------------
 */

async function getTripDays(tripId) {
  const response = await apiClient.get(
    `/trips/${tripId}/days`
  );

  return response.data;
}

async function getDayStops(
  tripId,
  dayId
) {
  const response = await apiClient.get(
    `/trips/${tripId}/days/${dayId}/stops`
  );

  return response.data;
}

async function addStop(
  tripId,
  dayId,
  stopData
) {
  const response = await apiClient.post(
    `/trips/${tripId}/days/${dayId}/stops`,
    stopData
  );

  return response.data;
}

async function updateStop(
  tripId,
  dayId,
  stopId,
  stopData
) {
  const response = await apiClient.patch(
    `/trips/${tripId}/days/${dayId}/stops/${stopId}`,
    stopData
  );

  return response.data;
}

async function deleteStop(
  tripId,
  dayId,
  stopId
) {
  const response =
    await apiClient.delete(
      `/trips/${tripId}/days/${dayId}/stops/${stopId}`
    );

  return response.data;
}

async function reorderStops(
  tripId,
  dayId,
  stopIds
) {
  const response = await apiClient.patch(
    `/trips/${tripId}/days/${dayId}/stops/reorder`,
    {
      stopIds,
    }
  );

  return response.data;
}

export {
  addStop,
  addTripCollaborator,
  createTrip,
  deleteStop,
  deleteTrip,
  getDayStops,
  getTripById,
  getTripCollaborators,
  getTripDays,
  getTrips,
  removeTripCollaborator,
  reorderStops,
  updateStop,
  updateTrip,
};