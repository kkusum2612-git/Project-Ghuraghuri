import User from '../models/User.js';

import {
  AUTH_COOKIE_NAME,
  clearAuthCookie,
} from '../services/auth-cookie.service.js';

import {
  verifyAccessToken,
} from '../services/token.service.js';

// MongoDB ObjectIds normally contain exactly 24 hexadecimal characters.
//
// Checking the format before querying MongoDB prevents an invalid token
// subject from causing a Mongoose CastError.
const MONGODB_OBJECT_ID_PATTERN = /^[a-f\d]{24}$/i;

// These are expected token-verification failures.
//
// They mean that the client does not have a usable login session.
// They should produce HTTP 401 instead of an internal server error.
const EXPECTED_JWT_ERROR_NAMES = new Set([
  'JsonWebTokenError',
  'TokenExpiredError',
  'NotBeforeError',
]);

/**
 * Sends a consistent HTTP 401 authentication response.
 *
 * @param {object} res
 * The Express response object.
 *
 * @param {string} message
 * The main response message.
 *
 * @returns {object}
 * The Express response.
 */
function sendUnauthorizedResponse(
  res,
  message = 'Authentication is required.'
) {
  return res.status(401).json({
    success: false,
    message,
    errors: [
      {
        field: 'authentication',
        message: 'Please log in to continue.',
      },
    ],
  });
}

/**
 * Verifies the logged-in user before allowing access to a protected route.
 *
 * Workflow:
 *
 * 1. Read the JWT from the HTTP-only cookie.
 * 2. Verify the token's signature, issuer, audience and expiry.
 * 3. Read the user ID from the token's "sub" field.
 * 4. Load the latest user record from MongoDB.
 * 5. Confirm that the account remains active.
 * 6. Attach the user to req.user.
 * 7. Continue to the protected controller.
 *
 * @param {object} req
 * The Express request object.
 *
 * @param {object} res
 * The Express response object.
 *
 * @param {Function} next
 * Continues to the next middleware/controller or receives an unexpected error.
 */
async function authenticateUser(req, res, next) {
  try {
    // cookie-parser places unsigned cookies inside req.cookies.
    const token = req.cookies?.[AUTH_COOKIE_NAME];

    if (typeof token !== 'string' || token.trim() === '') {
      return sendUnauthorizedResponse(res);
    }

    let tokenPayload;

    try {
      tokenPayload = verifyAccessToken(token);
    } catch (error) {
      // An expired, malformed or incorrectly signed token represents an
      // invalid login session rather than an unexpected server failure.
      if (EXPECTED_JWT_ERROR_NAMES.has(error?.name)) {
        // Remove the unusable cookie so the browser stops resending it.
        clearAuthCookie(res);

        return sendUnauthorizedResponse(
          res,
          'Your login session is invalid or has expired.'
        );
      }

      // Configuration errors such as a missing JWT_SECRET are server errors.
      // Pass them to the centralized error middleware instead of disguising
      // them as incorrect user authentication.
      throw error;
    }

    // jsonwebtoken may technically return different payload types.
    // Our token service creates an object payload with the user ID in "sub".
    const userId =
      tokenPayload &&
      typeof tokenPayload === 'object' &&
      typeof tokenPayload.sub === 'string'
        ? tokenPayload.sub.trim()
        : '';

    if (!MONGODB_OBJECT_ID_PATTERN.test(userId)) {
      clearAuthCookie(res);

      return sendUnauthorizedResponse(
        res,
        'Your login session is invalid or has expired.'
      );
    }

    // Load the current database record instead of trusting mutable information
    // stored inside the token.
    //
    // This means changes to role, approvalStatus and accountStatus take effect
    // without waiting for the existing JWT to expire.
    const user = await User.findById(userId);

    // A token may refer to an account that has since been deleted.
    if (!user) {
      clearAuthCookie(res);

      return sendUnauthorizedResponse(
        res,
        'Your account could not be found. Please log in again.'
      );
    }

    // Suspended and disabled accounts must not continue using protected APIs,
    // even when they still possess a previously issued valid token.
    if (user.accountStatus !== 'active') {
      clearAuthCookie(res);

      return res.status(403).json({
        success: false,
        message: 'This account is not currently allowed to access the application.',
        errors: [
          {
            field: 'account',
            message:
              user.accountStatus === 'suspended'
                ? 'This account has been suspended.'
                : 'This account has been disabled.',
          },
        ],
      });
    }

    // Attach the current Mongoose user document to the request.
    //
    // Protected controllers will later access:
    // req.user._id
    // req.user.role
    // req.user.approvalStatus
    // req.user.accountStatus
    req.user = user;

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Creates middleware that restricts a route to specific user roles.
 *
 * This middleware must run after authenticateUser because it depends on
 * req.user being populated from the latest MongoDB user document.
 *
 * Example:
 *
 * authorizeRoles('traveler')
 *
 * allows only travelers.
 *
 * authorizeRoles('hotel', 'admin')
 *
 * allows either a hotel account or an administrator.
 *
 * Frontend route hiding is not authorization. Sensitive API routes must use
 * this middleware, or another suitable backend permission check, so users
 * cannot bypass restrictions by calling an API directly.
 *
 * @param {...string} allowedRoles
 * One or more roles that are permitted to continue to the controller.
 *
 * @returns {Function}
 * Express middleware that checks the authenticated user's role.
 */
function authorizeRoles(...allowedRoles) {
  return function roleAuthorizationMiddleware(req, res, next) {
    // authorizeRoles is designed to run after authenticateUser.
    //
    // This fallback protects the route from accidentally continuing when the
    // middleware chain was configured incorrectly and req.user is unavailable.
    if (!req.user) {
      return sendUnauthorizedResponse(res);
    }

    // A user whose current role is not in the route's allow-list is
    // authenticated but does not have permission to perform this action.
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
        errors: [
          {
            field: 'authorization',
            message: 'Your account role is not allowed to access this resource.',
          },
        ],
      });
    }

    // The current user has one of the permitted roles.
    return next();
  };
}

export {
  authenticateUser,
  authorizeRoles,
};