const mongoose = require('mongoose');

const baselineSchema = new mongoose.Schema(
  {
    avgUninterruptedMin: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },
    interruptionRate: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const interventionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    ruleId: {
      type: String,
      required: [true, 'Rule ID is required'],
      trim: true,
    },
    suggestedAction: {
      type: String,
      required: [true, 'Suggested action is required'],
      trim: true,
    },
    shownAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    baseline: {
      type: baselineSchema,
      required: true,
      default: () => ({ avgUninterruptedMin: 0, completionRate: 0, interruptionRate: 0 }),
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

interventionSchema.index({ userId: 1, shownAt: -1 });

module.exports = mongoose.model('Intervention', interventionSchema);

