import apiClient from '../../../api/axiosClient';


/*
 * ============================================================
 * ADMIN FRONTEND API
 * ============================================================
 *
 * Existing functions manage provider applications.
 *
 * Rafi Feature 3 adds:
 *
 *   getRewardSettings()
 *   updateRewardSettings()
 *
 * All requests still travel through the project's shared
 * apiClient, so login cookies and API base configuration remain
 * centralized.
 */


/*
 * ------------------------------------------------------------
 * EXISTING PROVIDER APPLICATION API
 * ------------------------------------------------------------
 */
async function getPendingProviderApplications() {
  const response =
    await apiClient.get(
      '/admin/provider-applications/pending'
    );

  return response.data;
}


async function approveProviderApplication(
  userId
) {
  const response =
    await apiClient.patch(
      `/admin/provider-applications/${userId}/approve`
    );

  return response.data;
}


async function rejectProviderApplication(
  userId
) {
  const response =
    await apiClient.patch(
      `/admin/provider-applications/${userId}/reject`
    );

  return response.data;
}


/*
 * ============================================================
 * RAFI FEATURE 3 - REWARD SETTINGS API
 * ============================================================
 */

/*
 * Load the authoritative global Premium/reward policy.
 */
async function getRewardSettings() {
  const response =
    await apiClient.get(
      '/admin/reward-settings'
    );

  return response.data;
}


/*
 * Save administrator changes.
 *
 * settingsData may contain:
 *
 * premiumUpgradePrice
 * premiumBaseDiscountPercent
 * pointsPerEligiblePayment
 * pointsPerDiscountStep
 * discountPercentPerStep
 * maximumDiscountPercent
 */
async function updateRewardSettings(
  settingsData
) {
  const response =
    await apiClient.patch(
      '/admin/reward-settings',
      settingsData
    );

  return response.data;
}


export {
  approveProviderApplication,
  getPendingProviderApplications,
  getRewardSettings,
  rejectProviderApplication,
  updateRewardSettings,
};