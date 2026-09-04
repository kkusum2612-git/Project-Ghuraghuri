import multer from 'multer';

/*
 * ------------------------------------------------------------
 * IMAGE UPLOAD VALIDATION
 * ------------------------------------------------------------
 *
 * Multer reads multipart/form-data requests.
 *
 * We use memoryStorage because we do NOT want to save uploaded
 * files permanently on the Express server.
 *
 * Flow:
 *
 * browser
 *   -> Multer keeps file temporarily in memory
 *   -> controller sends Buffer to Supabase
 *   -> request finishes
 *
 * Nothing is written to a local uploads folder.
 */

const MAX_IMAGE_SIZE_BYTES =
  5 * 1024 * 1024;

const MAX_IMAGES_PER_REQUEST =
  6;

const ALLOWED_IMAGE_TYPES =
  new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
  ]);

const storage =
  multer.memoryStorage();

/**
 * Allows only the image formats supported by our
 * Supabase bucket.
 */
function imageFileFilter(
  _req,
  file,
  callback
) {
  if (
    ALLOWED_IMAGE_TYPES.has(
      file.mimetype
    )
  ) {
    callback(
      null,
      true
    );

    return;
  }

  const error = new Error(
    'Only JPEG, PNG, and WebP images are allowed.'
  );

  error.statusCode = 400;

  callback(
    error,
    false
  );
}

const hotelImageUploader =
  multer({
    storage,

    limits: {
      fileSize:
        MAX_IMAGE_SIZE_BYTES,

      files:
        MAX_IMAGES_PER_REQUEST,
    },

    fileFilter:
      imageFileFilter,
  });

// Trip covers use one image while sharing the same validation rules.
const tripCoverUploader =
  multer({
    storage,

    limits: {
      fileSize:
        MAX_IMAGE_SIZE_BYTES,

      files: 1,
    },

    fileFilter:
      imageFileFilter,
  });

/**
 * Wrapper around Multer's array middleware.
 *
 * The frontend must send files using this field name:
 *
 * images
 *
 * Maximum:
 * 6 images per request
 */
function uploadHotelImages(
  req,
  res,
  next
) {
  hotelImageUploader.array(
    'images',
    MAX_IMAGES_PER_REQUEST
  )(
    req,
    res,
    (error) => {
      if (!error) {
        next();

        return;
      }

      /*
       * Multer creates its own error objects for
       * upload-limit violations.
       */
      if (
        error instanceof
        multer.MulterError
      ) {
        if (
          error.code ===
          'LIMIT_FILE_SIZE'
        ) {
          error.message =
            'Each image must be 5 MB or smaller.';
        } else if (
          error.code ===
          'LIMIT_FILE_COUNT'
        ) {
          error.message =
            'You can upload a maximum of 6 images at once.';
        } else {
          error.message =
            `Image upload failed: ${error.message}`;
        }

        error.statusCode = 400;
      }

      if (!error.statusCode) {
        error.statusCode = 400;
      }

      next(error);
    }
  );
}
/*
 * Guide profile and tour-package photos use the same
 * validation rules as hotel images.
 *
 * The frontend sends the files using the "images" field.
 * A guide may upload up to 6 images in one request.
 */
function uploadGuideImages(
  req,
  res,
  next
) {
  hotelImageUploader.array(
    'images',
    MAX_IMAGES_PER_REQUEST
  )(
    req,
    res,
    (error) => {
      if (!error) {
        next();

        return;
      }

      if (
        error instanceof
        multer.MulterError
      ) {
        if (
          error.code ===
          'LIMIT_FILE_SIZE'
        ) {
          error.message =
            'Each image must be 5 MB or smaller.';
        } else if (
          error.code ===
          'LIMIT_FILE_COUNT'
        ) {
          error.message =
            'You can upload a maximum of 6 images at once.';
        } else {
          error.message =
            `Image upload failed: ${error.message}`;
        }

        error.statusCode = 400;
      }

      if (!error.statusCode) {
        error.statusCode = 400;
      }

      next(error);
    }
  );
}
// The trip form sends one cover file using the "image" field.
function uploadTripCover(
  req,
  res,
  next
) {
  tripCoverUploader.single(
    'image'
  )(
    req,
    res,
    (error) => {
      if (!error) {
        next();

        return;
      }

      if (
        error instanceof
        multer.MulterError
      ) {
        if (
          error.code ===
          'LIMIT_FILE_SIZE'
        ) {
          error.message =
            'The cover image must be 5 MB or smaller.';
        } else if (
          error.code ===
            'LIMIT_FILE_COUNT' ||
          error.code ===
            'LIMIT_UNEXPECTED_FILE'
        ) {
          error.message =
            'You can upload only one trip cover image.';
        } else {
          error.message =
            `Image upload failed: ${error.message}`;
        }

        error.statusCode = 400;
      }

      if (!error.statusCode) {
        error.statusCode = 400;
      }

      next(error);
    }
  );
}

export {
  uploadGuideImages,
  uploadHotelImages,
  uploadTripCover,
};