const jwt = require('jsonwebtoken');
const env = require('../config/env');

/**
 * Sign a JWT containing only the user id
 */
const signToken = (userId) => {
  return jwt.sign(
    { id: userId.toString() },
    env.JWT_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
};

/**
 * Verify a JWT with explicit HS256 algorithm enforcement
 */
const verifyToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
  });
};

module.exports = {
  signToken,
  verifyToken,
};
