import React, { useState } from 'react';
import { Play, RotateCcw, Clock, Sparkles } from 'lucide-react';
import { formatSeconds } from '../../utils/formatTime';

export const PomodoroDisplay = ({
  phase = 'focus',
  remainingSec = 1500,
  isRunning = false,
  isHost = false,
  onStartTimer,
  pomodoroConfig = { focusMin: 25, breakMin: 5 },
}) => {
  const [focusMin, setFocusMin] = useState(pomodoroConfig.focusMin || 25);
  const [breakMin, setBreakMin] = useState(pomodoroConfig.breakMin || 5);
  const [showConfig, setShowConfig] = useState(false);

  const totalCycleSec =
    phase === 'focus' ? (pomodoroConfig.focusMin || 25) * 60 : (pomodoroConfig.breakMin || 5) * 60;
  const progressRatio = Math.max(0, Math.min(1, remainingSec / (totalCycleSec || 1)));

  const handleStartSubmit = (e) => {
    e.preventDefault();
    if (onStartTimer) {
      onStartTimer({
        focusMin: parseInt(focusMin, 10) || 25,
        breakMin: parseInt(breakMin, 10) || 5,
      });
      setShowConfig(false);
    }
  };

  const isBreak = phase === 'break';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background glow based on phase */}
      <div
        className={`absolute -top-24 -left-24 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-colors duration-1000 ${
          isBreak ? 'bg-emerald-500' : 'bg-indigo-500'
        }`}
      />

      {/* Phase Badge */}
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase transition-colors ${
            isBreak
              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
              : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full animate-ping ${
              isBreak ? 'bg-emerald-500' : 'bg-indigo-500'
            }`}
          />
          <span>{isBreak ? 'Break Interval' : 'Focus Interval'}</span>
        </span>
      </div>

      {/* Big Digits Display */}
      <div className="my-2 text-center select-none">
        <span className="font-mono text-6xl sm:text-7xl lg:text-8xl font-black tracking-tight text-slate-900 dark:text-white tabular-nums">
          {formatSeconds(remainingSec)}
        </span>
      </div>

      {/* Status indicator */}
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 mb-6 flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span>
          {isRunning
            ? `Synchronized with server (${isBreak ? 'Break' : 'Focus'} phase)`
            : 'Waiting for room host to start timer'}
        </span>
      </p>

      {/* Host Controls */}
      {isHost && (
        <div className="w-full max-w-sm pt-4 border-t border-slate-100 dark:border-slate-800">
          {!showConfig ? (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => onStartTimer({ focusMin, breakMin })}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 focus-ring transition-all"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>{isRunning ? 'Restart Timer' : 'Start Timer'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowConfig(true)}
                className="px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Configure
              </button>
            </div>
          ) : (
            <form onSubmit={handleStartSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-left">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Focus (min)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="120"
                    value={focusMin}
                    onChange={(e) => setFocusMin(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Break (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={breakMin}
                    onChange={(e) => setBreakMin(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                >
                  Apply & Start
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

export default PomodoroDisplay;
