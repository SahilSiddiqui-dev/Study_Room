const AVATAR_KEYS = ['owl', 'fox', 'panda', 'cat', 'bear'];
const DEFAULT_KEY = 'owl';

const USER_ROLES = ['user', 'admin'];

const ROOM_STATUS = ['open', 'closed'];

const EVENT_TYPES = [
  'tab_switch',
  'idle',
  'left_room',
  'manual_break',
  'planned_break',
];

const REASON_CATEGORIES = [
  'phone',
  'notification',
  'fatigue',
  'difficult_topic',
  'doubt',
  'planned',
  'other',
];

const TIMER_PHASES = ['focus', 'break'];

module.exports = {
  AVATAR_KEYS,
  DEFAULT_KEY,
  USER_ROLES,
  ROOM_STATUS,
  EVENT_TYPES,
  REASON_CATEGORIES,
  TIMER_PHASES,
};
