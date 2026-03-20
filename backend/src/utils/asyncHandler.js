/**
 * Wraps an async route handler and forwards any errors to Express error middleware.
 * @param {Function} fn - Async express route handler
 * @returns {Function}
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
