# Deploy Runbook — Go Live (Блок 2/3)

> Prerequisite for ANY public traffic: Блок 0 security (done in code) + **credential
> rotation** + **git-history secret purge** (skipped at owner's request — do this
> BEFORE launch, see step 0).

## 0. Security prerequisite (do first, once)
1. **Rotate** (old values are in git history and already compromised):
   - Supabase DB password (dashboard)
   - Telegram Bot Token (BotFather → revoke)
   - OpenRouter API key (dashboard)
   - Generate new `JWT_SECRET`: `openssl rand -base64 32`
2. **Purge history** (rewrites shared `origin`, breaks clones):
   ```powershell
   pip install git-filter-repo
   git filter-repo --path backend/.env --invert-paths --replace-text replace.txt
   git push --force --all && git push --force --tags
   ```
   Then ask all collaborators to re-clone.

## 1. Backend secrets (Fly.io / CI)
Set via `fly secrets set` (backend app `java-interwiew-tinder-1` and worker
`interview-tinder-worker-1`), NOT in committed files:

```
DATABASE_URL=...          # Supabase pooler URL (new password)
BOT_TOKEN=...             # rotated Telegram token
OPENROUTER_API_KEY=...    # rotated key
JWT_SECRET=...            # openssl rand -base64 32
REDIS_URL=...             # Upstash / Fly Redis
ADMIN_TELEGRAM_IDS=...    # your Telegram id
ALLOWED_ORIGINS=https://<your-vercel-app>,https://<your-domain>
FRONTEND_URL=https://<your-frontend>
# Billing (at least one enabled):
STARS_PRO_MONTHLY_AMOUNT=450
UKASSA_TOKEN=...          # optional, card payments
SMTP_HOST=... SMTP_PORT=587 SMTP_USER=... SMTP_PASS=...   # email magic-link
ENABLE_EMAIL_AUTH=true
ENABLE_GOOGLE_AUTH=true GOOGLE_CLIENT_ID=...
TELEGRAM_WEBHOOK_SECRET=...   # required in production
SENTRY_DSN=...            # optional
```

`backend/.env` and `.env.example` are templates only — real values come from
Fly secrets. `npm start` runs `server.js`; the worker runs `src/worker.js`.

## 2. Frontend env (Vercel)
`frontend/.env` (or Vercel project env):
```
VITE_API_URL=https://<your-fly-app>.fly.dev/api
VITE_SENTRY_DSN=
VITE_GOOGLE_CLIENT_ID=   # same as backend GOOGLE_CLIENT_ID
VITE_GA_MEASUREMENT_ID=  # optional, GA4
VITE_TELEGRAM_BOT_USERNAME=JavaInterviewTinderBot   # MUST match your bot
```
Replace placeholder domains in:
- `frontend/index.html` (OG/twitter tags — currently `/og-image.png`, fine)
- `frontend/public/sitemap.xml`, `robots.txt` (`java-interwiew-tinder.fly.dev`)
- `frontend/public/java-interview-questions.html` (canonical URL)
- `PROMO_POSTS.md` (`your-domain.com`)

## 3. Deploy
```powershell
# Frontend → Vercel
cd frontend; .\deploy-frontend.ps1 -Target vercel

# Backend + Worker → Fly.io (builds locally, pushes images)
cd backend; .\deploy-production.ps1

# DB: first time only (init + seed)
node src/scripts/migrate.js
```
Health check: `GET https://<fly-app>.fly.dev/health` → 200.

## 4. Post-deploy verification
- [ ] `/health` returns 200 on both apps
- [ ] Login via Telegram Mini App works (hash validation enforces)
- [ ] Swipe feed loads (no crash)
- [ ] AI explanation returns within ~30s
- [ ] Referral link copies as `t.me/<bot>?start=<id>`
- [ ] Web/PWA login (email code) arrives in inbox (SMTP)
- [ ] GA4 / Sentry receiving events (if configured)

## 5. Launch (Блок 3 — manual)
Posts are ready in `PROMO_POSTS.md`:
- ProductHunt launch (EN)
- Reddit: r/learnjava, r/cscareerquestions, r/ExperiencedDevs
- Хабр article (RU)
- X/Twitter daily
- Telegram-канал "Question of the Day"
