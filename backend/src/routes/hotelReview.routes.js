import { Router } from 'express';

import {
  createHotelReview,
  getHotelReviews,
  getTravelerHotelReviews,
  getVendorHotelReviews,
} from '../controllers/hotelReview.controller.js';

import {
  authenticateUser,
  authorizeRoles,
  requireApprovedProvider,
} from '../middleware/auth.middleware.js';

const router = Router();

/*
 * ------------------------------------------------------------
 * HOTEL REVIEW ROUTES
 * ------------------------------------------------------------
 *
 * Public:
 *
 * GET /api/v1/reviews/hotel/:hotelId
 *
 * Traveler:
 *
 * POST /api/v1/reviews
 * GET  /api/v1/reviews/traveler/me
 *
 * Hotel vendor:
 *
 * GET /api/v1/reviews/vendor/me
 */

/*
 * Shared protection for approved hotel vendors.
 */
const hotelVendorProtection = [
  authenticateUser,
  authorizeRoles('hotel'),
  requireApprovedProvider,
];

/*
 * ------------------------------------------------------------
 * TRAVELER ROUTES
 * ------------------------------------------------------------
 */

/*
 * Submit one review for a completed hotel booking.
 *
 * The traveler sends:
 *
 * {
 *   bookingId,
 *   rating,
 *   comment
 * }
 *
 * hotelId, vendorId and travelerId are derived securely
 * by the backend.
 */
router.post(
  '/',
  authenticateUser,
  authorizeRoles('traveler'),
  createHotelReview
);

/*
 * Logged-in traveler retrieves all hotel reviews they have
 * previously submitted.
 */
router.get(
  '/traveler/me',
  authenticateUser,
  authorizeRoles('traveler'),
  getTravelerHotelReviews
);

/*
 * ------------------------------------------------------------
 * HOTEL VENDOR ROUTE
 * ------------------------------------------------------------
 *
 * Approved hotel vendor retrieves reviews belonging only
 * to their own hotel listings.
 */
router.get(
  '/vendor/me',
  ...hotelVendorProtection,
  getVendorHotelReviews
);

/*
 * ------------------------------------------------------------
 * PUBLIC ROUTE
 * ------------------------------------------------------------
 *
 * Anyone can read reviews and rating information for one
 * active hotel.
 */
router.get(
  '/hotel/:hotelId',
  getHotelReviews
);

export default router;