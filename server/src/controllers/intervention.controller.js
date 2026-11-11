const interventionService = require('../services/intervention.service');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');

/**
 * POST /api/interventions
 */
const createIntervention = asyncHandler(async (req, res) => {
  const intervention = await interventionService.createIntervention(
    req.user._id,
    req.body
  );
  return sendResponse(res, 201, {
    data: { intervention },
    message: 'Intervention recorded successfully',
  });
});

/**
 * GET /api/interventions/report
 */
const getReport = asyncHandler(async (req, res) => {
  const report = await interventionService.getInterventionsReport(req.user._id);
  return sendResponse(res, 200, {
    data: { report },
  });
});

module.exports = {
  createIntervention,
  getReport,
};

