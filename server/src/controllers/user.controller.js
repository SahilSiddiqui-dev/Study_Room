const userService = require('../services/user.service');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');

/**
 * GET /api/users/me
 */
const getMe = asyncHandler(async (req, res) => {
  const user = await userService.getMe(req.user._id);
  return sendResponse(res, 200, {
    data: { user },
  });
});

/**
 * PATCH /api/users/me
 */
const updateMe = asyncHandler(async (req, res) => {
  const user = await userService.updateMe(req.user._id, req.body);
  return sendResponse(res, 200, {
    data: { user },
    message: 'Profile updated successfully',
  });
});

/**
 * PATCH /api/users/me/password
 */
const changePassword = asyncHandler(async (req, res) => {
  const result = await userService.changePassword(req.user._id, req.body);
  return sendResponse(res, 200, {
    message: result.message,
  });
});

/**
 * GET /api/users/avatars
 */
const getAvatars = asyncHandler(async (req, res) => {
  const avatars = userService.getAvatars();
  return sendResponse(res, 200, {
    data: { avatars },
  });
});

/**
 * GET /api/users/:username
 */
const getUserProfile = asyncHandler(async (req, res) => {
  const profile = await userService.getUserProfile(req.params.username);
  return sendResponse(res, 200, {
    data: { profile },
  });
});

module.exports = {
  getMe,
  updateMe,
  changePassword,
  getAvatars,
  getUserProfile,
};

