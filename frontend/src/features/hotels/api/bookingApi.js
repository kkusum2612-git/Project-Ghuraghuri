import apiClient from '../../../api/axiosClient';

async function getVendorBookings() {
  const response = await apiClient.get(
    '/bookings/vendor/me'
  );

  return response.data;
}

export {
  getVendorBookings,
};