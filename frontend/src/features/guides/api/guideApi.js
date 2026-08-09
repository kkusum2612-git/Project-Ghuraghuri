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
  const response = await apiClient.patch(`/guides/me/packages/${packageId}`, packageData);

  return response.data;
}

async function deleteTourPackage(packageId) {
  const response = await apiClient.delete(`/guides/me/packages/${packageId}`);

  return response.data;
}

/*
 * -------------------------------------------------------
 * PUBLIC GUIDE LISTINGS
 * -------------------------------------------------------
 */

async function getPublicGuides() {
  const response = await apiClient.get('/guides');

  return response.data;
}

async function getPublicGuideById(guideId) {
  const response = await apiClient.get(`/guides/${guideId}`);

  return response.data;
}

export {
  createGuideProfile,
  createTourPackage,
  deleteTourPackage,
  getMyGuideProfile,
  getPublicGuideById,
  getPublicGuides,
  updateGuideProfile,
  updateTourPackage,
};
