# 🐛 Java Interview Tinder — Comprehensive Bug Audit

> **Date**: 2026-05-16  
> **Scope**: Full-stack analysis (backend, frontend, database, security, UX)

---

## 🔴 Critical Bugs (App-breaking / Data-corruption / Security)

### BUG-01: **SECURITY — Telegram Hash Validation Completely Disabled** ⚠️ CRITICAL
**File**: [telegram.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/utils/telegram.js#L40-L50)

The hash validation is **commented out in production**. Lines 40–50 show that when the hash doesn't match, the code logs a warning but **continues executing** instead of returning `null`. This means **any attacker can forge initData** and impersonate any Telegram user.

```javascript
// Line 40-50: Hash mismatch is logged but IGNORED
if (calculatedHash !== hash) {
  console.log('Hash mismatch');
  console.log('⚠️ Skipping hash validation for now');
  // Continues execution — should return null!
}
```

**Impact**: Complete authentication bypass. Attacker can log in as any user, access their data, grant themselves admin.

---

### BUG-02: **CRASH — Undeclared Variable `params` in Question Feed**
**File**: [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L405)

Line 405 uses `params = ...` without `const`/`let`/`var`. In strict mode (ESM modules), this will throw a `ReferenceError`, crashing the `/api/questions/feed` endpoint.

```javascript
// Line 405: Missing declaration keyword
params = selectedCategories.length > 0  // ← ReferenceError in strict mode
  ? [userId, language, selectedCategories, limit]
  : [userId, language, limit];
```

---

### BUG-03: **CRASH — Undefined `stripe` in Stripe Webhook Handler**
**File**: [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L68)

The Stripe webhook handler at line 68 calls `stripe.webhooks.constructEvent(...)`, but `stripe` is never imported or initialized. This will crash on any Stripe webhook delivery.

```javascript
event = stripe.webhooks.constructEvent(req.body, sig, ...);
// 'stripe' is never imported or declared
```

---

### BUG-04: **CRASH — Duplicate Import in App.jsx**
**File**: [App.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/App.jsx#L9-L19)

`CodeCompletionMode` is imported twice (lines 9 and 19). This will cause a build error:

```javascript
// Line 9:
import CodeCompletionMode from './components/CodeCompletionMode';
// Line 19 (DUPLICATE):
import CodeCompletionMode from './components/CodeCompletionMode';
```

---

### BUG-05: **CRASH — Missing `CategorySelection` Import in App.jsx**
**File**: [App.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/App.jsx#L177)

Line 177 renders `<CategorySelection>` but the component is never imported. This will crash the app on first render.

---

### BUG-06: **CRASH — Missing React Hooks Imports in Multiple Components**
**File**: [CategorySelection.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/components/CategorySelection.jsx)

Uses `useState`, `useEffect`, `useCallback`, and `React.memo` but **never imports React or hooks**:

```javascript
// Line 1: Only utility imports — no React, useState, useEffect, useCallback
import { Check, Gift, Copy, Share2 } from 'lucide-react';
```

**Same issue in**: [Header.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/components/Header.jsx) — uses `useState`, `useEffect`, `useCallback` without importing them.

---

### BUG-07: **SECURITY — Credentials Committed to Git**
**File**: [.env](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/.env)

The `.env` file contains **live production credentials** and is checked into the repository:
- Database password: `kolbaserbochhkaBASS12345`
- Bot token: `8220422658:AAGuf...`
- OpenRouter API key: `sk-or-v1-a534...`
- JWT secret: `your_super_secret_jwt_key_change_this_in_production`

**Impact**: Anyone with repo access has full database, bot, and API access. The JWT secret is literally the placeholder string.

---

### BUG-08: **SECURITY — Weak JWT Secret**
**File**: [.env](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/.env#L22)

```
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
```

This is a placeholder, not a real secret. Tokens can be trivially forged.

---

### BUG-09: **CACHE BUG — Undefined `parsed` Variable in `writeCache`**
**File**: [aiService.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/services/aiService.js#L163)

Line 163 references `parsed` but it's never defined in this function scope:

```javascript
async function writeCache(clusterId, mode, language, content, isJson) {
  if (isJson) {
    try {
      validateParsed(mode, parsed); // ← 'parsed' is UNDEFINED here!
    } catch (err) {
      logger.error({ err, mode, clusterId }, '❌ NOT caching invalid JSON');
      return;
    }
  }
  // ... proceeds to cache potentially invalid data
}
```

**Impact**: The validation guard is broken. Invalid AI responses will be cached permanently, polluting the cache.

---

## 🟠 High-Severity Bugs (Logic Errors / Data Issues)

### BUG-10: **LOGIC — Rate Limiter Uses Wrong `userId` Source**
**File**: [rateLimiter.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/middleware/rateLimiter.js#L126)

```javascript
const userId = req.body?.userId || req.query?.userId;
```

After JWT auth middleware sets `req.userId`, the rate limiter reads from `req.body.userId` or `req.query.userId` instead of `req.userId`. Since clients don't send `userId` in body/query (it comes from JWT), **the rate limiter never finds a userId** and always calls `next()` — effectively disabling all per-user rate limiting.

---

### BUG-11: **LOGIC — `closeExplanation` Double-Advances in Bug-Hunting Mode**
**File**: [useStore.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/store/useStore.js#L376-L385)

When closing the explanation modal in bug-hunting mode, `closeExplanation` advances the question. But the `handleNext` function in BugHuntingMode also calls `advanceQuestion()`. The user **skips a question** every time they get a wrong answer and click "Следующая задача".

```javascript
closeExplanation: () => {
  // ...
  if (learningMode === 'bug-hunting') {
    set({ currentIndex: currentIndex + 1 }); // ← advance #1
  }
},
```

And in BugHuntingMode:
```javascript
const handleNext = () => {
  advanceQuestion(); // ← advance #2
};
```

---

### BUG-12: **LOGIC — `login()` Signature Mismatch**
**File**: [client.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/api/client.js#L22)

The `login()` method signature only accepts `initData` (1 param), but the store calls `apiClient.login(initData, referralId)` (2 params). The `referralId` is **silently dropped** and never sent to the server:

```javascript
// client.js line 22:
async login(initData) {  // ← only accepts 1 param
  body: JSON.stringify({ initData }),  // ← referralId never included
}
```

**Impact**: Referral tracking is completely broken. No new user gets their referrer credit.

---

### BUG-13: **LOGIC — New User Detection is Unreliable**
**File**: [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L185)

```javascript
const isNewUser = result.rows[0].created_at > new Date(Date.now() - 5000);
```

Detecting if a user is new by checking if `created_at` is within the last 5 seconds is fragile. Under high latency or slow queries, a genuinely new user might not be detected. Also, the `ON CONFLICT DO UPDATE` doesn't modify `created_at`, so for existing users `created_at` is always old — but if the DB query takes >5 seconds, a new user is missed too.

---

### BUG-14: **LOGIC — Blitz Mode Doesn't Advance Questions**
**File**: [BlitzMode.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/components/BlitzMode.jsx#L62-L81)

After answering, the Blitz mode calls `submitBlitzAnswer()` and clears feedback state, but **never calls `advanceQuestion()`**. The user sees the same question repeatedly:

```javascript
setTimeout(() => {
  setFeedback(null);
  setLocalBlitzData(null);
  // Missing: advanceQuestion()
}, 350);
```

---

### BUG-15: **LOGIC — CodeCompletionMode Uses Undefined `advanceQuestion`**
**File**: [CodeCompletionMode.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/components/CodeCompletionMode.jsx#L68)

`handleNext()` calls `advanceQuestion()`, but it's never destructured from `useStore()`:

```javascript
// Line 31: advanceQuestion is NOT in the destructured list
const { questions, currentIndex, submitCodeCompletionAnswer, isLoadingQuestions,
  hasMoreQuestions, fetchGeneration, language } = useStore();

// Line 68: Will crash with ReferenceError
const handleNext = () => { advanceQuestion(); };
```

---

### BUG-16: **LOGIC — Test Answer Comparison is Flawed**
**File**: [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L651-L652)

The test-answer endpoint compares the user's answer with `shortAnswer`, but the frontend displays shuffled options that include both `shortAnswer` and AI-generated wrong options. The comparison `norm(answer) === norm(correctAnswer)` works only if the user selects the exact `shortAnswer`. But if the AI generates an option that's textually similar to `shortAnswer` (e.g., same but with extra spaces), a correct selection might fail.

---

### BUG-17: **LOGIC — `renderMode()` Has Duplicate Switch Cases**
**File**: [App.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/App.jsx#L182-L248)

Lines 186–191 handle all non-swipe modes with early returns. Then lines 215–248 have a `switch` statement that handles them **again** (but is unreachable for those modes). This is dead code, but the `switch` default falls through to `<TestMode />`, which could cause unexpected behavior if `learningMode` is set to an unknown value.

---

## 🟡 Performance Bugs

### BUG-18: **PERF — Login Runs 5 Random Pre-load Queries Synchronously**
**File**: [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L215-L225)

On every login, the server runs `ORDER BY RANDOM() LIMIT 5` — a full table scan. Then it enqueues 5 AI generation jobs. This adds significant latency to every login request and wastes DB resources.

---

### BUG-19: **PERF — `getAuthHeaders()` Dynamic Import on Every Request**
**File**: [client.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/api/client.js#L13-L18)

Every single API request calls `await import('../store/useStore')` to get the token. Dynamic imports create new module evaluation overhead. The token should be stored on the client instance instead.

---

### BUG-20: **PERF — Sentry `tracesSampleRate: 1.0` in Frontend**
**File**: [main.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/main.jsx#L14)

`tracesSampleRate: 1.0` sends **100% of transactions** to Sentry. This generates massive data volume and slows performance. Backend correctly uses `0.1`. Frontend should too.

---

### BUG-21: **PERF — No Pagination on Admin Users Endpoint**
**File**: [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L1050-L1065)

`/api/admin/users` does a `GROUP BY` with `LEFT JOIN` and `LIMIT 100`. For large user bases, this is an expensive query with no cursor-based pagination.

---

### BUG-22: **PERF — Percentile Query is Expensive**
**File**: [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L1147-L1159)

The `/api/stats/percentile` endpoint runs two correlated subqueries inside a CTE. This scans `user_progress` twice for every request. No caching or rate limiting is applied.

---

### BUG-23: **PERF — Question Feed Query Not Optimized**
**File**: [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L383-L403)

The feed query performs a `LEFT JOIN` on three tables with `RANDOM()` ordering and a `CASE` expression. Missing composite indexes on `(user_id, question_id)` for `question_mastery` would cause sequential scans.

---

## 🟣 UX / UI Bugs

### BUG-24: **UX — `.env` Has `NODE_ENV=production` Locally**
**File**: [.env](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/.env#L20)

The local `.env` is set to `NODE_ENV=production`, which disables dev-mode features (mock validation, CORS bypass, etc.) and enables SSL for the database. This will cause connection failures when developing locally.

---

### BUG-25: **UX — `AI_TIMEOUT_MS = 3000` is Too Low**
**File**: [.env](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/.env#L21)

AI timeout is set to **3 seconds**. OpenRouter free-tier models regularly take 10-30 seconds to respond. This will cause most AI calls to time out, resulting in:
- Empty explanations
- Failed test/bug/blitz data generation
- User sees "AI generation timed out" frequently

---

### BUG-26: **UX — Hardcoded Russian Strings in Components**
Multiple components have hardcoded Russian strings mixed with `useTranslation()` calls:
- [QuestionCard.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/components/QuestionCard.jsx#L130): `"Нажми для ответа"`, `"Сообщить об ошибке"`
- [TestMode.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/components/TestMode.jsx): `"Загрузка вопросов…"`, `"Ответить"`, `"Правильно!"`
- [BlitzMode.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/components/BlitzMode.jsx): `"Блиц-режим"`, `"Поехали!"`
- [ExplanationModal.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/components/ExplanationModal.jsx#L186): `"🎓 Разбор"`, `"Далее →"`
- All other mode components

**Impact**: Language toggle in the app only translates the Header and CategorySelection. All other UI stays in Russian.

---

### BUG-27: **UX — Referral Link Shows Placeholder Text**
**File**: [CategorySelection.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/components/CategorySelection.jsx#L148)

```jsx
<span className="ref-url">t.me/your_referral_link</span>
```

The displayed text is a hardcoded placeholder. The actual link is computed on click but the user sees `"t.me/your_referral_link"` as the display text instead of their actual referral URL.

---

### BUG-28: **UX — `alert()` Used for Validation/Feedback**
**Files**: CategorySelection.jsx lines 63, 74, 146

Using `window.alert()` in a Telegram WebApp breaks the immersive experience. Should use toast notifications or inline messages.

---

### BUG-29: **UX — Explanation Modal Shows on Every Wrong Answer Automatically**
**File**: [useStore.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/store/useStore.js#L172)

In swipe mode, swiping left (don't know) automatically triggers `loadExplanation()` and opens the modal. This interrupts the swipe flow — users who just want to mark "unknown" and move on are forced to wait for/dismiss the explanation.

---

## 🔵 Minor / Code Quality Issues

### BUG-30: **Mixed `console.log` / `console.error` with Structured Logger**
The backend uses both `console.log`/`console.error` and `logger.info`/`logger.error` inconsistently:
- [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L101): `console.warn()` inside Stripe webhook
- [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L106): `console.log()` for unhandled events
- [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L147): `console.error()` for categories

This defeats the purpose of structured logging and makes production log analysis harder.

---

### BUG-31: **Admin Clear-Cache Deletes ALL AI Cache**
**File**: [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L1076)

```javascript
await pool.query('DELETE FROM ai_cache');
```

Clears the **entire** `ai_cache` table with no confirmation, no scope limits, and no Redis invalidation. All users will experience cold-start AI generation delays simultaneously.

---

### BUG-32: **`catFilter` Variable Declared But Never Used**
**File**: [server.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/backend/src/server.js#L375-L377)

```javascript
const catFilter = selectedCategories.length > 0
  ? 'AND q.category = ANY($cat)'
  : '';
```

This variable is computed but **never inserted into the query**. The actual category filter is hardcoded in the template literal at line 393 instead.

---

### BUG-33: **`localStorage.clear()` on Logout Destroys All Local Storage**
**File**: [useStore.js](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/store/useStore.js#L67)

```javascript
localStorage.clear(); // Clears ALL local storage, not just app data
```

If any other application data is stored in localStorage (i18n preferences, etc.), it gets wiped.

---

### BUG-34: **`QuestionCard` Click Handler Uses Non-Standard Event Property**
**File**: [QuestionCard.jsx](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/frontend/src/components/QuestionCard.jsx#L77)

```javascript
const handleClick = (e) => {
  if (e.pointerType !== 'touch') flip();
};
```

The `onClick` event doesn't have a `pointerType` property — that's only on `PointerEvent`. A standard `MouseEvent` from `onClick` will have `e.pointerType === undefined`, which is !== 'touch', so `flip()` fires on every click. This means **click-to-flip fires alongside the touch handlers on mobile**, potentially causing double-flips.

---

### BUG-35: **Database Schema Drift**
**File**: [schema.sql](file:///c:/Users/Honor/Desktop/Code/java-interview-tinder/database/schema.sql)

The `schema.sql` file has a minimal schema (users, questions, user_progress only). The actual codebase uses many more tables that aren't in this file:
- `user_preferences`
- `user_subscriptions`
- `subscription_plans`
- `user_rate_limits`
- `question_mastery`
- `question_reports`
- `referrals`
- `ai_cache`
- `analytics_events`

The migration file `database-migration.sql` likely covers these, but having the base schema out of sync makes cold starts fail.

---

## Summary

| Severity | Count | Key Areas |
|----------|-------|-----------|
| 🔴 Critical | 9 | Auth bypass, crashes, security |
| 🟠 High | 8 | Logic errors, broken features |
| 🟡 Performance | 6 | DB queries, tracing overhead |
| 🟣 UX/UI | 6 | i18n, broken referrals |
| 🔵 Minor | 6 | Code quality, schema drift |
| **Total** | **35** | |

> [!CAUTION]
> **BUG-01 (auth bypass)** and **BUG-07/BUG-08 (leaked credentials)** should be fixed immediately before any production deployment. The Telegram hash validation being disabled means anyone can impersonate any user.
