import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import {
  User,
  KeyRound,
  Globe,
  Sparkles,
  ExternalLink,
  Save,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import userApi from '../api/user.api';
import Avatar from '../components/ui/Avatar';
import { changePasswordSchema } from '../validators/auth.validator';
import { extractErrorDetails } from '../utils/errors';
import { formatDate } from '../utils/formatTime';
import toast from 'react-hot-toast';

export const ProfilePage = () => {
  const { user, updateUser, avatars } = useAuth();

  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'owl');
  const [timezone, setTimezone] = useState(user?.timezone || 'UTC');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [passwordServerError, setPasswordServerError] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  useEffect(() => {
    if (user) {
      setSelectedAvatar(user.avatar || 'owl');
      setTimezone(user.timezone || 'UTC');
    }
  }, [user]);

  // Form for Password Change
  const {
    register,
    handleSubmit,
    reset: resetPasswordForm,
    formState: { errors: passwordErrors },
  } = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsUpdatingProfile(true);
    try {
      const result = await userApi.updateMyProfile({
        avatar: selectedAvatar,
        timezone: timezone.trim(),
      });
      updateUser({
        avatar: selectedAvatar,
        timezone: timezone.trim(),
      });
      toast.success('Profile preferences updated!');
    } catch (err) {
      const details = extractErrorDetails(err, 'Failed to update profile');
      toast.error(details.message);
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleChangePassword = async (data) => {
    setPasswordServerError('');
    setIsUpdatingPassword(true);
    try {
      await userApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      toast.success('Password changed successfully!');
      resetPasswordForm();
    } catch (err) {
      const details = extractErrorDetails(err, 'Failed to change password');
      setPasswordServerError(details.message);
      toast.error(details.message);
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDetectTimezone = () => {
    const detected = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    setTimezone(detected);
    toast.success(`Detected timezone: ${detected}`);
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-4">
          <Avatar avatar={user.avatar} username={user.username} size="xl" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                {user.username}
              </h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                {user.role}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {user.email} • Member since {formatDate(user.createdAt)}
            </p>
          </div>
        </div>

        <Link
          to={`/u/${user.username}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 transition-colors self-start sm:self-auto"
        >
          <span>View Public Profile</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Left Column: Avatar & Preferences */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-500" />
            <span>Profile Preferences</span>
          </h3>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* Avatar Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                Active Study Avatar
              </label>
              <div className="flex items-center justify-around gap-2 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                {avatars.map((key) => {
                  const isSelected = selectedAvatar === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedAvatar(key)}
                      className={`relative p-1 rounded-full transition-all focus-ring ${
                        isSelected
                          ? 'ring-4 ring-indigo-500 scale-110 shadow-md shadow-indigo-500/20'
                          : 'opacity-60 hover:opacity-100 hover:scale-105'
                      }`}
                      title={key}
                    >
                      <Avatar avatar={key} size="lg" showBorder={false} />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Timezone */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Timezone
                </label>
                <button
                  type="button"
                  onClick={handleDetectTimezone}
                  className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
                >
                  Auto-Detect
                </button>
              </div>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. America/New_York or UTC"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white text-xs font-mono focus-ring"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Aligns your 7x24 focus heatmap to your local study clock.
              </p>
            </div>

            <button
              type="submit"
              disabled={isUpdatingProfile}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus-ring shadow-md shadow-indigo-600/20 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {isUpdatingProfile ? (
                <span>Saving preferences...</span>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Preferences</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Change Password */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-indigo-500" />
            <span>Change Password</span>
          </h3>

          {passwordServerError && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{passwordServerError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(handleChangePassword)} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Current Password
              </label>
              <input
                type="password"
                autoComplete="current-password"
                {...register('currentPassword')}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus-ring ${
                  passwordErrors.currentPassword
                    ? 'border-rose-400'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {passwordErrors.currentPassword && (
                <p className="mt-1 text-[11px] text-rose-600">
                  {passwordErrors.currentPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                New Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('newPassword')}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus-ring ${
                  passwordErrors.newPassword
                    ? 'border-rose-400'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Min 8 characters with at least one letter and one number.
              </p>
              {passwordErrors.newPassword && (
                <p className="mt-1 text-[11px] text-rose-600">
                  {passwordErrors.newPassword.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
                className={`w-full px-3.5 py-2 text-xs rounded-xl border bg-slate-50 dark:bg-slate-800/40 text-slate-900 dark:text-white focus-ring ${
                  passwordErrors.confirmPassword
                    ? 'border-rose-400'
                    : 'border-slate-300 dark:border-slate-700'
                }`}
              />
              {passwordErrors.confirmPassword && (
                <p className="mt-1 text-[11px] text-rose-600">
                  {passwordErrors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isUpdatingPassword}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 focus-ring disabled:opacity-60 transition-all"
            >
              {isUpdatingPassword ? 'Updating password...' : 'Update Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
