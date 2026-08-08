import { Router } from 'express';

import {
  createTrip,
  deleteTrip,
  getTripById,
  getTrips,
  updateTrip,
} from '../controllers/trip.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

const travelerTripProtection = [
  authenticateUser,
  authorizeRoles('traveler'),
];

router.post(
  '/',
  ...travelerTripProtection,
  createTrip
);

router.get(
  '/',
  ...travelerTripProtection,
  getTrips
);

router.get(
  '/:tripId',
  ...travelerTripProtection,
  getTripById
);

router.patch(
  '/:tripId',
  ...travelerTripProtection,
  updateTrip
);

router.delete(
  '/:tripId',
  ...travelerTripProtection,
  deleteTrip
);

export default router;