import {
  Router,
} from 'express';

import {
  approveProviderApplication,
  getAdminRewardSettings,
  getPendingProviderApplications,
  rejectProviderApplication,
  updateAdminRewardSettings,
} from '../controllers/admin.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';


const router =
  Router();


/*
 * ============================================================
 * ADMIN ROUTE SECURITY
 * ============================================================
 *
 * Every endpoint in this file requires:
 *
 * 1. A valid authenticated Ghuraghuri account.
 * 2. The "admin" role.
 *
 * This protects both:
 *
 * - existing provider approval
 * - Rafi's Premium/reward policy configuration
 */
router.use(
  authenticateUser,
  authorizeRoles('admin')
);


/*
 * ------------------------------------------------------------
 * EXISTING PROVIDER APPROVAL ROUTES
 * ------------------------------------------------------------
 *
 * These routes remain unchanged.
 */
router.get(
  '/provider-applications/pending',
  getPendingProviderApplications
);


router.patch(
  '/provider-applications/:userId/approve',
  approveProviderApplication
);


router.patch(
  '/provider-applications/:userId/reject',
  rejectProviderApplication
);


/*
 * ============================================================
 * RAFI FEATURE 3 - PREMIUM / REWARD POLICY
 * ============================================================
 *
 * GET
 * /api/v1/admin/reward-settings
 *
 * Returns the current global Premium/reward configuration.
 */
router.get(
  '/reward-settings',
  getAdminRewardSettings
);


/*
 * PATCH
 * /api/v1/admin/reward-settings
 *
 * Changes one or more global policy values.
 *
 * The backend remains authoritative; the admin frontend cannot
 * bypass validation by modifying browser JavaScript.
 */
router.patch(
  '/reward-settings',
  updateAdminRewardSettings
);


export default router;