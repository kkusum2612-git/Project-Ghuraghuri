import { Router } from 'express';

import {
  createGuideBooking,
  getMyGuideBookings,
  getReceivedGuideBookings,
  updateGuideBookingStatus,
} from '../controllers/guideBooking.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';


const router = Router();


const travelerProtection = [
  authenticateUser,
  authorizeRoles('traveler'),
];


const guideProtection = [
  authenticateUser,
  authorizeRoles('guide'),
];


// Traveler creates booking
router.post(
  '/',
  ...travelerProtection,
  createGuideBooking
);


// Traveler views own bookings
router.get(
  '/me',
  ...travelerProtection,
  getMyGuideBookings
);


// Guide views received bookings
router.get(
  '/received',
  ...guideProtection,
  getReceivedGuideBookings
);


// Guide updates booking status
router.patch(
  '/:bookingId/status',
  ...guideProtection,
  updateGuideBookingStatus
);


export default router;