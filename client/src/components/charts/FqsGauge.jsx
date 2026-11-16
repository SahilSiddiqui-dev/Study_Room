import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, HelpCircle } from 'lucide-react';

export const FqsGauge = ({ score = 0, delta = 0, range = '7d' }) => {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));

  // Gauge colors based on FQS range
  const getColor = (val) => {
    if (val >= 85) return '#10b981'; // emerald
    if (val >= 70) return '#6366f1'; // indigo
    if (val >= 50) return '#f59e0b'; // amber
    return '#f43f5e'; // rose
  };

  const getTierLabel = (val) => {
    if (val >= 85) return 'Elite Focus Stamina';
    if (val >= 70) return 'Strong Focus Endurance';
    if (val >= 50) return 'Developing Concentration';
    return 'High Distraction Vulnerability';
  };

  const strokeColor = getColor(normalizedScore);

  // SVG Gauge calculations (semi-circle arc)
  const radius = 70;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half-circle circumference
  const strokeDashoffset = circumference * (1 - normalizedScore / 100);

  const isPositiveDelta = delta > 0;
  const isZeroDelta = delta === 0;

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col items-center justify-between relative overflow-hidden">
      {/* Title */}
      <div className="w-full flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Focus Quality Score (FQS)
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Normalized 0–100 index based on uninterrupted stamina
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {range === '30d' ? 'Past 30 Days' : 'Past 7 Days'}
        </span>
      </div>

      {/* Semi-Circle Gauge SVG */}
      <div className="relative my-4 flex items-center justify-center">
        <svg width="200" height="115" viewBox="0 0 200 115" className="overflow-visible">
          {/* Background Arc */}
          <path
            d="M 20 100 A 70 70 0 0 1 180 100"
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="text-slate-100 dark:text-slate-800"
          />
          {/* Foreground Progress Arc */}
          <path
            d="M 20 100 A 70 70 0 0 1 180 100"
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Numbers */}
        <div className="absolute top-10 flex flex-col items-center">
          <span className="text-4xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            {normalizedScore}
          </span>
          <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 -mt-1">
            out of 100
          </span>
        </div>
      </div>

      {/* Tier Label */}
      <div className="text-center mt-2">
        <span
          className="inline-block text-xs font-bold px-3 py-1 rounded-full mb-2"
          style={{
            backgroundColor: `${strokeColor}15`,
            color: strokeColor,
          }}
        >
          {getTierLabel(normalizedScore)}
        </span>

        {/* Delta Badge */}
        <div className="flex items-center justify-center gap-1.5 text-xs">
          {isZeroDelta ? (
            <span className="text-slate-400 font-medium flex items-center gap-1">
              <Minus className="w-3.5 h-3.5" />
              <span>No change vs prior period</span>
            </span>
          ) : isPositiveDelta ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
              <ArrowUpRight className="w-4 h-4" />
              <span>+{delta} pts vs previous {range}</span>
            </span>
          ) : (
            <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-0.5">
              <ArrowDownRight className="w-4 h-4" />
              <span>{delta} pts vs previous {range}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FqsGauge;
