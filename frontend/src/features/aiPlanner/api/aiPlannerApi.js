import apiClient from '../../../api/axiosClient';


/*
 * ============================================================
 * RAFI FEATURE 4 - AI TRAVEL PLANNER FRONTEND API
 * ============================================================
 *
 * This file is the connection between React and the Feature 4
 * Express backend.
 *
 * We keep Axios calls outside the React page so the structure
 * remains consistent with the rest of Ghuraghuri.
 *
 *
 * The request flow is:
 *
 * AITravelPlannerPage
 *        ↓
 * aiPlannerApi.js
 *        ↓
 * shared axiosClient
 *        ↓
 * Express Feature 4 API
 *        ↓
 * Groq + MongoDB + Ghuraghuri hotel data
 *
 *
 * The shared apiClient already provides:
 *
 * - base URL: http://localhost:5000/api/v1
 * - JSON headers
 * - withCredentials: true
 *
 * withCredentials is important because Ghuraghuri authentication
 * uses the HTTP-only login cookie.
 */


/*
 * ------------------------------------------------------------
 * GENERATE AI TRAVEL PLAN
 * ------------------------------------------------------------
 *
 * Backend:
 *
 * POST /api/v1/ai/travel-plan
 *
 *
 * plannerData contains only the form values:
 *
 * {
 *   origin,
 *   destination,
 *   startDate,
 *   duration,
 *   travelers,
 *   budget,
 *   interests
 * }
 *
 *
 * We deliberately do NOT send:
 *
 * - travelerId
 * - isPremium
 * - hotelId
 * - hotel prices
 *
 *
 * Why?
 *
 * The backend gets travelerId from the authenticated user,
 * checks PremiumMembership itself, and finds trusted hotel data
 * from MongoDB.
 */
async function generateTravelPlan(
  plannerData
) {
  const response =
    await apiClient.post(
      '/ai/travel-plan',
      plannerData
    );


  /*
   * Axios returns a large response object.
   *
   * React only needs the JSON returned by Express.
   */
  return response.data;
}


/*
 * ------------------------------------------------------------
 * RELOAD ONE SAVED AI PLAN
 * ------------------------------------------------------------
 *
 * Backend:
 *
 * GET /api/v1/ai/travel-plan/:planId
 *
 *
 * The backend checks:
 *
 * - authentication
 * - traveler role
 * - Premium membership
 * - ownership of the AI plan
 *
 *
 * Therefore simply knowing another person's MongoDB plan ID
 * does not give access to their generated plan.
 */
async function getTravelPlanById(
  planId
) {
  const response =
    await apiClient.get(
      `/ai/travel-plan/${planId}`
    );


  return response.data;
}


/*
 * ------------------------------------------------------------
 * SAVE AS MY TRIP
 * ------------------------------------------------------------
 *
 * This backend route will be implemented during the conversion
 * block.
 *
 * Defining the frontend API function now keeps the page API
 * complete and means the React page will not later contain raw
 * Axios calls.
 */
async function saveAiPlanAsTrip(
  planId
) {
  const response =
    await apiClient.post(
      `/ai/travel-plan/${planId}/save-trip`
    );


  return response.data;
}


/*
 * ------------------------------------------------------------
 * CREATE PUBLIC ROOM
 * ------------------------------------------------------------
 *
 * This will convert the same neutral AI draft into the
 * underlying Trip + PublicRoom structure.
 *
 * Groq will NOT generate a second separate Public Room plan.
 */
async function createPublicRoomFromAiPlan(
  planId,
  roomData = {}
) {
  const response =
    await apiClient.post(
      `/ai/travel-plan/${planId}/create-public-room`,
      roomData
    );


  return response.data;
}


export {
  createPublicRoomFromAiPlan,
  generateTravelPlan,
  getTravelPlanById,
  saveAiPlanAsTrip,
};