import {
  Router,
} from 'express';

import {
  createPublicRoomFromTravelPlan,
  generateTravelPlan,
  getTravelPlanById,
  saveTravelPlanAsTrip,
} from '../controllers/aiTravelPlan.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';


/*
 * ============================================================
 * RAFI FEATURE 4 - AI TRAVEL PLANNER ROUTES
 * ============================================================
 *
 * app.js mounts this router at:
 *
 * /api/v1/ai/travel-plan
 *
 * Every route requires an authenticated traveler.
 *
 * The controller separately checks active Premium membership.
 */
const router =
  Router();


/*
 * Generate a new neutral AI plan.
 */
router.post(
  '/',

  authenticateUser,

  authorizeRoles(
    'traveler'
  ),

  generateTravelPlan
);


/*
 * Convert the AI plan into a normal My Trip.
 */
router.post(
  '/:planId/save-trip',

  authenticateUser,

  authorizeRoles(
    'traveler'
  ),

  saveTravelPlanAsTrip
);


/*
 * Convert the SAME AI plan into an underlying Trip +
 * Public Room wrapper.
 */
router.post(
  '/:planId/create-public-room',

  authenticateUser,

  authorizeRoles(
    'traveler'
  ),

  createPublicRoomFromTravelPlan
);


/*
 * Reload one saved AI plan.
 */
router.get(
  '/:planId',

  authenticateUser,

  authorizeRoles(
    'traveler'
  ),

  getTravelPlanById
);


export default router;