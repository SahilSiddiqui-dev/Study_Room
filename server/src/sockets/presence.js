/**
 * In-memory Presence Manager
 * Tracks connected sockets per room and de-duplicates multiple tabs for the same user.
 */
class PresenceManager {
  constructor() {
    // roomId -> Map<userId, { user: { userId, username, avatar }, socketIds: Set<string> }>
    this.rooms = new Map();
    // socketId -> Set<roomId>
    this.socketToRooms = new Map();
  }

  /**
   * Add a socket to a room.
   * Returns { participants, isFirstSocketForUser }
   */
  add(roomId, socket) {
    const user = socket.data.user;
    const userId = user._id.toString();

    // Track room on socket
    if (!this.socketToRooms.has(socket.id)) {
      this.socketToRooms.set(socket.id, new Set());
    }
    this.socketToRooms.get(socket.id).add(roomId);

    // Track user in room
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Map());
    }
    const roomMap = this.rooms.get(roomId);

    let isFirstSocketForUser = false;
    if (!roomMap.has(userId)) {
      isFirstSocketForUser = true;
      roomMap.set(userId, {
        user: {
          userId: user._id.toString(),
          username: user.username,
          avatar: user.avatar,
        },
        socketIds: new Set([socket.id]),
      });
    } else {
      roomMap.get(userId).socketIds.add(socket.id);
    }

    const participants = this.getParticipants(roomId);
    return { participants, isFirstSocketForUser };
  }

  /**
   * Remove a socket from a room.
   * Returns { participants, isLastSocketForUser, isRoomEmpty }
   */
  remove(roomId, socket) {
    const user = socket.data.user;
    const userId = user ? user._id.toString() : null;

    if (this.socketToRooms.has(socket.id)) {
      this.socketToRooms.get(socket.id).delete(roomId);
      if (this.socketToRooms.get(socket.id).size === 0) {
        this.socketToRooms.delete(socket.id);
      }
    }

    let isLastSocketForUser = false;
    let isRoomEmpty = false;

    if (this.rooms.has(roomId) && userId) {
      const roomMap = this.rooms.get(roomId);
      if (roomMap.has(userId)) {
        const entry = roomMap.get(userId);
        entry.socketIds.delete(socket.id);

        if (entry.socketIds.size === 0) {
          isLastSocketForUser = true;
          roomMap.delete(userId);
        }
      }

      if (roomMap.size === 0) {
        isRoomEmpty = true;
        this.rooms.delete(roomId);
      }
    }

    const participants = this.getParticipants(roomId);
    return { participants, isLastSocketForUser, isRoomEmpty };
  }

  /**
   * Get list of unique participants for a room
   */
  getParticipants(roomId) {
    if (!this.rooms.has(roomId)) return [];
    return Array.from(this.rooms.get(roomId).values()).map((entry) => entry.user);
  }

  /**
   * Get all roomIds a socket is currently in
   */
  getRoomsForSocket(socketId) {
    if (!this.socketToRooms.has(socketId)) return [];
    return Array.from(this.socketToRooms.get(socketId));
  }
}

module.exports = new PresenceManager();
