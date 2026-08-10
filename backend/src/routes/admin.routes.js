import { Router } from 'express';

import {
  approveProviderApplication,
  getPendingProviderApplications,
  rejectProviderApplication,
} from '../controllers/admin.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

// Every route in this file requires:
// 1. A valid logged-in user.
// 2. The "admin" role.
//
// This protects the endpoints even if someone tries to call them
// directly without using the frontend admin page.
router.use(
  authenticateUser,
  authorizeRoles('admin')
);

/**
 * GET /api/v1/admin/provider-applications/pending
 *
 * Returns hotel and guide accounts that are currently waiting
 * for administrator approval.
 */
router.get(
  '/provider-applications/pending',
  getPendingProviderApplications
);

/**
 * PATCH /api/v1/admin/provider-applications/:userId/approve
 *
 * Changes a pending hotel or guide account to "approved".
 */
router.patch(
  '/provider-applications/:userId/approve',
  approveProviderApplication
);

/**
 * PATCH /api/v1/admin/provider-applications/:userId/reject
 *
 * Changes a pending hotel or guide account to "rejected".
 */
router.patch(
  '/provider-applications/:userId/reject',
  rejectProviderApplication
);

export default router;