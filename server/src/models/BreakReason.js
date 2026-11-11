const mongoose = require('mongoose');
const { REASON_CATEGORIES } = require('../utils/constants');

const breakReasonSchema = new mongoose.Schema(
  {
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FocusEvent',
      required: [true, 'Event ID is required'],
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    category: {
      type: String,
      enum: { values: REASON_CATEGORIES, message: '{VALUE} is not a valid break reason category' },
      required: [true, 'Category is required'],
    },
    note: {
      type: String,
      maxlength: [200, 'Note cannot exceed 200 characters'],
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret) => {
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('BreakReason', breakReasonSchema);
