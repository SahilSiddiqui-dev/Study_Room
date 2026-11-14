import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Lock, Globe, Clock, Copy, Check, AlertCircle } from 'lucide-react';
import roomApi from '../api/room.api';
import sessionApi from '../api/session.api';
import { useAuth } from '../context/AuthContext';
import { useRoomPresence } from '../hooks/useRoomPresence';
import { useServerTimer } from '../hooks/useServerTimer';
import { useFocusTracking } from '../hooks/useFocusTracking';
import PomodoroDisplay from '../components/room/PomodoroDisplay';
import PresenceList from '../components/room/PresenceList';
import SessionController from '../components/room/SessionController';
import BreakReasonModal from '../components/modals/BreakReasonModal';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

export const RoomPage = () => {
  const { id: roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [copiedCode, setCopiedCode] = useState(false);
  const [interruptionModal, setInterruptionModal] = useState(null); // { eventId, type, durationSec }

  // 1. Fetch Room Data
  const {
    data: roomData,
    isLoading: isRoomLoading,
    isError: isRoomError,
    error: roomError,
  } = useQuery({
    queryKey: ['room', roomId],
    queryFn: () => roomApi.getRoomById(roomId),
    retry: 1,
  });

  const room = roomData?.data?.room;

  // 2. Fetch Active Session
  const { data: activeSessionData, refetch: refetchActiveSession } = useQuery({
    queryKey: ['activeSession'],
    queryFn: () => sessionApi.getActiveSession(),
  });

  const activeSession = activeSessionData?.data?.session || null;

  // 3. Socket Room Presence
  const { participants } = useRoomPresence(roomId);

  // 4. Synchronized Authoritative Server Timer
  const { phase, remainingSec, isRunning, startTimer } = useServerTimer(
    roomId,
    room?.pomodoro || { focusMin: 25, breakMin: 5 }
  );

  // 5. Automatic Focus Detection Hook (tab switch & 60s idle tracking)
  const { takeBreak } = useFocusTracking({
    isSessionActive: Boolean(activeSession),
    timerPhase: phase,
    onInterruption: (interruptionData) => {
      setInterruptionModal(interruptionData);
    },
  });

  const isHost =
    room && (room.hostId?._id === user?._id || room.hostId === user?._id);

  const handleCopyCode = () => {
    if (room?.joinCode) {
      navigator.clipboard.writeText(room.joinCode);
      setCopiedCode(true);
      toast.success('Join code copied to clipboard!');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await roomApi.leaveRoom(roomId);
    } catch (e) {
      // Ignored on exit
    }
    navigate('/rooms');
  };

  if (isRoomLoading) {
    return <LoadingSpinner label="Entering study room..." fullScreen />;
  }

  if (isRoomError || !room) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Unable to enter room
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {roomError?.response?.data?.message || 'This room does not exist or you do not have permission to join.'}
        </p>
        <Link
          to="/rooms"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Rooms</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeaveRoom}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 transition-colors focus-ring"
            title="Leave room"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 uppercase tracking-wider">
                {room.subject}
              </span>
              {room.isPrivate && (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                  <Lock className="w-3 h-3" />
                  <span>Private</span>
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">
              {room.name}
            </h1>
          </div>
        </div>

        {/* Room Meta Badges */}
        <div className="flex items-center gap-2">
          {isHost && room.isPrivate && room.joinCode && (
            <button
              onClick={handleCopyCode}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-xs font-mono font-bold hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
              title="Click to copy join code"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Code: {room.joinCode}</span>
            </button>
          )}

          <button
            onClick={handleLeaveRoom}
            className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-rose-600 dark:text-slate-300 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Leave Room
          </button>
        </div>
      </div>

      {/* Main Grid: Timer & Controls on Left, Presence & Session on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Authoritative Pomodoro */}
        <div className="lg:col-span-2 space-y-6">
          <PomodoroDisplay
            phase={phase}
            remainingSec={remainingSec}
            isRunning={isRunning}
            isHost={isHost}
            onStartTimer={startTimer}
            pomodoroConfig={room.pomodoro}
          />
        </div>

        {/* Right Column: Presence Roster & Session Controller */}
        <div className="space-y-6">
          {/* Active Session Controller */}
          <SessionController
            activeSession={activeSession}
            roomId={roomId}
            subject={room.subject}
            onSessionStarted={() => refetchActiveSession()}
            onSessionEnded={(endedSession) => {
              refetchActiveSession();
              navigate(`/sessions/${endedSession._id}/summary`);
            }}
            onTakeBreak={takeBreak}
            timerPhase={phase}
          />

          {/* Connected Presence */}
          <PresenceList
            participants={participants}
            hostId={room.hostId}
            currentUserId={user?._id}
          />
        </div>
      </div>

      {/* One-Tap Break Reason Modal */}
      <BreakReasonModal
        isOpen={Boolean(interruptionModal)}
        interruption={interruptionModal}
        onClose={() => setInterruptionModal(null)}
        onSubmitted={() => {
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }}
      />
    </div>
  );
};

export default RoomPage;
