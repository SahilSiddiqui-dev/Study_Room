const { z } = require('zod');

/**
 * Central Error Handling Middleware
 * Maps domain errors, validation errors, database errors, and auth errors
 * to standard API response envelopes.
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errors = undefined;

  // 1. Custom AppError
  if (err.statusCode) {
    statusCode = err.statusCode;
    message = err.message;
  }
  // 2. Zod Validation Errors
  else if (err instanceof z.ZodError || err.name === 'ZodError') {
    statusCode = 400;
    message = 'Validation failed';
    const issues = err.issues || [];
    errors = issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
  }
  // 3. Mongoose Cast Error (e.g. invalid ObjectId)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for field ${err.path}`;
  }
  // 4. Mongoose Schema Validation Error
  else if (err.name === 'ValidationError') {
    statusCode = 400;
    const errValues = Object.values(err.errors || {});
    message = errValues.map((e) => e.message).join(', ');
    errors = errValues.map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }
  // 5. MongoDB Duplicate Key Error (Code 11000 -> 409 Conflict)
  else if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    message = `A record with this ${field} already exists`;
  }
  // 6. JWT Authentication Errors
  else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = err.name === 'TokenExpiredError' ? 'Token has expired' : 'Invalid authentication token';
  }
  // 7. Payload Too Large (e.g. Body limit exceeded)
  else if (err.type === 'entity.too.large' || err.statusCode === 413 || err.status === 413) {
    statusCode = 413;
    message = 'Payload too large. Request body exceeds the 10kb limit.';
  }
  // 8. Unexpected/Internal Errors
  else {
    if (process.env.NODE_ENV !== 'test') {
      console.error('Unhandled Server Error:', err);
    }
    message = 'Internal server error';
  }

  const response = {
    success: false,
    message,
  };

  if (errors && errors.length > 0) {
    response.errors = errors;
  }

  // Include stack trace only in development/test if requested, never in production
  if (process.env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;

