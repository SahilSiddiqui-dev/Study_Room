const { z } = require('zod');
const { AVATAR_KEYS } = require('../utils/constants');

const passwordSchema = z
  .string({ required_error: 'Password is required' })
  .min(8, 'Password must be at least 8 characters long')
  .max(72, 'Password cannot exceed 72 characters')
  .regex(
    /^(?=.*[a-zA-Z])(?=.*\d)/,
    'Password must contain at least one letter and one number'
  );

const timezoneSchema = z
  .string()
  .refine(
    (tz) => {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: tz });
        return true;
      } catch (e) {
        return false;
      }
    },
    { message: 'Invalid IANA timezone identifier' }
  )
  .optional();

const registerSchema = z
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
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address'),
    password: passwordSchema,
    avatar: z.enum(AVATAR_KEYS).optional(),
    timezone: timezoneSchema,
  })
  .strict();

const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Invalid email address'),
    password: z.string({ required_error: 'Password is required' }).min(1, 'Password is required'),
  })
  .strict();

module.exports = {
  registerSchema,
  loginSchema,
  passwordSchema,
  timezoneSchema,
};
