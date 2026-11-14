import { useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../socket/SocketContext';

const IDLE_THRESHOLD_MS = 60 * 1000; // 60 seconds

/**
 * Hook for detecting focus interruptions (tab switching, 60s idle timeout, manual breaks).
 * Active strictly when an active session is in progress AND timer phase is 'focus'.
 */
export const useFocusTracking = ({
  isSessionActive,
  timerPhase = 'focus',
  onInterruption,
}) => {
  const { socket, isConnected } = useSocket();

  const hiddenTimeRef = useRef(null);
  const idleTimerRef = useRef(null);
  const isIdleRef = useRef(false);
  const idleStartTimeRef = useRef(null);
  const lastEmitTimeRef = useRef(0);

  // Helper to emit focus:event with ack callback and debounce guard
  const emitFocusEvent = useCallback(
    ({ type, durationSec = 0, planned = false }) => {
      if (!socket || !isConnected) return;

      const now = Date.now();
      // Guard against duplicate emits within 1000ms
      if (now - lastEmitTimeRef.current < 1000) {
        return;
      }
      lastEmitTimeRef.current = now;

      socket.emit(
        'focus:event',
        {
          type,
          durationSec: Math.max(0, Math.round(durationSec)),
          planned: Boolean(planned),
        },
        (response) => {
          if (response?.success && response.eventId) {
            if (onInterruption && !planned) {
              onInterruption({
                eventId: response.eventId,
                type,
                durationSec: Math.max(0, Math.round(durationSec)),
                planned: false,
              });
            }
          }
        }
      );
    },
    [socket, isConnected, onInterruption]
  );

  // 1. Tab Switching Detection (document.visibilitychange)
  useEffect(() => {
    // Only track when session is active and phase is 'focus'
    if (!isSessionActive || timerPhase !== 'focus') {
      hiddenTimeRef.current = null;
      return;
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab went to background
        hiddenTimeRef.current = Date.now();
      } else {
        // Tab became visible again
        if (hiddenTimeRef.current) {
          const durationSec = (Date.now() - hiddenTimeRef.current) / 1000;
          hiddenTimeRef.current = null;

          // Ignore instantaneous tab blips < 1s
          if (durationSec >= 1) {
            emitFocusEvent({
              type: 'tab_switch',
              durationSec,
              planned: false,
            });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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
            durationSec,
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
