import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  BellRing,
  BatteryLow,
  BrainCircuit,
  HelpCircle,
  Coffee,
  MoreHorizontal,
  X,
  Check,
  Clock,
  Sparkles,
} from 'lucide-react';
import { REASON_CATEGORIES, REASON_METADATA } from '../../constants/serverEnums';
import sessionApi from '../../api/session.api';
import toast from 'react-hot-toast';

const CATEGORY_ICONS = {
  phone: Smartphone,
  notification: BellRing,
  fatigue: BatteryLow,
  difficult_topic: BrainCircuit,
  doubt: HelpCircle,
  planned: Coffee,
  other: MoreHorizontal,
};

const AUTO_DISMISS_SEC = 20;

export const BreakReasonModal = ({
  isOpen,
  interruption, // { eventId, type, durationSec }
  onClose,
  onSubmitted,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [note, setNote] = useState('');
  const [secondsRemaining, setSecondsRemaining] = useState(AUTO_DISMISS_SEC);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-dismiss countdown timer
  useEffect(() => {
    if (!isOpen) {
      setSecondsRemaining(AUTO_DISMISS_SEC);
      setSelectedCategory(null);
      setNote('');
      return;
    }

    setSecondsRemaining(AUTO_DISMISS_SEC);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  if (!isOpen || !interruption) return null;

  const handleSubmit = async (categoryToSubmit = selectedCategory) => {
    if (!categoryToSubmit || !interruption.eventId) {
      onClose();
      return;
    }

    setIsSubmitting(true);
    try {
      await sessionApi.createBreakReason(interruption.eventId, {
        category: categoryToSubmit,
        note: note.slice(0, 200),
      });
      toast.success('Break reason logged!');
      if (onSubmitted) {
        onSubmitted({
          eventId: interruption.eventId,
          category: categoryToSubmit,
          note,
        });
      }
    } catch (err) {
      // Handle 409 Conflict quietly (e.g. if reason was already submitted or race condition)
      if (err.response?.status === 409) {
        console.info('Break reason already attached for event:', interruption.eventId);
      } else {
        toast.error(err.response?.data?.message || 'Failed to submit break reason');
      }
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const handleOneTapSelect = (cat) => {
    setSelectedCategory(cat);
    // Submit immediately on category tap if no note typed, or user can click save
    handleSubmit(cat);
  };

  const typeDisplayNames = {
    tab_switch: 'Tab Switch',
    idle: 'Idle Timeout',
    manual_break: 'Break Taken',
  };

  const progressPercent = (secondsRemaining / AUTO_DISMISS_SEC) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Auto dismiss countdown bar */}
        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5">
          <div
            className="bg-indigo-600 dark:bg-indigo-400 h-1.5 transition-all duration-1000 ease-linear"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header */}
        <div className="p-6 pb-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                {typeDisplayNames[interruption.type] || 'Focus Interruption'}
                {interruption.durationSec > 0 && ` (${interruption.durationSec}s)`}
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Auto-dismiss in {secondsRemaining}s</span>
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Skip break reason"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            What caused this study interruption?
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            One tap logs the reason so your productivity coach can detect your primary distraction patterns.
          </p>
        </div>

        {/* One-Tap Reason Grid */}
        <div className="p-6 pt-3 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {REASON_CATEGORIES.map((cat) => {
              const IconComponent = CATEGORY_ICONS[cat] || Sparkles;
              const meta = REASON_METADATA[cat] || {
                shortLabel: cat,
                description: '',
              };
              const isSelected = selectedCategory === cat;

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleOneTapSelect(cat)}
                  disabled={isSubmitting}
                  className={`p-3 rounded-2xl border text-left transition-all focus-ring flex flex-col justify-between gap-2 ${
                    isSelected
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-950/80 dark:border-indigo-400 dark:text-indigo-300 ring-2 ring-indigo-500'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold block leading-tight">
                      {meta.shortLabel}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-1 mt-0.5">
                      {meta.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Optional Note (max 200 chars)
            </label>
            <input
              type="text"
              maxLength="200"
              placeholder="e.g. Urgent message from project partner"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus-ring"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            >
              Skip
            </button>

            {selectedCategory && (
              <button
                type="button"
                onClick={() => handleSubmit(selectedCategory)}
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus-ring shadow-sm"
              >
                {isSubmitting ? 'Saving...' : 'Submit Reason'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BreakReasonModal;
