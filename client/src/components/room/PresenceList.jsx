import React from 'react';
import { Users, Crown } from 'lucide-react';
import Avatar from '../ui/Avatar';

export const PresenceList = ({ participants = [], hostId, currentUserId }) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-500" />
          <span>Active Students</span>
        </h4>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {participants.length} online
        </span>
      </div>

      {participants.length === 0 ? (
        <p className="text-xs text-slate-400 dark:text-slate-500 py-4 text-center">
          Waiting for participants to connect...
        </p>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {participants.map((p) => {
            const isHost =
              p.userId === hostId || p.userId === hostId?._id;
            const isMe = p.userId === currentUserId;

            return (
              <div
                key={p.userId}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Avatar avatar={p.avatar} username={p.username} size="sm" />
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      {p.username}
                      {isMe && ' (You)'}
                    </span>
                  </div>
                </div>

                {isHost && (
                  <span
                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200/50"
                    title="Room Host"
                  >
                    <Crown className="w-3 h-3" />
                    <span>Host</span>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PresenceList;
