import { v4 as uuidv4 } from 'uuid';
import pinoHttp from 'pino-http';
import logger from '../config/logger.js';

/**
 * Structured logging middleware using pino-http
 * Logs: userId, endpoint, latency, method, status, correlationId
 */
export const requestLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-correlation-id'] || uuidv4(),
  customProps: (req) => ({
    userId: req.userId || req.body?.userId || req.query?.userId || null,
  }),
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      // query: req.query, // optionally include
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  customLogLevel: (req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.url} completed ${res.statusCode}`,
  customErrorMessage: (req, res, err) => `${req.method} ${req.url} failed: ${err.message}`,
});

/**
 * Input validation middleware factory
 * Validates body fields against a schema object.
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
