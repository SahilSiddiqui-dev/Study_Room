const { computeFqs } = require('../src/utils/fqs');

describe('Focus Quality Score (FQS) Pure Function Unit Tests', () => {
  test('Perfect score scenario returns 100.0', () => {
    // 0 interruptions, 100% uninterrupted, 100% completion, 0 context switches
    const stats = {
      uninterruptedRatio: 1.0,
      interruptionRate: 0,
      sessionCompletion: 1.0,
      contextSwitchRate: 0,
    };
    const score = computeFqs(stats);
    expect(score).toBe(100.0);
  });

  test('Empty data returns 0 without NaN', () => {
    expect(computeFqs({})).toBe(0);
    expect(computeFqs(null)).toBe(0);
    expect(computeFqs(undefined)).toBe(0);
    expect(computeFqs({ activeMinutes: 0, totalSessions: 0 })).toBe(0);
    expect(Number.isNaN(computeFqs({}))).toBe(false);
  });

  test('Worst-case scenario returns 0.0', () => {
    // 0 uninterrupted, >= 10 interruptions/hr, 0% completion, >= 10 context switches/hr
    const stats = {
      uninterruptedRatio: 0,
      interruptionRate: 15.0, // capped at 10
      sessionCompletion: 0,
      contextSwitchRate: 20.0, // capped at 10
    };
    const score = computeFqs(stats);
    expect(score).toBe(0.0);
  });

  test('Intermediate realistic values calculate correctly', () => {
    // uninterruptedRatio: 0.8 -> 40 * 0.8 = 32
    // interruptionRate: 2 -> 25 * (1 - 2/10) = 25 * 0.8 = 20
    // sessionCompletion: 0.75 -> 20 * 0.75 = 15
    // contextSwitchRate: 1 -> 15 * (1 - 1/10) = 15 * 0.9 = 13.5
    // Total = 32 + 20 + 15 + 13.5 = 80.5
    const stats = {
      uninterruptedRatio: 0.8,
      interruptionRate: 2.0,
      sessionCompletion: 0.75,
      contextSwitchRate: 1.0,
    };
    const score = computeFqs(stats);
    expect(score).toBe(80.5);
  });

  test('Calculates derived rates from raw counts when provided', () => {
    // activeMinutes: 60
    // totalSessions: 2, completedSessions: 2 -> sessionCompletion: 1.0 (20 pts)
    // unplannedCount: 0 -> interruptionRate: 0 (25 pts)
    // totalUnplannedDurationSec: 0 -> uninterruptedRatio: 1.0 (40 pts)
    // tabSwitchCount: 0 -> contextSwitchRate: 0 (15 pts)
    // Total = 100.0
    const rawStats = {
      activeMinutes: 60,
      totalSessions: 2,
      completedSessions: 2,
      unplannedCount: 0,
      totalUnplannedDurationSec: 0,
      tabSwitchCount: 0,
    };
    const score = computeFqs(rawStats);
    expect(score).toBe(100.0);
  });
});

