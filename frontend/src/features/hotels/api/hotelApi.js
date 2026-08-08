import apiClient from '../../../api/axiosClient';

async function getVendorHotels() {
  const response = await apiClient.get(
    '/hotels/vendor/me'
  );

  return response.data;
}

async function getVendorHotelById(hotelId) {
  const response = await apiClient.get(
    `/hotels/vendor/me/${hotelId}`
  );

  return response.data;
}

async function createHotel(hotelData) {
  const response = await apiClient.post(
    '/hotels',
    hotelData
  );

  return response.data;
}

async function updateHotel(hotelId, hotelData) {
  const response = await apiClient.patch(
    `/hotels/${hotelId}`,
    hotelData
  );

  return response.data;
}

async function deleteHotel(hotelId) {
  const response = await apiClient.delete(
    `/hotels/${hotelId}`
  );

  return response.data;
}

export {
  createHotel,
  deleteHotel,
  getVendorHotelById,
  getVendorHotels,
  updateHotel,
};