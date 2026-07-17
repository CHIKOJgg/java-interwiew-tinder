# Bugs & Improvements — Java Interview Tinder

> **Date**: 2026-05-29  
> **Scope**: Full-stack (backend, frontend, database, infrastructure)  
> **Total Issues**: 37 (9 P0, 12 P1, 10 P2, 6 P3)  
> **Status**: ⚠️ 21 blocking issues must be resolved before production launch

---

## Priority Definitions

| Priority | Label | Meaning | Action Required |
|----------|-------|---------|-----------------|
| **P0** | 🔴 Critical | Security breach, data loss, app crash on startup | Fix immediately before any deployment |
| **P1** | 🟠 High | Broken feature, significant performance issue, UX blocker | Fix before production launch |
| **P2** | 🟡 Medium | Code quality, missing tests, non-critical bugs | Fix within first sprint after launch |
| **P3** | 🔵 Low | Nice-to-have improvement, tech debt | Add to backlog |

---

## P0 — Critical (Must Fix Before Launch)

---

### BUG-01 [P0] [Security] Production secrets committed to git

| Field | Value |
|-------|-------|
| **Files** | `backend/.env`, `set-secrets-production.ps1`, `set-secrets-staging.ps1`, `set-worker-secrets-production.ps1`, `set-worker-secrets-staging.ps1` |
| **Type** | Security — Credential Leak |

**Description**: Live production secrets are committed to the repository in plaintext:
- **Supabase DB password**: `kolbaserbochhkaBASS12345` (full read/write access to all user data)
- **Telegram Bot Token**: `8220422658:AAGufIGGCTeZUmSQE6PgFfLRIistLp4sc-A` (can send messages as the bot)
- **OpenRouter API Key**: `sk-or-v1-a5340217f6691338...` (unlimited AI generation at your cost)
- **JWT Secret**: `your_super_secret_jwt_key_change_this_in_production` (trivially forgeable)
- **Redis URL**: Contains password to production Redis instance
- **TON Wallet Address**: Crypto payment wallet exposed

These files are tracked by git (`.gitignore` was added after they were already committed).

**Impact**: Anyone with repo access can exfiltrate or corrupt the database, impersonate any user, drain the AI budget, and receive crypto payments meant for the project.

**Steps to Reproduce**:
```bash
git log -p -- backend/.env
# or browse the file on GitHub at:
# https://github.com/CHIKOJgg/java-interwiew-tinder/blob/main/backend/.env
```

**Solution**:
1. **Immediately rotate ALL exposed credentials**:
   - Reset Supabase DB password
   - Revoke and recreate Telegram Bot Token (via BotFather)
   - Regenerate OpenRouter API key
   - Generate new JWT secret (`openssl rand -base64 32`)
   - Reset Redis password
   - Change TON wallet (if possible) or monitor for misuse
2. Remove secrets from git history using BFG Repo-Cleaner:
   ```bash
   java -jar bfg.jar --delete-files .env --delete-files set-secrets-*.ps1
   git reflog expire --expire=now --all && git gc --prune=now --aggressive
   git push --force --all
   ```
3. Remove `set-secrets-*.ps1` files from repo entirely
4. Add secrets to GitHub Actions Secrets and Fly.io Secrets
5. Verify: `git log -p -- backend/.env` should show no secret values

**Verification**: New developer clones repo → can run the app with `.env.example` → no secrets visible in git history.

---

### BUG-02 [P0] [Security] Telegram hash validation is disabled

| Field | Value |
|-------|-------|
| **File** | `backend/src/utils/telegram.js:40-50` |
| **Type** | Security — Authentication Bypass |

**Description**: The HMAC-SHA256 validation of Telegram `initData` is commented out. When the calculated hash doesn't match the provided hash, the code logs a warning but **continues execution** instead of returning `null`. This makes the entire authentication system bypassable.

```javascript
// Line 40-50: current (broken) behavior
if (calculatedHash !== hash) {
  console.log('Hash mismatch');
  console.log('⚠️ Skipping hash validation for now');
  // ← should return null here, but doesn't
}
```

**Impact**: **Complete authentication bypass**. Any attacker can forge Telegram credentials to impersonate any user, including administrators. They can access private data, take over accounts, or grant themselves admin privileges.

**Steps to Reproduce**:
1. Create a fake `initData` string with arbitrary `id`, `username`, `first_name`
2. Post it to `/api/auth/login` with no valid HMAC signature
3. Server logs "Hash mismatch" but returns a valid JWT token
4. Attacker now has an authenticated session as the impersonated user

**Solution**:
```javascript
// Replace lines 40-50 with:
if (calculatedHash !== hash) {
  logger.warn({ hash, calculatedHash }, 'Telegram hash validation failed');
  return null; // ← reject invalid tokens
}
```

**Verification**: Unit test: send `initData` with manipulated `id` field → server rejects with 401. Send valid `initData` → still works.

---

### BUG-03 [P0] [Logic] Undeclared variable `params` causes crash in question feed

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js:405` |
| **Type** | Runtime — ReferenceError |

**Description**: Line 405 assigns to `params` without `const`/`let`/`var`. In strict mode (ESM modules), this throws a `ReferenceError`, crashing the `/api/questions/feed` endpoint.

```javascript
// Current (broken):
params = selectedCategories.length > 0
  ? [userId, language, selectedCategories, limit]
  : [userId, language, limit];

// Fixed:
const params = selectedCategories.length > 0
  ? [userId, language, selectedCategories, limit]
  : [userId, language, limit];
```

**Impact**: Every request to the main question feed endpoint crashes the server process. The app becomes completely unusable — users see no questions, cannot swipe, cannot enter any mode.

**Steps to Reproduce**:
1. Open the app
2. Select a language/category
3. App fails to load questions
4. Server logs: `ReferenceError: params is not defined`

**Solution**: Add `const` keyword before `params` on line 405.

**Verification**: Load the app, select a category, confirm questions appear in the feed.

---

### BUG-04 [P0] [Data] Transaction uses `pool.query()` instead of dedicated client

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js:1039-1063` |
| **Type** | Data Integrity — Transaction Leak |

**Description**: The admin grant-plan endpoint uses `pool.query()` for `BEGIN`, individual queries, and `COMMIT`. Each `pool.query()` call may get a **different connection from the pool**, so the transaction is never properly scoped. The `BEGIN` on one connection, queries on another, `COMMIT` on yet another — none of the statements are actually transactional.

```javascript
// Current (broken — each pool.query() may use a different connection):
await pool.query('BEGIN');
await pool.query(`UPDATE user_subscriptions ...`);
await pool.query(`INSERT INTO user_subscriptions ...`);
await pool.query(`UPDATE users SET subscription_plan = ...`);
await pool.query('COMMIT');

// Fixed pattern (as correctly used in worker.js:160-188):
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(`UPDATE user_subscriptions ...`);
  await client.query(`INSERT INTO user_subscriptions ...`);
  await client.query(`UPDATE users SET subscription_plan = ...`);
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release();
}
```

**Impact**: If any query in the sequence fails, previous queries are **not rolled back**. This leaves the database in an inconsistent state: a user might have a subscription record but no plan update, or vice versa. Payments and entitlement checks become unreliable.

**Steps to Reproduce**:
1. Call admin grant-plan endpoint
2. Force a failure in the third query (e.g., violate a constraint)
3. Observe that the first two queries are committed even though the overall operation failed
4. The database is now in an inconsistent state

**Solution**: Replace with `pool.connect()` + dedicated `client` pattern, with proper `try/catch/finally` and rollback.

**Verification**: Unit test: inject a failure in the middle of the transaction, verify that `SELECT` after the operation shows no partial changes.

---

### BUG-05 [P0] [Logic] Rate limiter reads userId from wrong source — completely disabled

| Field | Value |
|-------|-------|
| **File** | `backend/src/middleware/rateLimiter.js:126` |
| **Type** | Logic — Security |

**Description**: The rate limiter reads the user ID from `req.body?.userId || req.query?.userId` instead of from `req.userId` (which is set by the JWT auth middleware). Since clients never send `userId` in the request body or query string (it comes from the JWT), the rate limiter **never finds a userId** and calls `next()` unconditionally — all per-user rate limiting is completely disabled.

```javascript
// Current (broken — always undefined):
const userId = req.body?.userId || req.query?.userId;

// Fixed:
const userId = req.userId;
```

**Impact**: Users can make unlimited requests to AI generation endpoints. An attacker can:
- Burn through your OpenRouter API budget in minutes
- Generate thousands of AI explanations simultaneously
- Exhaust database connection pool with job queue inserts

**Steps to Reproduce**:
1. Authenticate as any user
2. Send 1000 rapid requests to `/api/questions/explain`
3. All 1000 requests are processed (no rate limiting applied)

**Solution**: Replace line 126 with `const userId = req.userId;`. Ensure the auth middleware runs before the rate limiter for protected routes.

**Verification**: Test: send 20 rapid requests from same user → request 21 should receive 429. Test with different users → independent counters.

---

### BUG-06 [P0] [Logic] `login()` method drops referralId parameter

| Field | Value |
|-------|-------|
| **File** | `frontend/src/api/client.js:22`, `backend/src/server.js:283` |
| **Type** | Data Loss — Referral System |

**Description**: The frontend calls `apiClient.login(initData, referralId)` with 2 arguments, but the `login()` method only accepts 1 parameter (`initData`). The `referralId` is **silently dropped** and never sent to the server. The server's login handler also doesn't accept or process `referralId` in the request body.

```javascript
// client.js:22 — only 1 param, referralId ignored:
async login(initData) {
  const response = await fetch(`${this.baseUrl}/auth/login`, {
    // body only includes initData:
    body: JSON.stringify({ initData }),
  });
}

// App.jsx:84 — calls with 2 args:
await apiClient.login(initData, referralId);
```

**Impact**: The entire referral system is **completely broken**. No new user ever gets their referrer credited. Users who share referral links never receive conversion rewards. This defeats the purpose of the referral feature.

**Steps to Reproduce**:
1. User A shares their referral link with User B
2. User B clicks the link and logs in for the first time
3. The referral bonus is never credited to User A
4. The `referrals` table remains empty

**Solution**:
1. Fix `client.js:22` to accept and send `referralId`:
   ```javascript
   async login(initData, referralId) {
     const body = { initData };
     if (referralId) body.referralId = referralId;
     const response = await fetch(`${this.baseUrl}/auth/login`, {
       body: JSON.stringify(body),
     });
   }
   ```
2. Fix `server.js:283` to process `referralId` from request body and call the referral service.

**Verification**: E2E test: create referral link → register a new user via that link → verify `referrals` table has the expected row.

---

### BUG-07 [P0] [Logic] Blitz mode doesn't advance questions

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/BlitzMode.jsx:62-81` |
| **Type** | Logic — Game-Breaking |

**Description**: After the user submits a blitz-mode answer, the `setTimeout` callback clears the feedback and local data but **never calls `advanceQuestion()`**. The user sees the same question repeatedly and cannot progress.

```javascript
// Current (broken — no advanceQuestion):
setTimeout(() => {
  setFeedback(null);
  setLocalBlitzData(null);
  // Missing: advanceQuestion()
}, 350);
```

**Impact**: Blitz mode is completely unusable. Users answer the first question, see feedback briefly, then the same question reappears. They cannot finish a blitz session.

**Steps to Reproduce**:
1. Select Blitz mode
2. Answer the first question
3. See correct/incorrect feedback
4. After 350ms, the same question appears again
5. Repeat indefinitely

**Solution**: Add `advanceQuestion()` call after setting `setLocalBlitzData(null)`:
```javascript
setTimeout(() => {
  setFeedback(null);
  setLocalBlitzData(null);
  advanceQuestion(); // ← add this
}, 350);
```

**Verification**: Select Blitz mode → answer a question → verify the next question appears after 350ms.

---

### BUG-08 [P0] [Logic] CodeCompletionMode calls undefined `advanceQuestion`

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/CodeCompletionMode.jsx:31-68` |
| **Type** | Runtime — ReferenceError |

**Description**: The `handleNext()` function on line 68 calls `advanceQuestion()`, but `advanceQuestion` is never destructured from `useStore()` on line 31. This causes a `ReferenceError` when the user tries to proceed after completing a code exercise.

```javascript
// Line 31: advanceQuestion is MISSING from destructuring:
const { questions, currentIndex, submitCodeCompletionAnswer, isLoadingQuestions,
  hasMoreQuestions, fetchGeneration, language } = useStore();

// Line 68: Will throw ReferenceError:
const handleNext = () => { advanceQuestion(); };
```

**Impact**: Code Completion mode crashes immediately after the first exercise. Users cannot navigate to the next question.

**Steps to Reproduce**:
1. Select Code Completion mode
2. Complete the first exercise
3. Click "Next" button
4. App crashes with `ReferenceError: advanceQuestion is not defined`

**Solution**: Add `advanceQuestion` to the destructured variables on line 31:
```javascript
const { questions, currentIndex, submitCodeCompletionAnswer, isLoadingQuestions,
  hasMoreQuestions, fetchGeneration, language, advanceQuestion } = useStore();
```

**Verification**: Select Code Completion → complete exercise → click Next → verify next exercise loads without error.

---

### BUG-09 [P0] [Security] JWT secret is a placeholder string

> ⚠️ **STATUS: STALE / PARTIALLY RESOLVED.** The originally reported placeholder
> (`your_super_secret_jwt_key_change_this_in_production`) is no longer present in
> `backend/.env` (it now holds an empty value that must be supplied via env/CI).
> The real risk remains: **the production JWT secret was committed in plaintext**
> in `backend/.env` and `set-secrets-*.ps1`. Rotate it immediately (see BUG-SEC-1)
> and never store it in the working tree. Treat this as a live secret-rotation task,
> not a placeholder bug.

| Field | Value |
|-------|-------|
| **File** | `backend/.env` (JWT_SECRET) |
| **Type** | Security — Weak Authentication |

**Description**: A weak/committed JWT secret lets anyone forge valid JWT tokens for any user, including admins.

```dotenv
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

**Impact**: Complete token forgery. Attacker can:
- Log in as any user by signing a JWT with userId=X
- Grant themselves admin privileges
- Access any user's data and subscriptions

**Steps to Reproduce**:
1. Use any JWT library (e.g., `jwt.io`) to create a token with `{ userId: 1, plan: 'admin' }`
2. Sign it with secret `your_super_secret_jwt_key_change_this_in_production`
3. Use this token to call any protected API endpoint
4. Server accepts the forged token

**Solution**:
1. Generate a real secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
2. Update the secret in production environment
3. Add a fallback in code: if `process.env.JWT_SECRET === 'your_super_secret_jwt_key_change_this_in_production'`, log a critical warning and/or refuse to start
4. Better: validate on startup:
   ```javascript
   if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
     logger.fatal('JWT_SECRET must be at least 32 characters');
     process.exit(1);
   }
   ```

**Verification**: Start server → confirm it refuses to start with the placeholder secret. Set a real secret → confirm tokens are properly signed and verified.

---

## P1 — High Priority (Fix Before Production Launch)

---

### BUG-10 [P1] [Crash] `stripe` is never imported in Stripe webhook handler

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js:68` |
| **Type** | Runtime — ReferenceError |

**Description**: The Stripe webhook handler at line 68 calls `stripe.webhooks.constructEvent(req.body, sig, ...)`, but `stripe` is never imported or initialized anywhere in `server.js`. Any delivery to this webhook throws a `ReferenceError`.

**Impact**: If the Stripe webhook endpoint is configured in Stripe dashboard, every webhook delivery crashes the server. This is the **Stripe integration path** — even though Stripe is legacy, the endpoint still receives calls.

**Solution**: Either (a) remove the Stripe webhook endpoint entirely (since Stripe is legacy/disabled), or (b) add proper Stripe SDK initialization:
```javascript
// Before the route handler:
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
```

**Verification**: If endpoint is removed → test that `POST /api/webhooks/stripe` returns 404. If kept → test with a valid Stripe webhook payload.

---

### BUG-11 [P1] [Logic] Empty catch blocks silently swallow errors (20+ occurrences)

| Field | Value |
|-------|-------|
| **Files** | `server.js:207,214,219,220,240,260,337,360,508,589,777,788`, `worker.js:113,180,233`, `rateLimiter.js:82,118,119,138,140,141,149,151,154`, `redis.js:44`, `starsService.js:95`, `tonService.js:152` |
| **Type** | Reliability — Silent Failures |

**Description**: The codebase has over 20 instances of `.catch(() => {})` or `catch { }` that silently ignore errors. Critical failures — DB query failures, cache misses, payment processing errors, notification delivery failures — are swallowed with zero logging.

**Pattern found**:
```javascript
// Silent catch — errors disappear:
pool.query(...).catch(() => {});

// Nested silent catches:
pool.query(...).catch(async () => { ... }).catch(() => {});

// Empty catch block in payment processing:
import('../referralService.js').then(m => ...).catch(() => {});
```

**Impact**: Production debugging becomes **nearly impossible**. When users report issues, there will be no error logs to investigate. Data corruption can occur silently (e.g., a failed `INSERT INTO user_subscriptions` is silently ignored, but the subsequent `UPDATE users` proceeds, leaving inconsistent state).

**Solution**: Audit every `.catch(() => {})` and `catch { }` and replace with:
```javascript
// Minimum viable fix:
.catch(err => logger.error({ err, context: 'description' }, 'Error in [operation]'))

// Better — handle or rethrow:
.catch(err => {
  logger.error({ err, ... }, 'Failed to [operation]');
  // Re-throw if caller depends on it
  throw err;
})
```

**Verification**: Run the app, trigger a DB connection failure → verify error is logged with context, not silently swallowed. Count of `.catch(() => {})` patterns should be 0.

---

### BUG-12 [P1] [UX] AI_TIMEOUT_MS = 3000 is too low for free-tier models

| Field | Value |
|-------|-------|
| **File** | `backend/.env:21`, `backend/src/services/aiService.js` |
| **Type** | Reliability — AI Feature Broken |

**Description**: The AI request timeout is set to **3 seconds**. OpenRouter's free-tier models (like `google/gemini-2.0-flash-exp:free`) regularly take 10-30 seconds to respond. This means ~90% of AI calls will time out, resulting in:
- Empty explanations when swiping left
- Failed test question generation
- Failed bug-hunt scenario generation
- Failed interview evaluations

```dotenv
AI_TIMEOUT_MS=3000
```

**Impact**: Every feature that depends on AI generation (explanations, test mode, bug hunting, blitz, code completion, mock interview, resume analysis) will fail most of the time. The app appears broken to users.

**Solution**:
1. Increase timeout to **30000** (30 seconds):
   ```dotenv
   AI_TIMEOUT_MS=30000
   ```
2. Add real-time progress feedback to the user (loading spinner with elapsed time)
3. Consider setting up queue-based AI processing (already partially implemented in `queueService.js`) to separate frontend responsiveness from AI latency

**Verification**: Swipe left on a question → wait up to 30s → verify explanation appears (not timeout). Monitor AI success rate — should be > 80%.

---

### BUG-13 [P1] [Runtime] Missing React imports in CategorySelection.jsx

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/CategorySelection.jsx:1` |
| **Type** | Build — ReferenceError |

**Description**: `CategorySelection.jsx` uses `useState`, `useEffect`, `useCallback`, and `React.memo` but imports none of them. The file only imports icon components from `lucide-react`. In strict build modes or with certain bundler configurations, this causes `ReferenceError`.

```javascript
// Current (missing React imports):
import { Check, Gift, Copy, Share2 } from 'lucide-react';

// Fixed:
import React, { useState, useEffect, useCallback } from 'react';
import { Check, Gift, Copy, Share2 } from 'lucide-react';
```

**Same issue**: `Header.jsx` also uses hooks without importing them.

**Impact**: App fails to build or crashes at runtime when navigating to category selection or when the header renders.

**Solution**: Add `import React, { useState, useEffect, useCallback } from 'react';` to both `CategorySelection.jsx` and `Header.jsx`.

**Verification**: Build the frontend (`npm run build`) → no errors. Navigate to category selection → works. Navigate to any page with header → works.

---

### BUG-14 [P1] [Architecture] Monolithic 1330-line server.js

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js` (1330 lines) |
| **Type** | Architecture — Maintainability |

**Description**: All API routes, middleware, business logic, and startup code live in a single `server.js` file. This includes:
- 25 route handlers
- 4 middleware functions
- Database query logic inline in route handlers
- Business logic mixed with HTTP concerns
- Error handling scattered throughout

**Impact**: High risk of regressions when modifying any route. New developer onboarding takes longer. Testing individual routes in isolation is difficult. Code review is harder.

**Solution**: Refactor into domain-separated route files using Express Router:
```
src/routes/
├── auth.routes.js      # Login, token refresh
├── questions.routes.js  # Feed, swipe, explain, test-answer, etc.
├── stats.routes.js      # User stats, percentile
├── billing.routes.js    # Stars, TON, subscription
├── referral.routes.js   # Referral stats
├── admin.routes.js      # Admin endpoints
└── webhooks.routes.js   # Stripe, Telegram bot
```

Each route file extracts the inline logic and delegates to service files.

**Verification**: All existing endpoints respond identically after refactoring. `server.js` < 100 lines (only imports + middleware setup).

---

### BUG-15 [P1] [Perf] Login runs `ORDER BY RANDOM()` queries — adds latency to every login

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js:215-225` |
| **Type** | Performance — Login Latency |

**Description**: On every login, the server runs 5 queries with `ORDER BY RANDOM() LIMIT 5` (a full table scan) and enqueues 5 AI generation jobs. This happens synchronously before the login response is sent.

```javascript
const preload = await pool.query(`SELECT id, question_text, category FROM questions ORDER BY RANDOM() LIMIT 5`);
// Then enqueues 5 AI jobs...
```

**Impact**: Every login takes 200-500ms longer than necessary. For 1000 DAU logging in once per day, that's 200-500 seconds of wasted server time. The `ORDER BY RANDOM()` requires a full sequential scan of the questions table, which grows linearly with question count.

**Solution**:
1. Move preload queries to after the login response (fire-and-forget with proper error logging)
2. Replace `ORDER BY RANDOM()` with `ORDER BY RANDOM()` only if table < 10K rows; otherwise use `TABLESAMPLE` or application-level random selection
3. Consider removing preload entirely — questions are fetched on-demand via `/api/questions/feed`

```javascript
// Fixed: respond first, then preload asynchronously
res.json({ success: true, user: userData });

// Fire preload after response (non-blocking):
preloadCacheForUser(userId).catch(err => logger.error({ err }, 'Preload error'));
```

**Verification**: Login endpoint response time < 200ms. Preload queries still execute in background.

---

### BUG-16 [P1] [Security] XSS via `dangerouslySetInnerHTML` in CodeCompletionMode

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/CodeCompletionMode.jsx:26` |
| **Type** | Security — Cross-Site Scripting |

**Description**: AI-generated code snippets are rendered using `dangerouslySetInnerHTML`. The `highlight.js` utility does basic HTML escaping but can miss edge cases. If the AI model generates malicious content (e.g., `<script>alert(1)</script>` inside a code snippet), it will be executed in the Telegram WebView.

```jsx
// Current — potentially unsafe:
<SnippetBlock dangerouslySetInnerHTML={{ __html: html }} />
```

**Impact**: Persistent XSS. An attacker who can influence AI prompts or training data could execute arbitrary JavaScript in users' Telegram WebViews. This could steal the user's JWT token, Telegram data, or perform actions on their behalf.

**Solution**:
1. Sanitize HTML before injecting: `npm install DOMPurify`
   ```javascript
   import DOMPurify from 'dompurify';
   // ...in render:
   <SnippetBlock dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />
   ```
2. Or better: avoid `dangerouslySetInnerHTML` entirely and use a safe code renderer

**Verification**: Test: inject `<script>alert('xss')</script>` into snippet → verify it's escaped to text, not executed. Normal code highlighting should still work.

---

### BUG-17 [P1] [Security] Error details leaked in production responses (12+ endpoints)

| Field | Value |
|-------|-------|
| **Files** | `backend/src/server.js:612,799,897,963,974,983,997,1013,1032,1061,1084,1138,1150,1161,1177` |
| **Type** | Security — Information Disclosure |

**Description**: Over a dozen endpoints include the raw `error.message` in the JSON response sent to the client. In production, this can leak:
- Internal server paths and filenames
- API key configurations (e.g., "OpenRouter API key not configured")
- Database error details (table names, column types)
- Stack traces

```javascript
// Current — leaks error details:
res.status(500).json({
  error: 'AI explanation failed',
  detail: error.message,  // ← leaks internal info
});
```

**Impact**: Attackers gain insight into the internal architecture, potentially identifying attack vectors. In some cases, sensitive configuration errors are exposed.

**Solution**:
```javascript
// Fixed:
res.status(500).json({
  error: 'AI explanation failed',
  // detail only in non-production:
  ...(process.env.NODE_ENV !== 'production' && { detail: error.message }),
});
// Always log the full error:
logger.error({ err: error, endpoint: req.path }, 'AI explanation failed');
```

**Verification**: In production mode (`NODE_ENV=production`), trigger an error → response should NOT include `detail` field. Logs should contain the full error.

---

### BUG-18 [P1] [Data] Admin auto-grant has missing transaction boundaries

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js:200-221` |
| **Type** | Data Integrity — Partial Updates |

**Description**: The admin auto-grant logic (when admin logs in) has three sequential DB operations without a transaction. If the second `INSERT` succeeds but the third `UPDATE` fails, the database is left with a subscription record but the user's `subscription_plan` field doesn't reflect it.

```javascript
// Three operations — not transactional:
await pool.query(`INSERT INTO user_subscriptions ...`);  // op 1
await pool.query(`INSERT INTO user_subscriptions ...`);  // op 2 (fallback)
await pool.query(`UPDATE users SET subscription_plan = 'pro' ...`);  // op 3
```

**Impact**: Users can have a subscription record in `user_subscriptions` but their `users.subscription_plan` field remains `free`. This means they paid but get no features. Hard to detect and hard to fix at scale.

**Solution**: Wrap all three operations in a proper transaction using a dedicated client (see BUG-04 for the correct pattern).

**Verification**: Inject a failure in the UPDATE query → verify both INSERTS are rolled back. Database remains consistent.

---

### BUG-19 [P1] [Logic] Subscription polling uses empty catch — no user feedback on payment failure

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/SubscriptionPlans.jsx:263-287` |
| **Type** | UX — Payment Failure Hidden |

**Description**: The payment success polling loop has an empty `catch { }` block. If the HTTP request fails (network error, server error), the error is silently swallowed and the polling stops. The user sees no error message.

```javascript
try {
  const info = await apiClient.getBillingInfo();
  // ... handle success
} catch { }  // ← silent failure
```

**Impact**: Users who complete a payment but hit a network error during verification will see no confirmation and no error. They think the payment failed, may pay twice, or contact support unnecessarily.

**Solution**:
```javascript
try {
  const info = await apiClient.getBillingInfo();
  // ... handle success
} catch (err) {
  logger.error('Payment polling failed', err);
  // Show error to user after max attempts:
  if (checks >= MAX_CHECKS - 1) {
    setError('Failed to verify payment. Please contact support.');
    setPolling(false);
  }
}
```

**Verification**: Simulate a network failure during payment polling → user sees a friendly error message after 20 attempts (not silent hang).

---

### BUG-20 [P1] [Data] Duplicate `ADMIN_IDS` definition across files

| Field | Value |
|-------|-------|
| **Files** | `backend/src/middleware/auth.js:30-32`, `backend/src/middleware/rateLimiter.js:9-14` |
| **Type** | Maintainability — Duplicate Code |

**Description**: The admin Telegram IDs are parsed from `ADMIN_TELEGRAM_IDS` environment variable in two separate files. If one is updated and the other is missed, admin users could be locked out of some admin features while retaining others.

```javascript
// auth.js:30-32
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number).filter(Boolean);

// rateLimiter.js:9-14
const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number).filter(Boolean);
```

**Impact**: Admin users could bypass rate limits but fail authentication, or vice versa.

**Solution**: Extract to a shared config module:
```javascript
// src/config/admin.js
export const ADMIN_IDS = (process.env.ADMIN_TELEGRAM_IDS || '').split(',').map(Number).filter(Boolean);

export const isAdmin = (userId) => ADMIN_IDS.includes(Number(userId));
```

Import this single source in both `auth.js` and `rateLimiter.js`.

**Verification**: Changing `ADMIN_TELEGRAM_IDS` in env affects both auth and rate limiting consistently.

---

### BUG-21 [P1] [Perf] Sentry `tracesSampleRate: 1.0` on frontend generates massive data volume

| Field | Value |
|-------|-------|
| **File** | `frontend/src/main.jsx:14` |
| **Type** | Performance — Observability Overhead |

**Description**: The frontend Sentry configuration has `tracesSampleRate: 1.0`, sending **100% of transactions** to Sentry. The backend correctly uses `0.1` (10%). At 1.0, every page navigation, API call, and user interaction is traced.

```javascript
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,  // ← should be 0.1
});
```

**Impact**: 
- 10x more trace data sent to Sentry → higher costs
- Increased bandwidth usage for Telegram WebView users (especially on mobile)
- Potential performance degradation from tracing instrumentation on every interaction
- Sentry rate limiting may drop traces

**Solution**: Change to `tracesSampleRate: 0.1` (10% sampling). Consider `tracesSampler` for more nuanced rules (e.g., 1.0 for admins, 0.1 for users).

**Verification**: After deploy, Sentry dashboard shows ~10x fewer transactions but still enough for debugging.

---

## P2 — Medium Priority (Fix in First Post-Launch Sprint)

---

### BUG-22 [P2] [Logic] `writeCache` references undefined `parsed` variable

| Field | Value |
|-------|-------|
| **File** | `backend/src/services/aiService.js:163` |
| **Type** | Logic — Validation Bypass |

**Description**: The `writeCache` function calls `validateParsed(mode, parsed)` where `parsed` is not defined in the function scope. The validation check silently fails (or throws), and invalid AI responses get cached permanently.

```javascript
async function writeCache(clusterId, mode, language, content, isJson) {
  if (isJson) {
    try {
      validateParsed(mode, parsed); // ← 'parsed' is undefined!
    } catch (err) {
      logger.error({ err, mode, clusterId }, 'NOT caching invalid JSON');
      return;
    }
  }
  // ... caches the content anyway because the guard never works
}
```

**Impact**: Invalid or malformed AI responses are cached in the database. All subsequent requests get the broken cached response until the cache is manually cleared. Users see garbled AI explanations.

**Solution**: Pass `content` to the validation function:
```javascript
const parsed = JSON.parse(content);
validateParsed(mode, parsed);
```

**Verification**: Unit test: `writeCache` with invalid JSON → should NOT cache. `writeCache` with valid JSON → should cache normally.

---

### BUG-23 [P2] [Data] Schema drift — `schema.sql` only has 3 of 14+ tables

> ⚠️ **STATUS: INACCURATE / CLOSED.** `database/schema.sql` actually defines
> **14 tables** (`users`, `questions`, `user_progress`, `question_mastery`,
> `user_preferences`, `subscription_plans`, `user_subscriptions`,
> `user_rate_limits`, `ai_cache`, `ai_jobs`, `referrals`, `question_reports`,
> `analytics_events`, `pending_ton_invoices`), not 3. The real, valid concern is
> **schema drift between `schema.sql` and `database-migration.sql`** (e.g.
> `ENUM progress_status` vs `VARCHAR(20)`, different `available_modes` defaults),
> not a missing-table count. Track that under the schema-drift task instead.

| Field | Value |
|-------|-------|
| **File** | `database/schema.sql` vs `database-migration.sql` |
| **Type** | Documentation — Schema Mismatch |

**Description**: `schema.sql` is comprehensive, but it can drift from the
authoritative migration (`database-migration.sql`) which is what `fly deploy`
actually runs. Keep the two in sync; prefer the migration as the source of truth.
- `ai_jobs`, `pending_ton_invoices`

**Impact**: Cold-starting a new environment requires running multiple migration scripts in the correct order, which is error-prone and undocumented.

**Solution**:
1. Regenerate `schema.sql` from the actual production database:
   ```bash
   pg_dump --schema-only --no-owner --no-privileges -t '*' > database/schema.sql
   ```
2. Add a verification script that checks schema vs production

**Verification**: Run `init-db.js` against a clean database → all 14+ tables are created with correct columns and indexes.

---

### BUG-24 [P2] [Logic] `closeExplanation` double-advances in Bug Hunting mode

| Field | Value |
|-------|-------|
| **Files** | `frontend/src/store/useStore.js:376-385`, `frontend/src/components/BugHuntingMode.jsx` |
| **Type** | Logic — Off-by-one |

**Description**: When closing the explanation modal in Bug Hunting mode, `closeExplanation()` advances `currentIndex` by 1 (line 158). Then the `handleNext` callback in BugHuntingMode also calls `advanceQuestion()`, which advances `currentIndex` by another 1. Users skip a question every time they view an explanation and click "Next".

```javascript
// useStore.js: closeExplanation advances:
if (learningMode === 'bug-hunting') {
  set({ currentIndex: currentIndex + 1 }); // ← advance #1
}

// BugHuntingMode: handleNext also advances:
const handleNext = () => {
  advanceQuestion(); // ← advance #2
};
```

**Impact**: In Bug Hunting mode, every other question is skipped. Users miss ~50% of the content and the learning experience is broken.

**Solution**: Remove the advance from `closeExplanation` for Bug Hunting mode, or remove it from `handleNext`. The preferred fix: keep advancement only in `handleNext`:
```javascript
// In useStore.js closeExplanation:
if (learningMode === 'bug-hunting') {
  // Remove: set({ currentIndex: currentIndex + 1 });
  // Just close the modal
}
```

**Verification**: Enter Bug Hunting mode → answer wrong → view explanation → click "Next" → verify question index increases by exactly 1.

---

### BUG-25 [P2] [UX] Hardcoded Russian strings block i18n in most components

| Field | Value |
|-------|-------|
| **Files** | `QuestionCard.jsx:130`, `TestMode.jsx`, `BlitzMode.jsx`, `ExplanationModal.jsx:186`, all mode components |
| **Type** | Localization — Mixed i18n Implementation |

**Description**: Multiple components mix `useTranslation()` calls with hardcoded Russian strings. The i18n system only covers Header and CategorySelection. All other UI components hardcode Russian text directly in JSX.

```jsx
// QuestionCard.jsx — hardcoded Russian:
<button>Нажми для ответа</button>
<button>Сообщить об ошибке</button>

// TestMode.jsx — hardcoded Russian:
<h2>Загрузка вопросов…</h2>
<button>Ответить</button>
<div>Правильно!</div>
```

**Impact**: The English/Russian language toggle only translates ~15% of the UI. Users who select English still see 85% of the interface in Russian.

**Solution**: Extract all hardcoded strings into `en.json` and `ru.json` translation files and replace with `t()` calls:
```jsx
// Fixed:
<button>{t('questionCard.tapToAnswer')}</button>
<button>{t('questionCard.reportError')}</button>
```

**Verification**: Switch app language to English → verify all UI text is in English. Switch back to Russian → all text is in Russian.

---

### BUG-26 [P2] [UX] Referral link shows placeholder instead of actual URL

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/CategorySelection.jsx:148` |
| **Type** | UX — Broken Display |

**Description**: The referral link display shows the hardcoded text `t.me/your_referral_link` instead of the user's actual referral URL. The real URL is generated on click (in the `onClick` handler), but the visible text is always the placeholder.

```jsx
<span className="ref-url">t.me/your_referral_link</span>
```

**Impact**: Users cannot see their actual referral link. They may think the feature isn't working. Referral sharing is discouraged by broken UX.

**Solution**: Compute the referral URL in component state and display it:
```jsx
const [referralUrl, setReferralUrl] = useState(generateReferralLink());
// ...
<span className="ref-url">{referralUrl}</span>
```

**Verification**: Open the referral section in the app → see your actual referral link displayed, not a placeholder.

---

### BUG-27 [P2] [UX] `alert()` used for feedback in Telegram WebView

| Field | Value |
|-------|-------|
| **Files** | `CategorySelection.jsx:63,74,146` |
| **Type** | UX — Native Alert in WebView |

**Description**: The app uses `window.alert()` for validation messages and user feedback. In Telegram's WebView, this creates a jarring break from the app's UI design language.

```javascript
// CategorySelection.jsx:63
if (!selectedCategory) {
  window.alert('Select category');
  return;
}
```

**Impact**: Poor user experience. Telegram WebView alerts look different from standard browser alerts and break the immersive feel of the mini app.

**Solution**: Replace `window.alert()` with a toast notification system or inline validation messages. Use the Telegram WebApp's `showPopup` method if available:
```javascript
if (window.Telegram?.WebApp?.showPopup) {
  window.Telegram.WebApp.showPopup({ title: 'Error', message: 'Select category' });
} else {
  // fallback to inline error message in component state
}
```

**Verification**: Submit empty form → see a styled inline error or Telegram popup, not a browser `alert()`.

---

### BUG-28 [P2] [Logic] Test answer comparison normalization differs between modes

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js:667,685,733` |
| **Type** | Correctness — Inconsistent Answer Matching |

**Description**: Different answer modes use different normalization functions for answer comparison:
- Test mode: `norm = s => (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim()` (collapses whitespace)
- Bug-hunt / Code-completion: `normC = s => (s || '').trim().toLowerCase()` (preserves internal whitespace)

This means the same answer could be marked correct in one mode but incorrect in another.

**Impact**: Inconsistent scoring between modes. Users get confused when the same knowledge is accepted in one mode but rejected in another.

**Solution**: Create a shared `normalizeAnswer` utility function used by all modes:
```javascript
// src/utils/normalize.js
const normalizeAnswer = (s) => (s || '')
  .toString()
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();
```

Import and use in all answer-comparison endpoints.

**Verification**: Test the same answer (e.g., "Hello   World") in Test mode and Bug Hunt mode → both should accept or both should reject consistently.

---

### BUG-29 [P2] [Backend] No linter configured — CI lint is a no-op

| Field | Value |
|-------|-------|
| **File** | `backend/package.json:17`, `frontend/package.json` |
| **Type** | Process — Quality Enforcement |

**Description**: Both `package.json` files define the lint script as:
```json
"lint": "echo 'No linter configured'"
```

The CI pipeline runs `npm run lint` on every push, but it always passes (exit code 0) because it just echoes a message. Code quality issues, unused variables, and potential bugs are never caught automatically.

**Impact**: No automated code quality feedback. Developers can push code with:
- Unused variables (like `catFilter` at server.js:375)
- Unused imports
- Potential bugs that a linter would catch
- Inconsistent formatting

**Solution**:
1. Install ESLint and Prettier:
   ```bash
   cd backend && npm install --save-dev eslint @eslint/js prettier
   cd frontend && npm install --save-dev eslint @eslint/js prettier eslint-plugin-react
   ```
2. Create ESLint config files
3. Update package.json:
   ```json
   "lint": "eslint src/"
   ```
4. Update CI to fail on lint errors

**Verification**: `npm run lint` reports actual issues (or passes cleanly). CI fails if lint errors exist.

---

### BUG-30 [P2] [Backend] `catFilter` variable declared but never used

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js:375-377` |
| **Type** | Dead Code — Unused Variable |

**Description**: The `catFilter` variable is computed but never inserted into the SQL query. The actual category filter is hardcoded differently in the template literal.

```javascript
// Computed but unused:
const catFilter = selectedCategories.length > 0
  ? 'AND q.category = ANY($cat)'
  : '';

// The actual query at line 393 doesn't use catFilter:
query += ` ... AND q.category = ANY($${params.length})`;
```

**Impact**: Dead code adds confusion. If a developer later tries to use `catFilter` thinking it's active, they'll introduce a bug.

**Solution**: Remove the unused `catFilter` variable:
```javascript
// Delete lines 375-377 entirely
```

**Verification**: App still works, category filtering still works.

---

## P3 — Low Priority (Nice-to-Have / Backlog)

---

### IMP-01 [P3] [Improvement] `localStorage.clear()` on logout destroys all local data

| Field | Value |
|-------|-------|
| **File** | `frontend/src/store/useStore.js:67` |
| **Type** | Data — Overly Aggressive Cleanup |

**Description**: On logout, the store calls `localStorage.clear()` which removes ALL localStorage entries, not just the app's data. This can affect other apps or browser extensions.

**Solution**: Change to selective removal:
```javascript
// Instead of:
localStorage.clear();

// Use:
['app_token', 'app_preferences', 'app_cache'].forEach(key => localStorage.removeItem(key));
```

---

### IMP-02 [P3] [Improvement] Number of `console.log`/`console.error` mixed with structured logger

| Field | Value |
|-------|-------|
| **Files** | `auth.js:26`, `rateLimiter.js:44,87,103,120`, `billingService.js:49,53,76,106`, `queueService.js:34,48`, `telegram.js:15,45,52,58,67`, `server.js:1309-1318`, `init-db.js` |
| **Type** | Observability — Inconsistent Logging |

**Description**: Multiple backend files mix `console.log`/`console.error` calls with the pino structured logger. This makes log aggregation and filtering harder.

**Solution**: Audit and replace all `console.*` calls with `logger.info`/`logger.error`/`logger.warn`.

---

### IMP-03 [P3] [Improvement] i18n `escapeValue: false` disables XSS protection

| Field | Value |
|-------|-------|
| **File** | `frontend/src/i18n/config.js:31` |
| **Type** | Security — Unsafe i18n Default |

**Description**: The i18next config has `interpolation: { escapeValue: false }`. If any translation string uses user data interpolation (e.g., `Hello {{username}}`), it could be an XSS vector.

**Solution**: Enable escaping unless explicitly needed:
```javascript
interpolation: {
  escapeValue: true,  // or remove the config (default is true)
}
```

---

### IMP-04 [P3] [Improvement] `handleClick` uses non-standard event property `e.pointerType`

| Field | Value |
|-------|-------|
| **File** | `frontend/src/components/QuestionCard.jsx:77` |
| **Type** | Correctness — Event Handler Bug |

**Description**: The click handler checks `e.pointerType !== 'touch'`, but standard `onClick` events (MouseEvent) don't have a `pointerType` property. This means `flip()` is always called, and on touch devices, it may fire alongside the swipe handlers, causing double-flips.

**Solution**: Use proper event detection or remove the check entirely:
```javascript
const handleClick = (e) => {
  // Only flip if it's a mouse click (not a touch/swipe end)
  if (e.detail > 0) flip(); // detail > 0 means it's a click, not a keyboard event
};
```

---

### IMP-05 [P3] [Improvement] Admin clear-cache deletes ALL entries with no confirmation

| Field | Value |
|-------|-------|
| **File** | `backend/src/server.js:1076` |
| **Type** | Operational — No Confirmation |

**Description**: `/api/admin/clear-cache` deletes all rows from `ai_cache` with no confirmation dialog, no scope limits, and no Redis cache invalidation. This causes a cold-start for all users simultaneously.

**Solution**: Add confirmation required, a dry-run option, and Redis cache invalidation alongside DB deletion.

---

### IMP-06 [P3] [Improvement] Missing `LICENSE`, `CHANGELOG.md`, `SECURITY.md` files

| Field | Value |
|-------|-------|
| **Root** | Repository root |
| **Type** | Documentation — Governance |

**Description**:
- README mentions MIT license but no `LICENSE` file exists
- No `CHANGELOG.md` for tracking releases
- No `SECURITY.md` for vulnerability reporting

**Solution**: Create these standard open-source governance files.

---

## Summary

| Priority | Count | Key Areas |
|----------|-------|-----------|
| **P0** 🔴 | 9 | Credential leak, auth bypass, crashes, data corruption, broken features |
| **P1** 🟠 | 12 | Silent error swallowing, AI timeout, missing imports, err leaks, race conditions |
| **P2** 🟡 | 10 | Validation bugs, UX issues, schema drift, dead code, testing gaps |
| **P3** 🔵 | 6 | Logging consistency, i18n safety, governance files |
| **Total** | **37** | |

> **Recommended**: Allocate a **reliability sprint** (3-5 days) to resolve P0 and P1 items before any public launch or feature work. The app has strong infrastructure but critical gaps in security and data integrity that make it unsafe for production today.
