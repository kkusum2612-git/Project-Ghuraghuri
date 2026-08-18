import { Router } from 'express';

import {
  getTravelerPaymentHistory,
  handleSslcommerzCancellation,
  handleSslcommerzFailure,
  handleSslcommerzIpn,
  handleSslcommerzSuccess,
  initiateHotelPayment,
} from '../controllers/payment.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

/*
 * ------------------------------------------------------------
 * KUSUM FEATURE 3 - PAYMENT ROUTES
 * ------------------------------------------------------------
 *
 * There are two different kinds of routes in this file:
 *
 * 1. Traveler routes
 *    These are called by our React frontend.
 *    They require normal Ghuraghuri authentication.
 *
 * 2. SSLCOMMERZ callback routes
 *    These are called by SSLCOMMERZ after a payment attempt.
 *    They MUST NOT use authenticateUser because the payment
 *    gateway does not possess the traveler's JWT cookie.
 */

// ------------------------------------------------------------
// AUTHENTICATED TRAVELER ROUTES
// ------------------------------------------------------------

/*
 * POST
 * /api/v1/payments/hotel/:bookingId/initiate
 *
 * Starts a payment for one hotel booking.
 *
 * Security:
 *
 * - user must be logged in
 * - user must have traveler role
 * - controller checks that the booking belongs to that traveler
 *
 * The browser does NOT supply the payment amount.
 *
 * The controller reads booking.totalPrice from MongoDB.
 */
router.post(
  '/hotel/:bookingId/initiate',
  authenticateUser,
  authorizeRoles('traveler'),
  initiateHotelPayment
);

/*
 * GET
 * /api/v1/payments/traveler/me
 *
 * Returns the logged-in traveler's payment attempts/history.
 *
 * We use req.user._id on the backend, so the traveler cannot
 * request another user's payment history by changing an ID.
 */
router.get(
  '/traveler/me',
  authenticateUser,
  authorizeRoles('traveler'),
  getTravelerPaymentHistory
);

// ------------------------------------------------------------
// SSLCOMMERZ CALLBACK ROUTES
// ------------------------------------------------------------

/*
 * IMPORTANT:
 *
 * These callback routes intentionally do NOT use:
 *
 * authenticateUser
 * authorizeRoles(...)
 *
 * Why?
 *
 * SSLCOMMERZ sends these requests from outside Ghuraghuri.
 * The gateway does not have our JWT authentication cookie.
 *
 * Instead, payment.controller.js identifies the transaction
 * using Ghuraghuri's transactionId and validates successful
 * payments directly with SSLCOMMERZ.
 */

/*
 * Successful hosted-checkout callback.
 *
 * A "success" callback alone is NOT trusted as proof of payment.
 *
 * The controller uses val_id to call SSLCOMMERZ's validation
 * API before changing Payment.status or Booking.paymentStatus.
 */
router.post(
  '/sslcommerz/success',
  handleSslcommerzSuccess
);

/*
 * Payment failure callback.
 *
 * This records the individual payment attempt as failed.
 */
router.post(
  '/sslcommerz/fail',
  handleSslcommerzFailure
);

/*
 * Payment cancellation callback.
 *
 * The Payment attempt becomes cancelled while the booking
 * remains available for another payment attempt.
 */
router.post(
  '/sslcommerz/cancel',
  handleSslcommerzCancellation
);

/*
 * Instant Payment Notification (IPN).
 *
 * This is the server-to-server notification endpoint.
 *
 * It is especially useful once our backend has a public URL.
 *
 * During localhost-only development, SSLCOMMERZ cannot directly
 * reach localhost from its servers, but keeping this endpoint
 * implemented gives us the correct production architecture.
 */
router.post(
  '/sslcommerz/ipn',
  handleSslcommerzIpn
);

export default router;
