const sessionService = require('../services/session.service');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');

/**
 * POST /api/sessions
 */
const startSession = asyncHandler(async (req, res) => {
  const session = await sessionService.startSession(req.user._id, req.body);
  return sendResponse(res, 201, {
    data: { session },
    message: 'Study session started',
  });
});

/**
 * GET /api/sessions/active
 */
const getActiveSession = asyncHandler(async (req, res) => {
  const session = await sessionService.getActiveSession(req.user._id);
  return sendResponse(res, 200, {
    data: { session },
  });
});

/**
 * PATCH /api/sessions/:id/end
 */
const endSession = asyncHandler(async (req, res) => {
  const session = await sessionService.endSession(req.user._id, req.params.id);
  return sendResponse(res, 200, {
    data: { session },
    message: 'Study session ended',
  });
});

/**
 * GET /api/sessions
 */
const getSessions = asyncHandler(async (req, res) => {
  const result = await sessionService.getSessions(req.user._id, req.query);
  return sendResponse(res, 200, {
    data: result,
  });
});

module.exports = {
  startSession,
  getActiveSession,
  endSession,
  getSessions,
};

