const User = require('../models/User');
const AppError = require('../utils/AppError');
const { AVATAR_KEYS } = require('../utils/constants');
const { hashPassword, comparePassword } = require('../utils/password');

/**
 * Get profile of current user
 */
const getMe = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User not found', 404);
  }
  return user;
};

/**
 * Update current user's profile (avatar, timezone)
 */
const updateMe = async (userId, { avatar, timezone }) => {
  const updates = {};
  if (avatar !== undefined) updates.avatar = avatar;
  if (timezone !== undefined) updates.timezone = timezone;

  const user = await User.findByIdAndUpdate(userId, updates, {
    returnDocument: 'after',
    runValidators: true,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Change user password
 * Compares current password, hashes new password with 12 rounds, and updates passwordHash
 */
const changePassword = async (userId, { currentPassword, newPassword }) => {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user) {
    throw new AppError('User not found', 404);
  }

  const isMatch = await comparePassword(currentPassword, user.passwordHash);
  if (!isMatch) {
    throw new AppError('Current password is incorrect', 400);
  }

  const newHash = await hashPassword(newPassword);
  user.passwordHash = newHash;
  await user.save();

  return { message: 'Password updated successfully' };
};

/**
 * Get available avatar keys
 */
const getAvatars = () => {
  return AVATAR_KEYS;
};

/**
 * Get public profile of a user by username
 * Returns username, avatar, and createdAt only
 */
const getUserProfile = async (username) => {
  const user = await User.findOne({ username });
  if (!user) {
    throw new AppError(`User '${username}' not found`, 404);
  }

  return {
    username: user.username,
    avatar: user.avatar,
    createdAt: user.createdAt,
  };
};

module.exports = {
  getMe,
  updateMe,
  changePassword,
  getAvatars,
  getUserProfile,
};
