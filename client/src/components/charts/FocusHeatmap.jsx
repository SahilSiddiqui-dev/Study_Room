import React, { useState } from 'react';
import { Calendar, Clock, Globe } from 'lucide-react';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const FocusHeatmap = ({ heatmap = [], timezone = 'UTC' }) => {
  const [hoveredCell, setHoveredCell] = useState(null); // { weekday, hour, focusMinutes, interruptions }

  // Build lookup map: 'weekday_hour' -> { focusMinutes, interruptions }
  const cellMap = {};
  let maxMinutes = 1;

  if (Array.isArray(heatmap)) {
    heatmap.forEach((item) => {
      const key = `${item.weekday}_${item.hour}`;
      cellMap[key] = item;
      if (item.focusMinutes > maxMinutes) {
        maxMinutes = item.focusMinutes;
      }
    });
  }

  // Get color intensity based on focusMinutes
  const getIntensityClass = (mins) => {
    if (!mins || mins === 0) {
      return 'bg-slate-100 dark:bg-slate-800/60 hover:ring-2 hover:ring-indigo-400';
    }
    const ratio = mins / maxMinutes;
    if (ratio < 0.25) {
      return 'bg-indigo-200 dark:bg-indigo-950/80 hover:ring-2 hover:ring-indigo-500';
    }
    if (ratio < 0.5) {
      return 'bg-indigo-400 dark:bg-indigo-800 hover:ring-2 hover:ring-indigo-400';
    }
    if (ratio < 0.75) {
      return 'bg-indigo-600 dark:bg-indigo-600 hover:ring-2 hover:ring-indigo-300';
    }
    return 'bg-indigo-800 dark:bg-indigo-500 hover:ring-2 hover:ring-indigo-200';
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Focus Stamina Heatmap (7 × 24h)</span>
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Hourly study density projected into your local timezone
          </p>
        </div>

        <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-mono">
          <Globe className="w-3.5 h-3.5" />
          <span>{timezone}</span>
        </span>
      </div>

      {/* Interactive Tooltip bar */}
      <div className="h-8 mb-4 px-3 py-1 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
        {hoveredCell ? (
          <div className="flex items-center gap-4 text-slate-700 dark:text-slate-200 font-medium">
            <span>
              <strong>{WEEKDAYS[hoveredCell.weekday]}</strong> at{' '}
              {String(hoveredCell.hour).padStart(2, '0')}:00
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              {hoveredCell.focusMinutes} focus min
            </span>
            <span className="text-slate-500">
              {hoveredCell.interruptions} interruptions
            </span>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">
            Hover over any hour cell to inspect focus minutes and interruptions
          </span>
        )}

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400">
          <span>Less</span>
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-100 dark:bg-slate-800" />
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-200 dark:bg-indigo-950" />
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-400 dark:bg-indigo-800" />
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-600 dark:bg-indigo-600" />
          <span className="w-2.5 h-2.5 rounded-sm bg-indigo-800 dark:bg-indigo-500" />
          <span>More</span>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="overflow-x-auto pb-2">
        <div className="min-w-[640px]">
          {/* Hour headers (00 to 23, showing every 3 hours for readability) */}
          <div className="grid grid-cols-[40px_repeat(24,1fr)] gap-1 text-[10px] text-slate-400 font-mono mb-1 text-center">
            <span />
            {[...Array(24)].map((_, h) => (
              <span key={h} className={h % 3 === 0 ? 'font-bold text-slate-600 dark:text-slate-300' : 'opacity-40'}>
                {h % 3 === 0 ? `${h}h` : ''}
              </span>
            ))}
          </div>

          {/* Weekday rows */}
          {WEEKDAYS.map((dayName, w) => (
            <div key={dayName} className="grid grid-cols-[40px_repeat(24,1fr)] gap-1 mb-1 items-center">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                {dayName}
              </span>
              {[...Array(24)].map((_, h) => {
                const cell = cellMap[`${w}_${h}`] || {
                  weekday: w,
                  hour: h,
                  focusMinutes: 0,
                  interruptions: 0,
                };
                return (
                  <button
                    key={h}
                    type="button"
                    onMouseEnter={() => setHoveredCell(cell)}
                    onFocus={() => setHoveredCell(cell)}
                    className={`h-6 rounded-sm transition-all focus:outline-none ${getIntensityClass(
                      cell.focusMinutes
                    )}`}
                    aria-label={`${dayName} ${h}:00 - ${cell.focusMinutes}m`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FocusHeatmap;
