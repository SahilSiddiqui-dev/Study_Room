const User = require('../models/User');
const AppError = require('../utils/AppError');
const {
  hashPassword,
  comparePassword,
  compareDummyPassword,
} = require('../utils/password');
const { signToken } = require('../utils/token');

/**
 * Register a new user
 * Explicitly hashes the password with 12 rounds before storing.
 */
const register = async ({ username, email, password, avatar, timezone }) => {
  // Check for duplicate username
  const existingUsername = await User.findOne({ username });
  if (existingUsername) {
    throw new AppError('Username is already taken', 409);
  }

  // Check for duplicate email
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    throw new AppError('Email is already registered', 409);
  }

  // Hash password in service layer (12 rounds)
  const passwordHash = await hashPassword(password);

  const user = await User.create({
    username,
    email,
    passwordHash,
    avatar,
    timezone: timezone || 'UTC',
  });

  const token = signToken(user._id);

  return { user, token };
};

/**
 * Log in an existing user
 * Protects against timing attacks using dummy hash comparison when email does not exist.
 */
const login = async ({ email, password }) => {
  // Explicitly select passwordHash for authentication check
  const user = await User.findOne({ email }).select('+passwordHash');

  if (!user) {
    // Timing attack mitigation: run dummy bcrypt comparison
    await compareDummyPassword(password);
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const token = signToken(user._id);

  return { user, token };
};

module.exports = {
  register,
  login,
};
