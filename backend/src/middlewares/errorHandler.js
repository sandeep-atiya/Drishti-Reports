import logger from '../utils/logger.js';

/**
 * 404 handler — attach after all routes.
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Route ${req.method} ${req.originalUrl} not found`);
  error.statusCode = 404;
  next(error);
};

/**
 * Normalises well-known error types to the right HTTP status + user-friendly message.
 */
const classify = (err) => {
  const name = err.name || '';

  // Sequelize DB connection errors → 503 Service Unavailable
  if (
    name === 'SequelizeConnectionError' ||
    name === 'SequelizeConnectionRefusedError' ||
    name === 'SequelizeConnectionTimedOutError' ||
    name === 'SequelizeHostNotReachableError' ||
    name === 'SequelizeAccessDeniedError'
  ) {
    return { statusCode: 503, message: 'Database temporarily unavailable. Please try again.' };
  }

  // Sequelize query / data errors → 500 but log fully
  if (name === 'SequelizeDatabaseError' || name === 'SequelizeUniqueConstraintError') {
    return { statusCode: 500, message: 'A database error occurred.' };
  }

  // SQLite errors (better-sqlite3 throws plain Errors with SQLITE_ codes in message)
  if (err.message?.startsWith('SQLITE_')) {
    return { statusCode: 500, message: 'Local cache error. Retrying from source database.' };
  }

  // Joi validation (shouldn't reach here — handled in validate middleware, but safety net)
  if (err.isJoi || name === 'ValidationError') {
    return { statusCode: 400, message: err.message };
  }

  // JSON parse errors in body
  if (name === 'SyntaxError' && err.status === 400) {
    return { statusCode: 400, message: 'Invalid JSON in request body.' };
  }

  // Default
  return {
    statusCode: err.statusCode || err.status || 500,
    message:    err.message   || 'Internal Server Error',
  };
};

/**
 * Global error handler — must be the last middleware registered in app.js.
 */
export const errorHandler = (err, req, res, next) => {
  const { statusCode, message } = classify(err);
  const isDev = process.env.NODE_ENV === 'development';

  logger.error(`[${req.method}] ${req.originalUrl} → ${statusCode}: ${err.message}`, {
    ...(isDev && { stack: err.stack }),
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(isDev && { stack: err.stack }),
  });
};
