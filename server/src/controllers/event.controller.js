const eventService = require('../services/event.service');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');

/**
 * POST /api/sessions/:id/events
 */
const createEvent = asyncHandler(async (req, res) => {
  const event = await eventService.createEvent(
    req.user._id,
    req.params.id,
    req.body
  );
  return sendResponse(res, 201, {
    data: { event },
    message: 'Focus event recorded',
  });
});

/**
 * GET /api/sessions/:id/events
 */
const getEvents = asyncHandler(async (req, res) => {
  const events = await eventService.getEventsBySession(
    req.user._id,
    req.params.id
  );
  return sendResponse(res, 200, {
    data: { events },
  });
});

/**
 * POST /api/events/:id/reason
 */
const createBreakReason = asyncHandler(async (req, res) => {
  const reason = await eventService.createBreakReason(
    req.user._id,
    req.params.id,
    req.body
  );
  return sendResponse(res, 201, {
    data: { reason },
    message: 'Break reason recorded',
  });
});

module.exports = {
  createEvent,
  getEvents,
  createBreakReason,
};

