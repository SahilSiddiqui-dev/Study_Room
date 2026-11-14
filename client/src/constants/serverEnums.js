/**
 * Mirrored from server/src/utils/constants.js
 * When adding/modifying enums, verify against backend constants first.
 */

// Mirrored from server/src/utils/constants.js -> AVATAR_KEYS
// NOTE: Avatar keys can also be loaded dynamically via GET /api/users/avatars
export const AVATAR_KEYS = ['owl', 'fox', 'panda', 'cat', 'bear'];
export const DEFAULT_AVATAR = 'owl';

// Mirrored from server/src/utils/constants.js -> USER_ROLES
export const USER_ROLES = ['user', 'admin'];

// Mirrored from server/src/utils/constants.js -> ROOM_STATUS
export const ROOM_STATUS = ['open', 'closed'];

// Mirrored from server/src/utils/constants.js -> EVENT_TYPES
export const EVENT_TYPES = [
  'tab_switch',
  'idle',
  'left_room',
  'manual_break',
  'planned_break',
];

// Mirrored from server/src/utils/constants.js -> REASON_CATEGORIES
export const REASON_CATEGORIES = [
  'phone',
  'notification',
  'fatigue',
  'difficult_topic',
  'doubt',
  'planned',
  'other',
];

// Human-friendly labels and details for reason categories
export const REASON_METADATA = {
  phone: {
    label: 'Phone Distraction',
    shortLabel: 'Phone',
    description: 'Checking messages, social feeds, or phone calls',
    icon: 'Smartphone',
    color: 'amber',
  },
  notification: {
    label: 'App Notification',
    shortLabel: 'Notification',
    description: 'Desktop alerts, emails, or chat pings',
    icon: 'BellRing',
    color: 'blue',
  },
  fatigue: {
    label: 'Mental Fatigue',
    shortLabel: 'Fatigue',
    description: 'Tired, feeling sleepy, or low energy',
    icon: 'BatteryLow',
    color: 'red',
  },
  difficult_topic: {
    label: 'Challenging Material',
    shortLabel: 'Difficult Topic',
    description: 'Stuck on a hard concept, problem, or debug',
    icon: 'BrainCircuit',
    color: 'purple',
  },
  doubt: {
    label: 'Unclear Question',
    shortLabel: 'Doubt / Question',
    description: 'Need to look up documentation or ask peer',
    icon: 'HelpCircle',
    color: 'cyan',
  },
  planned: {
    label: 'Scheduled Break',
    shortLabel: 'Planned Break',
    description: 'Routine Pomodoro break or planned rest',
    icon: 'Coffee',
    color: 'emerald',
  },
  other: {
    label: 'Other Distraction',
    shortLabel: 'Other',
    description: 'Environment noise, chore, or miscellaneous interruption',
    icon: 'MoreHorizontal',
    color: 'slate',
  },
};

// Mirrored from server/src/utils/constants.js -> TIMER_PHASES
export const TIMER_PHASES = ['focus', 'break'];
