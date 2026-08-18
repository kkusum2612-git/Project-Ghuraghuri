import {
  Router,
} from 'express';

import {
  uploadHotelImages as uploadHotelImagesController,
} from '../controllers/upload.controller.js';

import {
  authenticateUser,
  authorizeRoles,
  requireApprovedProvider,
} from '../middleware/auth.middleware.js';

import {
  uploadHotelImages as uploadHotelImagesMiddleware,
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

export default router;