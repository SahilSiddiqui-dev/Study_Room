const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');

// Mount Auth routes under /api/auth
router.use('/auth', authRoutes);

module.exports = router;
