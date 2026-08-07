import User from '../models/User.js';
import {
  clearAuthCookie,  
  setAuthCookie,
} from '../services/auth-cookie.service.js';
import {
  comparePassword,  
  hashPassword,
} from '../services/password.service.js';
import {
  createAccessToken,
} from '../services/token.service.js';
import {
  validateLoginInput,  
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

/**
 * Logs an existing user into the application.
 *
 * Login workflow:
 *
 * 1. Validate the submitted email and password.
 * 2. Find the user by normalized email address.
 * 3. Load the normally hidden password hash.
 * 4. Compare the submitted password with the stored bcrypt hash.
 * 5. Confirm that the account is active.
 * 6. Create a JWT.
 * 7. Store the JWT in an HTTP-only cookie.
 * 8. Return safe user information.
 *
 * @param {object} req
 * The Express request object containing req.body.
 *
 * @param {object} res
 * The Express response object.
 *
 * @param {Function} next
 * Sends unexpected errors to the centralized error middleware.
 */
async function loginUser(req, res, next) {
  try {
    const validationResult = validateLoginInput(req.body);

    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        message: 'Please correct the login information.',
        errors: validationResult.errors,
      });
    }

    const {
      email,
      password,
    } = validationResult.data;

    // passwordHash uses "select: false" in the User model.
    //
    // The explicit "+passwordHash" tells Mongoose to include it only for this
    // security-sensitive password comparison.
    const user = await User.findOne({
      email,
    }).select('+passwordHash');

    // Use the same response for:
    // - an email that does not exist;
    // - an incorrect password.
    //
    // This prevents the login API from revealing which email addresses are
    // registered in the system.
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
        errors: [
          {
            field: 'credentials',
            message: 'The provided login credentials are incorrect.',
          },
        ],
      });
    }

    const passwordMatches = await comparePassword(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email address or password.',
        errors: [
          {
            field: 'credentials',
            message: 'The provided login credentials are incorrect.',
          },
        ],
      });
    }

    // Suspended or disabled users must not receive a new authentication token.
    //
    // We check this only after the password has been verified. Therefore, this
    // message does not reveal account status to someone who does not know the
    // correct password.
    if (user.accountStatus !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'This account is not currently allowed to sign in.',
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

    // Hotel and guide users with pending approval may still log in.
    //
    // Later authorization middleware will prevent them from using protected
    // vendor or guide operations until an administrator approves them.
    const accessToken = createAccessToken(user._id);

    setAuthCookie(res, accessToken);

    // The User model's toJSON transformation removes passwordHash and __v.
    const safeUser = user.toJSON();

    return res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      data: {
        user: safeUser,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns the currently authenticated user's latest account information.
 *
 * The authenticateUser middleware runs before this controller. That middleware:
 *
 * 1. Reads and verifies the JWT cookie.
 * 2. Loads the latest user record from MongoDB.
 * 3. Confirms that the account is active.
 * 4. Places the user document in req.user.
 *
 * @param {object} req
 * The Express request object containing req.user.
 *
 * @param {object} res
 * The Express response object.
 *
 * @returns {object}
 * An HTTP 200 response containing safe user information.
 */
function getCurrentUser(req, res) {
  // Convert the Mongoose document into a JSON-safe object.
  //
  // The User model's toJSON transformation removes passwordHash and __v.
  const safeUser = req.user.toJSON();

  return res.status(200).json({
    success: true,
    message: 'Authenticated user retrieved successfully.',
    data: {
      user: safeUser,
    },
  });
}

/**
 * Logs the browser out by removing its authentication cookie.
 *
 * JWT logout does not delete or change the user account. It removes the
 * browser's stored token so later protected requests are unauthenticated.
 *
 * This operation is intentionally idempotent. That means it succeeds whether
 * the cookie currently exists or has already been removed.
 *
 * @param {object} req
 * The Express request object. It is not currently needed, but remains part of
 * the normal Express controller signature.
 *
 * @param {object} res
 * The Express response object used to clear the cookie and return JSON.
 *
 * @returns {object}
 * An HTTP 200 logout response.
 */
function logoutUser(_req, res) {
  clearAuthCookie(res);

  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
    data: {},
  });
}

export {
  getCurrentUser,  
  loginUser,
  logoutUser,  
  registerUser,
};