import {
  Router,
} from 'express';

import {
  generateTravelPlan,
  getTravelPlanById,
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
 * app.js will mount this router at:
 *
 *   /api/v1/ai/travel-plan
 *
 *
 * Security has two layers:
 *
 * 1. This route verifies authentication and traveler role.
 * 2. The controller independently verifies PremiumMembership.
 *
 * This means a normal traveler cannot bypass the frontend
 * Premium lock by manually calling the API.
 */
const router =
  Router();


/*
 * ------------------------------------------------------------
 * POST /api/v1/ai/travel-plan
 * ------------------------------------------------------------
 *
 * Generates a new AI travel plan.
 *
 * Flow:
 *
 * authenticated traveler
 *        ↓
 * PremiumMembership check
 *        ↓
 * input validation
 *        ↓
 * Groq
 *        ↓
 * real hotel enrichment
 *        ↓
 * AiTravelPlan saved in MongoDB
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
 * ------------------------------------------------------------
 * GET /api/v1/ai/travel-plan/:planId
 * ------------------------------------------------------------
 *
 * Reloads one previously generated plan belonging to the
 * current Premium traveler.
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