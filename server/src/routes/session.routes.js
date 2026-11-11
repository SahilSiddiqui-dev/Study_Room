const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/session.controller');
const eventController = require('../controllers/event.controller');
const protect = require('../middleware/protect');
const validate = require('../middleware/validate');
const { writeLimiter } = require('../middleware/rateLimiters');
const { idParamSchema } = require('../validators/common.validator');
const {
  createSessionSchema,
  sessionQuerySchema,
} = require('../validators/session.validator');
const { createEventSchema } = require('../validators/event.validator');

// All session routes are protected
router.use(protect);

router
  .route('/')
  .post(validate({ body: createSessionSchema }), sessionController.startSession)
  .get(validate({ query: sessionQuerySchema }), sessionController.getSessions);

// Active session must precede /:id to prevent route shadowing
router.get('/active', sessionController.getActiveSession);

router.patch(
  '/:id/end',
  validate({ params: idParamSchema }),
  sessionController.endSession
);

// Session events nested under /sessions/:id/events
router
  .route('/:id/events')
  .post(
    writeLimiter,
    validate({ params: idParamSchema, body: createEventSchema }),
    eventController.createEvent
  )
  .get(validate({ params: idParamSchema }), eventController.getEvents);

module.exports = router;
