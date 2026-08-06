import bcrypt from 'bcryptjs';

// Salt rounds control how computationally expensive password hashing is.
//
// A larger number makes password cracking more difficult, but it also makes
// registration and login slower.
//
// Twelve rounds provide a reasonable balance for this university project.
const PASSWORD_SALT_ROUNDS = 12;

/**
 * Converts a plain-text password into a secure bcrypt hash.
 *
 * Example:
 *
 * Plain password:
 * Example123
 *
 * Stored value:
 * $2b$12$...
 *
 * We must never store the user's original password in MongoDB.
 *
 * @param {string} plainPassword
 * The original password submitted during registration.
 *
 * @returns {Promise<string>}
 * A secure bcrypt hash that may be stored in MongoDB.
 */
async function hashPassword(plainPassword) {
  // The registration validator should already check the password.
  // However, this service performs its own check as an extra safety layer.
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new TypeError('A non-empty password is required for hashing.');
  }

  // bcrypt processes at most 72 bytes of password input.
  //
  // Some Unicode characters use more than one byte, so byte length is safer
  // than checking only the number of visible JavaScript characters.
  const passwordByteLength = Buffer.byteLength(plainPassword, 'utf8');

  if (passwordByteLength > 72) {
    throw new RangeError('Password cannot contain more than 72 UTF-8 bytes.');
  }

  // bcrypt automatically creates a random salt before producing the hash.
  //
  // Because the salt is random, two users who choose the same password
  // should still receive different stored hashes.
  const passwordHash = await bcrypt.hash(
    plainPassword,
    PASSWORD_SALT_ROUNDS
  );

  return passwordHash;
}

/**
 * Compares a password submitted during login with the hash stored in MongoDB.
 *
 * bcrypt does not decrypt the stored hash. Password hashes are one-way.
 * Instead, bcrypt performs a secure comparison operation.
 *
 * @param {string} plainPassword
 * The password submitted through the login form.
 *
 * @param {string} passwordHash
 * The saved bcrypt hash loaded from MongoDB.
 *
 * @returns {Promise<boolean>}
 * true when the password matches; otherwise false.
 */
async function comparePassword(plainPassword, passwordHash) {
  // Invalid or missing values should produce a failed comparison rather than
  // causing bcrypt to throw an unexpected server error.
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    return false;
  }

  if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
    return false;
  }

  const passwordsMatch = await bcrypt.compare(
    plainPassword,
    passwordHash
  );

  return passwordsMatch;
}

export {
  hashPassword,
  comparePassword,
};