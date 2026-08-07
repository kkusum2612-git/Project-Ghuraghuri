import { Router } from 'express';

import { getTripDays } from '../controllers/day.controller.js';
import {
  addStop,
  deleteStop,
  getDayStops,
  reorderStops,
  updateStop,
} from '../controllers/stop.controller.js';
import {
  createTrip,
  deleteTrip,
  getTripById,
  getUserTrips,
  updateTrip,
} from '../controllers/trip.controller.js';

const router = Router();

router.post('/', createTrip);
router.get('/', getUserTrips);

router.get('/:tripId/days', getTripDays);

router.get('/:tripId/days/:dayId/stops', getDayStops);
router.post('/:tripId/days/:dayId/stops', addStop);

router.patch(
  '/:tripId/days/:dayId/stops/reorder',
  reorderStops,
);

router.patch(
  '/:tripId/days/:dayId/stops/:stopId',
  updateStop,
);

router.delete(
  '/:tripId/days/:dayId/stops/:stopId',
  deleteStop,
);

router.get('/:tripId', getTripById);
router.patch('/:tripId', updateTrip);
router.delete('/:tripId', deleteTrip);

export default router;