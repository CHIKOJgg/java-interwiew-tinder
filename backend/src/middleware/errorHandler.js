/**
 * Centralized Express error handler.
 *
 * Guarantees every unhandled error is logged (via the logger transport, which
 * forwards to Sentry) instead of being swallowed by an empty catch, and returns
 * a consistent JSON envelope. In production the raw error message is never
 * leaked to clients.
 */
export function errorHandler(isDev = process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    const status = err.status || err.statusCode || 500;
    const safeMessage =
      status >= 500 && !isDev
        ? 'Internal server error'
        : (err.message || 'Internal server error');

    // logger is imported lazily to avoid a hard dependency cycle at module load.
    import('../config/logger.js')
      .then(({ default: logger }) => {
        logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');
      })
      .catch(() => {});

    if (!res.headersSent) {
      res.status(status).json({ error: safeMessage });
    }
  };
}

export default errorHandler;
