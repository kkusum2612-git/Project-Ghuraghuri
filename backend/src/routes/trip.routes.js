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
  addTripCollaborator,
  getTripCollaborators,
  removeTripCollaborator,
} from '../controllers/tripCollaborator.controller.js';

import {
  authenticateUser,
  authorizeRoles,
} from '../middleware/auth.middleware.js';

const router = Router();

/*
 * Every route in the Trip feature belongs to the traveler
 * workspace.
 *
 * First:
 * authenticateUser checks that the user is logged in.
 *
 * Then:
 * authorizeRoles('traveler') checks that the account is a
 * traveler account.
 *
 * More specific ownership/collaborator authorization is handled
 * inside the controllers because it depends on the individual trip.
 */
const travelerTripProtection = [
  authenticateUser,
  authorizeRoles('traveler'),
];

/*
 * ------------------------------------------------------------
 * TRIP DASHBOARD / MANAGEMENT
 * ------------------------------------------------------------
 */

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


/*
 * ------------------------------------------------------------
 * FEATURE 3 — TRIP COLLABORATORS
 * ------------------------------------------------------------
 *
 * These routes are placed before the general /:tripId routes so
 * the feature structure remains easy to read and maintain.
 *
 * GET:
 * Owner or collaborator can view trip membership.
 *
 * POST:
 * Only the owner can add a collaborator.
 *
 * DELETE:
 * Only the owner can remove a collaborator.
 */

router.get(
  '/:tripId/collaborators',
  ...travelerTripProtection,
  getTripCollaborators
);

router.post(
  '/:tripId/collaborators',
  ...travelerTripProtection,
  addTripCollaborator
);

router.delete(
  '/:tripId/collaborators/:userId',
  ...travelerTripProtection,
  removeTripCollaborator
);


/*
 * ------------------------------------------------------------
 * TRIP ITINERARY DAYS
 * ------------------------------------------------------------
 */

router.get(
  '/:tripId/days',
  ...travelerTripProtection,
  getTripDays
);


/*
 * ------------------------------------------------------------
 * TRIP ITINERARY STOPS
 * ------------------------------------------------------------
 */

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


/*
 * ------------------------------------------------------------
 * INDIVIDUAL TRIP
 * ------------------------------------------------------------
 */

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