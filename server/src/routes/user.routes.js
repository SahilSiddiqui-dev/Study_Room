const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const protect = require('../middleware/protect');
const validate = require('../middleware/validate');
const { passwordLimiter } = require('../middleware/rateLimiters');
const {
  updateMeSchema,
  changePasswordSchema,
  usernameParamSchema,
} = require('../validators/user.validator');

// Public route to list available avatar keys
router.get('/avatars', userController.getAvatars);

// Protected routes for current authenticated user
router.get('/me', protect, userController.getMe);

router.patch(
  '/me',
  protect,
  validate({ body: updateMeSchema }),
  userController.updateMe
);

router.patch(
  '/me/password',
  protect,
  passwordLimiter,
  validate({ body: changePasswordSchema }),
  userController.changePassword
);

// Public user profile by username (positioned after fixed routes)
router.get(
  '/:username',
  validate({ params: usernameParamSchema }),
  userController.getUserProfile
);

module.exports = router;

