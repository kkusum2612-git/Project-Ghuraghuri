import {
  createClient,
} from '@supabase/supabase-js';

/*
 * ------------------------------------------------------------
 * SUPABASE CLIENT
 * ------------------------------------------------------------
 *
 * Ghuraghuri still uses MongoDB as its main database.
 *
 * Supabase is being used ONLY for file/image storage.
 *
 * We intentionally create the Supabase client lazily instead
 * of immediately when this file is imported.
 *
 * Why?
 *
 * Other team members may pull this code before they have added
 * the Supabase environment variables to their own backend/.env.
 *
 * If we created the client immediately, their entire backend
 * could fail to start.
 *
 * With lazy initialization:
 *
 * - the normal Ghuraghuri backend can still start;
 * - Supabase is only required when an upload endpoint is used.
 */

let supabaseClient = null;

/**
 * Returns the reusable server-side Supabase client.
 *
 * The secret key must remain inside backend/.env.
 * It must never be sent to React or committed to Git.
 */
function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL?.trim();

  const supabaseSecretKey =
    process.env.SUPABASE_SECRET_KEY?.trim();

  if (
    !supabaseUrl ||
    !supabaseSecretKey
  ) {
    const error = new Error(
      'Supabase image storage is not configured on this server.'
    );

    error.statusCode = 503;

    throw error;
  }

  supabaseClient = createClient(
    supabaseUrl,
    supabaseSecretKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  return supabaseClient;
}

export {
  getSupabaseClient,
};