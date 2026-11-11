const mongoose = require('mongoose');
const { ROOM_STATUS } = require('../utils/constants');

const pomodoroSchema = new mongoose.Schema(
  {
    focusMin: {
      type: Number,
      required: true,
      min: [5, 'Focus minutes must be at least 5'],
      max: [120, 'Focus minutes cannot exceed 120'],
      default: 25,
    },
    breakMin: {
      type: Number,
      required: true,
      min: [1, 'Break minutes must be at least 1'],
      max: [30, 'Break minutes cannot exceed 30'],
      default: 5,
    },
  },
  { _id: false }
);

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Room name is required'],
      trim: true,
      minlength: [3, 'Room name must be at least 3 characters'],
      maxlength: [50, 'Room name cannot exceed 50 characters'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
    },
    subjectKey: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    joinCode: {
      type: String,
      trim: true,
      default: null,
    },
    hostId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Host ID is required'],
    },
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    status: {
      type: String,
      enum: { values: ROOM_STATUS, message: '{VALUE} is not a valid room status' },
      default: 'open',
    },
    pomodoro: {
      type: pomodoroSchema,
      default: () => ({ focusMin: 25, breakMin: 5 }),
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
roomSchema.index({ subjectKey: 1, status: 1 });
roomSchema.index({ hostId: 1 });

module.exports = mongoose.model('Room', roomSchema);
