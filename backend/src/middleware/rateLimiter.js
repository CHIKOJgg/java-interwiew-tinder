import pool from '../config/database.js';

/**
 * In-memory rate limit store (backed by DB for persistence).
 * Enforces per-user limits based on subscription plan.
 */
const limitsCache = new Map();

async function getUserLimits(userId) {
  if (limitsCache.has(userId)) {
    const cached = limitsCache.get(userId);
    if (Date.now() - cached._fetchedAt < 60000) return cached; // 1 min cache
  }

  try {
    // Get user plan limits
    const { rows } = await pool.query(`
      SELECT 
        sp.requests_per_day,
        sp.ai_generations_per_month,
        sp.resume_analysis_limit,
        sp.interview_eval_limit,
        sp.available_languages,
        sp.available_modes,
        sp.model_priority,
        COALESCE(rl.requests_today, 0) as requests_today,
        COALESCE(rl.ai_generations_this_month, 0) as ai_generations_this_month,
        COALESCE(rl.resume_analyses_this_month, 0) as resume_analyses_this_month,
        COALESCE(rl.interview_evals_this_month, 0) as interview_evals_this_month,
        rl.daily_reset_at,
        rl.monthly_reset_at
      FROM users u
      LEFT JOIN subscription_plans sp ON sp.id = COALESCE(u.subscription_plan, 'free')
      LEFT JOIN user_rate_limits rl ON rl.user_id = u.telegram_id
      WHERE u.telegram_id = $1
    `, [userId]);

    if (rows.length === 0) return null;

    const limits = { ...rows[0], _fetchedAt: Date.now() };
    limitsCache.set(userId, limits);
    return limits;
  } catch (err) {
    console.error('Error fetching user limits:', err.message);
    return null;
  }
}

async function incrementCounter(userId, field) {
  try {
    await pool.query(`
      INSERT INTO user_rate_limits (user_id, ${field}, last_request_at) 
      VALUES ($1, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE 
      SET ${field} = user_rate_limits.${field} + 1, 
          last_request_at = CURRENT_TIMESTAMP
    `, [userId]);
    limitsCache.delete(userId); // invalidate cache
  } catch (err) {
    console.error('Error incrementing counter:', err.message);
  }
}

/**
 * Rate limiting middleware factory
 * @param {string} limitType - 'requests' | 'ai_generation' | 'resume' | 'interview'
 */
export function rateLimit(limitType = 'requests') {
  return async (req, res, next) => {
    const userId = req.body?.userId || req.query?.userId;
    if (!userId) return next(); // no user, no limits

    const limits = await getUserLimits(userId);
    if (!limits) return next(); // can't check, let through

    // Reset counters if day/month has passed
    const now = new Date();
    if (limits.daily_reset_at && new Date(limits.daily_reset_at).getDate() !== now.getDate()) {
      await pool.query(`
        UPDATE user_rate_limits 
        SET requests_today = 0, daily_reset_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1
      `, [userId]).catch(() => {});
      limitsCache.delete(userId);
    }
    if (limits.monthly_reset_at && new Date(limits.monthly_reset_at).getMonth() !== now.getMonth()) {
      await pool.query(`
        UPDATE user_rate_limits 
        SET ai_generations_this_month = 0, resume_analyses_this_month = 0, 
            interview_evals_this_month = 0, monthly_reset_at = CURRENT_TIMESTAMP 
        WHERE user_id = $1
      `, [userId]).catch(() => {});
      limitsCache.delete(userId);
    }

    let exceeded = false;
    let counterField;

    switch (limitType) {
      case 'requests':
        exceeded = (limits.requests_today || 0) >= (limits.requests_per_day || 50);
        counterField = 'requests_today';
        break;
      case 'ai_generation':
        exceeded = (limits.ai_generations_this_month || 0) >= (limits.ai_generations_per_month || 100);
        counterField = 'ai_generations_this_month';
        break;
      case 'resume':
        exceeded = (limits.resume_analyses_this_month || 0) >= (limits.resume_analysis_limit || 0);
        counterField = 'resume_analyses_this_month';
        break;
      case 'interview':
        exceeded = (limits.interview_evals_this_month || 0) >= (limits.interview_eval_limit || 0);
        counterField = 'interview_evals_this_month';
        break;
    }

    if (exceeded) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded', 
        type: limitType,
        message: 'Upgrade your plan for higher limits'
      });
    }

    await incrementCounter(userId, counterField);
    req.userLimits = limits;
    next();
  };
}

/**
 * Entitlement check middleware factory
 * @param {string} feature - 'language' | 'mode' | 'resume' | 'interview' | 'quality_model'
 * @param {string} value - specific language or mode to check
 */
export function requireEntitlement(feature, value) {
  return async (req, res, next) => {
    const userId = req.body?.userId || req.query?.userId;
    if (!userId) return next();

    const limits = await getUserLimits(userId);
    if (!limits) return next();

    let allowed = true;

    switch (feature) {
      case 'language':
        allowed = (limits.available_languages || ['Java']).includes(value || req.body?.language || req.query?.language);
        break;
      case 'mode':
        allowed = (limits.available_modes || ['swipe', 'test']).includes(value || req.body?.mode || req.query?.mode);
        break;
      case 'resume':
        allowed = (limits.resume_analysis_limit || 0) > 0;
        break;
      case 'interview':
        allowed = (limits.interview_eval_limit || 0) > 0;
        break;
      case 'quality_model':
        allowed = limits.model_priority === 'quality';
        break;
    }

    if (!allowed) {
      return res.status(403).json({ 
        error: 'Feature not available',
        feature,
        message: 'Upgrade your plan to access this feature'
      });
    }

    next();
  };
}

/**
 * Track analytics event
 */
export async function trackEvent(eventData) {
  try {
    await pool.query(`
      INSERT INTO analytics_events (user_id, event_type, endpoint, latency_ms, model, cache_hit, token_usage, fallback_used, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `, [
      eventData.userId || null,
      eventData.eventType,
      eventData.endpoint || null,
      eventData.latencyMs || null,
      eventData.model || null,
      eventData.cacheHit || false,
      eventData.tokenUsage || null,
      eventData.fallbackUsed || false,
      eventData.metadata ? JSON.stringify(eventData.metadata) : null
    ]);
  } catch (err) {
    // Never fail the request because of analytics
    console.error('Analytics tracking error:', err.message);
  }
}
