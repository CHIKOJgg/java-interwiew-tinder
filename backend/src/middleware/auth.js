import jwt from 'jsonwebtoken';
import * as Sentry from "@sentry/node";
import logger from '../config/logger.js';
import ADMIN_IDS from '../config/admin.js';
import { validateTelegramWebAppData } from '../utils/telegram.js';

/**
 * Dual-mode authentication middleware.
 *
 * 1. Tries JWT Bearer token first (web users, existing Mini App sessions)
 * 2. Falls back to Telegram Mini App initData (`x-telegram-init-data` header)
 *
 * The initData fallback mirrors funding-finder's approach: every API request
 * from the Telegram Mini App carries initData, so even if the JWT token is
 * lost (sessionStorage cleared by WebView), the request still authenticates.
 */
export const authMiddleware = (req, res, next) => {
  // Mode 1: JWT Bearer token (web users + existing sessions)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
      req.userPlan = decoded.plan;
      Sentry.setUser({ id: String(req.userId) });
      return next();
    } catch (error) {
      logger.error({ err: error }, 'JWT verification failed');
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  }

  // Mode 2: Telegram Mini App initData (fallback for Mini App requests)
  const initData = req.headers['x-telegram-init-data'];
  if (initData && process.env.BOT_TOKEN) {
    const data = validateTelegramWebAppData(initData, process.env.BOT_TOKEN);
    if (data) {
      req.userId = String(data.telegram_id);
      req.userPlan = 'init_data';
      Sentry.setUser({ id: req.userId });
      return next();
    }
    logger.warn('Telegram initData validation failed in authMiddleware');
  }

  return res.status(401).json({ error: 'Authorization token missing' });
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
