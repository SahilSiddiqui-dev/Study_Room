const mongoose = require('mongoose');
const { EVENT_TYPES } = require('../utils/constants');

const focusEventSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudySession',
      required: [true, 'Session ID is required'],
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    type: {
      type: String,
      enum: { values: EVENT_TYPES, message: '{VALUE} is not a valid focus event type' },
      required: [true, 'Event type is required'],
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    durationSec: {
      type: Number,
      default: 0,
      min: [0, 'Duration cannot be negative'],
    },
    planned: {
      type: Boolean,
      default: false,
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

// Indexes
focusEventSchema.index({ userId: 1, startedAt: 1 });
focusEventSchema.index({ sessionId: 1 });

module.exports = mongoose.model('FocusEvent', focusEventSchema);

