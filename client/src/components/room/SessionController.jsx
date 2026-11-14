import React, { useState } from 'react';
import { Target, Clock, Coffee, StopCircle, Play, CheckCircle2 } from 'lucide-react';
import sessionApi from '../../api/session.api';
import { extractErrorDetails } from '../../utils/errors';
import toast from 'react-hot-toast';

export const SessionController = ({
  activeSession,
  roomId,
  subject,
  onSessionStarted,
  onSessionEnded,
  onTakeBreak,
  timerPhase = 'focus',
}) => {
  const [goal, setGoal] = useState('');
  const [plannedMinutes, setPlannedMinutes] = useState(25);
  const [isStarting, setIsStarting] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const handleStartSession = async (e) => {
    e.preventDefault();
    setIsStarting(true);
    try {
      const result = await sessionApi.startSession({
        roomId,
        subject,
        goal: goal.trim(),
        plannedMinutes: parseInt(plannedMinutes, 10) || 25,
      });
      toast.success('Study session started! Focus mode engaged.');
      setGoal('');
      if (onSessionStarted) {
        onSessionStarted(result.data?.session);
      }
    } catch (err) {
      const details = extractErrorDetails(err, 'Failed to start study session');
      toast.error(details.message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeSession) return;
    if (!window.confirm('Are you ready to conclude this study session?')) return;

    setIsEnding(true);
    try {
      const result = await sessionApi.endSession(activeSession._id);
      toast.success('Session ended! Great job studying.');
      if (onSessionEnded) {
        onSessionEnded(result.data?.session || activeSession);
      }
    } catch (err) {
      const details = extractErrorDetails(err, 'Failed to end session');
      toast.error(details.message);
    } finally {
      setIsEnding(false);
    }
  };

  // If a session is active, render active session panel
  if (activeSession) {
    const startedAt = new Date(activeSession.startedAt);
    const elapsedMinutes = Math.max(
      0,
      Math.round((Date.now() - startedAt.getTime()) / 60000)
    );
    const progress = Math.min(
      100,
      Math.round((elapsedMinutes / (activeSession.plannedMinutes || 25)) * 100)
    );

    return (
      <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-950/80 rounded-3xl p-6 shadow-md shadow-indigo-500/5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              Active Study Session
            </h4>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            {elapsedMinutes} / {activeSession.plannedMinutes} min ({progress}%)
          </span>
        </div>

        {/* Goal */}
        <div className="mb-4 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 block uppercase tracking-wider mb-0.5">
            Target Goal
          </span>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {activeSession.goal || 'Focused study on ' + (activeSession.subject || 'material')}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 mb-6 overflow-hidden">
          <div
            className="bg-indigo-600 dark:bg-indigo-400 h-2 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Session Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onTakeBreak(timerPhase === 'break')}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors focus-ring"
          >
            <Coffee className="w-4 h-4 text-amber-500" />
            <span>Take a Break</span>
          </button>

          <button
            type="button"
            onClick={handleEndSession}
            disabled={isEnding}
            className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-600/20 focus-ring disabled:opacity-60 transition-all"
          >
            <StopCircle className="w-4 h-4" />
            <span>{isEnding ? 'Ending...' : 'End Session'}</span>
          </button>
        </div>
      </div>
    );
  }

  // Not in session: Show start session form
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-4 h-4 text-indigo-500" />
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          Start Personal Study Session
        </h4>
      </div>

      <form onSubmit={handleStartSession} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Session Goal (optional)
          </label>
          <input
            type="text"
            maxLength="200"
            placeholder="e.g. Complete chapter 4 problem set #1-5"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus-ring"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Planned Duration (minutes)
          </label>
          <div className="grid grid-cols-4 gap-2 mb-2">
            {[15, 25, 45, 60].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setPlannedMinutes(mins)}
                className={`py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                  plannedMinutes === mins
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                }`}
              >
                {mins}m
              </button>
            ))}
          </div>
          <input
            type="number"
            min="5"
            max="240"
            value={plannedMinutes}
            onChange={(e) => setPlannedMinutes(Math.max(5, Math.min(240, parseInt(e.target.value, 10) || 5)))}
            className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus-ring"
          />
        </div>

        <button
          type="submit"
          disabled={isStarting}
          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 focus-ring disabled:opacity-60 transition-all flex items-center justify-center gap-2"
        >
          {isStarting ? (
            <span>Starting session...</span>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>Begin Session ({plannedMinutes}m)</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default SessionController;
