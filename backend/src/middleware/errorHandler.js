/**
 * Centralized error handler middleware.
 *
 * Catches unhandled errors from route handlers, logs them with correlation id,
 * and returns safe error responses to clients (no stack traces in production).
 */

export function errorHandler(options = false, allowedOriginsArg = null) {
  const isDev = typeof options === 'boolean' ? options : Boolean(options?.isDev);
  const allowedOrigins = allowedOriginsArg || (typeof options === 'object' && options ? options.allowedOrigins : null);

  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const safeMessage =
      (status < 500 || isDev) && err.message ? err.message : 'Internal server error';

    // Lazy load logger to avoid circular dependency
    import('../config/logger.js')
      .then(({ default: logger }) => {
        logger.error({ err, path: req?.path, method: req?.method }, 'Unhandled error');
      })
      .catch(() => {});

    if (!res.headersSent) {
      const origin = req?.headers?.origin;
      const allowOrigin =
        origin && (isDev || (allowedOrigins && allowedOrigins.has(origin))) ? origin : (isDev ? origin || '*' : undefined);
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
