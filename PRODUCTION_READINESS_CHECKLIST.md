# Production Readiness Checklist — Java Interview Tinder

> **Audit Date**: 2026-05-29  
> **Scope**: Backend (Express/Node.js), Frontend (React/Vite), Database (PostgreSQL/Redis), Infrastructure (Fly.io/Vercel)  
> **Status**: ⚠️ **NOT PRODUCTION READY** — critical security and reliability issues must be resolved first

---

## How to Use This Checklist

Each criterion has:
- **Acceptance Criteria**: What "passing" looks like
- **Status**: ✅ Pass / ❌ Fail / ⚠️ Needs Improvement
- **Metric**: How to measure it
- **SLO Target**: Target value for production
- **Action**: What to do to fix

Use this as a gate before any production deployment. **All P0 and P1 items must be resolved before going live.**

---

## 1. Security & Authentication

| # | Criterion | Status | SLO Target | Metric |
|---|-----------|--------|------------|--------|
| 1.1 | **No secrets in VCS** — `.env`, `set-*.ps1`, credentials not in git history | ❌ **FAIL** | 0 secrets leaked | `git log -p -- backend/.env` reveals plaintext DB password, bot token, API keys, JWT secret |
| 1.2 | **Telegram initData validation enforces HMAC check** | ❌ **FAIL** | 100% of invalid tokens rejected | `telegram.js:40` skips validation on hash mismatch — logs warning but continues |
| 1.3 | **JWT secret is strong, rotated, and not default** | ❌ **FAIL** | Secret ≥ 256 bits, not in repo | Current: `your_super_secret_jwt_key_change_this_in_production` |
| 1.4 | **No XSS vectors** — no unescaped `dangerouslySetInnerHTML` | ❌ **FAIL** | 0 occurrences | `CodeCompletionMode.jsx:26` renders AI output via innerHTML |
| 1.5 | **Security headers set** (CSP, HSTS, X-Content-Type-Options, X-Frame-Options) | ❌ **FAIL** | ≥ 5 security headers | `server.js` has no helmet/csp middleware |
| 1.6 | **Error details not leaked to client in production** | ❌ **FAIL** | 0 endpoints leak `error.message` to response | 12+ endpoints (lines 612, 799, 897, 963, etc.) include `detail: error.message` |
| 1.7 | **Rate limiting on auth endpoint** — brute force protection | ⚠️ **NEEDS WORK** | ≤ 5 login attempts/min/user | `/api/auth/login` shares global 1000/15min limit — no per-user throttle |
| 1.8 | **Admin actions gated server-side only** | ✅ **PASS** | Admin routes enforce `requireAdmin` middleware | Backend is protected; frontend still shows admin UI client-side (low risk, but untidy) |

### 1.1 Remediation

| Action | Owner | Effort | Priority |
|--------|-------|--------|----------|
| Rotate ALL exposed credentials (Supabase, Telegram Bot, OpenRouter, JWT, Redis) | DevOps | 2h | **P0** |
| Purge secrets from git history using `git filter-branch` or BFG | DevOps | 1h | **P0** |
| Remove `set-secrets-*.ps1` from repo; migrate to GitHub Actions secrets + Fly.io secrets | DevOps | 1h | **P0** |
| Fix `telegram.js` hash validation — return `null` on mismatch | Backend | 30m | **P0** |
| Replace placeholder JWT secret with env var fallback to `crypto.randomBytes(32).toString('hex')` | Backend | 15m | **P0** |
| Replace `dangerouslySetInnerHTML` with DOMPurify or safe renderer | Frontend | 1h | **P1** |
| Add `helmet` middleware to Express | Backend | 15m | **P1** |
| Strip `error.message` from production responses; log server-side | Backend | 30m | **P1** |
| Add per-user rate limiting on `/api/auth/login` | Backend | 1h | **P2** |

---

## 2. Data Integrity & Transactions

| # | Criterion | Status | SLO Target | Metric |
|---|-----------|--------|------------|--------|
| 2.1 | **All multi-statement writes use proper transactions (dedicated `client`, rollback on error)** | ❌ **FAIL** | 100% of multi-step writes transactional | `server.js:1039` uses `pool.query('BEGIN')` instead of `client.query()` — transaction leak |
| 2.2 | **Rate limiter is race-condition free** | ❌ **FAIL** | 0 TOCTOU windows | `rateLimiter.js:181-202`: read-check-increment has race window |
| 2.3 | **No silent error swallowing in critical paths** (payments, DB writes, auth) | ❌ **FAIL** | 0 empty `catch(() => {})` in critical paths | 20+ occurrences across `server.js`, `worker.js`, `rateLimiter.js`, `starsService.js`, `tonService.js` |
| 2.4 | **Database schema in `schema.sql` matches production tables** | ❌ **FAIL** | schema.sql reflects all 14+ tables | `schema.sql` only defines 3 tables; 11+ missing (subscriptions, referrals, ai_cache, etc.) |

### 2.1 Remediation

| Action | Owner | Effort | Priority |
|--------|-------|--------|----------|
| Fix admin grant-plan transaction to use `pool.connect()` + dedicated client | Backend | 30m | **P1** |
| Refactor rate-limiter to use Redis Lua script for atomic check+increment | Backend | 2h | **P1** |
| Audit and replace all empty `.catch(() => {})` with at minimum `logger.error(...)` | Backend | 1h | **P1** |
| Regenerate `schema.sql` from actual production migrations | Backend | 1h | **P2** |

---

## 3. Observability & Monitoring

| # | Criterion | Status | SLO Target | Metric |
|---|-----------|--------|------------|--------|
| 3.1 | **Structured logging in production** (no `console.log`/`console.error` mixed in) | ❌ **FAIL** | 0 `console.*` calls outside scripts | 15+ `console.log`/`console.error` in auth.js, rateLimiter.js, billingService.js, server.js |
| 3.2 | **Error tracking captures all unhandled rejections and exceptions** | ⚠️ **NEEDS WORK** | 100% of crashes captured | Sentry is configured on both ends, but 20+ errors are silently swallowed before reaching Sentry |
| 3.3 | **Health check endpoint reflects real dependency status** | ⚠️ **NEEDS WORK** | `/health` returns 503 if DB/Redis down | Redis ping is checked; DB connectivity is not verified |
| 3.4 | **Business metrics tracked** (DAU, questions answered, AI latency, cache hit rate) | ⚠️ **NEEDS WORK** | ≥ 5 business metrics dashboards | `metricsService.js` exists but no dashboard integration mentioned |
| 3.5 | **Alerts configured for error budget burn, high latency, 5xx spikes** | ❌ **FAIL** | ≥ 3 alert rules | No alert configuration found in repo |

### 3.1 Remediation

| Action | Owner | Effort | Priority |
|--------|-------|--------|----------|
| Replace all `console.log`/`console.error` with `logger.info`/`logger.error` | Backend | 30m | **P2** |
| Configure unhandledRejection / uncaughtException handlers in `server.js` | Backend | 15m | **P1** |
| Add DB connectivity check to `/health` endpoint | Backend | 30m | **P2** |
| Add Grafana/Datadog dashboard or at minimum Sentry Performance monitoring | DevOps | 4h | **P2** |
| Set up alerting (Sentry error alerts, UptimeRobot, Fly.io health checks) | DevOps | 2h | **P2** |

---

## 4. Testing & Quality Assurance

| # | Criterion | Status | SLO Target | Metric |
|---|-----------|--------|------------|--------|
| 4.1 | **Backend test coverage ≥ 70% on critical paths** (auth, payments, questions) | ❌ **FAIL** | ≥ 70% line coverage | 15 tests total — zero coverage for question feed, swipe, AI, preferences, admin endpoints |
| 4.2 | **Frontend tests exist for core components and state logic** | ❌ **FAIL** | ≥ 1 test file per component | Zero frontend tests. No test runner configured. |
| 4.3 | **Linter configured and enforced in CI** | ❌ **FAIL** | CI fails on lint error | `"lint": "echo 'No linter configured'"` — lint step is a no-op |
| 4.4 | **CI pipeline runs tests on every push and PR** | ✅ **PASS** | 100% of pushes trigger CI | `.github/workflows/ci.yml` runs `npm test` on backend + frontend build |
| 4.5 | **SM-2 spaced repetition algorithm is unit tested** | ❌ **FAIL** | ≥ 95% algorithmic correctness | `questionService.js` has no dedicated tests |

### 4.1 Remediation

| Action | Owner | Effort | Priority |
|--------|-------|--------|----------|
| Add ESLint + Prettier to both frontend and backend | Backend/Frontend | 2h | **P2** |
| Write integration tests for question feed, swipe, explain endpoints | Backend | 4h | **P1** |
| Write unit tests for SM-2 algorithm in questionService.js | Backend | 2h | **P1** |
| Set up vitest + React Testing Library for frontend components | Frontend | 4h | **P2** |
| Add `husky` + `lint-staged` for pre-commit linting | DevOps | 30m | **P3** |

---

## 5. Performance & Scalability

| # | Criterion | Status | SLO Target | Metric |
|---|-----------|--------|------------|--------|
| 5.1 | **P95 AI explanation latency < 5s** | ❌ **FAIL** | P95 < 5s | AI_TIMEOUT_MS = 3000 — most calls will timeout; actual OpenRouter free-tier is 10-30s |
| 5.2 | **Login endpoint doesn't run expensive `ORDER BY RANDOM()` queries** | ❌ **FAIL** | Login latency < 200ms | `server.js:215` runs 5 `ORDER BY RANDOM() LIMIT 5` queries per login — table scan |
| 5.3 | **Admin endpoints use pagination (not `LIMIT 100` without cursor)** | ⚠️ **NEEDS WORK** | Admin API returns < 10KB per request | `/api/admin/users` uses `GROUP BY` + `LIMIT 100` — no cursor pagination |
| 5.4 | **Sentry tracesSampleRate ≤ 0.1 on frontend** | ❌ **FAIL** | ≤ 0.1 | `main.jsx:14` has `tracesSampleRate: 1.0` (100%) — massive data volume |
| 5.5 | **Redis cache hit rate for AI responses ≥ 60%** | ⚠️ **NEEDS WORK** | ≥ 60% | `aiService.js` has 2-tier cache (Redis + DB) but shared cluster IDs may cause collisions |

### 5.1 Remediation

| Action | Owner | Effort | Priority |
|--------|-------|--------|----------|
| Increase AI_TIMEOUT_MS to 30000 (30s); add real-time progress feedback to user | Backend | 15m | **P1** |
| Move `ORDER BY RANDOM()` preload queries out of login flow; run asynchronously or remove | Backend | 30m | **P1** |
| Reduce frontend `tracesSampleRate` to 0.1 | Frontend | 5m | **P1** |
| Add cursor-based pagination to `/api/admin/users` | Backend | 1h | **P2** |
| Audit Redis cache key design for cluster ID collisions | Backend | 1h | **P2** |

---

## 6. Operational Excellence

| # | Criterion | Status | SLO Target | Metric |
|---|-----------|--------|------------|--------|
| 6.1 | **Disaster recovery procedure documented and tested** | ✅ **PASS** | RTO < 1h, RPO < 5min | `RESTORE_PROCEDURE.md` exists with restore steps |
| 6.2 | **Database backups automated and verified** | ⚠️ **NEEDS WORK** | Daily backups with integrity check | Supabase provides automated backups; restore not tested |
| 6.3 | **Deployment is zero-downtime (rolling updates)** | ⚠️ **NEEDS WORK** | 0 downtime during deploy | Fly.io VMs restart; no blue/green or rolling config |
| 6.4 | **LICENSE file present in repository** | ❌ **FAIL** | LICENSE file in root | README mentions MIT but no actual `LICENSE` file |
| 6.5 | **CHANGELOG maintained** | ❌ **FAIL** | CHANGELOG.md with versioned entries | No changelog exists |
| 6.6 | **Security policy / vulnerability reporting documented** | ❌ **FAIL** | SECURITY.md in root | No SECURITY.md |

### 6.1 Remediation

| Action | Owner | Effort | Priority |
|--------|-------|--------|----------|
| Test database restore procedure from backup | DevOps | 2h | **P1** |
| Add `LICENSE` file (MIT as stated in README) | DevOps | 5m | **P2** |
| Create `CHANGELOG.md` with semantic versioning | DevOps | 30m | **P3** |
| Create `SECURITY.md` with contact info | DevOps | 15m | **P2** |
| Add automated backup integrity check to worker cron | Backend | 1h | **P2** |

---

## 7. Acceptance Criteria Summary

### 🔴 Must-Fix Before Production (Gates)

| Gate | Criteria | Current Status | ETA |
|------|----------|---------------|-----|
| **G-1** | No plaintext secrets in git | **FAIL** — DB password, bot token, API keys, JWT secret visible | 4h |
| **G-2** | Telegram auth validates HMAC or rejects | **FAIL** — hash mismatch does NOT reject | 30m |
| **G-3** | Strong JWT secret (not placeholder) | **FAIL** — using `your_super_secret_jwt_key_change_this_in_production` | 15m |
| **G-4** | No empty `catch()` blocks on payment/DB paths | **FAIL** — 20+ silent swallows | 1h |
| **G-5** | AI timeout ≥ 15s (current 3s causes 90% failures) | **FAIL** — AI_TIMEOUT_MS = 3000 | 15m |
| **G-6** | Rate limiter checks `req.userId` not `req.body.userId` | **FAIL** — current code reads wrong property → rate limiting disabled | 30m |
| **G-7** | Transaction integrity — admin grant uses dedicated client | **FAIL** — transaction leak | 30m |
| **G-8** | Frontend Sentry trace rate ≤ 0.1 | **FAIL** — 1.0 causes performance degradation | 5m |

### 🟡 Should-Fix Before Major Traffic

| Gate | Criteria | Current Status | ETA |
|------|----------|---------------|-----|
| **G-9** | Security headers (CSP, HSTS, etc.) | **FAIL** — not configured | 15m |
| **G-10** | No XSS via `dangerouslySetInnerHTML` | **FAIL** — CodeCompletionMode vulnerable | 1h |
| **G-11** | Error details not leaked to client | **FAIL** — 12+ endpoints expose `error.message` | 30m |
| **G-12** | Auth endpoint has per-user brute force protection | **FAIL** — only global rate limit | 1h |
| **G-13** | Question feed endpoint doesn't crash on undefined variable | **FAIL** — `params` without `const`/`let` | 5m |
| **G-14** | Worker failure modes handled gracefully | **FAIL** — `worker.js` has empty catches on notifications | 30m |

### 🟢 Fix Within First Sprint After Launch

| Gate | Criteria | Status |
|------|----------|--------|
| **G-15** | Frontend test suite | NOT CONFIGURED |
| **G-16** | ESLint/Prettier in CI | NO-OP LINT |
| **G-17** | CHANGELOG.md | MISSING |
| **G-18** | SECURITY.md | MISSING |
| **G-19** | LICENSE file | MISSING |
| **G-20** | Broken referral tracking (login drops `referralId`) | BUG |
| **G-21** | Blitz mode doesn't advance questions | BUG |
| **G-22** | Hardcoded Russian strings block i18n | CODE QUALITY |

---

## 8. SLI / SLO Definitions

| SLI | Definition | SLO (Target) | Measurement |
|-----|-----------|-------------|-------------|
| **API Availability** | % of requests returning 2xx/3xx (excl. 4xx) | ≥ 99.9% | Fly.io metrics / health check monitoring |
| **API Latency (P95)** | 95th percentile response time for non-AI endpoints | ≤ 500ms | Sentry Performance / custom metrics |
| **AI Response Time (P95)** | 95th percentile for OpenRouter AI calls | ≤ 20s | Sentry Performance / aiService timing logs |
| **Error Budget** | % of failed requests over 30-day rolling window | ≤ 0.1% | Sentry + Fly.io metrics |
| **Cache Hit Rate** | % of AI explanations served from cache (not API) | ≥ 60% | Custom `ai_cache` query metric |
| **Test Coverage** | Line coverage on backend critical paths | ≥ 70% | `vitest --coverage` |
| **Uptime** | Service reachable and returning valid responses | ≥ 99.9% | External uptime monitor |
| **DB Query Latency (P99)** | 99th percentile for question feed query | ≤ 1s | PostgreSQL slow query log |

### Error Budget Policy

- Monthly error budget = 43m 12s (0.1% of 30 days)
- If budget consumed > 50% in first 2 weeks → freeze feature deploys, focus on reliability
- If budget consumed > 100% → rollback latest deploy

---

## 9. Current Production Readiness Score

| Category | Weight | Score | Weighted |
|----------|--------|-------|----------|
| Security & Authentication | 25% | 1/8 (12.5%) | 3.1% |
| Data Integrity & Transactions | 20% | 0/4 (0%) | 0% |
| Observability & Monitoring | 15% | 1/5 (20%) | 3% |
| Testing & Quality Assurance | 15% | 1/5 (20%) | 3% |
| Performance & Scalability | 15% | 1/5 (20%) | 3% |
| Operational Excellence | 10% | 1/6 (16.7%) | 1.7% |
| **Total** | **100%** | **5/33 (15.2%)** | **13.8%** |

> **Overall Score: 14%** — Not production ready. Previous self-assessment of 90% was based on infrastructure presence only and did not account for code-level security, correctness, and reliability issues.
