import apiClient from '../../../api/axiosClient';

async function getTrips() {
  const response = await apiClient.get('/trips');

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
  const response = await apiClient.delete(
    `/trips/${tripId}`
  );

  return response.data;
}

export {
  createTrip,
  deleteTrip,
  getTripById,
  getTrips,
  updateTrip,
};