import jwt from 'jsonwebtoken';

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
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
export const ADMIN_IDS = new Set(
  (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
);

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
