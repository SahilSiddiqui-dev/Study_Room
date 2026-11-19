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
  const [remainingSec, setRemainingSec] = useState((initialConfig.focusMin || 25) * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [serverTime, setServerTime] = useState(null);

  const localTickRef = useRef(null);

  // Keep remainingSec updated when initialConfig loads or changes while idle
  useEffect(() => {
    if (!isRunning && initialConfig?.focusMin) {
      setRemainingSec(initialConfig.focusMin * 60);
    }
  }, [initialConfig?.focusMin, isRunning]);

  // Sync state from server packet
  const handleTimerSync = useCallback((data) => {
    if (!data || (data.roomId && data.roomId !== roomId)) return;

    if (data.phase) setPhase(data.phase);
    if (data.serverTime) setServerTime(data.serverTime);

    // If server provides remainingSec directly, sync immediately
    if (typeof data.remainingSec === 'number') {
      setRemainingSec(Math.max(0, Math.floor(data.remainingSec)));
    }

    if (typeof data.isRunning === 'boolean') {
      setIsRunning(data.isRunning);
    } else {
      setIsRunning(true);
    }
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

  // Start / restart timer action
  const startTimer = useCallback((customConfig = {}) => {
    const fMin = parseInt(customConfig.focusMin || initialConfig.focusMin, 10) || 25;
    const bMin = parseInt(customConfig.breakMin || initialConfig.breakMin, 10) || 5;

    // Optimistically update UI immediately (0ms lag)
    setRemainingSec(fMin * 60);
    setPhase('focus');
    setIsRunning(true);

    if (socket && isConnected) {
      socket.emit('timer:start', {
        roomId,
        focusMin: fMin,
        breakMin: bMin,
      });
    }
  }, [socket, isConnected, roomId, initialConfig]);

  // Pause timer action
  const pauseTimer = useCallback(() => {
    setIsRunning(false);
    if (socket && isConnected) {
      socket.emit('timer:pause', { roomId });
    }
  }, [socket, isConnected, roomId]);

  // Reset timer action
  const resetTimer = useCallback(() => {
    const fMin = parseInt(initialConfig.focusMin, 10) || 25;
    setIsRunning(false);
    setRemainingSec(fMin * 60);
    setPhase('focus');

    if (socket && isConnected) {
      socket.emit('timer:reset', { roomId });
    }
  }, [socket, isConnected, roomId, initialConfig]);

  return {
    phase,
    remainingSec,
    isRunning,
    startTimer,
    pauseTimer,
    resetTimer,
    serverTime,
  };
};

export default useServerTimer;
