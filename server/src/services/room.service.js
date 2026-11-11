const crypto = require('crypto');
const Room = require('../models/Room');
const AppError = require('../utils/AppError');
const { getPagination } = require('../utils/pagination');

/**
 * Generate a random 6-character alphanumeric join code for private rooms
 */
const generateJoinCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

/**
 * Helper to strip joinCode for non-hosts
 */
const formatRoomForUser = (roomDoc, userId) => {
  const room = roomDoc.toObject ? roomDoc.toObject() : { ...roomDoc };
  const hostIdStr = room.hostId && room.hostId._id ? room.hostId._id.toString() : (room.hostId ? room.hostId.toString() : null);
  const isHost = hostIdStr === userId.toString();

  if (!isHost) {
    delete room.joinCode;
  }
  return room;
};

/**
 * Create a new room
 */
const createRoom = async (userId, data) => {
  const isPrivate = Boolean(data.isPrivate);
  const joinCode = isPrivate ? generateJoinCode() : null;

  const room = await Room.create({
    name: data.name,
    subject: data.subject,
    subjectKey: data.subject.trim().toLowerCase(),
    isPrivate,
    joinCode,
    hostId: userId,
    participants: [userId],
    pomodoro: data.pomodoro || { focusMin: 25, breakMin: 5 },
  });

  return formatRoomForUser(room, userId);
};

/**
 * Get rooms visible to current user (open public rooms OR rooms where user is participant)
 */
const getRooms = async (userId, query) => {
  const { page, limit, skip } = getPagination(query);

  const filter = {
    status: 'open',
    $or: [
      { isPrivate: false },
      { participants: userId },
    ],
  };

  if (query.subject && query.subject.trim()) {
    filter.subjectKey = query.subject.trim().toLowerCase();
  }

  const [total, rooms] = await Promise.all([
    Room.countDocuments(filter),
    Room.find(filter)
      .populate('hostId', 'username avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
  ]);

  const sanitizedRooms = rooms.map((room) => formatRoomForUser(room, userId));

  return {
    rooms: sanitizedRooms,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * Get room by ID
 */
const getRoomById = async (userId, roomId) => {
  const room = await Room.findById(roomId)
    .populate('hostId', 'username avatar')
    .populate('participants', 'username avatar');

  if (!room || room.status === 'closed') {
    throw new AppError('Room not found', 404);
  }

  const isHost = room.hostId._id.toString() === userId.toString();
  const isParticipant = room.participants.some(
    (p) => p._id.toString() === userId.toString()
  );

  // If room is private and user is not host or participant, require join
  if (room.isPrivate && !isHost && !isParticipant) {
    throw new AppError('This room is private. Please join with a join code.', 403);
  }

  return formatRoomForUser(room, userId);
};

/**
 * Join a room (public or private with valid code)
 * Ensures duplicate participants are never added.
 */
const joinRoom = async (userId, roomId, joinCode) => {
  const room = await Room.findById(roomId);

  if (!room || room.status === 'closed') {
    throw new AppError('Room not found or is closed', 404);
  }

  if (room.isPrivate) {
    const isHost = room.hostId.toString() === userId.toString();
    if (!isHost) {
      if (!joinCode || joinCode.toUpperCase() !== (room.joinCode || '').toUpperCase()) {
        throw new AppError('Invalid or missing join code for private room', 403);
      }
    }
  }

  // Check if already in participants to avoid duplicates
  const alreadyParticipant = room.participants.some(
    (p) => p.toString() === userId.toString()
  );

  if (!alreadyParticipant) {
    room.participants.push(userId);
    await room.save();
  }

  await room.populate('hostId', 'username avatar');
  await room.populate('participants', 'username avatar');

  return formatRoomForUser(room, userId);
};

/**
 * Leave a room
 */
const leaveRoom = async (userId, roomId) => {
  const room = await Room.findById(roomId);

  if (!room || room.status === 'closed') {
    throw new AppError('Room not found', 404);
  }

  room.participants = room.participants.filter(
    (p) => p.toString() !== userId.toString()
  );
  await room.save();

  return { message: 'Successfully left the room' };
};

/**
 * Update room details (host only)
 */
const updateRoom = async (userId, roomId, data) => {
  const room = await Room.findById(roomId);

  if (!room || room.status === 'closed') {
    throw new AppError('Room not found', 404);
  }

  if (room.hostId.toString() !== userId.toString()) {
    throw new AppError('Only the room host can update this room', 403);
  }

  if (data.name) room.name = data.name;
  if (data.subject) {
    room.subject = data.subject;
    room.subjectKey = data.subject.trim().toLowerCase();
  }
  if (data.pomodoro) {
    room.pomodoro = {
      focusMin: data.pomodoro.focusMin ?? room.pomodoro.focusMin,
      breakMin: data.pomodoro.breakMin ?? room.pomodoro.breakMin,
    };
  }

  await room.save();
  await room.populate('hostId', 'username avatar');

  return formatRoomForUser(room, userId);
};

/**
 * Delete / Close room (host only)
 */
const deleteRoom = async (userId, roomId) => {
  const room = await Room.findById(roomId);

  if (!room || room.status === 'closed') {
    throw new AppError('Room not found', 404);
  }

  if (room.hostId.toString() !== userId.toString()) {
    throw new AppError('Only the room host can delete this room', 403);
  }

  room.status = 'closed';
  await room.save();

  return { message: 'Room closed successfully' };
};

module.exports = {
  createRoom,
  getRooms,
  getRoomById,
  joinRoom,
  leaveRoom,
  updateRoom,
  deleteRoom,
};
