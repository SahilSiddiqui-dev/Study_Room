import React from 'react';
import owlSvg from '../../assets/avatars/owl.svg';
import foxSvg from '../../assets/avatars/fox.svg';
import pandaSvg from '../../assets/avatars/panda.svg';
import catSvg from '../../assets/avatars/cat.svg';
import bearSvg from '../../assets/avatars/bear.svg';

const AVATAR_MAP = {
  owl: owlSvg,
  fox: foxSvg,
  panda: pandaSvg,
  cat: catSvg,
  bear: bearSvg,
};

/**
 * Avatar component displaying original SVG graphics for known keys
 * or clean fallback initials for custom / unknown avatars.
 */
export const Avatar = ({
  avatar = 'owl',
  username = '',
  size = 'md',
  className = '',
  showBorder = true,
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-24 h-24 text-2xl',
  }[size] || 'w-10 h-10 text-sm';

  const avatarKey = (avatar || '').toLowerCase();
  const svgSrc = AVATAR_MAP[avatarKey];

  const borderClass = showBorder
    ? 'ring-2 ring-white dark:ring-slate-800 shadow-sm'
    : '';

  if (svgSrc) {
    return (
      <img
        src={svgSrc}
        alt={`${username || avatarKey} avatar`}
        className={`rounded-full object-cover shrink-0 select-none ${sizeClasses} ${borderClass} ${className}`}
        loading="lazy"
      />
    );
  }

  // Fallback to initials if unknown key
  const initials = (username || avatar || '?')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 shrink-0 select-none ${sizeClasses} ${borderClass} ${className}`}
      title={username || avatarKey}
    >
      {initials}
    </div>
  );
};

export default Avatar;
