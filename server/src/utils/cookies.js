const env = require('../config/env');

const parseExpiryToMs = (expiry) => {
  if (typeof expiry === 'number') return expiry * 1000;
  if (!expiry || typeof expiry !== 'string') return 24 * 60 * 60 * 1000;

  const match = expiry.match(/^(\d+)([dhms]?)$/);
  if (!match) return 24 * 60 * 60 * 1000;

  const num = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'm':
      return num * 60 * 1000;
    case 's':
      return num * 1000;
    default:
      return num * 1000;
  }
};

const getCookieOptions = () => ({
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  maxAge: parseExpiryToMs(env.JWT_EXPIRES_IN),
  path: '/',
});

/**
 * Set the authentication cookie on the HTTP response
 */
const setAuthCookie = (res, token) => {
  const options = getCookieOptions();
  res.cookie(env.COOKIE_NAME, token, options);
};

/**
 * Clear the authentication cookie on the HTTP response with identical options
 */
const clearAuthCookie = (res) => {
  const options = getCookieOptions();
  delete options.maxAge;
  res.clearCookie(env.COOKIE_NAME, options);
};

module.exports = {
  setAuthCookie,
  clearAuthCookie,
  getCookieOptions,
};
