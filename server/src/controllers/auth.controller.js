const authService = require('../services/auth.service');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');
const { setAuthCookie, clearAuthCookie } = require('../utils/cookies');

/**
 * POST /api/auth/register
 */
const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(req.body);
  setAuthCookie(res, token);
  return sendResponse(res, 201, {
    data: { user },
    message: 'User registered successfully',
  });
});

/**
 * POST /api/auth/login
 */
const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(req.body);
  setAuthCookie(res, token);
  return sendResponse(res, 200, {
    data: { user },
    message: 'Logged in successfully',
  });
});

/**
 * POST /api/auth/logout
 */
const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  return sendResponse(res, 200, {
    message: 'Logged out successfully',
  });
});

/**
 * GET /api/auth/me
 */
const getMe = asyncHandler(async (req, res) => {
  return sendResponse(res, 200, {
    data: { user: req.user },
  });
});

module.exports = {
  register,
  login,
  logout,
  getMe,
};
