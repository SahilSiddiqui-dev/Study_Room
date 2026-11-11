const express = require('express');
const router = express.Router();
const roomController = require('../controllers/room.controller');
const protect = require('../middleware/protect');
const validate = require('../middleware/validate');
const { idParamSchema } = require('../validators/common.validator');
const {
  createRoomSchema,
  updateRoomSchema,
  joinRoomSchema,
  roomQuerySchema,
} = require('../validators/room.validator');

// All room routes require authentication
router.use(protect);

router
  .route('/')
  .post(validate({ body: createRoomSchema }), roomController.createRoom)
  .get(validate({ query: roomQuerySchema }), roomController.getRooms);

router
  .route('/:id')
  .get(validate({ params: idParamSchema }), roomController.getRoomById)
  .patch(
    validate({ params: idParamSchema, body: updateRoomSchema }),
    roomController.updateRoom
  )
  .delete(validate({ params: idParamSchema }), roomController.deleteRoom);

router.post(
  '/:id/join',
  validate({ params: idParamSchema, body: joinRoomSchema }),
  roomController.joinRoom
);

router.post(
  '/:id/leave',
  validate({ params: idParamSchema }),
  roomController.leaveRoom
);

module.exports = router;
