import apiClient from '../../../api/axiosClient';

/*
 * ============================================================
 * RAFI FEATURE 3 - PREMIUM FRONTEND API
 * ============================================================
 *
 * This file contains the frontend functions that communicate
 * with Rafi's Premium backend routes.
 *
 *
 * Why keep API calls in a separate file?
 *
 * We could technically write:
 *
 *   apiClient.get(...)
 *
 * directly inside PremiumPage.jsx.
 *
 * But the rest of the Ghuraghuri project already follows a
 * cleaner feature structure:
 *
 *   page/component
 *        ↓
 *   feature API wrapper
 *        ↓
 *   shared axiosClient
 *        ↓
 *   Express backend
 *
 *
 * Therefore Premium follows the same architecture.
 *
 *
 * The shared apiClient already provides:
 *
 *   base URL:
 *     http://localhost:5000/api/v1
 *
 *   withCredentials: true
 *
 *
 * withCredentials is especially important because Ghuraghuri
 * authentication uses an HTTP-only JWT cookie.
 *
 * The browser automatically sends that cookie with these API
 * requests.
 */


/*
 * ------------------------------------------------------------
 * GET CURRENT TRAVELER'S PREMIUM STATUS
 * ------------------------------------------------------------
 *
 * Backend:
 *
 *   GET /api/v1/premium/me
 *
 *
 * We do NOT send:
 *
 *   travelerId
 *
 * because the backend determines the traveler from the secure
 * login cookie.
 *
 *
 * Possible response for a normal traveler:
 *
 * {
 *   success: true,
 *   data: {
 *     isPremium: false,
 *     membership: null,
 *     rewards: null,
 *     settings: {...}
 *   }
 * }
 *
 *
 * Possible response for a Premium traveler:
 *
 * {
 *   success: true,
 *   data: {
 *     isPremium: true,
 *     membership: {...},
 *     rewards: {...},
 *     settings: {...}
 *   }
 * }
 */
async function getMyPremiumStatus() {
  const response =
    await apiClient.get(
      '/premium/me'
    );

  /*
   * Axios gives us a larger response object containing:
   *
   *   status
   *   headers
   *   config
   *   data
   *
   * Our pages only need the backend JSON body, so we return:
   *
   *   response.data
   */
  return response.data;
}


/*
 * ------------------------------------------------------------
 * START PREMIUM UPGRADE PAYMENT
 * ------------------------------------------------------------
 *
 * Backend:
 *
 *   POST /api/v1/premium/upgrade/initiate
 *
 *
 * Notice that we send NO payment amount.
 *
 * We do NOT do:
 *
 *   {
 *     amount: 499
 *   }
 *
 *
 * Why?
 *
 * A malicious user can modify browser requests.
 *
 * Therefore the authoritative Premium price comes from:
 *
 *   RewardSettings in MongoDB
 *
 * on the backend.
 *
 *
 * The backend responds with something similar to:
 *
 * {
 *   success: true,
 *   data: {
 *     payment: {...},
 *     gatewayPageUrl: "https://sandbox.sslcommerz..."
 *   }
 * }
 *
 *
 * PremiumPage.jsx will then redirect the browser to that hosted
 * SSLCOMMERZ checkout URL.
 */
async function initiatePremiumUpgrade() {
  const response =
    await apiClient.post(
      '/premium/upgrade/initiate'
    );

  return response.data;
}


export {
  getMyPremiumStatus,
  initiatePremiumUpgrade,
};