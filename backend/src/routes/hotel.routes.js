import { Router } from 'express';

import {
  createHotel,
  deleteHotel,
  getHotelAvailability,
  getHotelById,
  getHotels,
  getVendorHotelById,
  getVendorHotels,
  updateHotel,
} from '../controllers/hotel.controller.js';

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

// Public hotel search.
// We will use this later for the traveler-side feature.
router.get('/', getHotels);

// Only an authenticated + approved hotel vendor can create a listing.
router.post(
  '/',
  ...hotelVendorProtection,
  createHotel
);

// Current logged-in vendor's listings.
router.get(
  '/vendor/me',
  ...hotelVendorProtection,
  getVendorHotels
);

// Current vendor's specific listing.
// Useful when the Edit Hotel frontend loads an existing listing.
router.get(
  '/vendor/me/:hotelId',
  ...hotelVendorProtection,
  getVendorHotelById
);

router.get(
  '/:hotelId/availability',
  getHotelAvailability
);

// Public hotel details.
router.get('/:hotelId', getHotelById);

// Only the owner can update this hotel.
router.patch(
  '/:hotelId',
  ...hotelVendorProtection,
  updateHotel
);

// Only the owner can delete this hotel.
router.delete(
  '/:hotelId',
  ...hotelVendorProtection,
  deleteHotel
);

export default router;