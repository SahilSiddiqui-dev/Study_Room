import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  ArrowRight,
  LayoutDashboard,
  RotateCcw,
  AlertTriangle,
  Coffee,
  Sparkles,
} from 'lucide-react';
import sessionApi from '../api/session.api';
import { formatDate, formatDateTime, formatSeconds } from '../utils/formatTime';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export const SessionSummaryPage = () => {
  const { id: sessionId } = useParams();

  const { data: eventsData, isLoading: isEventsLoading } = useQuery({
    queryKey: ['sessionEvents', sessionId],
    queryFn: () => sessionApi.getSessionEvents(sessionId),
  });

  const { data: sessionsData, isLoading: isSessionLoading } = useQuery({
    queryKey: ['sessionsHistory', { limit: 50 }],
    queryFn: () => sessionApi.getSessions({ limit: 50 }),
  });

  const session = sessionsData?.data?.sessions?.find((s) => s._id === sessionId);
  const events = eventsData?.data?.events || [];

  if (isEventsLoading || isSessionLoading) {
    return <LoadingSpinner label="Compiling session summary..." fullScreen />;
  }

  const planned = session?.plannedMinutes || 25;
  const actual = session?.actualMinutes || 0;
  const completed = session?.completed || actual >= 0.9 * planned;

  const typeLabels = {
    tab_switch: 'Tab Switch',
    idle: 'Idle Timeout',
    manual_break: 'Manual Break',
    planned_break: 'Scheduled Break',
    left_room: 'Left Room',
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header Banner */}
      <div className="text-center mb-8">
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4 ${
            completed
              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
          }`}
        >
          {completed ? (
            <CheckCircle2 className="w-9 h-9" />
          ) : (
            <Clock className="w-9 h-9" />
          )}
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
          Session Concluded
        </h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {completed
            ? 'Goal achieved! You maintained focus through your target duration.'
            : 'Session completed early. Every block of focused effort counts!'}
        </p>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Subject & Goal
          </span>
          <span className="text-base font-bold text-slate-900 dark:text-white block truncate">
            {session?.subject || 'Study Block'}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 block truncate mt-0.5">
            {session?.goal || 'General Focus'}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Duration
          </span>
          <div className="flex items-baseline justify-center gap-1.5">
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {actual}m
            </span>
            <span className="text-xs text-slate-400">
              / {planned}m planned
            </span>
          </div>
          <span className="text-xs text-slate-500 block mt-0.5">
            {Math.round((actual / planned) * 100)}% target reached
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm text-center">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-1">
            Interruptions
          </span>
          <span className="text-2xl font-black text-slate-900 dark:text-white block">
            {events.filter((e) => !e.planned).length}
          </span>
          <span className="text-xs text-slate-500 block mt-0.5">
            {events.length} total logged events
          </span>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-500" />
          <span>Session Event Timeline</span>
        </h3>

        {events.length === 0 ? (
          <div className="text-center py-8 text-slate-400 dark:text-slate-500 text-sm">
            <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-400 opacity-60" />
            <span>Zero interruptions recorded! Flawless focus session.</span>
          </div>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {events.map((event, idx) => {
              const isUnplanned = !event.planned;
              return (
                <div key={event._id || idx} className="relative group">
                  <div
                    className={`absolute -left-[27px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      isUnplanned ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                  />
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {typeLabels[event.type] || event.type}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                            isUnplanned
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}
                        >
                          {isUnplanned ? 'Unplanned' : 'Planned'}
                        </span>
                      </div>
                      {event.durationSec > 0 && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                          Duration: {event.durationSec}s
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0">
                      {new Date(event.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Link
          to="/sessions"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors"
        >
          <span>View Session History</span>
        </Link>

        <Link
          to="/dashboard"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all"
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>Open Analytics Dashboard</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};

export default SessionSummaryPage;
