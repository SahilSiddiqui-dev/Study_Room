import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../socket/SocketContext';
import sessionApi from '../api/session.api';

const IDLE_THRESHOLD_MS = 60 * 1000; // 60 seconds

/**
 * Hook for detecting focus interruptions (tab switching, window unfocus, 60s idle timeout, manual breaks).
 * Active when a study session is active (or in focus mode).
 */
export const useFocusTracking = ({
  isSessionActive,
  sessionId,
  roomId,
  timerPhase = 'focus',
  onInterruption,
}) => {
  const { socket, isConnected } = useSocket();

  const hiddenTimeRef = useRef(null);
  const idleTimerRef = useRef(null);
  const isIdleRef = useRef(false);
  const idleStartTimeRef = useRef(null);
  const lastEmitTimeRef = useRef(0);

  // Helper to emit focus:event with ack callback, REST fallback, and debounce guard
  const emitFocusEvent = useCallback(
    async ({ type, durationSec = 0, planned = false }) => {
      const now = Date.now();
      // Guard against duplicate emits within 1200ms
      if (now - lastEmitTimeRef.current < 1200) {
        return;
      }
      lastEmitTimeRef.current = now;

      const durSec = Math.max(0, Math.round(durationSec));
      const payload = {
        type,
        durationSec: durSec,
        planned: Boolean(planned),
        roomId,
      };

      let eventHandled = false;

      // 1. Try socket emit first if connected
      if (socket && isConnected) {
        try {
          socket.emit('focus:event', payload, (response) => {
            if (response?.success && response.eventId) {
              eventHandled = true;
              if (onInterruption && !planned) {
                onInterruption({
                  eventId: response.eventId,
                  type,
                  durationSec: durSec,
                  planned: false,
                });
              }
            }
          });
        } catch (err) {
          console.warn('Socket emit focus:event error:', err);
        }
      }

      // 2. Fallback to REST API if socket not connected or didn't handle
      setTimeout(async () => {
        if (!eventHandled && sessionId) {
          try {
            const res = await sessionApi.createSessionEvent(sessionId, {
              type,
              durationSec: durSec,
              planned: Boolean(planned),
            });
            if (res?.success && res.data?.event?._id) {
              if (onInterruption && !planned) {
                onInterruption({
                  eventId: res.data.event._id,
                  type,
                  durationSec: durSec,
                  planned: false,
                });
              }
            }
          } catch (err) {
            console.warn('REST focus event fallback error:', err);
          }
        }
      }, 300);
    },
    [socket, isConnected, onInterruption, sessionId, roomId]
  );

  // 1. Tab Switching & Window Blur Detection
  useEffect(() => {
    // Only track when session is active and phase is 'focus'
    if (!isSessionActive || timerPhase !== 'focus') {
      hiddenTimeRef.current = null;
      return;
    }

    const handleFocusLoss = () => {
      if (!hiddenTimeRef.current) {
        hiddenTimeRef.current = Date.now();
      }
    };

    const handleFocusGain = () => {
      if (hiddenTimeRef.current) {
        const elapsed = (Date.now() - hiddenTimeRef.current) / 1000;
        hiddenTimeRef.current = null;

        // Count any switch >= 0.5 seconds
        if (elapsed >= 0.5) {
          emitFocusEvent({
            type: 'tab_switch',
            durationSec: Math.max(1, Math.round(elapsed)),
            planned: false,
          });
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleFocusLoss();
      } else {
        handleFocusGain();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleFocusLoss);
    window.addEventListener('focus', handleFocusGain);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleFocusLoss);
      window.removeEventListener('focus', handleFocusGain);
      hiddenTimeRef.current = null;
    };
  }, [isSessionActive, timerPhase, emitFocusEvent]);

  // 2. Idle Detection (60 seconds without mouse, keyboard, touch, scroll)
  useEffect(() => {
    if (!isSessionActive || timerPhase !== 'focus') {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      isIdleRef.current = false;
      idleStartTimeRef.current = null;
      return;
    }

    const markActive = () => {
      // If user was previously idle and now returned, emit 'idle' event
      if (isIdleRef.current && idleStartTimeRef.current) {
        const durationSec = (Date.now() - idleStartTimeRef.current) / 1000;
        isIdleRef.current = false;
        idleStartTimeRef.current = null;

        if (durationSec >= 1) {
          emitFocusEvent({
            type: 'idle',
            durationSec: Math.max(1, Math.round(durationSec)),
            planned: false,
          });
        }
      }

      // Reset the 60s idle countdown
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);

      idleTimerRef.current = setTimeout(() => {
        isIdleRef.current = true;
        idleStartTimeRef.current = Date.now();
      }, IDLE_THRESHOLD_MS);
    };

    // Activity event listeners
    const activityEvents = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    activityEvents.forEach((event) => {
      window.addEventListener(event, markActive, { passive: true });
    });

    // Start initial idle timer
    idleTimerRef.current = setTimeout(() => {
      isIdleRef.current = true;
      idleStartTimeRef.current = Date.now();
    }, IDLE_THRESHOLD_MS);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, markActive);
      });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      isIdleRef.current = false;
      idleStartTimeRef.current = null;
    };
  }, [isSessionActive, timerPhase, emitFocusEvent]);

  // 3. Manual Break action
  const takeBreak = useCallback(
    (isPlanned = false) => {
      const type = isPlanned || timerPhase === 'break' ? 'planned_break' : 'manual_break';
      emitFocusEvent({
        type,
        durationSec: 0,
        planned: type === 'planned_break',
      });
    },
    [timerPhase, emitFocusEvent]
  );

  return {
    takeBreak,
  };
};

export default useFocusTracking;
