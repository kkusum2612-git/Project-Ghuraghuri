import {
  Router,
} from 'express';

import {
  uploadHotelImages as uploadHotelImagesController,
  uploadTripCover as uploadTripCoverController,
} from '../controllers/upload.controller.js';

import {
  authenticateUser,
  authorizeRoles,
  requireApprovedProvider,
} from '../middleware/auth.middleware.js';

import {
  uploadHotelImages as uploadHotelImagesMiddleware,
  uploadTripCover as uploadTripCoverMiddleware,
} from '../middleware/image-upload.middleware.js';

const router =
  Router();

/*
 * ------------------------------------------------------------
 * HOTEL IMAGE UPLOAD
 * ------------------------------------------------------------
 *
 * POST
 * /api/v1/uploads/hotel-images
 *
 * Only:
 *
 * - authenticated users
 * - hotel-role accounts
 * - approved hotel providers
 *
 * may upload hotel listing images.
 */
router.post(
  '/hotel-images',

  authenticateUser,

  authorizeRoles(
    'hotel'
  ),

  requireApprovedProvider,

  uploadHotelImagesMiddleware,

  uploadHotelImagesController
);

// An authenticated traveler can upload one trip cover image.
router.post(
  '/trip-cover',

  authenticateUser,

  authorizeRoles(
    'traveler'
  ),

  uploadTripCoverMiddleware,

  uploadTripCoverController
);

export default router;