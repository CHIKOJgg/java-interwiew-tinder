import pool from '../config/database.js';
import redis from '../config/redis.js';

// No longer using local Map for limits caching — use Redis
// const limitsCache = new Map();

// ─── Admin bypass ─────────────────────────────────────────────────────
// Set ADMIN_TELEGRAM_IDS=123456789,987654321 in .env to grant unlimited access
const ADMIN_IDS = new Set(
  (process.env.ADMIN_TELEGRAM_IDS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
);

function isAdmin(userId) {
  return ADMIN_IDS.has(String(userId));
}

// ─── Default free plan limits ─────────────────────────────────────────
// These are the fallback values used when the subscription_plans table
// is unavailable or the user has no plan row.
const FREE_DEFAULTS = {
  requests_per_day: 200,
  ai_generations_per_month: 500,
  resume_analysis_limit: 3,
  interview_eval_limit: 20,
  available_languages: ['Java', 'Python', 'TypeScript'],  // all languages unlocked on free
  available_modes: ['swipe', 'test', 'bug-hunting', 'blitz', 'mock-interview', 'concept-linker', 'code-completion'],
  model_priority: 'standard',
};

async function getUserLimits(userId) {
  if (isAdmin(userId)) return null; 

  const cacheKey = `limits:${userId}`;
  
  // 1. Try Redis cache first
  if (redis) {
    try {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    } catch (err) {
      console.warn('Redis read error in getUserLimits:', err.message);
    }
  }

  try {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(sp.requests_per_day,         ${FREE_DEFAULTS.requests_per_day})      as requests_per_day,
        COALESCE(sp.ai_generations_per_month, ${FREE_DEFAULTS.ai_generations_per_month}) as ai_generations_per_month,
        COALESCE(sp.resume_analysis_limit,    ${FREE_DEFAULTS.resume_analysis_limit})  as resume_analysis_limit,
        COALESCE(sp.interview_eval_limit,     ${FREE_DEFAULTS.interview_eval_limit})   as interview_eval_limit,
        COALESCE(sp.available_languages,      ARRAY['Java','Python','TypeScript'])      as available_languages,
        COALESCE(sp.available_modes,          ARRAY['swipe','test','bug-hunting','blitz','mock-interview','concept-linker','code-completion']) as available_modes,
        COALESCE(sp.model_priority,           'standard')                              as model_priority,
        COALESCE(rl.requests_today,           0) as requests_today,
        COALESCE(rl.ai_generations_this_month,0) as ai_generations_this_month,
        COALESCE(rl.resume_analyses_this_month,0) as resume_analyses_this_month,
        COALESCE(rl.interview_evals_this_month,0) as interview_evals_this_month,
        rl.daily_reset_at,
        rl.monthly_reset_at
      FROM users u
      LEFT JOIN subscription_plans sp ON sp.id = COALESCE(u.subscription_plan, 'free')
      LEFT JOIN user_rate_limits rl ON rl.user_id = u.telegram_id
      WHERE u.telegram_id = $1
    `, [userId]);

    if (rows.length === 0) return { ...FREE_DEFAULTS, _fetchedAt: Date.now() };

    const limits = { ...rows[0], _fetchedAt: Date.now() };
    if (typeof limits.available_languages === 'string') {
      limits.available_languages = limits.available_languages.replace(/[{}"]/g, '').split(',');
    }
    if (typeof limits.available_modes === 'string') {
      limits.available_modes = limits.available_modes.replace(/[{}"]/g, '').split(',');
    }

    // 2. Save to Redis with 60s TTL
    if (redis) {
      redis.setex(cacheKey, 60, JSON.stringify(limits)).catch(() => {});
    }
    
    return limits;
  } catch (err) {
    console.error('Error fetching user limits:', err.message);
    return { ...FREE_DEFAULTS, _fetchedAt: Date.now() };
  }
}

async function incrementCounter(userId, field) {
  const redisKey = `counter:${userId}:${field}`;
  
  // 1. Try Redis INCR first for immediate consistency across instances
  if (redis) {
    try {
      await redis.incr(redisKey);
      // Set TTL if new key
      const ttl = field.includes('month') ? 2592000 : 86400; // rough 30d or 1d
      await redis.expire(redisKey, ttl);
    } catch (err) {
      console.warn('Redis increment failed:', err.message);
    }
  }

  // 2. Persist to DB
  try {
    await pool.query(`
      INSERT INTO user_rate_limits (user_id, ${field}, last_request_at)
      VALUES ($1, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id) DO UPDATE
      SET ${field} = user_rate_limits.${field} + 1,
          last_request_at = CURRENT_TIMESTAMP
    `, [userId]);
    
    // Invalidate limits cache
    if (redis) redis.del(`limits:${userId}`).catch(() => {});
  } catch (err) {
    console.error('Error incrementing counter:', err.message);
  }
}

export function rateLimit(limitType = 'requests') {
  return async (req, res, next) => {
    const userId = req.userId || req.body?.userId || req.query?.userId;
    if (!userId || isAdmin(userId)) return next();

    const limits = await getUserLimits(userId);
    if (!limits) return next(); // admin or error — let through

    // Reset stale counters in DB
    const now = new Date();
    if (limits.daily_reset_at && new Date(limits.daily_reset_at).getDate() !== now.getDate()) {
      await pool.query(
        'UPDATE user_rate_limits SET requests_today = 0, daily_reset_at = CURRENT_TIMESTAMP WHERE user_id = $1',
        [userId]
      ).catch(() => {});
      if (redis) {
        redis.del(`limits:${userId}`).catch(() => {});
        redis.del(`counter:${userId}:requests_today`).catch(() => {});
      }
    }
    if (limits.monthly_reset_at && new Date(limits.monthly_reset_at).getMonth() !== now.getMonth()) {
      await pool.query(
        `UPDATE user_rate_limits SET ai_generations_this_month = 0, resume_analyses_this_month = 0,
         interview_evals_this_month = 0, monthly_reset_at = CURRENT_TIMESTAMP WHERE user_id = $1`,
        [userId]
      ).catch(() => {});
      if (redis) {
        redis.del(`limits:${userId}`).catch(() => {});
        redis.keys(`counter:${userId}:*_month`).then(keys => {
          if (keys.length > 0) redis.del(...keys);
        }).catch(() => {});
      }
    }

    // 2. Check current counter value (prefer Redis for distributed accuracy)
    let currentCount = 0;
    let exceeded = false;
    let counterField;

    switch (limitType) {
      case 'requests':
        counterField = 'requests_today';
        break;
      case 'ai_generation':
        counterField = 'ai_generations_this_month';
        break;
      case 'resume':
        counterField = 'resume_analyses_this_month';
        break;
      case 'interview':
        counterField = 'interview_evals_this_month';
        break;
    }

    if (counterField) {
      if (redis) {
        try {
          const val = await redis.get(`counter:${userId}:${counterField}`);
          currentCount = val ? parseInt(val) : limits[counterField];
        } catch {
          currentCount = limits[counterField];
        }
      } else {
        currentCount = limits[counterField];
      }

      const max = limits[counterField.replace('_today', '_per_day').replace('_this_month', '_limit')] || FREE_DEFAULTS[counterField.replace('_today', '_per_day').replace('_this_month', '_limit')];
      exceeded = currentCount >= max;
    }

    if (exceeded) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        type: limitType,
        message: 'Upgrade your plan for higher limits',
      });
    }

    if (counterField) await incrementCounter(userId, counterField);
    req.userLimits = limits;
    next();
  };
}

export function requireEntitlement(feature, value) {
  return async (req, res, next) => {
    const userId = req.userId || req.body?.userId || req.query?.userId;
    if (!userId || isAdmin(userId)) return next();

    const limits = await getUserLimits(userId);
    if (!limits) return next();

    let allowed = true;
    const requestedLanguage = value || req.body?.language || req.query?.language;
    const requestedMode = value || req.body?.mode || req.query?.mode;

    switch (feature) {
      case 'language': {
        // Always allow if available_languages is missing/empty (DB schema not set up yet)
        const langs = limits.available_languages;
        if (!langs || langs.length === 0) { allowed = true; break; }
        allowed = langs.includes(requestedLanguage) || langs.includes('*');
        break;
      }
      case 'mode': {
        const modes = limits.available_modes;
        if (!modes || modes.length === 0) { allowed = true; break; }
        allowed = modes.includes(requestedMode) || modes.includes('*');
        break;
      }
      case 'resume':
        allowed = (limits.resume_analysis_limit || FREE_DEFAULTS.resume_analysis_limit) > 0;
        break;
      case 'interview':
        allowed = (limits.interview_eval_limit || FREE_DEFAULTS.interview_eval_limit) > 0;
        break;
      case 'quality_model':
        allowed = limits.model_priority === 'quality';
        break;
    }

    if (!allowed) {
      return res.status(403).json({
        error: 'Feature not available',
        feature,
        message: 'Upgrade your plan to access this feature',
      });
    }

    next();
  };
}

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
      eventData.metadata ? JSON.stringify(eventData.metadata) : null,
    ]);
  } catch { /* analytics never breaks the request */ }
}
