import { Router } from 'express';

import {
  createGuideProfile,
  createTourPackage,
  deleteTourPackage,
  getMyGuideProfile,
  getPendingGuideApplications,
  getPublicGuideById,
  getPublicGuides,
  updateGuideApprovalStatus,
  updateMyGuideProfile,
  updateTourPackage,
} from '../controllers/guide.controller.js';

import { authenticateUser, authorizeRoles } from '../middleware/auth.middleware.js';

const router = Router();

/*
 * A guide must be logged in and have the "guide" role
 * to manage their own professional profile/packages.
 *
 * We intentionally DO NOT use requireApprovedProvider here.
 *
 * Reason:
 * A newly registered guide starts with:
 *
 * approvalStatus = "pending"
 *
 * They must be able to complete their guide profile and
 * tour packages BEFORE the admin reviews the application.
 */
const guideProtection = [authenticateUser, authorizeRoles('guide')];

/*
 * Admin-only protection for reviewing guide applications.
 */
const adminProtection = [authenticateUser, authorizeRoles('admin')];

/*
 * -------------------------------------------------------
 * GUIDE'S OWN PROFILE
 * -------------------------------------------------------
 */

/*
 * Create the currently logged-in guide's professional profile.
 *
 * POST /api/v1/guides/me
 */
router.post('/me', ...guideProtection, createGuideProfile);

/*
 * Get the currently logged-in guide's profile.
 *
 * GET /api/v1/guides/me
 */
router.get('/me', ...guideProtection, getMyGuideProfile);

/*
 * Update the currently logged-in guide's profile.
 *
 * PATCH /api/v1/guides/me
 */
router.patch('/me', ...guideProtection, updateMyGuideProfile);

/*
 * -------------------------------------------------------
 * GUIDE TOUR PACKAGES
 * -------------------------------------------------------
 */

/*
 * Create a tour package.
 *
 * POST /api/v1/guides/me/packages
 */
router.post('/me/packages', ...guideProtection, createTourPackage);

/*
 * Update one of the current guide's packages.
 *
 * PATCH /api/v1/guides/me/packages/:packageId
 */
router.patch('/me/packages/:packageId', ...guideProtection, updateTourPackage);

/*
 * Delete one of the current guide's packages.
 *
 * DELETE /api/v1/guides/me/packages/:packageId
 */
router.delete('/me/packages/:packageId', ...guideProtection, deleteTourPackage);

/*
 * -------------------------------------------------------
 * ADMIN GUIDE APPROVAL
 * -------------------------------------------------------
 */

/*
 * Get guide applications waiting for approval.
 *
 * GET /api/v1/guides/admin/pending
 */
router.get('/admin/pending', ...adminProtection, getPendingGuideApplications);

/*
 * Approve or reject a guide.
 *
 * PATCH /api/v1/guides/admin/:guideId/approval
 */
router.patch('/admin/:guideId/approval', ...adminProtection, updateGuideApprovalStatus);

/*
 * -------------------------------------------------------
 * PUBLIC GUIDE LISTINGS
 * -------------------------------------------------------
 */

/*
 * Public list of approved guides.
 *
 * GET /api/v1/guides
 */
router.get('/', getPublicGuides);

/*
 * Public details of one approved guide.
 *
 * Keep this route LAST because "/:guideId" is dynamic.
 *
 * GET /api/v1/guides/:guideId
 */
router.get('/:guideId', getPublicGuideById);

export default router;
