import { Router } from 'express';

import {
  createGuideReview,
  getGuideReviews,
  getMyGuideAnalytics,
  getMyGuideReviews,
  getTravelerGuideReviews,
} from '../controllers/guideReview.controller.js';

import {
  authenticateUser,
  authorizeRoles,
  requireApprovedProvider,
} from '../middleware/auth.middleware.js';

const router = Router();

const guideProtection = [
  authenticateUser,
  authorizeRoles('guide'),
  requireApprovedProvider,
];

/*
 * Traveler submits a review for a completed guide booking.
 */
router.post(
  '/',
  authenticateUser,
  authorizeRoles('traveler'),
  createGuideReview
);

/*
 * Traveler retrieves their submitted guide reviews.
 */
router.get(
  '/traveler/me',
  authenticateUser,
  authorizeRoles('traveler'),
  getTravelerGuideReviews
);

/*
 * Guide retrieves reviews received on their profile.
 */
router.get(
  '/me',
  ...guideProtection,
  getMyGuideReviews
);

/*
 * Guide retrieves analytics.
 */
router.get(
  '/analytics/me',
  ...guideProtection,
  getMyGuideAnalytics
);

/*
 * Public reviews for one approved guide.
 */
router.get(
  '/guide/:guideId',
  getGuideReviews
);

export default router;