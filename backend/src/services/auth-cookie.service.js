// This is the name that the browser will use when storing the JWT cookie.
//
// We keep the name in one constant so every part of authentication uses
// exactly the same spelling.
const AUTH_COOKIE_NAME = 'ghuraghuri_access_token';

// These values convert common time units into milliseconds.
//
// Express expects a cookie's maxAge value in milliseconds.
const MILLISECONDS_PER_SECOND = 1000;
const MILLISECONDS_PER_MINUTE = 60 * MILLISECONDS_PER_SECOND;
const MILLISECONDS_PER_HOUR = 60 * MILLISECONDS_PER_MINUTE;
const MILLISECONDS_PER_DAY = 24 * MILLISECONDS_PER_HOUR;
const MILLISECONDS_PER_WEEK = 7 * MILLISECONDS_PER_DAY;

// This object lets us convert values such as:
// - 30m = 30 minutes
// - 12h = 12 hours
// - 7d = 7 days
// - 2w = 2 weeks
const TIME_UNIT_TO_MILLISECONDS = {
  s: MILLISECONDS_PER_SECOND,
  m: MILLISECONDS_PER_MINUTE,
  h: MILLISECONDS_PER_HOUR,
  d: MILLISECONDS_PER_DAY,
  w: MILLISECONDS_PER_WEEK,
};

/**
 * Converts the JWT expiry setting into milliseconds.
 *
 * The JWT service uses JWT_EXPIRES_IN to control how long a token remains
 * valid. The cookie should expire at approximately the same time.
 *
 * Supported examples:
 * - 30m
 * - 12h
 * - 7d
 * - 2w
 *
 * @param {string} duration
 * The duration text read from JWT_EXPIRES_IN.
 *
 * @returns {number}
 * The equivalent duration in milliseconds.
 */
function convertDurationToMilliseconds(duration) {
  // The regular expression separates a value such as "7d" into:
  // - amount: 7
  // - unit: d
  const durationMatch = /^(\d+)([smhdw])$/i.exec(duration);

  if (!durationMatch) {
    throw new Error(
      'JWT_EXPIRES_IN must use a format such as 30m, 12h, 7d, or 2w.'
    );
  }

  const amount = Number(durationMatch[1]);
  const unit = durationMatch[2].toLowerCase();

  // Reject zero because a cookie with a zero lifetime would expire immediately.
  if (!Number.isSafeInteger(amount) || amount <= 0) {
    throw new Error('JWT_EXPIRES_IN must contain a positive whole number.');
  }

  return amount * TIME_UNIT_TO_MILLISECONDS[unit];
}

/**
 * Returns the shared options used when setting the authentication cookie.
 *
 * @returns {{
 *   httpOnly: boolean,
 *   secure: boolean,
 *   sameSite: string,
 *   maxAge: number,
 *   path: string
 * }}
 */
function getAuthCookieOptions() {
  // In production, HTTPS should be used and secure cookies should be enabled.
  //
  // During local development, the site normally runs over HTTP on localhost.
  // A secure cookie would not work over ordinary local HTTP, so it is disabled
  // only in non-production environments.
  const isProduction = process.env.NODE_ENV === 'production';

  // Keep the browser cookie lifetime synchronized with the JWT lifetime.
  const jwtExpiry =
    typeof process.env.JWT_EXPIRES_IN === 'string' &&
    process.env.JWT_EXPIRES_IN.trim()
      ? process.env.JWT_EXPIRES_IN.trim()
      : '7d';

  return {
    // JavaScript running in the browser cannot read an HTTP-only cookie.
    // The browser can still send it automatically with HTTP requests.
    httpOnly: true,

    // Secure cookies are sent only over HTTPS.
    secure: isProduction,

    // "lax" provides useful protection against many cross-site requests while
    // still supporting ordinary navigation and our localhost development flow.
    sameSite: 'lax',

    // Express expects maxAge in milliseconds.
    maxAge: convertDurationToMilliseconds(jwtExpiry),

    // The cookie should be available to every API route on this backend.
    path: '/',
  };
}

/**
 * Stores a JWT in the browser as an authentication cookie.
 *
 * @param {object} response
 * The Express response object.
 *
 * @param {string} token
 * The signed JWT created by token.service.js.
 */
function setAuthCookie(response, token) {
  // Validate the response object so programming mistakes produce a clear error.
  if (!response || typeof response.cookie !== 'function') {
    throw new TypeError(
      'A valid Express response object is required to set the authentication cookie.'
    );
  }

  // Never create an empty authentication cookie.
  if (typeof token !== 'string' || token.trim() === '') {
    throw new TypeError(
      'A non-empty token is required to set the authentication cookie.'
    );
  }

  response.cookie(
    AUTH_COOKIE_NAME,
    token,
    getAuthCookieOptions()
  );
}

/**
 * Removes the authentication cookie during logout.
 *
 * The identifying cookie options must match the options used when the cookie
 * was created. Otherwise, the browser may not remove the intended cookie.
 *
 * @param {object} response
 * The Express response object.
 */
function clearAuthCookie(response) {
  if (!response || typeof response.clearCookie !== 'function') {
    throw new TypeError(
      'A valid Express response object is required to clear the authentication cookie.'
    );
  }

  const cookieOptions = getAuthCookieOptions();

  // Express 5 does not need maxAge or expires when clearCookie() is called.
  //
  // We pass only the options needed to identify the same cookie.
  response.clearCookie(
    AUTH_COOKIE_NAME,
    {
      httpOnly: cookieOptions.httpOnly,
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
      path: cookieOptions.path,
    }
  );
}

export {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
  getAuthCookieOptions,
  setAuthCookie,
};