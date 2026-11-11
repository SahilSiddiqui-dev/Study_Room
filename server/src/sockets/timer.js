/**
 * Server-Side Room Pomodoro Timer Engine
 * The server is the authoritative clock, periodically synchronizing state with clients
 * and automatically transitioning between 'focus' and 'break' phases.
 */
class TimerManager {
  constructor() {
    // roomId -> { phase, focusMin, breakMin, remainingSec, intervalId, hostId }
    this.timers = new Map();
  }

  /**
   * Start or restart a timer for a room
   */
  start(io, roomId, { focusMin = 25, breakMin = 5 } = {}, hostId) {
    this.clear(roomId);

    const fMin = Math.max(5, Math.min(120, parseInt(focusMin, 10) || 25));
    const bMin = Math.max(1, Math.min(30, parseInt(breakMin, 10) || 5));

    const state = {
      phase: 'focus',
      focusMin: fMin,
      breakMin: bMin,
      remainingSec: fMin * 60,
      hostId: hostId.toString(),
      intervalId: null,
    };

    // Emit initial phase and sync
    io.to(roomId).emit('timer:phase', { roomId, phase: state.phase });
    io.to(roomId).emit('timer:sync', {
      roomId,
      phase: state.phase,
      remainingSec: state.remainingSec,
      serverTime: new Date().toISOString(),
    });

    state.intervalId = setInterval(() => {
      state.remainingSec -= 1;

      if (state.remainingSec <= 0) {
        // Automatically switch phases
        if (state.phase === 'focus') {
          state.phase = 'break';
          state.remainingSec = state.breakMin * 60;
        } else {
          state.phase = 'focus';
          state.remainingSec = state.focusMin * 60;
        }

        io.to(roomId).emit('timer:phase', { roomId, phase: state.phase });
      }

      io.to(roomId).emit('timer:sync', {
        roomId,
        phase: state.phase,
        remainingSec: state.remainingSec,
        serverTime: new Date().toISOString(),
      });
    }, 1000);

    this.timers.set(roomId, state);
    return state;
  }

  /**
   * Get current state for late joiners
   */
  getState(roomId) {
    const state = this.timers.get(roomId);
    if (!state) return null;

    return {
      roomId,
      phase: state.phase,
      remainingSec: state.remainingSec,
      serverTime: new Date().toISOString(),
    };
  }

  /**
   * Clear and remove room timer
   */
  clear(roomId) {
    if (this.timers.has(roomId)) {
      const state = this.timers.get(roomId);
      if (state.intervalId) {
        clearInterval(state.intervalId);
      }
      this.timers.delete(roomId);
    }
  }

  /**
   * Clean up all timers on server shutdown
   */
  clearAll() {
    for (const [roomId] of this.timers) {
      this.clear(roomId);
    }
  }
}

module.exports = new TimerManager();

