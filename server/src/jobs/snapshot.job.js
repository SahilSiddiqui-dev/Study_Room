const cron = require('node-cron');
const User = require('../models/User');
const StudySession = require('../models/StudySession');
const FocusEvent = require('../models/FocusEvent');
const BreakReason = require('../models/BreakReason');
const AnalyticsSnapshot = require('../models/AnalyticsSnapshot');
const { computeMetricsForPeriod } = require('../services/analytics.service');
const { evaluateCoachSuggestions } = require('../services/coach.service');

/**
 * Execute daily snapshot computation for all active users
 * Idempotent upsert matching unique index { userId, date }
 *
 * @param {string} [targetDateStr] Optional YYYY-MM-DD date. Defaults to yesterday.
 */
const runSnapshotJob = async (targetDateStr) => {
  let dateStr = targetDateStr;

  if (!dateStr) {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    dateStr = yesterday.toISOString().split('T')[0];
  }

  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  console.log(`[Snapshot Job] Running snapshot computation for date: ${dateStr}`);

  const users = await User.find({});
  let processedCount = 0;

  for (const user of users) {
    try {
      const metrics = await computeMetricsForPeriod(user._id, dayStart, dayEnd);

      // Determine top break reason on this day
      const daySessions = await StudySession.find({
        userId: user._id,
        startedAt: { $gte: dayStart, $lte: dayEnd },
      });
      const daySessionIds = daySessions.map((s) => s._id);

      const dayEvents = daySessionIds.length > 0
        ? await FocusEvent.find({ sessionId: { $in: daySessionIds } })
        : [];
      const dayEventIds = dayEvents.map((e) => e._id);

      const dayReasons = dayEventIds.length > 0
        ? await BreakReason.find({ eventId: { $in: dayEventIds } })
        : [];

      let topReason = 'none';
      if (dayReasons.length > 0) {
        const counts = {};
        dayReasons.forEach((r) => {
          counts[r.category] = (counts[r.category] || 0) + 1;
        });
        topReason = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      }

      // Generate coach recommendations
      let recommendations = [];
      try {
        const coachResult = await evaluateCoachSuggestions(user._id, '7d');
        recommendations = (coachResult.suggestions || []).map((s) => s.suggestedAction);
      } catch (coachErr) {
        recommendations = [];
      }

      // Idempotently upsert daily snapshot
      await AnalyticsSnapshot.findOneAndUpdate(
        { userId: user._id, date: dateStr },
        {
          userId: user._id,
          date: dateStr,
          fqs: metrics.fqs,
          interruptionRate: metrics.interruptionRate,
          avgUninterruptedMin: metrics.avgUninterruptedMin,
          topReason,
          recommendations,
        },
        { upsert: true, returnDocument: 'after' }
      );

      processedCount++;
    } catch (err) {
      console.error(`[Snapshot Job] Error processing snapshot for user ${user._id}:`, err.message);
    }
  }

  console.log(`[Snapshot Job] Successfully completed. Processed ${processedCount} users.`);
  return { processedCount, date: dateStr };
};

/**
 * Schedule daily cron job at 00:05
 */
const initSnapshotCron = () => {
  const job = cron.schedule('5 0 * * *', async () => {
    console.log('[Snapshot Job] Triggering daily cron schedule...');
    try {
      await runSnapshotJob();
    } catch (err) {
      console.error('[Snapshot Job] Cron execution error:', err.message);
    }
  });

  return job;
};

module.exports = {
  runSnapshotJob,
  initSnapshotCron,
};

