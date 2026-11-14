/**
 * Time formatting and Pomodoro clock synchronization helpers.
 */

/**
 * Format raw seconds as MM:SS (e.g. 1500 -> '25:00', 65 -> '01:05')
 */
export const formatSeconds = (totalSeconds) => {
  if (totalSeconds == null || isNaN(totalSeconds) || totalSeconds < 0) {
    return '00:00';
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

/**
 * Format minutes as human-friendly string (e.g. 90 -> '1h 30m', 25 -> '25m')
 */
export const formatMinutes = (minutes) => {
  if (!minutes || minutes <= 0) return '0m';
  const hrs = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
};

/**
 * Format ISO date string into readable short date
 */
export const formatDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

/**
 * Format ISO date string into readable date and time
 */
export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

/**
 * Pure function: Calculate remaining seconds given a server broadcast state,
 * taking into account the time elapsed since serverTime packet was emitted.
 *
 * @param {number} serverRemainingSec - Remaining seconds reported in server sync packet
 * @param {string|number|Date} serverTime - Server timestamp when sync was emitted
 * @param {number} clientReceiveTime - Client Date.now() when packet was received or current time
 * @returns {number} Estimated remaining seconds (clamped at 0)
 */
export const computeRemainingSeconds = (
  serverRemainingSec,
  serverTime,
  clientNow = Date.now()
) => {
  if (serverRemainingSec == null || isNaN(serverRemainingSec)) return 0;
  if (!serverTime) return Math.max(0, Math.floor(serverRemainingSec));

  const serverTimestamp = new Date(serverTime).getTime();
  if (isNaN(serverTimestamp)) return Math.max(0, Math.floor(serverRemainingSec));

  // Elapsed seconds since the server packet was emitted
  const elapsedSec = Math.max(0, (clientNow - serverTimestamp) / 1000);
  const remaining = Math.max(0, Math.round(serverRemainingSec - elapsedSec));

  return remaining;
};
