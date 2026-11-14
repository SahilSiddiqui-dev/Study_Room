import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';
import { Sparkles, PieChart as PieIcon } from 'lucide-react';
import { REASON_METADATA } from '../../constants/serverEnums';

const COLORS = [
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#64748b', // slate
];

export const BreakReasonsChart = ({ reasons = [], totalReasons = 0 }) => {
  if (!reasons || reasons.length === 0 || totalReasons === 0) {
    return (
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center min-h-[320px]">
        <PieIcon className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          No Break Reasons Recorded
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mt-1">
          When study interruptions occur, use the one-tap prompt to log your triggers.
        </p>
      </div>
    );
  }

  const chartData = reasons.map((r, i) => {
    const meta = REASON_METADATA[r.category] || {};
    return {
      name: meta.shortLabel || r.category,
      category: r.category,
      count: r.count,
      percentage: r.percentage,
      color: COLORS[i % COLORS.length],
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white px-3 py-2 rounded-xl text-xs shadow-xl border border-slate-700">
          <p className="font-bold">{data.name}</p>
          <p className="text-indigo-300">
            {data.count} interruptions ({data.percentage}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
          Break Reason Breakdown
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {totalReasons} logged breaks
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
              dataKey="count"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend list */}
      <div className="grid grid-cols-2 gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
        {chartData.map((item) => (
          <div key={item.category} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-600 dark:text-slate-300 font-medium truncate">
              {item.name}
            </span>
            <span className="text-slate-400 ml-auto">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BreakReasonsChart;
