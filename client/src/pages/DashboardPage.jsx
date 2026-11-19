import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Clock,
  Sparkles,
  Zap,
  Activity,
  Flame,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import analyticsApi from '../api/analytics.api';
import interventionApi from '../api/intervention.api';
import FqsGauge from '../components/charts/FqsGauge';
import BreakReasonsChart from '../components/charts/BreakReasonsChart';
import FocusHeatmap from '../components/charts/FocusHeatmap';
import SubjectBarChart from '../components/charts/SubjectBarChart';
import CoachCardList from '../components/analytics/CoachCardList';
import InterventionsReport from '../components/analytics/InterventionsReport';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export const DashboardPage = () => {
  const [range, setRange] = useState('7d'); // '7d' | '30d'
  const queryClient = useQueryClient();

  // 1. Summary & FQS
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['analytics', 'summary', range],
    queryFn: () => analyticsApi.getSummary(range),
  });

  // 2. Break reasons
  const { data: reasonsData, isLoading: isReasonsLoading } = useQuery({
    queryKey: ['analytics', 'reasons', range],
    queryFn: () => analyticsApi.getReasons(range),
  });

  // 3. Heatmap
  const { data: heatmapData, isLoading: isHeatmapLoading } = useQuery({
    queryKey: ['analytics', 'heatmap', range],
    queryFn: () => analyticsApi.getHeatmap(range),
  });

  // 4. Subjects
  const { data: subjectsData, isLoading: isSubjectsLoading } = useQuery({
    queryKey: ['analytics', 'subjects', range],
    queryFn: () => analyticsApi.getSubjects(range),
  });

  // 5. Coach recommendations
  const { data: coachData, isLoading: isCoachLoading } = useQuery({
    queryKey: ['analytics', 'coach', range],
    queryFn: () => analyticsApi.getCoach(range),
  });

  // 6. Interventions report
  const { data: reportData, refetch: refetchReport } = useQuery({
    queryKey: ['interventions', 'report'],
    queryFn: () => interventionApi.getReport(),
  });

  const isLoading =
    isSummaryLoading || isReasonsLoading || isHeatmapLoading || isSubjectsLoading;

  if (isLoading) {
    return <LoadingSpinner label="Crunching productivity analytics..." fullScreen />;
  }

  const current = summaryData?.data?.current || {};
  const delta = summaryData?.data?.delta || {};
  const reasons = reasonsData?.data?.reasons || [];
  const totalReasons = reasonsData?.data?.totalReasons || 0;
  const heatmap = heatmapData?.data?.heatmap || [];
  const timezone = heatmapData?.data?.timezone || 'UTC';
  const subjects = subjectsData?.data?.subjects || [];
  const recommendations =
    coachData?.data?.suggestions || coachData?.data?.recommendations || [];
  const report = reportData?.data?.report || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>Productivity & Coach Analytics</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Deterministic Math Engine
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Explainable metrics, Focus Quality Score, and evidence-based study coaching.
          </p>
        </div>

        {/* 7d vs 30d Toggle */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setRange('7d')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              range === '7d'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Past 7 Days
          </button>
          <button
            type="button"
            onClick={() => setRange('30d')}
            className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
              range === '30d'
                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
            }`}
          >
            Past 30 Days
          </button>
        </div>
      </div>

      {/* Row 1: FQS Gauge & 4 Key Stat Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* FQS Gauge */}
        <div className="lg:col-span-1">
          <FqsGauge score={current.fqs} delta={delta.fqs} range={range} />
        </div>

        {/* 4 Stat Cards */}
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-2 gap-4">
          {/* Card 1: Interruption Rate */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Interruption Rate
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white block">
                {current.interruptionRate || 0}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                interruptions per hour
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              Delta: {delta.interruptionRate > 0 ? `+${delta.interruptionRate}` : delta.interruptionRate} /hr
            </div>
          </div>

          {/* Card 2: Average Uninterrupted Gap */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Average Focus Block
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white block">
                {current.avgUninterruptedMin || 0}m
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                average uninterrupted stamina
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              Delta: {delta.avgUninterruptedMin > 0 ? `+${delta.avgUninterruptedMin}m` : `${delta.avgUninterruptedMin}m`}
            </div>
          </div>

          {/* Card 3: Completion Rate */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Session Completion
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white block">
                {Math.round((current.sessionCompletion || 0) * 100)}%
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                {current.completedSessions || 0} of {current.totalSessions || 0} sessions
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              Total Active: {current.activeMinutes || 0} minutes
            </div>
          </div>

          {/* Card 4: Recovery Time */}
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Avg Recovery Time
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div>
              <span className="text-3xl font-black text-slate-900 dark:text-white block">
                {Math.round(current.recoveryTimeSec || 0)}s
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                duration to return after break
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400">
              Context Switch: {current.contextSwitchRate || 0}/hr
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Break Reasons Chart & Subject Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BreakReasonsChart reasons={reasons} totalReasons={totalReasons} />
        <SubjectBarChart subjects={subjects} />
      </div>

      {/* Row 3: 7x24 Focus Heatmap */}
      <FocusHeatmap heatmap={heatmap} timezone={timezone} />

      {/* Row 4: Coach Rule Engine & Interventions Report */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4">
        {/* Left: Algorithmic Coach Suggestions */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Deterministic Coach Rules
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2 mb-4">
            Evaluates your 14-day study data against 7 mathematical rules. Zero LLM hallucinations.
          </p>

          <CoachCardList
            recommendations={recommendations}
            onInterventionCommitted={() => refetchReport()}
          />
        </div>

        {/* Right: Intervention Before vs After Report */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Empirical Intervention Outcomes
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-2 mb-4">
            Measures your actual performance before vs after adopting a coach tip.
          </p>

          <InterventionsReport report={report} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
