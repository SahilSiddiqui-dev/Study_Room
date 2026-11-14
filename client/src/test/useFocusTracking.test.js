import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFocusTracking } from '../hooks/useFocusTracking';

// Mock SocketContext
const mockEmit = vi.fn();
vi.mock('../socket/SocketContext', () => ({
  useSocket: () => ({
    socket: { emit: mockEmit },
    isConnected: true,
  }),
}));

describe('useFocusTracking Hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockEmit.mockClear();
    Object.defineProperty(document, 'hidden', {
      writable: true,
      value: false,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not emit events when session is inactive', () => {
    const onInterruption = vi.fn();
    renderHook(() =>
      useFocusTracking({
        isSessionActive: false,
        timerPhase: 'focus',
        onInterruption,
      })
    );

    // Simulate tab switch
    act(() => {
      document.hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });

    act(() => {
      vi.advanceTimersByTime(5000);
      document.hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(mockEmit).not.toHaveBeenCalled();
    expect(onInterruption).not.toHaveBeenCalled();
  });

  it('detects tab switch and emits focus:event once on return with duration', () => {
    const onInterruption = vi.fn();
    renderHook(() =>
      useFocusTracking({
        isSessionActive: true,
        timerPhase: 'focus',
        onInterruption,
      })
    );

    // 1. Tab becomes hidden
    act(() => {
      document.hidden = true;
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // 2. User spends 10 seconds in another tab
    act(() => {
      vi.advanceTimersByTime(10000);
    });

    // 3. Tab becomes visible again
    act(() => {
      document.hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    });

    // Verify emit was called exactly once with type 'tab_switch'
    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith(
      'focus:event',
      expect.objectContaining({
        type: 'tab_switch',
        durationSec: 10,
        planned: false,
      }),
      expect.any(Function)
    );

    // Simulate server ack callback returning eventId
    const ackCallback = mockEmit.mock.calls[0][2];
    act(() => {
      ackCallback({ success: true, eventId: 'evt_123' });
    });

    expect(onInterruption).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'evt_123',
        type: 'tab_switch',
        durationSec: 10,
      })
    );
  });

  it('detects 60-second idle timeout and emits idle event upon returning', () => {
    const onInterruption = vi.fn();
    renderHook(() =>
      useFocusTracking({
        isSessionActive: true,
        timerPhase: 'focus',
        onInterruption,
      })
    );

    // Advance 60 seconds of inactivity to trigger idle state
    act(() => {
      vi.advanceTimersByTime(60000);
    });

    // Advance another 15 seconds while idle
    act(() => {
      vi.advanceTimersByTime(15000);
    });

    // User resumes activity by moving mouse
    act(() => {
      window.dispatchEvent(new Event('mousemove'));
    });

    expect(mockEmit).toHaveBeenCalledTimes(1);
    expect(mockEmit).toHaveBeenCalledWith(
      'focus:event',
      expect.objectContaining({
        type: 'idle',
        durationSec: 15,
        planned: false,
      }),
      expect.any(Function)
    );
  });
});
