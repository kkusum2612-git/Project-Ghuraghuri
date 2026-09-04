import apiClient from '../../../api/axiosClient';

async function getHotels(filters = {}) {
  const response = await apiClient.get(
    '/hotels',
    {
      params: filters,
    }
  );

  return response.data;
}

async function getHotelById(hotelId) {
  const response = await apiClient.get(
    `/hotels/${hotelId}`
  );

  return response.data;
}

async function getHotelAvailability(
  hotelId,
  checkInDate,
  checkOutDate
) {
  const response = await apiClient.get(
    `/hotels/${hotelId}/availability`,
    {
      params: {
        checkInDate,
        checkOutDate,
      },
    }
  );

  return response.data;
}

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

/*
 * Upload one or more hotel image files.
 *
 * Normal hotel requests use JSON, but actual files must be
 * sent as multipart/form-data.
 *
 * The backend endpoint:
 *
 * POST /api/v1/uploads/hotel-images
 *
 * uploads the files to Supabase Storage and returns their
 * public URLs.
 */
async function uploadHotelImages(files) {
  const uploadData =
    new FormData();

  files.forEach((file) => {
    uploadData.append(
      'images',
      file
    );
  });

  const response =
    await apiClient.post(
      '/uploads/hotel-images',
      uploadData,
      {
        headers: {
          'Content-Type':
            'multipart/form-data',
        },
      }
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

async function updateHotel(
  hotelId,
  hotelData
) {
  const response =
    await apiClient.patch(
      `/hotels/${hotelId}`,
      hotelData
    );

  return response.data;
}

async function deleteHotel(hotelId) {
  const response =
    await apiClient.delete(
      `/hotels/${hotelId}`
    );

  return response.data;
}

export {
  createHotel,
  deleteHotel,
  getHotelAvailability,
  getHotelById,
  getHotels,
  getVendorHotelById,
  getVendorHotels,
  updateHotel,
  uploadHotelImages,
};