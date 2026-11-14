import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowRight, BookOpen, AlertCircle, Sparkles } from 'lucide-react';
import { registerSchema } from '../validators/auth.validator';
import { useAuth } from '../context/AuthContext';
import { extractErrorDetails } from '../utils/errors';
import Avatar from '../components/ui/Avatar';
import toast from 'react-hot-toast';

export const RegisterPage = () => {
  const { register: registerUser, avatars } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const detectedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      avatar: 'owl',
      timezone: detectedTimezone,
    },
  });

  const selectedAvatar = watch('avatar') || 'owl';

  const onSubmit = async (data) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      await registerUser(data);
      toast.success('Account created! Welcome to StudyRoom');
      navigate('/rooms');
    } catch (err) {
      const details = extractErrorDetails(err, 'Failed to create account');
      setServerError(details.message);

      // If backend returned specific field errors, attach to react-hook-form
      if (details.fieldErrors) {
        Object.entries(details.fieldErrors).forEach(([field, msg]) => {
          setError(field, { type: 'server', message: msg });
        });
      }
      toast.error(details.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 mb-4">
            <BookOpen className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Join collaborative study rooms with synchronized Pomodoro timers.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-200/80 dark:border-slate-800 p-6 sm:p-8">
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            {/* Avatar Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Choose your study avatar
              </label>
              <div className="flex items-center justify-around gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                {avatars.map((key) => {
                  const isSelected = selectedAvatar === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setValue('avatar', key, { shouldValidate: true })}
                      className={`relative p-1.5 rounded-full transition-all focus-ring ${
                        isSelected
                          ? 'ring-4 ring-indigo-500 scale-110 shadow-md shadow-indigo-500/20'
                          : 'opacity-70 hover:opacity-100 hover:scale-105'
                      }`}
                      title={key}
                    >
                      <Avatar avatar={key} size="lg" showBorder={false} />
                    </button>
                  );
                })}
              </div>
              {errors.avatar && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.avatar.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="study_scholar"
                {...register('username')}
                className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 focus-ring transition-colors ${
                  errors.username
                    ? 'border-rose-400 dark:border-rose-600'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                3-20 characters: lowercase letters, numbers, and underscores only.
              </p>
              {errors.username && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.username.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="scholar@university.edu"
                {...register('email')}
                className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 focus-ring transition-colors ${
                  errors.email
                    ? 'border-rose-400 dark:border-rose-600'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                {...register('password')}
                className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 focus-ring transition-colors ${
                  errors.password
                    ? 'border-rose-400 dark:border-rose-600'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                At least 8 characters with at least one letter and one number.
              </p>
              {errors.password && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Timezone */}
            <div>
              <label
                htmlFor="timezone"
                className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Study Timezone
              </label>
              <input
                id="timezone"
                type="text"
                {...register('timezone')}
                className={`w-full px-4 py-2.5 rounded-xl border text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-800/50 focus-ring transition-colors ${
                  errors.timezone
                    ? 'border-rose-400 dark:border-rose-600'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Used to align your 7x24 focus heatmap accurately.
              </p>
              {errors.timezone && (
                <p className="mt-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
                  {errors.timezone.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus-ring disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Link */}
        <p className="mt-6 text-center text-sm text-slate-600 dark:text-slate-400">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-indigo-600 dark:text-indigo-400 hover:underline focus-ring rounded"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
