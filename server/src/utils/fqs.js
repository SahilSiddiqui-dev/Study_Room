/**
 * Focus Quality Score (FQS) Pure Function
 * Formula:
 *   40 * uninterruptedRatio +
 *   25 * (1 - min(interruptionRate / 10, 1)) +
 *   20 * sessionCompletion +
 *   15 * (1 - min(contextSwitchRate / 10, 1))
 * Rounded to 1 decimal place.
 *
 * @param {Object} stats
 * @param {number} [stats.uninterruptedRatio] - Clamped 0..1 ratio of focus time uninterrupted
 * @param {number} [stats.interruptionRate] - Unplanned interruptions per active hour
 * @param {number} [stats.sessionCompletion] - Ratio of completed sessions (0..1)
 * @param {number} [stats.contextSwitchRate] - tab_switch interruptions per active hour
 * @param {number} [stats.activeMinutes] - Total study minutes
 * @param {number} [stats.totalSessions] - Total sessions count
 * @returns {number} FQS between 0.0 and 100.0
 */
const computeFqs = (stats = {}) => {
  if (!stats) return 0;

  const activeMinutes = Number(stats.activeMinutes) || 0;
  const totalSessions = Number(stats.totalSessions) || 0;

  // Handle empty state gracefully without NaN
  if (activeMinutes === 0 && totalSessions === 0 && stats.uninterruptedRatio === undefined) {
    return 0;
  }

  // 1. Uninterrupted Ratio (0..1)
  let uninterruptedRatio = 0;
  if (stats.uninterruptedRatio !== undefined) {
    uninterruptedRatio = Number(stats.uninterruptedRatio) || 0;
  } else if (activeMinutes > 0) {
    const unplannedDurationSec = Number(stats.totalUnplannedDurationSec) || 0;
    uninterruptedRatio = 1 - unplannedDurationSec / (activeMinutes * 60);
  }
  uninterruptedRatio = Math.max(0, Math.min(1, uninterruptedRatio));

  // 2. Interruption Rate (per hour, normalized against cap of 10)
  let interruptionRate = 0;
  if (stats.interruptionRate !== undefined) {
    interruptionRate = Number(stats.interruptionRate) || 0;
  } else if (activeMinutes > 0) {
    interruptionRate = ((Number(stats.unplannedCount) || 0) / activeMinutes) * 60;
  }
  const interruptionPenalty = Math.max(0, Math.min(1, interruptionRate / 10));

  // 3. Session Completion (0..1)
  let sessionCompletion = 0;
  if (stats.sessionCompletion !== undefined) {
    sessionCompletion = Number(stats.sessionCompletion) || 0;
  } else if (totalSessions > 0) {
    sessionCompletion = (Number(stats.completedSessions) || 0) / totalSessions;
  }
  sessionCompletion = Math.max(0, Math.min(1, sessionCompletion));

  // 4. Context Switch Rate (tab_switch per hour, normalized against cap of 10)
  let contextSwitchRate = 0;
  if (stats.contextSwitchRate !== undefined) {
    contextSwitchRate = Number(stats.contextSwitchRate) || 0;
  } else if (activeMinutes > 0) {
    contextSwitchRate = ((Number(stats.tabSwitchCount) || 0) / activeMinutes) * 60;
  }
  const contextSwitchPenalty = Math.max(0, Math.min(1, contextSwitchRate / 10));

  // Compute final score
  const fqs =
    40 * uninterruptedRatio +
    25 * (1 - interruptionPenalty) +
    20 * sessionCompletion +
    15 * (1 - contextSwitchPenalty);

  const clamped = Math.max(0, Math.min(100, fqs));
  return Math.round(clamped * 10) / 10;
};

module.exports = { computeFqs };

