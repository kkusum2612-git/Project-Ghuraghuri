import express from 'express';

import {
  registerUser,
} from '../controllers/auth.controller.js';

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

export default authRouter;