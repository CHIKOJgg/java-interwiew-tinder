# Deployment Guide

## 1. Supabase (Database)

```bash
# 1. Create project at https://supabase.com
# 2. Go to Project Settings → Database → Connection string (PSQL)
# 3. Run migration:
psql "postgresql://..." -f backend/database-migration.sql
psql "postgresql://..." -f database/schema.sql

# 4. Seed questions (optional):
cd backend
npm run seed-db
```

Copy the connection URI (`postgresql://...`).

---

## 2. Fly.io (Backend)

### Prerequisites

```bash
# Install flyctl
# Windows: winget install Fly-io.flyctl
# macOS: brew install flyctl
# Linux: curl -fsSL https://fly.io/install.sh | sh

fly auth login
```

### Deploy

```bash
cd backend

# Set secrets (one-time)
fly secrets set \
  DATABASE_URL="postgresql://..." \
  BOT_TOKEN="your:telegram_bot_token" \
  OPENROUTER_API_KEY="sk-or-..." \
  JWT_SECRET="$(openssl rand -hex 32)" \
  ADMIN_TELEGRAM_IDS="123456789,987654321" \
  REDIS_URL="redis://..." \
  ALLOWED_ORIGINS="https://your-frontend.vercel.app" \
  SENTRY_DSN="https://..." \
  LOGTAIL_TOKEN="..." \
  TON_WALLET_ADDRESS="UQ..." \
  TON_CENTER_API_KEY="..." \
  FRONTEND_URL="https://your-frontend.vercel.app"

# Deploy
fly deploy

# Check logs
fly logs
```

### Redis (optional — for rate limiting + AI cache)

```bash
# Create Redis via Fly.io (free tier available):
fly redis create

# Or use Upstash (easier, free tier):
# https://console.upstash.com → create Redis → copy REST URL
```

### Worker (for background AI generation)

```bash
# Deploy separate worker instance:
fly deploy --config fly.worker.toml
```

---

## 3. Vercel (Frontend)

### Connect repo

1. Go to [vercel.com](https://vercel.com) → Add New Project
2. Import your GitHub repo
3. Set root directory to `frontend`

### Environment Variables

```
VITE_API_URL=https://your-app.fly.dev/api
VITE_SENTRY_DSN=https://...
```

### Deploy

Vercel auto-deploys on push to `main`.

---

## 4. Telegram Bot Configuration

1. Go to [@BotFather](https://t.me/BotFather)
2. Set Mini App URL:
   ```
   /setmenubutton → select bot → send URL:
   https://your-frontend.vercel.app
   ```
3. Set bot domain for Mini App:
   ```
   /setdomain → your-frontend.vercel.app
   ```
4. Enable Payments (for Stars billing):
   ```
   @BotFather → My bots → Bot Settings → Payments → Connect Telegram Stars
   ```
5. Point `BOT_TOKEN` environment variable to this bot's token.

---

## 5. Post-Deploy Verification

```bash
# Health check
curl https://your-app.fly.dev/health

# Check logs
fly logs

# Open in browser
open https://your-frontend.vercel.app
```

### Verify via Telegram Mini App

1. Open Telegram → find your bot
2. Tap menu button → app should load
3. Check:
   - Login works (auth with Telegram)
   - Questions load in swipe mode
   - AI explanations work
   - Subscription flow works
