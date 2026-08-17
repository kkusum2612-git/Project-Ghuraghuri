import {
  uploadImage,
} from '../services/storage.service.js';

/*
 * ------------------------------------------------------------
 * UPLOAD CONTROLLER
 * ------------------------------------------------------------
 *
 * Multer has already validated the files before this controller
 * runs.
 *
 * The authenticated hotel vendor is available as:
 *
 * req.user
 *
 * because the route uses authenticateUser first.
 */

/**
 * Upload hotel photos to Supabase.
 *
 * Expected multipart field:
 *
 * images
 *
 * Supports up to 6 images in one request.
 */
async function uploadHotelImages(
  req,
  res,
  next
) {
  try {
    const files =
      Array.isArray(
        req.files
      )
        ? req.files
        : [];

    if (
      files.length === 0
    ) {
      const error =
        new Error(
          'Please select at least one image to upload.'
        );

      error.statusCode = 400;

      throw error;
    }

    /*
     * Every hotel vendor receives their own folder.
     *
     * Example:
     *
     * hotels/66bf.../
     *
     * This keeps uploads organized and prevents all users'
     * images from being mixed into one directory.
     */
    const folder =
      `hotels/${req.user._id}`;

    const uploadedImages =
      await Promise.all(
        files.map(
          async (file) => {
            const result =
              await uploadImage({
                buffer:
                  file.buffer,

                mimeType:
                  file.mimetype,

                folder,
              });

            return {
              originalName:
                file.originalname,

              path:
                result.path,

              url:
                result.publicUrl,
            };
          }
        )
      );

    res.status(201).json({
      success: true,

      message:
        uploadedImages.length ===
        1
          ? 'Hotel image uploaded successfully.'
          : 'Hotel images uploaded successfully.',

      data: {
        images:
          uploadedImages,
      },
    });
  } catch (error) {
    next(error);
  }
}

export {
  uploadHotelImages,
};