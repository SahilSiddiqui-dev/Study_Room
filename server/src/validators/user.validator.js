const { z } = require('zod');
const { AVATAR_KEYS } = require('../utils/constants');
const { passwordSchema, timezoneSchema } = require('./auth.validator');

const updateMeSchema = z
  .object({
    avatar: z.enum(AVATAR_KEYS, {
      errorMap: () => ({ message: `Avatar must be one of: ${AVATAR_KEYS.join(', ')}` }),
    }).optional(),
    timezone: timezoneSchema,
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z
      .string({ required_error: 'Current password is required' })
      .min(1, 'Current password is required'),
    newPassword: passwordSchema,
  })
  .strict();

const usernameParamSchema = z
  .object({
    username: z
      .string({ required_error: 'Username is required' })
      .trim()
      .toLowerCase()
      .min(3, 'Username must be at least 3 characters')
      .max(20, 'Username must be at most 20 characters')
      .regex(
        /^[a-z0-9_]+$/,
        'Username can only contain lowercase letters, numbers, and underscores'
      ),
  })
  .strict();

module.exports = {
  updateMeSchema,
  changePasswordSchema,
  usernameParamSchema,
};

