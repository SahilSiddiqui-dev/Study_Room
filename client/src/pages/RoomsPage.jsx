import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Search,
  Users,
  Clock,
  Lock,
  Globe,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FilterX,
  Sparkles,
} from 'lucide-react';
import roomApi from '../api/room.api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/ui/Avatar';
import CreateRoomModal from '../components/modals/CreateRoomModal';
import JoinCodeModal from '../components/modals/JoinCodeModal';
import toast from 'react-hot-toast';

export const RoomsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPrivateRoom, setSelectedPrivateRoom] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['rooms', { page, subject: subjectFilter }],
    queryFn: () => roomApi.getRooms({ page, limit: 12, subject: subjectFilter }),
    keepPreviousData: true,
  });

  const closeRoomMutation = useMutation({
    mutationFn: (roomId) => roomApi.deleteRoom(roomId),
    onSuccess: () => {
      toast.success('Room closed successfully');
      queryClient.invalidateQueries({ queryKey: ['rooms'] });
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to close room');
    },
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    setSubjectFilter(searchInput.trim());
  };

  const handleClearFilter = () => {
    setSearchInput('');
    setSubjectFilter('');
    setPage(1);
  };

  const handleJoinClick = async (room) => {
    const isHost =
      room.hostId?._id === user?._id || room.hostId === user?._id;
    const isParticipant =
      Array.isArray(room.participants) &&
      room.participants.some((p) => (p._id || p) === user?._id);

    // If private and not already joined or host, prompt for join code
    if (room.isPrivate && !isHost && !isParticipant) {
      setSelectedPrivateRoom(room);
      return;
    }

    try {
      await roomApi.joinRoom(room._id);
      navigate(`/rooms/${room._id}`);
    } catch (err) {
      if (room.isPrivate) {
        setSelectedPrivateRoom(room);
      } else {
        toast.error(err.response?.data?.message || 'Could not join room');
      }
    }
  };

  const handleCloseRoom = (e, roomId, roomName) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to close "${roomName}"?`)) {
      closeRoomMutation.mutate(roomId);
    }
  };

  const rooms = data?.data?.rooms || [];
  const total = data?.data?.total || 0;
  const totalPages = data?.data?.totalPages || 1;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span>Collaborative Study Rooms</span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Live Pomodoro
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Join a room to study synchronously without audio or video distractions.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 focus-ring shrink-0"
        >
          <Plus className="w-5 h-5" />
          <span>Create Room</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="mb-8 flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <input
            type="text"
            placeholder="Search rooms by subject (e.g. Mathematics, Programming)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus-ring shadow-sm"
          />
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <button
            type="submit"
            className="absolute right-2 top-1.5 px-3 py-1 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 transition-colors"
          >
            Filter
          </button>
        </form>

        {subjectFilter && (
          <button
            onClick={handleClearFilter}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 shrink-0"
          >
            <FilterX className="w-4 h-4" />
            <span>Clear Filter ({subjectFilter})</span>
          </button>
        )}
      </div>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-4 shadow-sm"
            >
              <div className="flex justify-between items-center">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3" />
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded-full w-16" />
              </div>
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-full w-24" />
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-20" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <div className="p-8 text-center rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300">
          <p className="font-semibold">Failed to load study rooms</p>
          <p className="text-xs mt-1 text-rose-600 dark:text-rose-400">
            {error?.message || 'Please verify the backend server is running.'}
          </p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && rooms.length === 0 && (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
            No study rooms found
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            {subjectFilter
              ? `No open rooms matching "${subjectFilter}". Try clearing your search.`
              : 'There are currently no open study rooms. Be the first to start one!'}
          </p>
          {subjectFilter ? (
            <button
              onClick={handleClearFilter}
              className="px-4 py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              Show all rooms
            </button>
          ) : (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus-ring"
            >
              <Plus className="w-4 h-4" />
              <span>Create a Room</span>
            </button>
          )}
        </div>
      )}

      {/* Room Grid */}
      {!isLoading && !isError && rooms.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((room) => {
            const host = room.hostId || {};
            const isHost =
              host._id === user?._id || room.hostId === user?._id;
            const participantCount = Array.isArray(room.participants)
              ? room.participants.length
              : 1;

            return (
              <div
                key={room._id}
                onClick={() => handleJoinClick(room)}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-700 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 uppercase tracking-wider">
                      {room.subject}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {room.isPrivate ? (
                        <span
                          className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40"
                          title="Requires Join Code"
                        >
                          <Lock className="w-3 h-3" />
                          <span>Private</span>
                        </span>
                      ) : (
                        <span
                          className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/40"
                          title="Publicly Accessible"
                        >
                          <Globe className="w-3 h-3" />
                          <span>Public</span>
                        </span>
                      )}

                      {/* Host Actions */}
                      {isHost && (
                        <button
                          type="button"
                          onClick={(e) => handleCloseRoom(e, room._id, room.name)}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="Close Room (Host action)"
                          aria-label="Close room"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Room Title */}
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors mb-2 line-clamp-1">
                    {room.name}
                  </h3>

                  {/* Join Code for Host */}
                  {isHost && room.isPrivate && room.joinCode && (
                    <div className="mb-3 px-2.5 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between">
                      <span className="font-semibold">Join Code:</span>
                      <code className="font-mono font-bold tracking-widest">{room.joinCode}</code>
                    </div>
                  )}

                  {/* Pomodoro Spec */}
                  <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 mb-4">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-500" />
                      <span>
                        {room.pomodoro?.focusMin || 25}m focus / {room.pomodoro?.breakMin || 5}m break
                      </span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      <span>{participantCount} joined</span>
                    </span>
                  </div>
                </div>

                {/* Footer with Host Info */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar avatar={host.avatar} username={host.username} size="sm" />
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block leading-tight">
                        Host
                      </span>
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                        {host.username || 'Host'}
                        {isHost && ' (You)'}
                      </span>
                    </div>
                  </div>

                  <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 group-hover:bg-indigo-600 text-indigo-600 group-hover:text-white dark:bg-indigo-950 dark:group-hover:bg-indigo-600 dark:text-indigo-300 dark:group-hover:text-white transition-colors">
                    Enter &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="mt-8 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing page <span className="font-semibold">{page}</span> of{' '}
            <span className="font-semibold">{totalPages}</span> ({total} rooms)
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateRoomModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreated={(newRoom) => {
          queryClient.invalidateQueries({ queryKey: ['rooms'] });
          navigate(`/rooms/${newRoom._id}`);
        }}
      />

      <JoinCodeModal
        isOpen={Boolean(selectedPrivateRoom)}
        room={selectedPrivateRoom}
        onClose={() => setSelectedPrivateRoom(null)}
        onJoined={(joinedRoom) => {
          navigate(`/rooms/${joinedRoom._id}`);
        }}
      />
    </div>
  );
};

export default RoomsPage;
