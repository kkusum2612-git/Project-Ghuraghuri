import { Router } from 'express';

import {
  createGuideProfile,
  createTourPackage,
  deleteTourPackage,
  getMyGuideProfile,
  getPublicGuideById,
  getPublicGuides,
  updateMyGuideProfile,
  updateTourPackage,
} from '../controllers/guide.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

/*
 * A guide must be logged in and have the "guide" role
 * to manage their own professional profile and packages.
 *
 * We intentionally do not require provider approval here.
 * A pending guide needs to complete their profile and tour
 * packages before the administrator reviews the account.
 */
const guideProtection = [
  authenticateUser,
  authorizeRoles('guide'),
];

/*
 * -------------------------------------------------------
 * GUIDE'S OWN PROFILE
 * -------------------------------------------------------
 */

// Create the current guide's professional profile.
router.post(
  '/me',
  ...guideProtection,
  createGuideProfile
);

// Get the current guide's professional profile.
router.get(
  '/me',
  ...guideProtection,
  getMyGuideProfile
);

// Update the current guide's professional profile.
router.patch(
  '/me',
  ...guideProtection,
  updateMyGuideProfile
);

/*
 * -------------------------------------------------------
 * GUIDE TOUR PACKAGES
 * -------------------------------------------------------
 */

// Create a tour package belonging to the current guide.
router.post(
  '/me/packages',
  ...guideProtection,
  createTourPackage
);

// Update one of the current guide's tour packages.
router.patch(
  '/me/packages/:packageId',
  ...guideProtection,
  updateTourPackage
);

// Delete one of the current guide's tour packages.
router.delete(
  '/me/packages/:packageId',
  ...guideProtection,
  deleteTourPackage
);

/*
 * -------------------------------------------------------
 * PUBLIC GUIDE LISTINGS
 * -------------------------------------------------------
 *
 * Approval is handled by the shared administrator API:
 *
 * /api/v1/admin/provider-applications/...
 *
 * These public endpoints only expose approved guides.
 */

// List approved guides.
router.get(
  '/',
  getPublicGuides
);

// Keep this dynamic route last.
router.get(
  '/:guideId',
  getPublicGuideById
);

export default router;