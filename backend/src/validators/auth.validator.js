// These are the roles that a normal user is allowed to select during registration.
//
// "admin" is intentionally missing.
// An ordinary visitor must never be able to create an administrator account
// simply by sending { role: "admin" } in a request.
const PUBLIC_REGISTRATION_ROLES = ['traveler', 'hotel', 'guide'];

// This is a simple email pattern.
//
// It checks for:
// 1. Some text before the @ symbol
// 2. An @ symbol
// 3. Some text after @
// 4. A dot followed by more text
//
// It is not intended to describe every technically possible email address.
// It provides practical validation for this university project.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone numbers may contain:
// - digits
// - spaces
// - a plus sign
// - parentheses
// - hyphens
//
// Examples that this pattern allows:
// 01700000000
// +880 1700-000000
// (+880) 1700 000000
const PHONE_ALLOWED_CHARACTERS_PATTERN = /^[+\d\s()-]+$/;

/**
 * Adds one validation problem to the errors array.
 *
 * Keeping this logic in a small helper function makes the main validator
 * easier for beginners to read.
 *
 * @param {Array} errors - The array containing all validation problems.
 * @param {string} field - The name of the invalid field.
 * @param {string} message - A clear explanation for the user.
 */
function addValidationError(errors, field, message) {
  errors.push({
    field,
    message,
  });
}

/**
 * Validates information submitted through the registration form.
 *
 * This function does not:
 * - save anything to MongoDB;
 * - hash the password;
 * - create a login token;
 * - send an HTTP response.
 *
 * It only checks and cleans the submitted values.
 *
 * @param {object} input - The registration information sent by the user.
 * @returns {{
 *   isValid: boolean,
 *   errors: Array<{ field: string, message: string }>,
 *   data: {
 *     name: string,
 *     email: string,
 *     phone: string,
 *     password: string,
 *     role: string
 *   }
 * }}
 */
function validateRegistrationInput(input) {
  // A client is expected to send a normal JavaScript object.
  //
  // This safety check prevents errors when input is null, an array,
  // a string, or another unexpected value.
  const source =
    input && typeof input === 'object' && !Array.isArray(input) ? input : {};

  // We collect every validation problem instead of stopping after the first one.
  //
  // This lets the registration page show all relevant errors to the user
  // at the same time.
  const errors = [];

  // Clean text fields by removing unnecessary spaces from their beginning
  // and end.
  //
  // We only read a value as text when it is actually a string.
  const name = typeof source.name === 'string' ? source.name.trim() : '';
  const email = typeof source.email === 'string' ? source.email.trim().toLowerCase() : '';
  const phone = typeof source.phone === 'string' ? source.phone.trim() : '';
  const password = typeof source.password === 'string' ? source.password : '';

  // "traveler" is the default role when the client does not send one.
  let role = 'traveler';

  // When the client provides a role, it must be text.
  if (source.role !== undefined) {
    if (typeof source.role !== 'string') {
      addValidationError(errors, 'role', 'Role must be provided as text.');
    } else {
      role = source.role.trim().toLowerCase();
    }
  }

  // -----------------------------
  // Name validation
  // -----------------------------

  if (!name) {
    addValidationError(errors, 'name', 'Name is required.');
  } else if (name.length < 2) {
    addValidationError(errors, 'name', 'Name must contain at least 2 characters.');
  } else if (name.length > 80) {
    addValidationError(errors, 'name', 'Name cannot contain more than 80 characters.');
  }

  // -----------------------------
  // Email validation
  // -----------------------------

  if (!email) {
    addValidationError(errors, 'email', 'Email is required.');
  } else if (email.length > 120) {
    addValidationError(errors, 'email', 'Email cannot contain more than 120 characters.');
  } else if (!EMAIL_PATTERN.test(email)) {
    addValidationError(errors, 'email', 'Please provide a valid email address.');
  }

  // -----------------------------
  // Phone validation
  // -----------------------------

  if (!phone) {
    addValidationError(errors, 'phone', 'Phone number is required.');
  } else {
    // This checks whether the phone contains unsupported characters,
    // such as letters or symbols that are not normally used in phone numbers.
    if (!PHONE_ALLOWED_CHARACTERS_PATTERN.test(phone)) {
      addValidationError(
        errors,
        'phone',
        'Phone number may contain only digits, spaces, +, -, and parentheses.'
      );
    }

    // Remove every non-digit character before counting the actual digits.
    //
    // Example:
    // "+880 1700-000000" becomes "8801700000000".
    const phoneDigits = phone.replace(/\D/g, '');

    if (phoneDigits.length < 7) {
      addValidationError(errors, 'phone', 'Phone number must contain at least 7 digits.');
    } else if (phoneDigits.length > 15) {
      addValidationError(errors, 'phone', 'Phone number cannot contain more than 15 digits.');
    }
  }

  // -----------------------------
  // Password validation
  // -----------------------------

  if (!password) {
    addValidationError(errors, 'password', 'Password is required.');
  } else {
    if (password.length < 8) {
      addValidationError(errors, 'password', 'Password must contain at least 8 characters.');
    }

    // We limit the password length because bcrypt is designed around a
    // practical input limit.
    if (password.length > 72) {
      addValidationError(errors, 'password', 'Password cannot contain more than 72 characters.');
    }

    if (!/[a-z]/.test(password)) {
      addValidationError(
        errors,
        'password',
        'Password must contain at least one lowercase letter.'
      );
    }

    if (!/[A-Z]/.test(password)) {
      addValidationError(
        errors,
        'password',
        'Password must contain at least one uppercase letter.'
      );
    }

    if (!/\d/.test(password)) {
      addValidationError(errors, 'password', 'Password must contain at least one number.');
    }
  }

  // -----------------------------
  // Role validation
  // -----------------------------

  if (!PUBLIC_REGISTRATION_ROLES.includes(role)) {
    addValidationError(
      errors,
      'role',
      'Role must be traveler, hotel, or guide. Administrator accounts cannot be self-registered.'
    );
  }

  return {
    // The input is valid only when no validation errors were collected.
    isValid: errors.length === 0,

    // The controller will later send these errors to the frontend when
    // the submitted information is invalid.
    errors,

    // These are the cleaned values that the controller may use.
    //
    // The password is still plain text at this stage, but it exists only
    // temporarily in server memory. The registration service will hash it
    // before saving anything to MongoDB.
    data: {
      name,
      email,
      phone,
      password,
      role,
    },
  };
}

export { validateRegistrationInput };