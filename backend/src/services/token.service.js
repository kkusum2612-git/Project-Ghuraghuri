import jwt from 'jsonwebtoken';

// HS256 means that the same private secret is used to:
// 1. Sign a token when a user logs in.
// 2. Verify the token on later requests.
//
// We state the algorithm explicitly instead of relying on a library default.
// This makes the security configuration clearer and prevents unexpected
// algorithms from being accepted during verification.
const JWT_ALGORITHM = 'HS256';

// The issuer identifies which backend created the token.
const JWT_ISSUER = 'ghuraghuri-api';

// The audience identifies which application is expected to use the token.
const JWT_AUDIENCE = 'ghuraghuri-web';

/**
 * Reads and validates JWT configuration from environment variables.
 *
 * Environment variables are used so that private values remain outside
 * the Git repository and source-code files.
 *
 * Required variable:
 * JWT_SECRET
 *
 * Optional variable:
 * JWT_EXPIRES_IN
 *
 * @returns {{
 *   secret: string,
 *   expiresIn: string
 * }}
 */
function getJwtSettings() {
  // Read the secret from backend/.env through process.env.
  //
  // We never print or return this value in an API response.
  const secret =
    typeof process.env.JWT_SECRET === 'string'
      ? process.env.JWT_SECRET.trim()
      : '';

  // A JWT secret should be long and difficult to guess.
  //
  // Our generated secret contains 32 random bytes and appears as roughly
  // 44 Base64 characters, so it comfortably satisfies this minimum.
  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must exist and contain at least 32 characters.'
    );
  }

  // Use the configured duration when it exists.
  // Otherwise, use seven days as a safe development default.
  const expiresIn =
    typeof process.env.JWT_EXPIRES_IN === 'string' &&
    process.env.JWT_EXPIRES_IN.trim()
      ? process.env.JWT_EXPIRES_IN.trim()
      : '7d';

  return {
    secret,
    expiresIn,
  };
}

/**
 * Creates a signed authentication token for one user.
 *
 * We store the user ID in the standard JWT "subject" field, called "sub".
 *
 * We intentionally do not store the user's name, email, approval status,
 * or account status inside the token. Those values may change later.
 *
 * When a protected request arrives, the authentication middleware will:
 * 1. Verify the token.
 * 2. Read the user ID from the token.
 * 3. Load the latest user information from MongoDB.
 *
 * @param {string|object} userId
 * A MongoDB user ID or another value that can safely become a string.
 *
 * @returns {string}
 * A signed JWT string.
 */
function createAccessToken(userId) {
  // A user ID is required because the token must identify one account.
  if (userId === undefined || userId === null || String(userId).trim() === '') {
    throw new TypeError('A user ID is required to create an access token.');
  }

  const { secret, expiresIn } = getJwtSettings();

  // We use an empty payload object because the user ID is placed in the
  // standard "subject" option below.
  //
  // jsonwebtoken automatically adds:
  // - iat: issued-at timestamp
  // - exp: expiry timestamp
  const token = jwt.sign(
    {},
    secret,
    {
      algorithm: JWT_ALGORITHM,
      subject: String(userId),
      expiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );

  return token;
}

/**
 * Verifies a token and returns its decoded payload.
 *
 * Verification checks:
 * - the token signature;
 * - the allowed algorithm;
 * - the issuer;
 * - the audience;
 * - the expiry time.
 *
 * jsonwebtoken throws an error when any check fails.
 * The authentication middleware will later catch that error and return
 * an HTTP 401 response.
 *
 * @param {string} token
 * The JWT received from the user's authentication cookie.
 *
 * @returns {object}
 * The verified token payload, including the user's ID in payload.sub.
 */
function verifyAccessToken(token) {
  // Reject missing or invalid token values before calling jsonwebtoken.
  if (typeof token !== 'string' || token.trim() === '') {
    throw new TypeError('A token is required for verification.');
  }

  const { secret } = getJwtSettings();

  const decodedPayload = jwt.verify(
    token,
    secret,
    {
      // Only tokens signed using HS256 are accepted.
      algorithms: [JWT_ALGORITHM],

      // These must match the values used when the token was created.
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );

  return decodedPayload;
}

export {
  createAccessToken,
  verifyAccessToken,
};