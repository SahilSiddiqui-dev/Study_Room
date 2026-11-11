const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

// Pre-computed 12-round dummy hash to prevent timing attacks when user is not found
const DUMMY_HASH = '$2b$12$e80yq9tV4.b1L0fQxJb9xeN5wT2R3U5s9KzL1.mO9X1W3P4Q5R6S7';

/**
 * Hash a plain text password using bcrypt with 12 rounds.
 */
const hashPassword = async (password) => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain text password with a bcrypt hash.
 */
const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};

/**
 * Run a dummy bcrypt compare against a pre-computed hash to even out response times
 * during login when the email does not exist in the database.
 */
const compareDummyPassword = async (password) => {
  return bcrypt.compare(password, DUMMY_HASH);
};

module.exports = {
  hashPassword,
  comparePassword,
  compareDummyPassword,
};

