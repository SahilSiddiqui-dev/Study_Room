const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const roomRoutes = require('./room.routes');
const sessionRoutes = require('./session.routes');
const eventRoutes = require('./event.routes');

// Mount routes under /api
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/rooms', roomRoutes);
router.use('/sessions', sessionRoutes);
router.use('/events', eventRoutes);

module.exports = router;
