const rateLimit = require('express-rate-limit');

// Helper to create rate limiter with uniform envelope response
const createLimiter = ({ windowMs, max, message }) => {
  return rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, _next, options) => {
      res.status(options.statusCode).json({
        success: false,
        message: message || 'Too many requests, please try again later.',
      });
    },
  });
};

// Global rate limiter: 100 requests per 15 minutes per IP
const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again after 15 minutes.',
});

// Strict auth rate limiter: 10 requests per 15 minutes per IP (register and login)
const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again after 15 minutes.',
});

// Password change limiter: 5 requests per 15 minutes per IP
const passwordLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many password change attempts, please try again after 15 minutes.',
});

// Write-heavy limiter for events & reasons: 60 requests per 1 minute per IP
const writeLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 60,
  message: 'Too many study event requests, please slow down.',
});

module.exports = {
  globalLimiter,
  authLimiter,
  passwordLimiter,
  writeLimiter,
};

