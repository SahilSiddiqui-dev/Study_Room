import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../socket/SocketContext';

/**
 * Manages Socket.IO room presence and automatic join/leave lifecycle.
 */
export const useRoomPresence = (roomId) => {
  const { socket, isConnected } = useSocket();
  const [participants, setParticipants] = useState([]);

  const handlePresence = useCallback((data) => {
    if (!data || (data.roomId && data.roomId !== roomId)) return;

    if (Array.isArray(data.participants)) {
      // Deduplicate participants by userId
      const seen = new Set();
      const unique = [];

      data.participants.forEach((p) => {
        const id = p.userId || p._id || p.id;
        if (id && !seen.has(id.toString())) {
          seen.add(id.toString());
          unique.push({
            userId: id.toString(),
            username: p.username || 'Student',
            avatar: p.avatar || 'owl',
          });
        }
      });

      setParticipants(unique);
    }
  }, [roomId]);

  useEffect(() => {
    if (!socket || !isConnected || !roomId) return;

    // Join room immediately upon mount / socket connection
    socket.emit('room:join', { roomId });

    socket.on('room:presence', handlePresence);

    // Re-join if socket reconnects
    const handleReconnect = () => {
      socket.emit('room:join', { roomId });
    };
    socket.on('connect', handleReconnect);

    return () => {
      socket.emit('room:leave', { roomId });
      socket.off('room:presence', handlePresence);
      socket.off('connect', handleReconnect);
    };
  }, [socket, isConnected, roomId, handlePresence]);

  return {
    participants,
    count: participants.length,
  };
};

export default useRoomPresence;
