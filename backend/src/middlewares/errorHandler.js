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
 * Global error handler — must be the last middleware registered in app.js.
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(message, {
    statusCode,
    method: req.method,
    url: req.originalUrl,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
