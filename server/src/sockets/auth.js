const cookie = require('cookie');
const env = require('../config/env');
const { verifyToken } = require('../utils/token');
const User = require('../models/User');

const parseCookies = cookie.parse || cookie.parseCookie;

/**
 * Socket.IO authentication middleware
 * Parses handshake cookie header, verifies JWT, and attaches user to socket.data.user
 */
const socketAuthMiddleware = async (socket, next) => {
  try {
    const rawCookies =
      socket.handshake.headers.cookie ||
      socket.handshake.headers.Cookie ||
      '';
    const parsedCookies = typeof parseCookies === 'function' ? parseCookies(rawCookies) : {};
    let token = parsedCookies[env.COOKIE_NAME];

    // Fallback: check handshake auth object
    if (!token && socket.handshake.auth && socket.handshake.auth.token) {
      token = socket.handshake.auth.token;
    }

    if (!token) {
      return next(new Error('Authentication required: No token cookie provided'));
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new Error('Authentication failed: User no longer exists'));
    }

    // Attach user to socket session
    socket.data.user = user;
    next();
  } catch (err) {
    return next(new Error(`Authentication failed: ${err.message}`));
  }
};

module.exports = socketAuthMiddleware;
