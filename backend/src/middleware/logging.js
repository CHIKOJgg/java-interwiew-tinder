import crypto from 'crypto';

/**
 * Structured logging middleware
 * Logs: userId, endpoint, latency, method, status, correlationId
 */
export function requestLogger(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  const start = Date.now();

  req.correlationId = correlationId;
  res.setHeader('X-Correlation-Id', correlationId);

  const originalEnd = res.end;
  res.end = function (...args) {
    const latency = Date.now() - start;
    const log = {
      ts: new Date().toISOString(),
      correlationId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      latency_ms: latency,
      userId: req.body?.userId || req.query?.userId || null
    };
    console.log(JSON.stringify(log));
    originalEnd.apply(res, args);
  };

  next();
}

/**
 * Input validation middleware factory
 * Validates body fields against a schema object.
 * Schema: { fieldName: { required: bool, type: string, maxLength: number } }
 */
export function validateBody(schema) {
  return (req, res, next) => {
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = req.body?.[field];

      if (rules.required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      if (value !== undefined && value !== null) {
        if (rules.type && typeof value !== rules.type) {
          errors.push(`${field} must be of type ${rules.type}`);
        }

        if (rules.maxLength && typeof value === 'string' && value.length > rules.maxLength) {
          errors.push(`${field} exceeds max length ${rules.maxLength}`);
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }

    next();
  };
}

/**
 * Sanitize text input — strip potential prompt injection patterns
 */
export function sanitizeText(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\x00/g, '')           // null bytes
    .replace(/<script[^>]*>/gi, '') // basic XSS
    .replace(/<\/script>/gi, '')
    .slice(0, 10000);               // hard cap
}

/**
 * Body sanitization middleware
 * Sanitizes all string fields in req.body
 */
export function sanitizeBody(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    for (const [key, value] of Object.entries(req.body)) {
      if (typeof value === 'string') {
        req.body[key] = sanitizeText(value);
      }
    }
  }
  next();
}
