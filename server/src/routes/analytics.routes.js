const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analytics.controller');
const protect = require('../middleware/protect');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const { rangeQuerySchema } = require('../validators/analytics.validator');

// All analytics routes require authentication
router.use(protect);

router.get(
  '/summary',
  validate({ query: rangeQuerySchema }),
  analyticsController.getSummary
);

router.get(
  '/reasons',
  validate({ query: rangeQuerySchema }),
  analyticsController.getReasons
);

router.get(
  '/heatmap',
  validate({ query: rangeQuerySchema }),
  analyticsController.getHeatmap
);

router.get(
  '/subjects',
  validate({ query: rangeQuerySchema }),
  analyticsController.getSubjects
);

router.get(
  '/coach',
  validate({ query: rangeQuerySchema }),
  analyticsController.getCoach
);

// Admin-only route to trigger daily analytics snapshots
router.post(
  '/snapshots/run',
  authorize('admin'),
  analyticsController.runSnapshots
);

module.exports = router;

