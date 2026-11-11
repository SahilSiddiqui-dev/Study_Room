const env = require('../config/env');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');
const User = require('../models/User');

/**
 * Protect middleware:
 * Validates the JWT auth cookie (or Bearer header), retrieves the active user,
 * and attaches the user document to req.user.
 */
const protect = asyncHandler(async (req, res, next) => {
  let token = null;

  // 1. Read token from httpOnly cookie first
  if (req.cookies && req.cookies[env.COOKIE_NAME]) {
    token = req.cookies[env.COOKIE_NAME];
  }
  // Fallback to Bearer token in Authorization header
  else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new AppError('Authentication required. Please log in.', 401));
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    return next(err); // Handled by errorHandler -> 401
  }

  // 3. Check if user still exists
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(
      new AppError('The user belonging to this token no longer exists.', 401)
    );
  }

  // 4. Attach user to request
  req.user = user;
  next();
});

module.exports = protect;

