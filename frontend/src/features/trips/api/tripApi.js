import apiClient from '../../../api/axiosClient';

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
  createTrip,
  deleteStop,
  deleteTrip,
  getDayStops,
  getTripById,
  getTripDays,
  getTrips,
  reorderStops,
  updateStop,
  updateTrip,
};