const StudySession = require('../models/StudySession');
const FocusEvent = require('../models/FocusEvent');
const BreakReason = require('../models/BreakReason');
const User = require('../models/User');
const { computeFqs } = require('../utils/fqs');

const parseRangeDays = (range) => {
  return range === '30d' ? 30 : 7;
};

/**
 * Compute comprehensive study metrics for a given user and time window
 */
const computeMetricsForPeriod = async (userId, startDate, endDate) => {
  const sessions = await StudySession.find({
    userId,
    startedAt: { $gte: startDate, $lt: endDate },
    endedAt: { $ne: null },
  });

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.completed).length;
  const activeMinutes = sessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);

  const sessionIds = sessions.map((s) => s._id);
  const events = sessionIds.length > 0
    ? await FocusEvent.find({ sessionId: { $in: sessionIds } }).sort({ startedAt: 1 })
    : [];

  const unplannedEvents = events.filter((e) => !e.planned);
  const unplannedCount = unplannedEvents.length;
  const totalUnplannedDurationSec = unplannedEvents.reduce((acc, e) => acc + (e.durationSec || 0), 0);
  const tabSwitchCount = unplannedEvents.filter((e) => e.type === 'tab_switch').length;

  const interruptionRate = activeMinutes > 0 ? (unplannedCount / activeMinutes) * 60 : 0;
  const sessionCompletion = totalSessions > 0 ? completedSessions / totalSessions : 0;
  const uninterruptedRatio = activeMinutes > 0
    ? Math.max(0, Math.min(1, 1 - totalUnplannedDurationSec / (activeMinutes * 60)))
    : 0;
  const contextSwitchRate = activeMinutes > 0 ? (tabSwitchCount / activeMinutes) * 60 : 0;
  const recoveryTimeSec = unplannedCount > 0 ? totalUnplannedDurationSec / unplannedCount : 0;

  // Compute average uninterrupted gap inside sessions
  const allGaps = [];
  sessions.forEach((s) => {
    const sEvents = unplannedEvents
      .filter((e) => e.sessionId.toString() === s._id.toString())
      .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());

    const sStart = s.startedAt.getTime();
    const sEnd = s.endedAt ? s.endedAt.getTime() : sStart + (s.actualMinutes || 0) * 60000;

    if (sEvents.length === 0) {
      const gap = (sEnd - sStart) / 60000;
      if (gap > 0) allGaps.push(gap);
    } else {
      // First gap
      const firstGap = (sEvents[0].startedAt.getTime() - sStart) / 60000;
      if (firstGap > 0) allGaps.push(firstGap);

      // Intermediate gaps
      for (let i = 0; i < sEvents.length - 1; i++) {
        const gapStart = sEvents[i].startedAt.getTime() + (sEvents[i].durationSec || 0) * 1000;
        const gapEnd = sEvents[i + 1].startedAt.getTime();
        const gap = (gapEnd - gapStart) / 60000;
        if (gap > 0) allGaps.push(gap);
      }

      // Last gap
      const lastEventEnd = sEvents[sEvents.length - 1].startedAt.getTime() + (sEvents[sEvents.length - 1].durationSec || 0) * 1000;
      const lastGap = (sEnd - lastEventEnd) / 60000;
      if (lastGap > 0) allGaps.push(lastGap);
    }
  });

  const avgUninterruptedMin = allGaps.length > 0
    ? allGaps.reduce((sum, g) => sum + g, 0) / allGaps.length
    : 0;

  const fqs = computeFqs({
    activeMinutes,
    totalSessions,
    completedSessions,
    unplannedCount,
    totalUnplannedDurationSec,
    tabSwitchCount,
    interruptionRate,
    sessionCompletion,
    uninterruptedRatio,
    contextSwitchRate,
  });

  return {
    activeMinutes,
    totalSessions,
    completedSessions,
    unplannedCount,
    sessionCompletion: Math.round(sessionCompletion * 1000) / 1000,
    interruptionRate: Math.round(interruptionRate * 10) / 10,
    avgUninterruptedMin: Math.round(avgUninterruptedMin * 10) / 10,
    recoveryTimeSec: Math.round(recoveryTimeSec * 10) / 10,
    uninterruptedRatio: Math.round(uninterruptedRatio * 1000) / 1000,
    contextSwitchRate: Math.round(contextSwitchRate * 10) / 10,
    fqs,
  };
};

/**
 * GET /api/analytics/summary
 */
const getSummary = async (userId, range = '7d') => {
  const rangeDays = parseRangeDays(range);
  const now = new Date();
  const currentStart = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 2 * rangeDays * 24 * 60 * 60 * 1000);
  const previousEnd = currentStart;

  const [current, previous] = await Promise.all([
    computeMetricsForPeriod(userId, currentStart, now),
    computeMetricsForPeriod(userId, previousStart, previousEnd),
  ]);

  const delta = {
    activeMinutes: current.activeMinutes - previous.activeMinutes,
    interruptionRate: Math.round((current.interruptionRate - previous.interruptionRate) * 10) / 10,
    avgUninterruptedMin: Math.round((current.avgUninterruptedMin - previous.avgUninterruptedMin) * 10) / 10,
    sessionCompletion: Math.round((current.sessionCompletion - previous.sessionCompletion) * 1000) / 1000,
    fqs: Math.round((current.fqs - previous.fqs) * 10) / 10,
  };

  return {
    range,
    current,
    previous,
    delta,
  };
};

/**
 * GET /api/analytics/reasons
 */
const getReasons = async (userId, range = '7d') => {
  const rangeDays = parseRangeDays(range);
  const now = new Date();
  const startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  const sessions = await StudySession.find({
    userId,
    startedAt: { $gte: startDate, $lte: now },
  });
  const sessionIds = sessions.map((s) => s._id);

  const events = sessionIds.length > 0
    ? await FocusEvent.find({ sessionId: { $in: sessionIds } })
    : [];
  const eventIds = events.map((e) => e._id);

  const reasons = eventIds.length > 0
    ? await BreakReason.find({ eventId: { $in: eventIds } })
    : [];

  const totalReasons = reasons.length;
  const countByCategory = {};

  reasons.forEach((r) => {
    countByCategory[r.category] = (countByCategory[r.category] || 0) + 1;
  });

  const categoryBreakdown = Object.entries(countByCategory)
    .map(([category, count]) => ({
      category,
      count,
      percentage: totalReasons > 0 ? Math.round((count / totalReasons) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    range,
    totalReasons,
    reasons: categoryBreakdown,
  };
};

/**
 * GET /api/analytics/heatmap
 * Weekday (0-6) x Hour (0-23) focus minutes and interruptions in user's timezone
 */
const getHeatmap = async (userId, range = '7d') => {
  const rangeDays = parseRangeDays(range);
  const now = new Date();
  const startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  const user = await User.findById(userId);
  const timezone = user && user.timezone ? user.timezone : 'UTC';

  const sessions = await StudySession.find({
    userId,
    startedAt: { $gte: startDate, $lte: now },
  });
  const sessionIds = sessions.map((s) => s._id);

  const events = sessionIds.length > 0
    ? await FocusEvent.find({ sessionId: { $in: sessionIds }, planned: false })
    : [];

  // Initialize 7x24 grid
  const grid = {};
  for (let w = 0; w < 7; w++) {
    for (let h = 0; h < 24; h++) {
      grid[`${w}_${h}`] = { weekday: w, hour: h, focusMinutes: 0, interruptions: 0 };
    }
  }

  // Helper to extract weekday and hour in user timezone
  const getTimeParts = (date) => {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        weekday: 'narrow',
        hour: 'numeric',
        hourCycle: 'h23',
      });
      // Fallback simple offset using date-fns or native Date
      const d = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
      return { weekday: d.getDay(), hour: d.getHours() };
    } catch (e) {
      return { weekday: date.getUTCDay(), hour: date.getUTCHours() };
    }
  };

  sessions.forEach((s) => {
    const { weekday, hour } = getTimeParts(s.startedAt);
    const key = `${weekday}_${hour}`;
    if (grid[key]) {
      grid[key].focusMinutes += s.actualMinutes || 0;
    }
  });

  events.forEach((e) => {
    const { weekday, hour } = getTimeParts(e.startedAt);
    const key = `${weekday}_${hour}`;
    if (grid[key]) {
      grid[key].interruptions += 1;
    }
  });

  return {
    range,
    timezone,
    heatmap: Object.values(grid),
  };
};

/**
 * GET /api/analytics/subjects
 */
const getSubjects = async (userId, range = '7d') => {
  const rangeDays = parseRangeDays(range);
  const now = new Date();
  const startDate = new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000);

  const sessions = await StudySession.find({
    userId,
    startedAt: { $gte: startDate, $lte: now },
  });

  const sessionsBySubject = {};
  sessions.forEach((s) => {
    const subj = s.subject || 'General';
    if (!sessionsBySubject[subj]) sessionsBySubject[subj] = [];
    sessionsBySubject[subj].push(s);
  });

  const subjectsData = await Promise.all(
    Object.entries(sessionsBySubject).map(async ([subject, subjSessions]) => {
      const minutes = subjSessions.reduce((acc, s) => acc + (s.actualMinutes || 0), 0);
      const totalCount = subjSessions.length;
      const completedCount = subjSessions.filter((s) => s.completed).length;
      const completion = totalCount > 0 ? Math.round((completedCount / totalCount) * 1000) / 1000 : 0;

      const subjSessionIds = subjSessions.map((s) => s._id);
      const subjEvents = await FocusEvent.find({ sessionId: { $in: subjSessionIds } });
      const unplanned = subjEvents.filter((e) => !e.planned);
      const unplannedCount = unplanned.length;
      const interruptionRate = minutes > 0 ? Math.round(((unplannedCount / minutes) * 60) * 10) / 10 : 0;
      const tabSwitchCount = unplanned.filter((e) => e.type === 'tab_switch').length;
      const totalUnplannedDurationSec = unplanned.reduce((acc, e) => acc + (e.durationSec || 0), 0);

      const fqs = computeFqs({
        activeMinutes: minutes,
        totalSessions: totalCount,
        completedSessions: completedCount,
        unplannedCount,
        totalUnplannedDurationSec,
        tabSwitchCount,
      });

      return {
        subject,
        minutes,
        sessionsCount: totalCount,
        interruptionRate,
        completion,
        fqs,
      };
    })
  );

  return {
    range,
    subjects: subjectsData.sort((a, b) => b.minutes - a.minutes),
  };
};

module.exports = {
  computeMetricsForPeriod,
  getSummary,
  getReasons,
  getHeatmap,
  getSubjects,
  parseRangeDays,
};

