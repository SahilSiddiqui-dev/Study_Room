import React from 'react';
import { Award, CheckCircle2, AlertCircle, Clock, TrendingUp } from 'lucide-react';
import { formatDate } from '../../utils/formatTime';

export const InterventionsReport = ({ report = [] }) => {
  if (!report || report.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center py-8">
        <Clock className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          No Interventions Recorded
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1">
          When you click "I'll try this" on a coach tip, the system captures your 7-day baseline to evaluate if the tip improved your habits.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {report.map((item) => {
        const isEvaluated = item.status === 'evaluated';
        const improved = item.improved;

        return (
          <div
            key={item._id}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {formatDate(item.shownAt)} • Rule: {item.ruleId}
                </span>
                <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 line-clamp-1 mt-0.5">
                  {item.suggestedAction}
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                  !isEvaluated
                    ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                    : improved
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {!isEvaluated ? (
                  <>
                    <Clock className="w-3.5 h-3.5" />
                    <span>Insufficient Data ({item.sessionsCount || 0}/3 sessions)</span>
                  </>
                ) : improved ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Habit Improved</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>In Progress</span>
                  </>
                )}
              </span>
            </div>

            {/* Before vs After Grid if Evaluated */}
            {isEvaluated && item.after && item.delta ? (
              <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Avg Uninterrupted</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {item.after.avgUninterruptedMin}m
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    (was {item.baseline?.avgUninterruptedMin}m)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Completion Rate</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {Math.round(item.after.completionRate * 100)}%
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    (was {Math.round((item.baseline?.completionRate || 0) * 100)}%)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 block">Interruption Rate</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {item.after.interruptionRate}/hr
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    (was {item.baseline?.interruptionRate}/hr)
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">
                At least 3 completed study sessions required to calculate before-vs-after impact.
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default InterventionsReport;
