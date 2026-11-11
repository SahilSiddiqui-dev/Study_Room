const express = require('express');
const router = express.Router();
const eventController = require('../controllers/event.controller');
const protect = require('../middleware/protect');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimiters');
const { idParamSchema } = require('../validators/common.validator');
const { createBreakReasonSchema } = require('../validators/event.validator');

// All event routes are protected
router.use(protect);

// POST /api/events/:id/reason
router.post(
  '/:id/reason',
  writeLimiter,
  validate({ params: idParamSchema, body: createBreakReasonSchema }),
  eventController.createBreakReason
);

module.exports = router;
