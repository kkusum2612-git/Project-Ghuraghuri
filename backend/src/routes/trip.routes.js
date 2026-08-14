import { Router } from 'express';

import {
  addStop,
  createTrip,
  deleteTrip,
  deleteStop,
  getDayStops,
  getTripById,
  getTripDays,
  getTrips,
  reorderStops,
  updateStop,
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
  '/:tripId/days',
  ...travelerTripProtection,
  getTripDays
);

router.get(
  '/:tripId/days/:dayId/stops',
  ...travelerTripProtection,
  getDayStops
);

router.post(
  '/:tripId/days/:dayId/stops',
  ...travelerTripProtection,
  addStop
);

router.patch(
  '/:tripId/days/:dayId/stops/reorder',
  ...travelerTripProtection,
  reorderStops
);

router.patch(
  '/:tripId/days/:dayId/stops/:stopId',
  ...travelerTripProtection,
  updateStop
);

router.delete(
  '/:tripId/days/:dayId/stops/:stopId',
  ...travelerTripProtection,
  deleteStop
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