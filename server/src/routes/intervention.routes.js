const express = require('express');
const router = express.Router();
const interventionController = require('../controllers/intervention.controller');
const protect = require('../middleware/protect');
const validate = require('../middleware/validate');
const { createInterventionSchema } = require('../validators/analytics.validator');

// All intervention routes are protected
router.use(protect);

router
  .route('/')
  .post(
    validate({ body: createInterventionSchema }),
    interventionController.createIntervention
  );

router.get('/report', interventionController.getReport);

module.exports = router;
