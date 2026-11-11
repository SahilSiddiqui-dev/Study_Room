const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const env = require('./config/env');
const AppError = require('./utils/AppError');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiters');

const app = express();

// 1. Trust proxy in production
if (env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// 2. Security headers via Helmet (first middleware)
app.use(helmet());

// 3. CORS configuration with explicit single origin and credentials
app.use(
  cors({
    origin: env.CLIENT_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
  })
);

// 4. Request parsing and logging
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 5. Global rate limiter for API routes
app.use('/api', globalLimiter);

// 6. Public Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
    },
  });
});

// 7. Route placeholders (will be wired in future phases)
const routes = require('./routes');
app.use('/api', routes);

// 8. 404 handler for unhandled routes
app.use((req, res, next) => {
  next(new AppError(`Cannot ${req.method} ${req.originalUrl} on this server`, 404));
});

// 9. Central Error Handler (must be last)
app.use(errorHandler);

module.exports = app;

