import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../socket/SocketContext';
import { computeRemainingSeconds } from '../utils/formatTime';

/**
 * Synchronized Pomodoro timer hook.
 * The server is the authoritative clock, periodically broadcasting timer:sync.
 * To keep the UI buttery smooth, this hook ticks locally every 1,000ms between sync packets.
 */
export const useServerTimer = (roomId, initialConfig = { focusMin: 25, breakMin: 5 }) => {
  const { socket, isConnected } = useSocket();

  const [phase, setPhase] = useState('focus'); // 'focus' | 'break'
  const [remainingSec, setRemainingSec] = useState(initialConfig.focusMin * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [serverTime, setServerTime] = useState(null);

  const localTickRef = useRef(null);

  // Sync state from server packet
  const handleTimerSync = useCallback((data) => {
    if (!data || (data.roomId && data.roomId !== roomId)) return;

    if (data.phase) setPhase(data.phase);
    if (data.serverTime) setServerTime(data.serverTime);

    // Compute remaining seconds adjusting for network transit latency
    const computedSec = computeRemainingSeconds(
      data.remainingSec,
      data.serverTime,
      Date.now()
    );

    setRemainingSec(computedSec);
    setIsRunning(true);
  }, [roomId]);

  // Phase transition event
  const handlePhaseChange = useCallback((data) => {
    if (!data || (data.roomId && data.roomId !== roomId)) return;
    if (data.phase) {
      setPhase(data.phase);
    }
  }, [roomId]);

  // Socket event listeners
  useEffect(() => {
    if (!socket || !isConnected) return;

    socket.on('timer:sync', handleTimerSync);
    socket.on('timer:phase', handlePhaseChange);

    return () => {
      socket.off('timer:sync', handleTimerSync);
      socket.off('timer:phase', handlePhaseChange);
    };
  }, [socket, isConnected, handleTimerSync, handlePhaseChange]);

  // Smooth local 1-second interval ticker while running
  useEffect(() => {
    if (!isRunning) {
      if (localTickRef.current) clearInterval(localTickRef.current);
      return;
    }

    localTickRef.current = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (localTickRef.current) clearInterval(localTickRef.current);
    };
  }, [isRunning]);

  // Host action: emit timer:start
  const startTimer = useCallback((customConfig = {}) => {
    if (!socket || !isConnected) return;

    const payload = {
      roomId,
      focusMin: customConfig.focusMin || initialConfig.focusMin,
      breakMin: customConfig.breakMin || initialConfig.breakMin,
    };

    socket.emit('timer:start', payload);
  }, [socket, isConnected, roomId, initialConfig]);

  return {
    phase,
    remainingSec,
    isRunning,
    startTimer,
    serverTime,
  };
};

export default useServerTimer;
