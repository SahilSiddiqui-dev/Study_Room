import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { BookOpen } from 'lucide-react';

export const SubjectBarChart = ({ subjects = [] }) => {
  if (!subjects || subjects.length === 0) {
    return (
      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-center text-center min-h-[300px]">
        <BookOpen className="w-10 h-10 text-slate-300 dark:text-slate-700 mb-2" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          No Subject Metrics Yet
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-xs mt-1">
          Complete study sessions in your subjects to generate comparative stamina benchmarks.
        </p>
      </div>
    );
  }

  const chartData = subjects.map((s) => ({
    name: s.subject || 'General',
    minutes: s.minutes || 0,
    fqs: s.fqs || 0,
    interruptionRate: s.interruptionRate || 0,
    sessionsCount: s.sessionsCount || 0,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl text-xs shadow-xl border border-slate-700 space-y-1">
          <p className="font-bold text-sm text-indigo-300">{label}</p>
          <p className="text-slate-300">Total Minutes: {payload[0]?.value}m</p>
          {payload[1] && (
            <p className="text-slate-400">
              Interruption Rate: {payload[1]?.value} / hr
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
            Subject Stamina Comparison
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Total active study minutes per subject
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {subjects.length} subjects
        </span>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="minutes" name="Minutes Studied" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SubjectBarChart;
