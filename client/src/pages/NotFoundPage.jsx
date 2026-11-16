import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Compass } from 'lucide-react';

export const NotFoundPage = () => {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 rounded-3xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-6">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>
        <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-2">
          404
        </h1>
        <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
          Study room not found
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-8">
          The page or study room you are looking for does not exist or has been moved.
        </p>
        <Link
          to="/rooms"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors focus-ring shadow-md shadow-indigo-600/20"
        >
          <Home className="w-4 h-4" />
          <span>Back to Study Rooms</span>
        </Link>
      </div>
    </div>
  );
};

export default NotFoundPage;
