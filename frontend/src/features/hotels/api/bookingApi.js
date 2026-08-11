import apiClient from '../../../api/axiosClient';

async function createBooking(bookingData) {
  const response = await apiClient.post(
    '/bookings',
    bookingData
  );

  return response.data;
}

async function getTravelerBookings() {
  const response = await apiClient.get(
    '/bookings/traveler/me'
  );

  return response.data;
}

async function getBookingById(bookingId) {
  const response = await apiClient.get(
    `/bookings/${bookingId}`
  );

  return response.data;
}

async function getVendorBookings() {
  const response = await apiClient.get(
    '/bookings/vendor/me'
  );

  return response.data;
}

export {
  createBooking,
  getBookingById,
  getTravelerBookings,
  getVendorBookings,
};