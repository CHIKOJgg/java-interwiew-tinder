import jwt from 'jsonwebtoken';
import * as Sentry from "@sentry/node";
import logger from '../config/logger.js';
import ADMIN_IDS from '../config/admin.js';

/**
 * Middleware to verify JWT token from Authorization header
 */
export const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token missing' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    req.userPlan = decoded.plan;
    
    Sentry.setUser({ id: String(req.userId) });
    
    next();
  } catch (error) {
    logger.error({ err: error }, 'JWT verification failed');
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

/**
 * Middleware to require admin privileges
 * Checks if req.userId (set by authMiddleware) is in the ADMIN_IDS set
 */
export const requireAdmin = (req, res, next) => {
  if (!req.userId || !ADMIN_IDS.has(String(req.userId))) {
    return res.status(403).json({ error: 'Forbidden: Admin access required' });
  }
  next();
};
