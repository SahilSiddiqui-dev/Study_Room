import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Plus, Lock, Globe, Clock, Sparkles } from 'lucide-react';
import { createRoomSchema } from '../../validators/room.validator';
import roomApi from '../../api/room.api';
import { extractErrorDetails } from '../../utils/errors';
import toast from 'react-hot-toast';

export const CreateRoomModal = ({ isOpen, onClose, onCreated }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createRoomSchema),
    defaultValues: {
      name: '',
      subject: '',
      isPrivate: false,
      pomodoro: {
        focusMin: 25,
        breakMin: 5,
      },
    },
  });

  const isPrivate = watch('isPrivate');

  if (!isOpen) return null;

  const handleClose = () => {
    reset();
    setServerError('');
    onClose();
  };

  const onSubmit = async (data) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      const result = await roomApi.createRoom(data);
      toast.success(`Room "${result.data?.room?.name || data.name}" created!`);
      handleClose();
      if (onCreated && result.data?.room) {
        onCreated(result.data.room);
      }
    } catch (err) {
      const details = extractErrorDetails(err, 'Failed to create room');
      setServerError(details.message);
      toast.error(details.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Create Study Room
            </h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 focus-ring"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {serverError && (
            <div className="p-3 text-sm rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300">
              {serverError}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Room Name
            </label>
            <input
              type="text"
              placeholder="e.g. Deep Work: Algorithms & DS"
              {...register('name')}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 focus-ring ${
                errors.name
                  ? 'border-rose-400 dark:border-rose-600'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.name.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Subject / Topic
            </label>
            <input
              type="text"
              placeholder="e.g. Computer Science, Calculus, Physics"
              {...register('subject')}
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 focus-ring ${
                errors.subject
                  ? 'border-rose-400 dark:border-rose-600'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            />
            {errors.subject && (
              <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">
                {errors.subject.message}
              </p>
            )}
          </div>

          {/* Pomodoro Durations */}
          <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/60">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Focus Duration (min)
              </label>
              <input
                type="number"
                min="5"
                max="120"
                {...register('pomodoro.focusMin')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus-ring"
              />
              {errors.pomodoro?.focusMin && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.pomodoro.focusMin.message}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Break Duration (min)
              </label>
              <input
                type="number"
                min="1"
                max="30"
                {...register('pomodoro.breakMin')}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white bg-white dark:bg-slate-900 focus-ring"
              />
              {errors.pomodoro?.breakMin && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.pomodoro.breakMin.message}
                </p>
              )}
            </div>
          </div>

          {/* Private Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/30">
            <div className="flex items-center gap-3">
              {isPrivate ? (
                <Lock className="w-5 h-5 text-amber-500" />
              ) : (
                <Globe className="w-5 h-5 text-indigo-500" />
              )}
              <div>
                <span className="text-sm font-semibold text-slate-900 dark:text-white block">
                  {isPrivate ? 'Private Room' : 'Public Room'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {isPrivate
                    ? 'Requires a 6-character join code to enter'
                    : 'Visible and open to all students'}
                </span>
              </div>
            </div>
            <input
              type="checkbox"
              id="isPrivate"
              {...register('isPrivate')}
              className="w-5 h-5 text-indigo-600 rounded border-slate-300 dark:border-slate-700 focus:ring-indigo-500 cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 focus-ring disabled:opacity-60 transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <span>Create Room</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateRoomModal;
