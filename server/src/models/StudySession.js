const mongoose = require('mongoose');

const studySessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    roomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Room',
      default: null,
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    goal: {
      type: String,
      maxlength: [200, 'Goal cannot exceed 200 characters'],
      trim: true,
      default: '',
    },
    plannedMinutes: {
      type: Number,
      required: [true, 'Planned minutes is required'],
      min: [5, 'Planned minutes must be at least 5'],
      max: [240, 'Planned minutes cannot exceed 240'],
    },
    startedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    endedAt: {
      type: Date,
      default: null,
    },
    actualMinutes: {
      type: Number,
      default: 0,
      min: 0,
    },
    completed: {
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
studySessionSchema.index({ userId: 1, startedAt: -1 });

module.exports = mongoose.model('StudySession', studySessionSchema);
