import { Router } from 'express';
import {
  createHotel,
  deleteHotel,
  getHotelById,
  getHotels,
  getVendorHotels,
  updateHotel,
} from '../controllers/hotel.controller.js';

const router = Router();

router
  .route('/')
  .post(createHotel)
  .get(getHotels);

router.get('/vendor/:vendorId', getVendorHotels);

router
  .route('/:hotelId')
  .get(getHotelById)
  .patch(updateHotel)
  .delete(deleteHotel);

export default router;
