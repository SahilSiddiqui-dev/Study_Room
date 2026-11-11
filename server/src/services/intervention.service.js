const Intervention = require('../models/Intervention');
const StudySession = require('../models/StudySession');
const { computeMetricsForPeriod } = require('./analytics.service');

/**
 * Record a shown coach intervention and capture a 7-day prior baseline.
 */
const createIntervention = async (userId, { ruleId, suggestedAction }) => {
  const shownAt = new Date();
  const baselineStart = new Date(shownAt.getTime() - 7 * 24 * 60 * 60 * 1000);

  const baselineMetrics = await computeMetricsForPeriod(userId, baselineStart, shownAt);

  const intervention = await Intervention.create({
    userId,
    ruleId,
    suggestedAction,
    shownAt,
    baseline: {
      avgUninterruptedMin: baselineMetrics.avgUninterruptedMin,
      completionRate: baselineMetrics.sessionCompletion,
      interruptionRate: baselineMetrics.interruptionRate,
    },
  });

  return intervention;
};

/**
 * Compare before vs after metrics for all user interventions
 */
const getInterventionsReport = async (userId) => {
  const interventions = await Intervention.find({ userId }).sort({ shownAt: -1 });

  const report = await Promise.all(
    interventions.map(async (intervention) => {
      const afterSessions = await StudySession.find({
        userId,
        startedAt: { $gte: intervention.shownAt },
        endedAt: { $ne: null },
      });

      if (afterSessions.length < 3) {
        return {
          _id: intervention._id,
          ruleId: intervention.ruleId,
          suggestedAction: intervention.suggestedAction,
          shownAt: intervention.shownAt,
          status: 'insufficient data',
          sessionsCount: afterSessions.length,
          message: 'At least 3 completed sessions after intervention required for impact analysis',
          baseline: intervention.baseline,
        };
      }

      const afterMetrics = await computeMetricsForPeriod(
        userId,
        intervention.shownAt,
        new Date()
      );

      const delta = {
        avgUninterruptedMin:
          Math.round((afterMetrics.avgUninterruptedMin - intervention.baseline.avgUninterruptedMin) * 10) / 10,
        completionRate:
          Math.round((afterMetrics.sessionCompletion - intervention.baseline.completionRate) * 1000) / 1000,
        interruptionRate:
          Math.round((afterMetrics.interruptionRate - intervention.baseline.interruptionRate) * 10) / 10,
      };

      // Considered improved if uninterrupted time increased OR interruption rate reduced
      const improved =
        delta.avgUninterruptedMin > 0 ||
        delta.interruptionRate < 0 ||
        delta.completionRate > 0;

      return {
        _id: intervention._id,
        ruleId: intervention.ruleId,
        suggestedAction: intervention.suggestedAction,
        shownAt: intervention.shownAt,
        status: 'evaluated',
        sessionsCount: afterSessions.length,
        baseline: intervention.baseline,
        after: {
          avgUninterruptedMin: afterMetrics.avgUninterruptedMin,
          completionRate: afterMetrics.sessionCompletion,
          interruptionRate: afterMetrics.interruptionRate,
        },
        delta,
        improved,
      };
    })
  );

  return report;
};

module.exports = {
  createIntervention,
  getInterventionsReport,
};

