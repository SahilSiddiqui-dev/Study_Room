const analyticsService = require('../services/analytics.service');
const coachService = require('../services/coach.service');
const { runSnapshotJob } = require('../jobs/snapshot.job');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');

/**
 * GET /api/analytics/summary
 */
const getSummary = asyncHandler(async (req, res) => {
  const summary = await analyticsService.getSummary(req.user._id, req.query.range);
  return sendResponse(res, 200, {
    data: summary,
  });
});

/**
 * GET /api/analytics/reasons
 */
const getReasons = asyncHandler(async (req, res) => {
  const reasons = await analyticsService.getReasons(req.user._id, req.query.range);
  return sendResponse(res, 200, {
    data: reasons,
  });
});

/**
 * GET /api/analytics/heatmap
 */
const getHeatmap = asyncHandler(async (req, res) => {
  const heatmap = await analyticsService.getHeatmap(req.user._id, req.query.range);
  return sendResponse(res, 200, {
    data: heatmap,
  });
});

/**
 * GET /api/analytics/subjects
 */
const getSubjects = asyncHandler(async (req, res) => {
  const subjects = await analyticsService.getSubjects(req.user._id, req.query.range);
  return sendResponse(res, 200, {
    data: subjects,
  });
});

/**
 * GET /api/analytics/coach
 */
const getCoach = asyncHandler(async (req, res) => {
  const coach = await coachService.evaluateCoachSuggestions(req.user._id, req.query.range);
  return sendResponse(res, 200, {
    data: coach,
  });
});

/**
 * POST /api/analytics/snapshots/run (Admin only)
 */
const runSnapshots = asyncHandler(async (req, res) => {
  const result = await runSnapshotJob();
  return sendResponse(res, 200, {
    data: result,
    message: 'Snapshot computation completed successfully',
  });
});

module.exports = {
  getSummary,
  getReasons,
  getHeatmap,
  getSubjects,
  getCoach,
  runSnapshots,
};
