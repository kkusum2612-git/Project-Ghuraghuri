import {
  randomUUID,
} from 'node:crypto';

import {
  getSupabaseClient,
} from '../config/supabase.js';

/*
 * ------------------------------------------------------------
 * SUPABASE STORAGE SERVICE
 * ------------------------------------------------------------
 *
 * This file contains reusable storage logic.
 *
 * It does NOT know anything about Express routes.
 *
 * Hotel uploads will use it first.
 *
 * Later, other members can reuse the same function for:
 *
 * guides/
 * trips/
 * public-rooms/
 *
 * without rebuilding the Supabase integration.
 */

const MIME_EXTENSION_MAP = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/**
 * Returns the configured Supabase bucket name.
 */
function getStorageBucket() {
  const bucket =
    process.env
      .SUPABASE_STORAGE_BUCKET
      ?.trim();

  if (!bucket) {
    const error = new Error(
      'Supabase storage bucket is not configured.'
    );

    error.statusCode = 503;

    throw error;
  }

  return bucket;
}

/**
 * Uploads one image into Supabase Storage.
 *
 * @param {object} options
 * Upload options.
 *
 * @param {Buffer} options.buffer
 * File contents provided by Multer.
 *
 * @param {string} options.mimeType
 * Example: image/jpeg.
 *
 * @param {string} options.folder
 * Example:
 * hotels/abc123
 *
 * @returns {Promise<object>}
 * Storage path and public URL.
 */
async function uploadImage({
  buffer,
  mimeType,
  folder,
}) {
  const extension =
    MIME_EXTENSION_MAP[
      mimeType
    ];

  if (!extension) {
    const error = new Error(
      'Unsupported image format.'
    );

    error.statusCode = 400;

    throw error;
  }

  const supabase =
    getSupabaseClient();

  const bucket =
    getStorageBucket();

  /*
   * We generate the filename ourselves instead of trusting
   * the original filename supplied by the browser.
   *
   * This avoids collisions and keeps storage paths clean.
   */
  const fileName =
    `${Date.now()}-${randomUUID()}.${extension}`;

  const normalizedFolder =
    String(folder)
      .replace(
        /^\/+|\/+$/g,
        ''
      );

  const storagePath =
    `${normalizedFolder}/${fileName}`;

  const {
    error: uploadError,
  } =
    await supabase.storage
      .from(bucket)
      .upload(
        storagePath,
        buffer,
        {
          contentType:
            mimeType,

          upsert: false,
        }
      );

  if (uploadError) {
    const error = new Error(
      `Unable to upload image: ${uploadError.message}`
    );

    error.statusCode = 502;

    throw error;
  }

  /*
   * Because ghuraghuri-images is a PUBLIC bucket,
   * Supabase can generate a permanent public URL.
   */
  const {
    data:
      publicUrlData,
  } =
    supabase.storage
      .from(bucket)
      .getPublicUrl(
        storagePath
      );

  if (
    !publicUrlData?.publicUrl
  ) {
    const error = new Error(
      'The image was uploaded but its public URL could not be generated.'
    );

    error.statusCode = 502;

    throw error;
  }

  return {
    path:
      storagePath,

    publicUrl:
      publicUrlData.publicUrl,
  };
}

export {
  uploadImage,
};