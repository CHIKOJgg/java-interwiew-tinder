# Launch Checklist — Java Interview Tinder

> Single source of truth to go from "code ready" → "first users", with **$0 budget**.
> Each step is concrete and verifiable. Do them IN ORDER — steps 1–3 are
> security/launch-blockers; do not send traffic before step 6 is green.

> ⚠️ Domain note: the repo still contains placeholders (`your-domain.com`,
> `java-interwiew-tinder.fly.dev` — note the typo "interwiew"). Replace
> `<DOMAIN>` and `<BACKEND>` below with your real values everywhere:
> `frontend/index.html`, `frontend/public/sitemap.xml`, `robots.txt`,
> `frontend/public/java-interview-questions.html` (canonical), `PROMO_POSTS.md`,
> and `backend/.env.example` / Fly secrets.

---

## Step 1 — Rotate & remove secrets from disk (BLOCKER)
The repo's `.env` files are git-ignored (safe in git), but real secrets still
sit in `backend/.env` / `frontend/.env` on disk. Treat them as compromised.

1. Rotate ALL of these (old values are in git history):
   - Supabase DB password (dashboard)
   - Telegram Bot Token (`@BotFather` → revoke)
   - OpenRouter API key (dashboard)
   - `JWT_SECRET`: `openssl rand -base64 32`
   - Redis password (Upstash/Fly Redis)
   - TON wallet (or monitor closely)
2. **Delete the secret files from disk** (keep only `.env.example`):
   ```powershell
   Remove-Item backend\.env, frontend\.env
   ```
3. Push new values only via CI / Fly secrets (Step 2), never to disk in repo.
4. (Optional, strong) Purge history so old values can't be recovered:
   ```powershell
   pip install git-filter-repo
   git filter-repo --path backend/.env --invert-paths
   git filter-repo --path frontend/.env --invert-paths
   git push --force --all
   ```
   Then ask collaborators to re-clone.

✅ Verify: `backend/.env` and `frontend/.env` do not exist; `git ls-files | Select-String '\.env$'` returns only `.env.example` / `.env.docker`.

---

## Step 2 — Set backend secrets (Fly.io / CI, never committed)
```powershell
cd backend
fly secrets set `
  DATABASE_URL="<supabase-pooler-url>" `
  BOT_TOKEN="<rotated-token>" `
  OPENROUTER_API_KEY="<rotated-key>" `
  JWT_SECRET="<openssl-rand>" `
  REDIS_URL="<upstash-url>" `
  ADMIN_TELEGRAM_IDS="<your-id>" `
  ALLOWED_ORIGINS="https://<DOMAIN>,https://<vercel-app>" `
  FRONTEND_URL="https://<DOMAIN>" `
  STARS_PRO_MONTHLY_AMOUNT=450 `
  STARS_PRO_YEARLY_AMOUNT=3000 `
  TELEGRAM_WEBHOOK_SECRET="<openssl-rand>" `
  SENTRY_DSN="<sentry-dsn>" `
  ENABLE_EMAIL_AUTH=true `
  EMAIL_FROM="no-reply@<DOMAIN>" `
  SMTP_HOST="<smtp-host>" SMTP_PORT=587 SMTP_USER="<user>" SMTP_PASS="<pass>" `
  ENABLE_GOOGLE_AUTH=true GOOGLE_CLIENT_ID="<gcp-client-id>"
```
Worker app (`interview-tinder-worker-1`) needs the same set.

✅ Verify: `fly secrets list` shows all keys, no value printed.

---

## Step 3 — Set frontend env (Vercel)
In Vercel project env (or `frontend/.env` locally before deploy):
```
VITE_API_URL=https://<BACKEND>/api
VITE_SENTRY_DSN=<sentry-dsn>
VITE_GA_MEASUREMENT_ID=<G-XXXXXXXXXX>   # Step 4
VITE_GOOGLE_CLIENT_ID=<same-as-backend>
VITE_TELEGRAM_BOT_USERNAME=JavaInterviewTinderBot
```

✅ Verify: values present in Vercel dashboard; no `your-domain.com` left.

---

## Step 4 — Wire analytics (so you can measure ROI)
1. **Sentry**: set DSN in Step 2 + Step 3 (code already initialized, `main.jsx`, `server.js`).
2. **GA4** (free): create property → copy Measurement ID →
   - set `VITE_GA_MEASUREMENT_ID` (Step 3)
   - add `gtag` snippet to `frontend/index.html` (currently absent — add the
     standard `<script>` after `<head>`, gated on the env var in `main.jsx`).
3. Track the funnel events already emitted by `metricsService` (login, swipe,
   pay) + add GA4 events in `ShareCard` / `SubscriptionPlans` for
   free→Pro conversion and referral-cohort.

✅ Verify: Sentry receives errors; GA4 Realtime shows a test visit.

---

## Step 5 — Replace placeholder domains & fix TypeScript claim  ✅ DONE
- Placeholder domains (`your-domain.com`, typo `interwiew`) already cleaned in
  recent commits; sitemap/canonical typo fixed in this pass.
- **TypeScript removed from public-facing claims** (`index.html` OG description,
  `Landing.jsx` tagline) — 0 seed questions exist. The language option still
  appears in `LanguageSelection.jsx` (shows empty state gracefully); decide later
  whether to hide it or generate ~400 TS questions via the AI worker.
- No `your-domain.com` / `interwiew` strings remain in the repo.

✅ Verify: `grep -r "your-domain.com\|interwiew" .` returns nothing.

---

## Step 6 — Create marketing assets (for posts/ProductHunt)
Already done in code: `frontend/public/icon.svg`, `og-image.png`.
See **`PROMO_ASSETS.md`** for the exact screenshots / GIF / ProductHunt gallery
to capture (you create these once, ~30 min). Drop PNGs into `frontend/public/`.

✅ Verify: assets captured and referenced by launch posts.

---

## Step 7 — Deploy backend + DB
```powershell
cd backend
# First time only: create tables + seed (Java ~946 + Python ~471 Qs)
node src/scripts/migrate.js
npm run seed-db
# Deploy API + worker to Fly.io
.\deploy-production.ps1
```
Health check: `GET https://<BACKEND>/health` → `200`.

✅ Verify: `/health` 200; login via Telegram hash validation enforced;
swipe feed loads; AI explanation returns < ~30s; referral link =
`t.me/<bot>?start=<id>`; email magic-link arrives in inbox.

---

## Step 8 — Deploy frontend (Vercel)
```powershell
cd frontend
.\deploy-frontend.ps1 -Target vercel
```
Set the Vercel domain to your `<DOMAIN>` (or use the `*.vercel.app` URL).

✅ Verify: `https://<DOMAIN>` opens Landing; "Start free" → WebLogin (Google/email)
works; PWA installs; `/java-interview-questions.html` indexed (submit sitemap to
Google Search Console).

---

## Step 9 — Launch organically (texts ready in PROMO_POSTS.md)
In order, all $0:
1. **ProductHunt** (EN) — use the prepared tagline + first comment.
2. **Reddit**: r/learnjava, r/cscareerquestions, r/ExperiencedDevs — post + AMA.
3. **Хабр** (RU) — article per the prepared structure (best RU/CIS converter).
4. **X/Twitter** — daily tip + `#java #interview`.
5. **Telegram-канал** "Question of the Day" → bot; cross-promo with IT channels.
6. Inside-app virality already built: ShareCard + referral (7 days PRO).

✅ Verify: first 100 users; D1/D7 retention + free→Pro in GA4/Sentry.

---

## Step 10 — Post-launch monetization upsides ($0)
- **B2B / white-label** to bootcamps & courses (JavaRush, Hexlet, Skillbox) —
  revenue-share, high LTV.
- **Affiliate** with job boards / recruiters (HH, LinkedIn).
- **Team plans** (code-ready via admin plans).
- Only AFTER metrics are healthy: paid Telegram Ads (from $50), paid channel
  posts, YouTube collabs (revenue-share, not prepaid).

---

## Status legend
- 🔴 Blocker (do before any traffic): Steps 1–3, 7 health check
- 🟠 Needed for measurement: Step 4
- 🟡 Polish: Steps 5–6, 8–10
- ✅ Already in code: icon.svg, og-image.png, SEO page, PWA prompt, email
  mailer, pricing on landing, ShareCard, referral, 7 modes, 3 payment rails
