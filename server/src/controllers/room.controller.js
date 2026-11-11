const roomService = require('../services/room.service');
const asyncHandler = require('../utils/asyncHandler');
const sendResponse = require('../utils/sendResponse');

/**
 * POST /api/rooms
 */
const createRoom = asyncHandler(async (req, res) => {
  const room = await roomService.createRoom(req.user._id, req.body);
  return sendResponse(res, 201, {
    data: { room },
    message: 'Room created successfully',
  });
});

/**
 * GET /api/rooms
 */
const getRooms = asyncHandler(async (req, res) => {
  const result = await roomService.getRooms(req.user._id, req.query);
  return sendResponse(res, 200, {
    data: result,
  });
});

/**
 * GET /api/rooms/:id
 */
const getRoomById = asyncHandler(async (req, res) => {
  const room = await roomService.getRoomById(req.user._id, req.params.id);
  return sendResponse(res, 200, {
    data: { room },
  });
});

/**
 * POST /api/rooms/:id/join
 */
const joinRoom = asyncHandler(async (req, res) => {
  const room = await roomService.joinRoom(
    req.user._id,
    req.params.id,
    req.body.joinCode
  );
  return sendResponse(res, 200, {
    data: { room },
    message: 'Joined room successfully',
  });
});

/**
 * POST /api/rooms/:id/leave
 */
const leaveRoom = asyncHandler(async (req, res) => {
  const result = await roomService.leaveRoom(req.user._id, req.params.id);
  return sendResponse(res, 200, {
    message: result.message,
  });
});

/**
 * PATCH /api/rooms/:id
 */
const updateRoom = asyncHandler(async (req, res) => {
  const room = await roomService.updateRoom(
    req.user._id,
    req.params.id,
    req.body
  );
  return sendResponse(res, 200, {
    data: { room },
    message: 'Room updated successfully',
  });
});

/**
 * DELETE /api/rooms/:id
 */
const deleteRoom = asyncHandler(async (req, res) => {
  const result = await roomService.deleteRoom(req.user._id, req.params.id);
  return sendResponse(res, 200, {
    message: result.message,
  });
});

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  updateRoom,
  deleteRoom,
};
