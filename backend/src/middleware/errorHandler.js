/**
 * Centralized error handler middleware.
 *
 * Catches unhandled errors from route handlers, logs them with correlation id,
 * and returns safe error responses to clients (no stack traces in production).
 */

export function errorHandler({ isDev = false, allowedOrigins = null } = {}) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const safeMessage =
      status < 500 || isDev ? err.message : 'Internal Server Error';

    // Lazy load logger to avoid circular dependency
    import('../utils/logger.js')
      .then(({ default: logger }) => {
        logger.error({ err, path: req?.path, method: req?.method }, 'Unhandled error');
      })
      .catch(() => {});

    if (!res.headersSent) {
      const origin = req?.headers?.origin;
      const allowOrigin =
        origin && (isDev || (allowedOrigins && allowedOrigins.has(origin))) ? origin : (isDev ? '*' : undefined);
      if (typeof res.setHeader === 'function') {
        if (allowOrigin) {
          res.setHeader('Access-Control-Allow-Origin', allowOrigin);
          res.setHeader('Vary', 'Origin');
        }
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Correlation-Id');
      }
      res.status(status).json({ error: safeMessage });
    }
  };
}

export default errorHandler;
