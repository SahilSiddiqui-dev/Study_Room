import React, { useState } from 'react';
import { Sparkles, Check, ArrowRight, Lightbulb, ShieldAlert, Award } from 'lucide-react';
import interventionApi from '../../api/intervention.api';
import toast from 'react-hot-toast';

export const CoachCardList = ({ recommendations = [], onInterventionCommitted }) => {
  const [submittingRuleId, setSubmittingRuleId] = useState(null);
  const [committedRules, setCommittedRules] = useState(new Set());

  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center py-10">
        <Sparkles className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-80" />
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
          Gathering Focus Patterns
        </h4>
        <p className="text-xs text-slate-400 dark:text-slate-500 max-w-sm mx-auto mt-1">
          Complete at least 3 study sessions over the past 14 days to unlock personalized algorithmic coaching suggestions.
        </p>
      </div>
    );
  }

  const handleCommit = async (rec) => {
    setSubmittingRuleId(rec.ruleId);
    try {
      await interventionApi.createIntervention({
        ruleId: rec.ruleId,
        suggestedAction: rec.suggestedAction,
      });
      setCommittedRules((prev) => new Set([...prev, rec.ruleId]));
      toast.success('Intervention baseline recorded! Track your progress below.');
      if (onInterventionCommitted) {
        onInterventionCommitted();
      }
    } catch (err) {
      toast.error('Could not save intervention');
    } finally {
      setSubmittingRuleId(null);
    }
  };

  const getRuleIcon = (ruleId) => {
    if (ruleId.includes('positive') || ruleId.includes('best')) return Award;
    if (ruleId.includes('spike') || ruleId.includes('high')) return ShieldAlert;
    return Lightbulb;
  };

  return (
    <div className="space-y-4">
      {recommendations.map((rec) => {
        const IconComponent = getRuleIcon(rec.ruleId);
        const isCommitted = committedRules.has(rec.ruleId);
        const isSubmitting = submittingRuleId === rec.ruleId;

        return (
          <div
            key={rec.ruleId}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between gap-4 relative overflow-hidden"
          >
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  <IconComponent className="w-4 h-4" />
                </span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Coach Recommendation
                </span>
              </div>

              <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1.5">
                {rec.insight}
              </h4>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 font-mono mb-3">
                {rec.evidence}
              </div>

              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                <strong className="text-indigo-600 dark:text-indigo-400">Suggested Action: </strong>
                {rec.suggestedAction}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => handleCommit(rec)}
                disabled={isCommitted || isSubmitting}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all focus-ring ${
                  isCommitted
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20'
                }`}
              >
                {isCommitted ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Committed to trial</span>
                  </>
                ) : isSubmitting ? (
                  <span>Recording baseline...</span>
                ) : (
                  <>
                    <span>I'll try this</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CoachCardList;
