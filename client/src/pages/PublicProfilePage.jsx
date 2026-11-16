import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { User, Calendar, BookOpen, ArrowLeft, AlertCircle } from 'lucide-react';
import userApi from '../api/user.api';
import Avatar from '../components/ui/Avatar';
import { formatDate } from '../utils/formatTime';
import LoadingSpinner from '../components/ui/LoadingSpinner';

export const PublicProfilePage = () => {
  const { username } = useParams();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['publicProfile', username],
    queryFn: () => userApi.getUserProfile(username),
    retry: 1,
  });

  if (isLoading) {
    return <LoadingSpinner label={`Loading ${username}'s profile...`} fullScreen />;
  }

  const profile = data?.data?.profile;

  if (isError || !profile) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-lg">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          Scholar not found
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          The user <strong className="text-slate-700 dark:text-slate-300">@{username}</strong> does not exist on StudyRoom.
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
    <div className="max-w-md mx-auto my-16 px-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-8 shadow-sm text-center">
        <div className="relative inline-block mb-4">
          <Avatar avatar={profile.avatar} username={profile.username} size="2xl" />
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
          {profile.username}
        </h1>

        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center justify-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          <span>Joined StudyRoom on {formatDate(profile.createdAt)}</span>
        </p>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
          <Link
            to="/rooms"
            className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Find Study Rooms</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PublicProfilePage;
