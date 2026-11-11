const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middleware/validate');
const protect = require('../middleware/protect');
const { authLimiter } = require('../middleware/rateLimiters');
const { registerSchema, loginSchema } = require('../validators/auth.validator');

// Public authentication routes with strict rate limiting
router.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  authController.register
);

router.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  authController.login
);

// Logout (clears auth cookie)
router.post('/logout', authController.logout);

// Protected route to fetch authenticated profile
router.get('/me', protect, authController.getMe);

module.exports = router;

