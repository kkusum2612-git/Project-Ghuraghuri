import { Router } from 'express';

import {
  createBooking,
  getBookingById,
  getTravelerBookings,
  getVendorBookings,
} from '../controllers/booking.controller.js';

import {
  authenticateUser,
  authorizeRoles,
  requireApprovedProvider,
} from '../middleware/auth.middleware.js';

const router = Router();

const hotelVendorProtection = [
  authenticateUser,
  authorizeRoles('hotel'),
  requireApprovedProvider,
];

// Only logged-in travelers can create bookings.
router.post(
  '/',
  authenticateUser,
  authorizeRoles('traveler'),
  createBooking
);

// Logged-in hotel sees only bookings belonging to their hotels.
router.get(
  '/vendor/me',
  ...hotelVendorProtection,
  getVendorBookings
);

// Logged-in traveler sees only their own bookings.
router.get(
  '/traveler/me',
  authenticateUser,
  authorizeRoles('traveler'),
  getTravelerBookings
);

// Hotel or traveler can access a booking only if it belongs to them.
router.get(
  '/:bookingId',
  authenticateUser,
  getBookingById
);

export default router;