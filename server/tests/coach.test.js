const {
  ruleDominantBreakReason,
  ruleHighInterruptionRate,
  rulePositiveReinforcement,
  ruleSessionLength,
} = require('../src/services/coach.service');

describe('Coach Rule Engine Unit Tests', () => {
  describe('Rule 1: Dominant Break Reason', () => {
    test('Triggers when a single category accounts for >= 40% of break reasons', () => {
      const context = {
        reasonsData: {
          totalReasons: 10,
          reasons: [
            { category: 'phone', count: 5, percentage: 50 },
            { category: 'fatigue', count: 3, percentage: 30 },
            { category: 'doubt', count: 2, percentage: 20 },
          ],
        },
      };

      const result = ruleDominantBreakReason(context);
      expect(result).not.toBeNull();
      expect(result.ruleId).toBe('dominant_break_reason');
      expect(result.evidence).toContain('phone accounted for 50% (5 of 10)');
      expect(result.suggestedAction).toContain('Do Not Disturb');
    });

    test('Returns null when no category reaches 40%', () => {
      const context = {
        reasonsData: {
          totalReasons: 10,
          reasons: [
            { category: 'phone', count: 3, percentage: 30 },
            { category: 'fatigue', count: 3, percentage: 30 },
            { category: 'notification', count: 4, percentage: 40 - 1 },
          ],
        },
      };

      const result = ruleDominantBreakReason(context);
      expect(result).toBeNull();
    });
  });

  describe('Rule 4: High Interruption Rate', () => {
    test('Triggers when interruption rate exceeds 6 per hour', () => {
      const context = {
        summaryData: {
          current: {
            interruptionRate: 7.5,
          },
        },
      };

      const result = ruleHighInterruptionRate(context);
      expect(result).not.toBeNull();
      expect(result.ruleId).toBe('high_interruption_rate');
      expect(result.evidence).toContain('7.5 interruptions per hour');
    });

    test('Returns null when interruption rate is within acceptable range (<= 6)', () => {
      const context = {
        summaryData: {
          current: {
            interruptionRate: 4.2,
          },
        },
      };

      const result = ruleHighInterruptionRate(context);
      expect(result).toBeNull();
    });
  });

  describe('Rule 7: Positive Reinforcement', () => {
    test('Triggers when FQS improves by >= 10 points over previous period', () => {
      const context = {
        summaryData: {
          current: { fqs: 82.5 },
          previous: { fqs: 70.0 },
          delta: { fqs: 12.5 },
        },
      };

      const result = rulePositiveReinforcement(context);
      expect(result).not.toBeNull();
      expect(result.ruleId).toBe('positive_reinforcement');
      expect(result.evidence).toContain('+12.5 points (from 70 to 82.5)');
    });

    test('Returns null when improvement is under 10 points', () => {
      const context = {
        summaryData: {
          current: { fqs: 75.0 },
          previous: { fqs: 70.0 },
          delta: { fqs: 5.0 },
        },
      };

      const result = rulePositiveReinforcement(context);
      expect(result).toBeNull();
    });
  });

  describe('Rule 3: Session Length', () => {
    test('Recommends shorter sessions when completion rate differs by >= 15 points', () => {
      const context = {
        rawSessions: [
          // 2 short sessions (both completed = 100%)
          { plannedMinutes: 25, completed: true },
          { plannedMinutes: 25, completed: true },
          // 2 long sessions (1 completed = 50%)
          { plannedMinutes: 50, completed: true },
          { plannedMinutes: 50, completed: false },
        ],
      };

      const result = ruleSessionLength(context);
      expect(result).not.toBeNull();
      expect(result.ruleId).toBe('session_length');
      expect(result.evidence).toContain('100% completion rate compared to 50%');
    });
  });
});
