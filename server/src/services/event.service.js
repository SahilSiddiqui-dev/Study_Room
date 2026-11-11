const StudySession = require('../models/StudySession');
const FocusEvent = require('../models/FocusEvent');
const BreakReason = require('../models/BreakReason');
const AppError = require('../utils/AppError');

/**
 * Record a focus event on the user's active session.
 */
const createEvent = async (userId, sessionId, data) => {
  const session = await StudySession.findById(sessionId);

  if (!session) {
    throw new AppError('Study session not found', 404);
  }

  if (session.userId.toString() !== userId.toString()) {
    throw new AppError('You do not have permission to log events on this session', 403);
  }

  if (session.endedAt !== null) {
    throw new AppError('Cannot record events on an ended study session', 400);
  }

  const planned = data.type === 'planned_break' || Boolean(data.planned);

  const event = await FocusEvent.create({
    sessionId: session._id,
    userId,
    type: data.type,
    durationSec: data.durationSec || 0,
    planned,
    startedAt: data.startedAt ? new Date(data.startedAt) : new Date(),
  });

  return event;
};

/**
 * Get all focus events for a user's session
 */
const getEventsBySession = async (userId, sessionId) => {
  const session = await StudySession.findById(sessionId);

  if (!session) {
    throw new AppError('Study session not found', 404);
  }

  if (session.userId.toString() !== userId.toString()) {
    throw new AppError('You do not have permission to view events for this session', 403);
  }

  const events = await FocusEvent.find({ sessionId }).sort({ startedAt: 1 });
  return events;
};

/**
 * Record a one-tap break reason for an interruption event
 * Enforces one reason per event (409 on repeat attempt).
 */
const createBreakReason = async (userId, eventId, data) => {
  const event = await FocusEvent.findById(eventId);

  if (!event) {
    throw new AppError('Focus event not found', 404);
  }

  if (event.userId.toString() !== userId.toString()) {
    throw new AppError('You do not have permission to record a reason for this event', 403);
  }

  const existingReason = await BreakReason.findOne({ eventId });
  if (existingReason) {
    throw new AppError('A break reason has already been submitted for this event', 409);
  }

  const reason = await BreakReason.create({
    eventId: event._id,
    userId,
    category: data.category,
    note: data.note || '',
  });

  return reason;
};

module.exports = {
  createEvent,
  getEventsBySession,
  createBreakReason,
};

