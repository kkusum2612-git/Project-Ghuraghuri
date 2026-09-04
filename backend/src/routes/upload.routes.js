import {
  Router,
} from 'express';

import {
  uploadGuideImages as uploadGuideImagesController,
  uploadHotelImages as uploadHotelImagesController,
  uploadTripCover as uploadTripCoverController,
} from '../controllers/upload.controller.js';

import {
  authenticateUser,
  authorizeRoles,
  requireApprovedProvider,
} from '../middleware/auth.middleware.js';

import {
  uploadGuideImages as uploadGuideImagesMiddleware,
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
/*
 * ------------------------------------------------------------
 * GUIDE IMAGE UPLOAD
 * ------------------------------------------------------------
 *
 * POST
 * /api/v1/uploads/guide-images
 *
 * A guide does not need administrator approval to upload
 * profile or tour-package photos. Pending guides must be able
 * to prepare their listing before the admin reviews it.
 */
router.post(
  '/guide-images',

  authenticateUser,

  authorizeRoles(
    'guide'
  ),

  uploadGuideImagesMiddleware,

  uploadGuideImagesController
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