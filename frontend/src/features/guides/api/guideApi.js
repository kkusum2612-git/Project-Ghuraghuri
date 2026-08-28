import apiClient from '../../../api/axiosClient';

/*
 * -------------------------------------------------------
 * GUIDE'S OWN PROFILE
 * -------------------------------------------------------
 */

async function getMyGuideProfile() {
  const response = await apiClient.get('/guides/me');

  return response.data;
}

async function createGuideProfile(guideData) {
  const response = await apiClient.post('/guides/me', guideData);

  return response.data;
}

async function updateGuideProfile(guideData) {
  const response = await apiClient.patch('/guides/me', guideData);

  return response.data;
}

/*
 * -------------------------------------------------------
 * TOUR PACKAGES
 * -------------------------------------------------------
 */

async function createTourPackage(packageData) {
  const response = await apiClient.post('/guides/me/packages', packageData);

  return response.data;
}

async function updateTourPackage(packageId, packageData) {
  const response = await apiClient.patch(
    `/guides/me/packages/${packageId}`,
    packageData
  );

  return response.data;
}

async function deleteTourPackage(packageId) {
  const response = await apiClient.delete(
    `/guides/me/packages/${packageId}`
  );

  return response.data;
}

/*
 * -------------------------------------------------------
 * GUIDE IMAGE UPLOAD
 * -------------------------------------------------------
 */

async function uploadGuideImages(files) {
  const formData = new FormData();

  files.forEach((file) => {
    formData.append('images', file);
  });

  const response = await apiClient.post(
    '/uploads/guide-images',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
}

/*
 * -------------------------------------------------------
 * PUBLIC GUIDE LISTINGS
 * -------------------------------------------------------
 */

async function getPublicGuides(filters = {}) {
  const response = await apiClient.get('/guides', {
    params: filters,
  });

  return response.data;
}

async function getPublicGuideById(guideId) {
  const response = await apiClient.get(`/guides/${guideId}`);

  return response.data;
}

/*
 * -------------------------------------------------------
 * GUIDE BOOKINGS
 * -------------------------------------------------------
 */

async function createGuideBooking(bookingData) {
  const response = await apiClient.post(
    '/guide-bookings',
    bookingData
  );

  return response.data;
}

async function getMyGuideBookings() {
  const response = await apiClient.get(
    '/guide-bookings/me'
  );

  return response.data;
}

async function getReceivedGuideBookings() {
  const response = await apiClient.get(
    '/guide-bookings/received'
  );

  return response.data;
}

async function updateGuideBookingStatus(
  bookingId,
  bookingStatus
) {
  const response = await apiClient.patch(
    `/guide-bookings/${bookingId}/status`,
    {
      bookingStatus,
    }
  );

  return response.data;
}

export {
  createGuideBooking,
  createGuideProfile,
  createTourPackage,
  deleteTourPackage,
  getMyGuideBookings,
  getMyGuideProfile,
  getPublicGuideById,
  getPublicGuides,
  getReceivedGuideBookings,
  updateGuideBookingStatus,
  updateGuideProfile,
  updateTourPackage,
  uploadGuideImages,
};