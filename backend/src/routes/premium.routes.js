import {
  Router,
} from 'express';

import {
  getMyPremiumStatus,
  handlePremiumSslcommerzCancellation,
  handlePremiumSslcommerzFailure,
  handlePremiumSslcommerzIpn,
  handlePremiumSslcommerzSuccess,
  initiatePremiumUpgrade,
} from '../controllers/premium.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';


/*
 * ============================================================
 * RAFI FEATURE 3 - PREMIUM ROUTES
 * ============================================================
 *
 * app.js mounts this router at:
 *
 *   /api/v1/premium
 *
 *
 * This router now contains TWO categories of endpoints:
 *
 *   1. SSLCOMMERZ callback routes
 *   2. Authenticated traveler routes
 *
 *
 * Their security works differently, so we keep that distinction
 * very clear below.
 */
const router =
  Router();


/*
 * ============================================================
 * SSLCOMMERZ CALLBACK ROUTES
 * ============================================================
 *
 * These routes intentionally DO NOT use:
 *
 *   authenticateUser
 *   authorizeRoles(...)
 *
 *
 * Why?
 *
 * SSLCOMMERZ is an external service.
 *
 * It does not possess the traveler's HTTP-only JWT cookie.
 *
 *
 * Does that mean anybody can make themselves Premium by calling
 * the success route?
 *
 * NO.
 *
 *
 * The success/IPN controller uses:
 *
 *   transactionId
 *   +
 *   validationId
 *
 * and sends the Validation ID BACK to SSLCOMMERZ.
 *
 * Premium is activated only when SSLCOMMERZ independently
 * validates:
 *
 *   status
 *   transaction ID
 *   amount
 *   currency
 *
 *
 * Therefore:
 *
 * Public callback URL
 *
 * does NOT mean:
 *
 * Unprotected Premium activation.
 */


/*
 * ------------------------------------------------------------
 * POST /api/v1/premium/sslcommerz/success
 * ------------------------------------------------------------
 *
 * Hosted-checkout success callback.
 *
 * The URL itself is not trusted as proof of payment.
 */
router.post(
  '/sslcommerz/success',
  handlePremiumSslcommerzSuccess
);


/*
 * ------------------------------------------------------------
 * POST /api/v1/premium/sslcommerz/fail
 * ------------------------------------------------------------
 *
 * Records an unsuccessful Premium checkout.
 */
router.post(
  '/sslcommerz/fail',
  handlePremiumSslcommerzFailure
);


/*
 * ------------------------------------------------------------
 * POST /api/v1/premium/sslcommerz/cancel
 * ------------------------------------------------------------
 *
 * Records that the traveler cancelled Premium checkout.
 */
router.post(
  '/sslcommerz/cancel',
  handlePremiumSslcommerzCancellation
);


/*
 * ------------------------------------------------------------
 * POST /api/v1/premium/sslcommerz/ipn
 * ------------------------------------------------------------
 *
 * Server-to-server payment notification endpoint.
 *
 * Successful information is still independently validated.
 */
router.post(
  '/sslcommerz/ipn',
  handlePremiumSslcommerzIpn
);


/*
 * ============================================================
 * AUTHENTICATED TRAVELER ROUTES
 * ============================================================
 *
 * These endpoints ARE called by the Ghuraghuri frontend.
 *
 * Therefore normal cookie authentication and traveler-role
 * authorization are required.
 */


/*
 * ------------------------------------------------------------
 * GET /api/v1/premium/me
 * ------------------------------------------------------------
 *
 * Returns Premium/reward information for the CURRENT logged-in
 * traveler.
 */
router.get(
  '/me',

  authenticateUser,

  authorizeRoles(
    'traveler'
  ),

  getMyPremiumStatus
);


/*
 * ------------------------------------------------------------
 * POST /api/v1/premium/upgrade/initiate
 * ------------------------------------------------------------
 *
 * Starts a Premium upgrade checkout.
 *
 * The authenticated traveler is taken from req.user.
 */
router.post(
  '/upgrade/initiate',

  authenticateUser,

  authorizeRoles(
    'traveler'
  ),

  initiatePremiumUpgrade
);


export default router;