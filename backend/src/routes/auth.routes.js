import express from 'express';

import {
  getCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
} from '../controllers/auth.controller.js';

import {
  authenticateUser,
} from '../middleware/auth.middleware.js';

// Express Router lets us keep authentication endpoints in a separate file.
//
// Later, this same router will also contain:
// - login
// - logout
// - current logged-in user
const authRouter = express.Router();

/**
 * POST /api/v1/auth/register
 *
 * Creates a new traveler, hotel, or guide account.
 *
 * The controller will:
 * 1. Validate the submitted information.
 * 2. Check whether the email already exists.
 * 3. Hash the password.
 * 4. Save the user in MongoDB.
 * 5. Create a JWT.
 * 6. Store the JWT in an HTTP-only cookie.
 * 7. Return safe user information.
 */
authRouter.post('/register', registerUser);

/**
 * POST /api/v1/auth/login
 *
 * Verifies an existing user's email and password.
 * On success, the controller creates a JWT and stores it in an
 * HTTP-only authentication cookie.
 */
authRouter.post('/login', loginUser);

/**
 * GET /api/v1/auth/me
 *
 * Returns the latest information for the currently logged-in user.
 *
 * authenticateUser must succeed before getCurrentUser is allowed to run.
 */
authRouter.get(
  '/me',
  authenticateUser,
  getCurrentUser
);

/**
 * POST /api/v1/auth/logout
 *
 * Removes the authentication cookie.
 *
 * This route does not require authenticateUser because users should still be
 * able to clear an expired or invalid authentication cookie.
 */
authRouter.post('/logout', logoutUser);

export default authRouter;