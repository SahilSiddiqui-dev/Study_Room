const { Server } = require('socket.io');
const env = require('../config/env');
const socketAuthMiddleware = require('./auth');
const presenceManager = require('./presence');
const timerManager = require('./timer');
const Room = require('../models/Room');
const StudySession = require('../models/StudySession');
const FocusEvent = require('../models/FocusEvent');
const { createEventSchema } = require('../validators/event.validator');

const initSocketServer = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CLIENT_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    const user = socket.data.user;

    // Per-socket rate limiter: max 20 events per 10 seconds
    const eventTimestamps = [];
    socket.use(([eventName, ...args], next) => {
      const now = Date.now();
      // Keep only timestamps within the last 10 seconds
      while (eventTimestamps.length > 0 && now - eventTimestamps[0] > 10000) {
        eventTimestamps.shift();
      }

      if (eventTimestamps.length >= 20) {
        socket.emit('error', { message: 'Rate limit exceeded: too many socket events' });
        return; // Drop event
      }

      eventTimestamps.push(now);
      next();
    });

    /**
     * room:join { roomId }
     */
    socket.on('room:join', async (data = {}) => {
      try {
        const { roomId } = data;
        if (!roomId || typeof roomId !== 'string') {
          return socket.emit('error', { message: 'Invalid roomId' });
        }

        const room = await Room.findById(roomId);
        if (!room || room.status === 'closed') {
          return socket.emit('error', { message: 'Room not found or closed' });
        }

        // Private room access check
        if (room.isPrivate) {
          const isHost = room.hostId.toString() === user._id.toString();
          const isMember = room.participants.some(
            (p) => p.toString() === user._id.toString()
          );
          if (!isHost && !isMember) {
            return socket.emit('error', { message: 'Access denied: private room' });
          }
        }

        socket.join(roomId);

        // Update presence with de-duplication
        const { participants } = presenceManager.add(roomId, socket);
        io.to(roomId).emit('room:presence', { roomId, participants });

        // If a timer is already running in the room, send current state to late joiner immediately
        const timerState = timerManager.getState(roomId);
        if (timerState) {
          socket.emit('timer:sync', timerState);
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * room:leave { roomId }
     */
    socket.on('room:leave', async (data = {}) => {
      try {
        const { roomId } = data;
        if (!roomId) return;

        socket.leave(roomId);

        const { participants, isLastSocketForUser, isRoomEmpty } =
          presenceManager.remove(roomId, socket);

        io.to(roomId).emit('room:presence', { roomId, participants });

        // If user's last socket left, log 'left_room' event on active session if present
        if (isLastSocketForUser) {
          const activeSession = await StudySession.findOne({
            userId: user._id,
            endedAt: null,
          });
          if (activeSession) {
            await FocusEvent.create({
              sessionId: activeSession._id,
              userId: user._id,
              type: 'left_room',
              planned: false,
            });
          }
        }

        if (isRoomEmpty) {
          timerManager.clear(roomId);
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * timer:start { roomId, focusMin, breakMin }
     * Host only!
     */
    socket.on('timer:start', async (data = {}) => {
      try {
        const { roomId, focusMin, breakMin } = data;
        if (!roomId) {
          return socket.emit('error', { message: 'roomId is required' });
        }

        const room = await Room.findById(roomId);
        if (!room || room.status === 'closed') {
          return socket.emit('error', { message: 'Room not found or closed' });
        }

        if (room.hostId.toString() !== user._id.toString()) {
          return socket.emit('error', {
            message: 'Only the room host can start the timer',
          });
        }

        timerManager.start(
          io,
          roomId,
          {
            focusMin: focusMin || room.pomodoro.focusMin,
            breakMin: breakMin || room.pomodoro.breakMin,
          },
          user._id
        );
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    /**
     * focus:event { type, durationSec, planned } (with ack callback)
     */
    socket.on('focus:event', async (data = {}, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};

      try {
        const parsed = createEventSchema.safeParse(data);
        if (!parsed.success) {
          return ack({ success: false, message: 'Validation failed for focus:event' });
        }

        const activeSession = await StudySession.findOne({
          userId: user._id,
          endedAt: null,
        });

        if (!activeSession) {
          return ack({
            success: false,
            message: 'No active study session found to attach event to',
          });
        }

        const planned =
          parsed.data.type === 'planned_break' || Boolean(parsed.data.planned);

        const event = await FocusEvent.create({
          sessionId: activeSession._id,
          userId: user._id,
          type: parsed.data.type,
          durationSec: parsed.data.durationSec || 0,
          planned,
        });

        return ack({
          success: true,
          eventId: event._id.toString(),
        });
      } catch (err) {
        return ack({ success: false, message: err.message });
      }
    });

    /**
     * Disconnect handler
     */
    socket.on('disconnect', async () => {
      const rooms = presenceManager.getRoomsForSocket(socket.id);

      for (const roomId of rooms) {
        const { participants, isLastSocketForUser, isRoomEmpty } =
          presenceManager.remove(roomId, socket);

        io.to(roomId).emit('room:presence', { roomId, participants });

        // Log 'left_room' event on active session if user completely left
        if (isLastSocketForUser) {
          try {
            const activeSession = await StudySession.findOne({
              userId: user._id,
              endedAt: null,
            });
            if (activeSession) {
              await FocusEvent.create({
                sessionId: activeSession._id,
                userId: user._id,
                type: 'left_room',
                planned: false,
              });
            }
          } catch (err) {
            console.error('Error logging left_room event on disconnect:', err.message);
          }
        }

        if (isRoomEmpty) {
          timerManager.clear(roomId);
        }
      }
    });
  });

  return io;
};

module.exports = { initSocketServer, timerManager, presenceManager };
