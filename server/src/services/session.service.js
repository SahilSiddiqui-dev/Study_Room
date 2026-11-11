const StudySession = require('../models/StudySession');
const Room = require('../models/Room');
const AppError = require('../utils/AppError');
const { getPagination } = require('../utils/pagination');

/**
 * Start a new study session.
 * Enforces rule: A user may only have one active session at a time (409 if already active).
 */
const startSession = async (userId, data) => {
  // Check for currently active session
  const activeSession = await StudySession.findOne({ userId, endedAt: null });
  if (activeSession) {
    throw new AppError(
      'You already have an active study session. Please end it before starting a new one.',
      409
    );
  }

  let subject = data.subject;
  let roomId = null;

  if (data.roomId) {
    const room = await Room.findById(data.roomId);
    if (!room || room.status === 'closed') {
      throw new AppError('Specified study room not found or is closed', 404);
    }
    roomId = room._id;
    if (!subject) {
      subject = room.subject; // Denormalize subject from room
    }
  }

  const session = await StudySession.create({
    userId,
    roomId,
    subject,
    goal: data.goal || '',
    plannedMinutes: data.plannedMinutes,
    startedAt: new Date(),
  });

  return session;
};

/**
 * Get current active session for user
 */
const getActiveSession = async (userId) => {
  const session = await StudySession.findOne({ userId, endedAt: null })
    .populate('roomId', 'name subject isPrivate');
  return session;
};

/**
 * End an active study session
 * Computes actualMinutes and marks completed if actualMinutes >= 0.9 * plannedMinutes
 */
const endSession = async (userId, sessionId) => {
  const session = await StudySession.findById(sessionId);

  if (!session) {
    throw new AppError('Study session not found', 404);
  }

  if (session.userId.toString() !== userId.toString()) {
    throw new AppError('You do not have permission to modify this session', 403);
  }

  if (session.endedAt !== null) {
    throw new AppError('Session has already ended', 400);
  }

  const endedAt = new Date();
  const actualMinutes = Math.max(
    0,
    Math.round((endedAt.getTime() - session.startedAt.getTime()) / (60 * 1000))
  );
  const completed = actualMinutes >= 0.9 * session.plannedMinutes;

  session.endedAt = endedAt;
  session.actualMinutes = actualMinutes;
  session.completed = completed;
  await session.save();

  return session;
};

/**
 * Get paginated list of sessions for user with optional date range filter
 */
const getSessions = async (userId, query) => {
  const { page, limit, skip } = getPagination(query);

  const filter = { userId };

  if (query.from || query.to) {
    filter.startedAt = {};
    if (query.from) {
      filter.startedAt.$gte = new Date(query.from);
    }
    if (query.to) {
      // If date string 'YYYY-MM-DD', match up to end of that day
      const toDate = new Date(query.to);
      if (query.to.length === 10) {
        toDate.setHours(23, 59, 59, 999);
      }
      filter.startedAt.$lte = toDate;
    }
  }

  const [total, sessions] = await Promise.all([
    StudySession.countDocuments(filter),
    StudySession.find(filter)
      .populate('roomId', 'name subject')
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  return {
    sessions,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

module.exports = {
  startSession,
  getActiveSession,
  endSession,
  getSessions,
};

