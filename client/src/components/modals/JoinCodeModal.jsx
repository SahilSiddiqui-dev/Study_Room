import React, { useState } from 'react';
import { X, Lock, KeyRound, ArrowRight } from 'lucide-react';
import roomApi from '../../api/room.api';
import { extractErrorDetails } from '../../utils/errors';
import toast from 'react-hot-toast';

export const JoinCodeModal = ({ isOpen, room, onClose, onJoined }) => {
  const [joinCode, setJoinCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !room) return null;

  const handleClose = () => {
    setJoinCode('');
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      setError('Please enter the 6-character room code');
      return;
    }

    setError('');
    setIsSubmitting(true);
    try {
      const result = await roomApi.joinRoom(room._id, joinCode.trim().toUpperCase());
      toast.success(`Joined ${room.name}!`);
      handleClose();
      if (onJoined) {
        onJoined(result.data?.room || room);
      }
    } catch (err) {
      const details = extractErrorDetails(err, 'Invalid join code');
      setError(details.message);
      toast.error(details.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
          Private Study Room
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Enter the join code shared by the host of{' '}
          <strong className="text-slate-700 dark:text-slate-300">{room.name}</strong>.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
              6-Character Join Code
            </label>
            <div className="relative">
              <input
                type="text"
                maxLength="8"
                autoFocus
                placeholder="e.g. PHYS99"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-mono tracking-widest text-center uppercase font-bold text-lg text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 focus-ring"
              />
              <KeyRound className="absolute right-3.5 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !joinCode.trim()}
              className="flex-1 py-2.5 px-4 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-600/20 focus-ring disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
            >
              {isSubmitting ? (
                <span>Joining...</span>
              ) : (
                <>
                  <span>Join Room</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JoinCodeModal;
