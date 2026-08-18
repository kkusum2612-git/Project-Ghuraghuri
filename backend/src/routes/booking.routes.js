import { Router } from 'express';

import {
  createBooking,
  getBookingById,
  getTravelerBookings,
  getVendorBookings,
  updateVendorBookingStatus,
} from '../controllers/booking.controller.js';

import {
  authenticateUser,
  authorizeRoles,
  requireApprovedProvider,
} from '../middleware/auth.middleware.js';

const router = Router();

/*
 * Shared protection used by hotel-vendor booking routes.
 *
 * The user must:
 *
 * 1. be logged in
 * 2. have the hotel role
 * 3. be approved by an administrator
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

// Only logged-in travelers can create bookings.
router.post(
  '/',
  authenticateUser,
  authorizeRoles('traveler'),
  createBooking
);

// Logged-in traveler sees only their own bookings.
router.get(
  '/traveler/me',
  authenticateUser,
  authorizeRoles('traveler'),
  getTravelerBookings
);

/*
 * ------------------------------------------------------------
 * HOTEL VENDOR ROUTES
 * ------------------------------------------------------------
 */

// Approved hotel vendor sees only bookings belonging to
// their own hotels.
router.get(
  '/vendor/me',
  ...hotelVendorProtection,
  getVendorBookings
);

/*
 * PATCH
 * /api/v1/bookings/vendor/me/:bookingId/status
 *
 * Approved hotel vendor manages one booking belonging
 * to their own hotel.
 *
 * Supported lifecycle:
 *
 * pending -> confirmed
 * pending -> declined
 * confirmed -> completed
 */
router.patch(
  '/vendor/me/:bookingId/status',
  ...hotelVendorProtection,
  updateVendorBookingStatus
);

/*
 * ------------------------------------------------------------
 * SHARED SINGLE-BOOKING ROUTE
 * ------------------------------------------------------------
 *
 * Hotel or traveler may access a booking only when it
 * belongs to them.
 */
router.get(
  '/:bookingId',
  authenticateUser,
  getBookingById
);

export default router;