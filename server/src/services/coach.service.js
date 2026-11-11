const { getSummary, getReasons, getHeatmap, getSubjects } = require('./analytics.service');
const StudySession = require('../models/StudySession');
const FocusEvent = require('../models/FocusEvent');

/**
 * Rule 1: Dominant break reason (>= 40% of reasons)
 */
const ruleDominantBreakReason = (context) => {
  const { reasonsData } = context;
  if (!reasonsData || !reasonsData.reasons || reasonsData.reasons.length === 0) return null;
  if (reasonsData.totalReasons < 3) return null;

  const top = reasonsData.reasons[0];
  if (top.percentage < 40) return null;

  const actionMap = {
    phone: 'Place your phone in another room or turn on Do Not Disturb during focus blocks.',
    notification: 'Disable desktop notifications and close messaging applications while studying.',
    fatigue: 'Take a brisk 5-minute walk or drink water; ensure you are getting adequate sleep.',
    difficult_topic: 'Break complex concepts into smaller sub-questions or seek a peer explanation.',
    doubt: 'Write unresolved questions in a margin notebook to review at the end of the session.',
    planned: 'Keep utilizing planned breaks to maintain stamina throughout the day.',
    other: 'Notice the specific triggers interrupting your sessions and document them.',
  };

  return {
    ruleId: 'dominant_break_reason',
    severity: 1,
    insight: `${top.category.charAt(0).toUpperCase() + top.category.slice(1)} is your primary cause of study breaks.`,
    evidence: `${top.category} accounted for ${top.percentage}% (${top.count} of ${reasonsData.totalReasons}) of your logged break reasons.`,
    suggestedAction: actionMap[top.category] || 'Identify your primary triggers and set environmental boundaries.',
  };
};

/**
 * Rule 2: Best focus window (strongest 2-hour window)
 */
const ruleBestFocusWindow = (context) => {
  const { heatmapData } = context;
  if (!heatmapData || !heatmapData.heatmap || heatmapData.heatmap.length === 0) return null;

  // Aggregate by hour of day (0-23)
  const hourMap = Array(24).fill(0).map((_, h) => ({ hour: h, focusMinutes: 0, interruptions: 0 }));
  heatmapData.heatmap.forEach((item) => {
    hourMap[item.hour].focusMinutes += item.focusMinutes;
    hourMap[item.hour].interruptions += item.interruptions;
  });

  let best2h = null;
  let bestScore = -1;

  for (let h = 0; h < 23; h++) {
    const mins = hourMap[h].focusMinutes + hourMap[h + 1].focusMinutes;
    const interr = hourMap[h].interruptions + hourMap[h + 1].interruptions;
    if (mins >= 30) {
      const score = mins / (1 + interr);
      if (score > bestScore) {
        bestScore = score;
        best2h = {
          start: `${String(h).padStart(2, '0')}:00`,
          end: `${String(h + 2).padStart(2, '0')}:00`,
          minutes: mins,
          interruptions: interr,
        };
      }
    }
  }

  if (!best2h) return null;

  return {
    ruleId: 'best_focus_window',
    severity: 2,
    insight: `Your highest focus concentration occurs between ${best2h.start} and ${best2h.end}.`,
    evidence: `During ${best2h.start}-${best2h.end}, you accumulated ${best2h.minutes} focus minutes with only ${best2h.interruptions} interruptions.`,
    suggestedAction: `Schedule your hardest subject or high-cognitive problem solving between ${best2h.start} and ${best2h.end}.`,
  };
};

/**
 * Rule 3: Session length (<=30m vs >30m completion difference >= 15%)
 */
const ruleSessionLength = (context) => {
  const { rawSessions } = context;
  if (!rawSessions || rawSessions.length < 4) return null;

  const shortSessions = rawSessions.filter((s) => s.plannedMinutes <= 30);
  const longSessions = rawSessions.filter((s) => s.plannedMinutes > 30);

  if (shortSessions.length < 2 || longSessions.length < 2) return null;

  const shortComp = shortSessions.filter((s) => s.completed).length / shortSessions.length;
  const longComp = longSessions.filter((s) => s.completed).length / longSessions.length;
  const diff = Math.abs(shortComp - longComp);

  if (diff < 0.15) return null;

  const shortPct = Math.round(shortComp * 100);
  const longPct = Math.round(longComp * 100);

  if (shortComp > longComp) {
    return {
      ruleId: 'session_length',
      severity: 3,
      insight: 'Shorter 25-minute Pomodoro sessions yield significantly higher completion rates.',
      evidence: `Short sessions (<=30 min) have a ${shortPct}% completion rate compared to ${longPct}% for sessions >30 min.`,
      suggestedAction: 'Adopt 25-minute focus intervals with 5-minute breaks to maintain completion consistency.',
    };
  } else {
    return {
      ruleId: 'session_length',
      severity: 3,
      insight: 'Longer study sessions allow you to enter deeper, more sustained focus.',
      evidence: `Longer sessions (>30 min) achieved a ${longPct}% completion rate compared to ${shortPct}% for shorter sessions.`,
      suggestedAction: 'Schedule 45 to 50-minute deep work blocks when working on comprehensive projects.',
    };
  }
};

/**
 * Rule 4: High interruption rate (> 6 interruptions per hour)
 */
const ruleHighInterruptionRate = (context) => {
  const { summaryData } = context;
  const rate = summaryData?.current?.interruptionRate || 0;
  if (rate <= 6) return null;

  return {
    ruleId: 'high_interruption_rate',
    severity: 1,
    insight: 'Your focus is being fragmented by frequent unplanned interruptions.',
    evidence: `Your interruption rate is ${rate} interruptions per hour, exceeding the healthy benchmark of 6/hour.`,
    suggestedAction: 'Shorten your study intervals to 20 minutes and schedule planned 5-minute restorative breaks.',
  };
};

/**
 * Rule 5: Evening distraction spike
 */
const ruleEveningSpike = (context) => {
  const { heatmapData, summaryData } = context;
  const totalInterr = summaryData?.current?.unplannedCount || 0;
  if (totalInterr < 5 || !heatmapData?.heatmap) return null;

  // Hours 18, 19, 20 (6:00 PM to 9:00 PM)
  let eveningInterr = 0;
  heatmapData.heatmap.forEach((item) => {
    if (item.hour >= 18 && item.hour <= 20) {
      eveningInterr += item.interruptions;
    }
  });

  const eveningPct = Math.round((eveningInterr / totalInterr) * 100);
  if (eveningPct < 40) return null;

  return {
    ruleId: 'evening_spike',
    severity: 2,
    insight: 'Distractions spike significantly during evening study hours.',
    evidence: `${eveningPct}% of your total interruptions (${eveningInterr} of ${totalInterr}) happen between 18:00 and 21:00.`,
    suggestedAction: 'Shift demanding study topics to earlier in the day and reserve evenings for light reading or practice.',
  };
};

/**
 * Rule 6: Subject weakness (interruption rate >= 1.5x overall rate)
 */
const ruleSubjectWeakness = (context) => {
  const { subjectsData, summaryData } = context;
  const overallRate = summaryData?.current?.interruptionRate || 0;
  if (!subjectsData?.subjects || subjectsData.subjects.length < 2 || overallRate <= 0) return null;

  const weakSubject = subjectsData.subjects.find(
    (s) => s.minutes >= 30 && s.interruptionRate >= 1.5 * overallRate
  );

  if (!weakSubject) return null;

  const ratio = (weakSubject.interruptionRate / overallRate).toFixed(1);

  return {
    ruleId: 'subject_weakness',
    severity: 2,
    insight: `${weakSubject.subject} has a significantly higher interruption rate than your other subjects.`,
    evidence: `${weakSubject.subject} has an interruption rate of ${weakSubject.interruptionRate}/hr, which is ${ratio}x your average rate of ${overallRate}/hr.`,
    suggestedAction: `Study ${weakSubject.subject} with shorter 15-minute bursts or join a collaborative study room for mutual accountability.`,
  };
};

/**
 * Rule 7: Positive reinforcement (FQS improved by >= 10 points)
 */
const rulePositiveReinforcement = (context) => {
  const { summaryData } = context;
  const deltaFqs = summaryData?.delta?.fqs || 0;
  const currentFqs = summaryData?.current?.fqs || 0;
  const prevFqs = summaryData?.previous?.fqs || 0;

  if (deltaFqs < 10) return null;

  return {
    ruleId: 'positive_reinforcement',
    severity: 4,
    insight: 'Significant improvement in your Focus Quality Score!',
    evidence: `Your Focus Quality Score jumped +${deltaFqs} points (from ${prevFqs} to ${currentFqs}) compared to the previous period!`,
    suggestedAction: 'Keep up your current study routines and habits; your focus discipline is visibly paying off.',
  };
};

const ALL_RULES = [
  ruleDominantBreakReason,
  ruleBestFocusWindow,
  ruleSessionLength,
  ruleHighInterruptionRate,
  ruleEveningSpike,
  ruleSubjectWeakness,
  rulePositiveReinforcement,
];

/**
 * Evaluate all coach rules and return top recommendations
 */
const evaluateCoachSuggestions = async (userId, range = '7d') => {
  const [summaryData, reasonsData, heatmapData, subjectsData] = await Promise.all([
    getSummary(userId, range),
    getReasons(userId, range),
    getHeatmap(userId, range),
    getSubjects(userId, range),
  ]);

  if (summaryData.current.totalSessions < 3) {
    return {
      status: 'insufficient_data',
      message: 'Not enough data yet. Complete at least 3 study sessions to unlock personalized coaching insights.',
      suggestions: [],
    };
  }

  // Fetch raw sessions for length analysis
  const rangeDays = range === '30d' ? 30 : 7;
  const startDate = new Date(Date.now() - rangeDays * 24 * 60 * 60 * 1000);
  const rawSessions = await StudySession.find({
    userId,
    startedAt: { $gte: startDate },
    endedAt: { $ne: null },
  });

  const context = {
    summaryData,
    reasonsData,
    heatmapData,
    subjectsData,
    rawSessions,
  };

  const results = [];
  for (const ruleFn of ALL_RULES) {
    const suggestion = ruleFn(context);
    if (suggestion) {
      results.push(suggestion);
    }
  }

  // Sort by severity (lowest number = highest priority)
  results.sort((a, b) => a.severity - b.severity);

  // Return at most 4 suggestions
  const topSuggestions = results.slice(0, 4);

  return {
    status: 'active',
    count: topSuggestions.length,
    suggestions: topSuggestions,
  };
};

module.exports = {
  evaluateCoachSuggestions,
  ruleDominantBreakReason,
  ruleBestFocusWindow,
  ruleSessionLength,
  ruleHighInterruptionRate,
  ruleEveningSpike,
  ruleSubjectWeakness,
  rulePositiveReinforcement,
};

