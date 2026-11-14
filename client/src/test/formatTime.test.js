import { describe, it, expect } from 'vitest';
import {
  formatSeconds,
  formatMinutes,
  computeRemainingSeconds,
} from '../utils/formatTime';

describe('Time and Pomodoro Clock Synchronization Functions', () => {
  describe('formatSeconds', () => {
    it('formats seconds into MM:SS format', () => {
      expect(formatSeconds(1500)).toBe('25:00');
      expect(formatSeconds(65)).toBe('01:05');
      expect(formatSeconds(9)).toBe('00:09');
      expect(formatSeconds(0)).toBe('00:00');
      expect(formatSeconds(-10)).toBe('00:00');
      expect(formatSeconds(null)).toBe('00:00');
    });
  });

  describe('formatMinutes', () => {
    it('formats minutes into human readable text', () => {
      expect(formatMinutes(90)).toBe('1h 30m');
      expect(formatMinutes(60)).toBe('1h');
      expect(formatMinutes(25)).toBe('25m');
      expect(formatMinutes(0)).toBe('0m');
    });
  });

  describe('computeRemainingSeconds (Pure Function)', () => {
    it('returns exact remaining seconds when clientNow matches serverTime', () => {
      const serverTime = '2026-11-15T00:00:00.000Z';
      const clientNow = new Date('2026-11-15T00:00:00.000Z').getTime();

      const remaining = computeRemainingSeconds(1500, serverTime, clientNow);
      expect(remaining).toBe(1500);
    });

    it('deducts elapsed seconds based on clock offset / network transit time', () => {
      const serverTime = '2026-11-15T00:00:00.000Z';
      // Client receives or renders 3 seconds later
      const clientNow = new Date('2026-11-15T00:00:03.000Z').getTime();

      const remaining = computeRemainingSeconds(1500, serverTime, clientNow);
      expect(remaining).toBe(1497);
    });

    it('clamps remaining seconds at 0 when elapsed time exceeds duration', () => {
      const serverTime = '2026-11-15T00:00:00.000Z';
      const clientNow = new Date('2026-11-15T00:30:00.000Z').getTime(); // 1800s later

      const remaining = computeRemainingSeconds(60, serverTime, clientNow);
      expect(remaining).toBe(0);
    });

    it('safely handles missing or malformed serverTime', () => {
      expect(computeRemainingSeconds(300, null)).toBe(300);
      expect(computeRemainingSeconds(300, 'invalid-date')).toBe(300);
      expect(computeRemainingSeconds(null, '2026-11-15T00:00:00.000Z')).toBe(0);
    });
  });
});
