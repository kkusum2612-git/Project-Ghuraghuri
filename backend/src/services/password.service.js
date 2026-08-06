import bcrypt from 'bcryptjs';

// A "salt round" controls how much work bcrypt performs while hashing.
//
// A higher number makes password cracking more difficult, but it also makes
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
 * Stored hash:
 * $2b$12$...
 *
 * The original password must never be stored in MongoDB.
 *
 * @param {string} plainPassword - The password submitted by the user.
 * @returns {Promise<string>} The secure bcrypt password hash.
 */
async function hashPassword(plainPassword) {
  // This protects the function from being called incorrectly elsewhere.
  //
  // Registration validation should normally catch missing passwords first,
  // but this service still checks its own input as an additional safety layer.
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    throw new TypeError('A non-empty password is required for hashing.');
  }

  // bcrypt processes a maximum of 72 bytes from a password.
  //
  // Most English characters use one byte, but some Unicode characters may use
  // more than one byte. Buffer.byteLength() measures the real UTF-8 byte length.
  if (Buffer.byteLength(plainPassword, 'utf8') > 72) {
    throw new RangeError('Password cannot contain more than 72 UTF-8 bytes.');
  }

  // bcrypt automatically creates a random salt and combines it with the hash.
  //
  // Because the salt is random, two users with the same password will normally
  // receive different stored hashes.
  const passwordHash = await bcrypt.hash(plainPassword, PASSWORD_SALT_ROUNDS);

  return passwordHash;
}

/**
 * Checks whether a submitted plain password matches a stored bcrypt hash.
 *
 * This function is used during login.
 *
 * It does not decrypt the stored hash. Password hashes cannot be decrypted.
 * Instead, bcrypt safely compares the submitted password with the hash.
 *
 * @param {string} plainPassword - Password submitted on the login form.
 * @param {string} passwordHash - Hash previously stored in MongoDB.
 * @returns {Promise<boolean>} True when the password matches; otherwise false.
 */
async function comparePassword(plainPassword, passwordHash) {
  // Both values must be strings before bcrypt can compare them.
  if (typeof plainPassword !== 'string' || plainPassword.length === 0) {
    return false;
  }

  if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
    return false;
  }

  // bcrypt.compare() performs the secure password comparison.
  const passwordsMatch = await bcrypt.compare(plainPassword, passwordHash);

  return passwordsMatch;
}

export { hashPassword, comparePassword };