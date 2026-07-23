// ─── Single source of truth for subscription plans ───────────────────
// Historically plan numbers were duplicated across migrate.js (DB seed),
// server.js (API fallback) and rateLimiter.js (FREE_DEFAULTS), which drifted
// ($9 vs $9.99, free 50 vs 200 req/day, etc). Everything now derives from
// the constants below. The DB is still the runtime source of truth; these
// values seed/reconcile it and back the API when the table is unavailable.
//
// Product decision (2-plan model): Free is a funnel, not a giveaway — its
// caps are deliberately tight to protect AI-token cost and create a real
// reason to upgrade. Pro unlocks everything.

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price_monthly: 0,
    stars_monthly: 0,
    stars_yearly: 0,
    requests_per_day: 40,
    ai_generations_per_month: 45,
    resume_analysis_limit: 1,
    interview_eval_limit: 3,
    sd_evaluation_limit: 1,
    available_languages: ['Java', 'Python', 'TypeScript'],
    available_modes: ['swipe', 'test', 'system-design'],
    model_priority: 'standard',
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price_monthly: 9.99,
    stars_monthly: 450,
    stars_yearly: 3000,
    requests_per_day: 1000,
    ai_generations_per_month: 1000,
    resume_analysis_limit: 10,
    interview_eval_limit: 50,
    sd_evaluation_limit: 100,
    available_languages: ['Java', 'Python', 'TypeScript'],
    available_modes: ['swipe', 'test', 'bug-hunting', 'blitz', 'mock-interview', 'concept-linker', 'code-completion', 'system-design'],
    model_priority: 'quality',
  },
};

// Fallback limits for a free/unknown user when the plans table or the user's
// plan row is unavailable. Mirrors PLANS.free.
export const FREE_DEFAULTS = {
  requests_per_day: PLANS.free.requests_per_day,
  ai_generations_per_month: PLANS.free.ai_generations_per_month,
  resume_analysis_limit: PLANS.free.resume_analysis_limit,
  interview_eval_limit: PLANS.free.interview_eval_limit,
  sd_evaluation_limit: PLANS.free.sd_evaluation_limit,
  available_languages: PLANS.free.available_languages,
  available_modes: PLANS.free.available_modes,
  model_priority: PLANS.free.model_priority,
};

// Ordered list for the /api/subscription/plans fallback response.
export const PLANS_LIST = [PLANS.free, PLANS.pro];
