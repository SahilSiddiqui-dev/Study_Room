const mongoose = require('mongoose');

const analyticsSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    date: {
      type: String,
      required: [true, 'Date (YYYY-MM-DD) is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted as YYYY-MM-DD'],
    },
    fqs: {
      type: Number,
      required: true,
      default: 0,
    },
    interruptionRate: {
      type: Number,
      required: true,
      default: 0,
    },
    avgUninterruptedMin: {
      type: Number,
      required: true,
      default: 0,
    },
    topReason: {
      type: String,
      default: 'none',
    },
    recommendations: {
      type: [String],
      default: [],
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

// Unique index: one snapshot per user per day
analyticsSnapshotSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AnalyticsSnapshot', analyticsSnapshotSchema);

