import apiClient from '../../../api/axiosClient';

/**
 * Retrieves all pending hotel and guide applications.
 *
 * The backend allows this request only for authenticated administrators.
 *
 * @returns {Promise<object>}
 * The backend response body.
 */
async function getPendingProviderApplications() {
  const response = await apiClient.get(
    '/admin/provider-applications/pending'
  );

  return response.data;
}

/**
 * Approves one pending hotel or guide application.
 *
 * @param {string} userId
 * The MongoDB ID of the provider account.
 *
 * @returns {Promise<object>}
 * The backend response body.
 */
async function approveProviderApplication(userId) {
  const response = await apiClient.patch(
    `/admin/provider-applications/${userId}/approve`
  );

  return response.data;
}

/**
 * Rejects one pending hotel or guide application.
 *
 * @param {string} userId
 * The MongoDB ID of the provider account.
 *
 * @returns {Promise<object>}
 * The backend response body.
 */
async function rejectProviderApplication(userId) {
  const response = await apiClient.patch(
    `/admin/provider-applications/${userId}/reject`
  );

  return response.data;
}

export {
  approveProviderApplication,
  getPendingProviderApplications,
  rejectProviderApplication,
};
