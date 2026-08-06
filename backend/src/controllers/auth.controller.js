import User from '../models/User.js';
import {
  setAuthCookie,
} from '../services/auth-cookie.service.js';
import {
  hashPassword,
} from '../services/password.service.js';
import {
  createAccessToken,
} from '../services/token.service.js';
import {
  validateRegistrationInput,
} from '../validators/auth.validator.js';

/**
 * Registers a new user account.
 *
 * This controller handles the following workflow:
 *
 * 1. Validate and clean the submitted information.
 * 2. Check whether the email address is already registered.
 * 3. Convert the plain password into a secure bcrypt hash.
 * 4. Save the user account in MongoDB.
 * 5. Create a JWT for the newly registered user.
 * 6. Store the JWT inside an HTTP-only cookie.
 * 7. Return safe user information to the frontend.
 *
 * @param {object} req
 * The Express request object.
 *
 * req.body contains the information sent by the registration form.
 *
 * @param {object} res
 * The Express response object.
 *
 * We use it to set the cookie and send the JSON response.
 *
 * @param {Function} next
 * The Express function that passes unexpected errors to the centralized
 * error-handling middleware.
 */
async function registerUser(req, res, next) {
  try {
    // Validate the submitted registration information before performing
    // any database operation.
    //
    // The validator also normalizes values, for example:
    // "  USER@EXAMPLE.COM  " becomes "user@example.com".
    const validationResult = validateRegistrationInput(req.body);

    // When validation fails, return HTTP 400.
    //
    // HTTP 400 means that the client sent invalid information.
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please correct the registration information.',
        errors: validationResult.errors,
      });
    }

    // Use the cleaned values produced by the validator.
    const {
      name,
      email,
      phone,
      password,
      role,
    } = validationResult.data;

    // Check whether another account already uses this email address.
    //
    // We perform this check before hashing the password because hashing is
    // intentionally expensive. There is no reason to perform that work when
    // registration must already fail because of a duplicate email.
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      // HTTP 409 means that the request conflicts with existing data.
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        errors: [
          {
            field: 'email',
            message: 'This email address is already registered.',
          },
        ],
      });
    }

    // Convert the plain password into a secure bcrypt hash.
    //
    // Only this hash will be stored in MongoDB.
    // The original password must never be saved.
    const passwordHash = await hashPassword(password);

    // Create the user in MongoDB.
    //
    // approvalStatus is not manually supplied here.
    // The User model automatically gives:
    //
    // traveler → not_required
    // hotel    → pending
    // guide    → pending
    const user = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role,
    });

    // Create a signed JWT containing the new user's MongoDB ID.
    //
    // The token service stores the ID in the standard JWT "subject" field.
    const accessToken = createAccessToken(user._id);

    // Store the JWT inside a secure HTTP-only cookie.
    //
    // The browser will later send this cookie automatically with API requests.
    setAuthCookie(res, accessToken);

    // Convert the Mongoose document into a normal safe JSON object.
    //
    // The User model's toJSON transformation removes passwordHash and __v.
    const safeUser = user.toJSON();

    // HTTP 201 means that a new resource was created successfully.
    return res.status(201).json({
      success: true,
      message: 'Account registered successfully.',
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    // Even though we checked for a duplicate email above, two registration
    // requests could theoretically reach MongoDB at almost the same time.
    //
    // MongoDB's unique email index is the final protection against duplicate
    // accounts. Duplicate-key errors use code 11000.
    if (error?.code === 11000 && error?.keyPattern?.email) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
        errors: [
          {
            field: 'email',
            message: 'This email address is already registered.',
          },
        ],
      });
    }

    // Pass unexpected errors to the centralized error middleware.
    //
    // Examples include:
    // - MongoDB connection problems
    // - unexpected Mongoose errors
    // - JWT configuration errors
    next(error);
  }
}

export {
  registerUser,
};