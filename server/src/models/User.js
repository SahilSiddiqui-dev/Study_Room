const mongoose = require('mongoose');
const { AVATAR_KEYS, DEFAULT_KEY, USER_ROLES } = require('../utils/constants.js');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      lowercase: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [20, 'Username must be at most 20 characters'],
      match: [/^[a-z0-9_]+$/, 'Only letters, numbers and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    avatar: {
      type: String,
      enum: { values: AVATAR_KEYS, message: '{VALUE} is not a valid avatar' },
      default: DEFAULT_KEY,
    },
    role: {
      type: String,
      enum: { values: USER_ROLES, message: '{VALUE} is not a valid role' },
      default: 'user',
    },
    timezone: {
      type: String,
      default: 'UTC',
      validate: {
        validator: function (v) {
          if (!v) return true;
          try {
            Intl.DateTimeFormat(undefined, { timeZone: v });
            return true;
          } catch (err) {
            return false;
          }
        },
        message: '{VALUE} is not a valid IANA timezone identifier',
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
