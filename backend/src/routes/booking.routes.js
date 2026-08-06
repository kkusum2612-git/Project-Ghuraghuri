import { Router } from 'express';
import {
  createBooking,
  getBookingById,
  getTravelerBookings,
  getVendorBookings,
} from '../controllers/booking.controller.js';

const router = Router();

router.post('/', createBooking);

router.get('/vendor/:vendorId', getVendorBookings);

router.get('/traveler/:travelerId', getTravelerBookings);

router.get('/:bookingId', getBookingById);

export default router;