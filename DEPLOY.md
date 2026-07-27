# Deployment Guide — Railway

This guide covers deploying the **java-interview-tinder** backend to Railway, step by step, from zero to production.

---

## Architecture

```
  ┌─────────────┐      ┌──────────────────┐      ┌─────────────────────┐
  │  Vercel      │ ───▶ │  Railway Backend │ ───▶ │  Supabase (Postgres)│
  │  (Frontend)  │ ◀──  │  (Node.js + Redis)│      │  (managed DB)       │
  └─────────────┘      └──────────────────┘      └─────────────────────┘
         │                        │
         │  VITE_API_URL          │  REDIS_URL, DATABASE_URL
         │  /api                  │  (injected env vars)
         ▼                        ▼
  https://<proj>.vercel.app   https://<service>.up.railway.app
```

The backend runs **two processes** in a single Railway container:

| Process   | Command          | Role                                              |
| --------- | ---------------- | ------------------------------------------------- |
| API       | `src/server.js`  | Express REST API (health, auth, search, TTS, etc.)|
| Worker    | `src/worker.js`  | Background job processor (AI tasks, Redis queue)  |

Both are started via `npm run start:all` (`backend/scripts/start-all.mjs`).

---

## Prerequisites

1. **GitHub account** — repo already pushed
2. **Railway account** — [railway.app](https://railway.app)
3. **Vercel account** — [vercel.com](https://vercel.com)
4. **Supabase account** — [supabase.com](https://supabase.com)
5. **Telegram bot token** — from [@BotFather](https://t.me/BotFather)
6. **Railway CLI** (optional, for manual deploys):
   ```bash
   # Windows:
   winget install RailwayCLI.RailwayCLI
   # macOS:
   brew install railwayapp/tap/railway
   # Linux:
   npm install -g @railway/cli
   ```

---

## Step 1: Prepare the Repository

### 1.1 Verify the config files exist

```
java-interview-tinder/
├── railway.toml              ← Railway config (build, deploy, env)
├── backend/
│   ├── Dockerfile            ← Multi-stage Node 22 build, uses start:all
│   └── package.json          ← start:all script defined
├── .github/workflows/deploy.yml   ← CI/CD (frontend → Vercel)
└── .env.example              ← Full env var template
```

### 1.2 Verify the Dockerfile uses `start:all`

```dockerfile
CMD ["npm", "run", "start:all"]
```

This runs both the API server and the background worker together.

---

## Step 2: Set Up Supabase (Database)

1. Create a project at https://supabase.com
2. Go to **Project Settings → Database → Connection string (PSQL)**
3. Run the migrations:
   ```bash
   psql "postgresql://..." -f backend/database-migration.sql
   ```
4. Copy the connection URI (`postgresql://...`). You'll need it for Railway env vars.

---

## Step 3: Connect to Railway

### Option A: GitHub Auto-Deploy (Recommended)

1. Go to [railway.app](https://railway.app) → **New Project** → **GitHub**
2. Select your repo and the `backend` root directory
3. Railway auto-detects the `Dockerfile` and `railway.toml`
4. Push to `main` — Railway builds and deploys automatically

### Option B: Manual CLI Deployment

```bash
# Login
railway login

# Create a new project (one-time)
railway new jit-backend --region frankfurt

# Link to the project
railway link jit-backend

# Deploy (builds Docker image and pushes)
railway up

# Check logs
railway logs
```

---

## Step 4: Configure Environment Variables

Set all production secrets in Railway dashboard → **Variables** tab (or via CLI):

```bash
railway variables set \
  DATABASE_URL="postgresql://..." \
  BOT_TOKEN="your:telegram_bot_token" \
  OPENROUTER_API_KEY="sk-or-..." \
  JWT_SECRET="$(openssl rand -hex 32)" \
  ADMIN_TELEGRAM_IDS="123456789,987654321" \
  REDIS_URL="redis://..." \
  ALLOWED_ORIGINS="https://your-frontend.vercel.app" \
  FRONTEND_URL="https://your-frontend.vercel.app" \
  SENTRY_DSN="https://..." \
  LOGTAIL_TOKEN="..." \
  TON_WALLET_ADDRESS="UQ..." \
  TON_CENTER_API_KEY="..." \
  NODE_ENV="production" \
  PORT="10000"
```

### Required variables

| Variable | Description | Source |
| -------- | ----------- | ------ |
| `DATABASE_URL` | Supabase Postgres connection URI | Supabase dashboard → Settings → Database |
| `BOT_TOKEN` | Telegram bot token | @BotFather |
| `JWT_SECRET` | Random 32+ char string | `openssl rand -hex 32` |
| `REDIS_URL` | Redis connection string | Railway Redis add-on |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Your Vercel URL |
| `FRONTEND_URL` | Frontend URL for redirects | Your Vercel URL |
| `TELEGRAM_WEBHOOK_SECRET` | Random secret for webhook auth | `openssl rand -hex 32` |

### Important notes

- **`PORT`** must be `10000` (Railway's expected port). The `railway.toml` sets this.
- **`NODE_ENV`** must be `production` for production hardening (fail-fast on missing secrets, etc.).
- **`REDIS_URL`** — add a Redis add-on from Railway dashboard, or use Upstash (free tier). The backend reads this for rate limiting and AI response caching.

---

## Step 5: Add Redis to Railway

1. In the Railway dashboard, go to your project
2. Click **"Add Service"** → **"Redis"**
3. Railway provisions Redis and auto-wires `REDIS_URL`
4. Copy the Redis connection string to your env vars if not auto-wired

### Alternative: Upstash Redis (free tier)

```bash
# Get URL from Upstash dashboard
REDIS_URL="rediss://..."
```

---

## Step 6: Set Up the Telegram Bot

1. Talk to [@BotFather](https://t.me/BotFather)
2. Create a new bot (or use existing)
3. Get the bot token (format: `123456:ABC-DEF...`)
4. Optionally set the webhook URL to `https://<your-railway-app>.up.railway.app/webhook`
5. Set `ADMIN_TELEGRAM_IDS` to your numeric ID (get it from @userinfobot)

---

## Step 7: Run Migrations (One-Time)

After the first deploy, run the database migrations:

```bash
# From your laptop
cd backend
DATABASE_URL="<your-supabase-url>" npm run setup-db
```

**Important:** The `setup-db` command is idempotent — running it twice is safe. It creates tables, seeds questions, and applies all migrations.

### Alternative: Run migrations on first deploy

Temporarily override the start command in Railway dashboard:
1. Go to Railway → Service → Settings → **Start Command**
2. Change to: `npm run setup-db && npm run start:all`
3. Trigger a manual deploy
4. After deploy succeeds, change back to `npm run start:all`
5. Trigger another deploy

---

## Step 8: Connect the Frontend to Railway Backend

The frontend on Vercel needs to know the Railway backend URL.

1. Deploy the backend to Railway first (Steps 1–7)
2. Note the Railway URL (e.g., `https://jit-backend-production-xxxx.up.railway.app`)
3. Go to your Vercel project → **Settings → Environment Variables**
4. Set `VITE_API_URL` to: `https://<your-railway-app>.up.railway.app/api`
5. Push to `main` — Vercel auto-deploys the frontend

### Local development

For local dev, set `VITE_API_URL=http://localhost:3000/api` in `frontend/.env`.

---

## Step 9: Verify the Deployment

### Health check

```bash
curl https://<your-app>.up.railway.app/health
```

Expected response:
```json
{"status":"ok","db":"connected","redis":"connected","uptime":...}
```

### Smoke tests

1. Open `https://<your-frontend>.vercel.app` in a browser
2. Start a conversation with the Telegram bot
3. Send `/start` — should return the welcome message
4. Try swiping a card — API should respond
5. Check Railway logs for any errors: `railway logs` or Railway dashboard → Logs

### Common issues

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| `db: disconnected` | Wrong `DATABASE_URL` | Verify Supabase pooler URL & credentials |
| CORS error | `ALLOWED_ORIGINS` missing Vercel URL | Add frontend URL and redeploy |
| Cold start slow | Free tier spins down after 15 min idle | Use a pinger (UptimeRobot) every 5 min |
| Worker not running | `start:all` not set | Verify Dockerfile `CMD` uses `npm run start:all` |
| `JWT_SECRET` too short | Under 16 characters | Regenerate with `openssl rand -hex 32` |

---

## Pricing (Railway Hobby Plan)

| Item | Cost | Included |
| ---- | ---- | -------- |
| Railway Hobby | $5/mo | 512MB RAM, 512MB storage, 100GB bandwidth |
| Redis add-on | Free tier | Rate limiting + AI cache |
| Supabase | Free tier | Postgres database |
| Vercel | Free tier | Frontend hosting |
| **Total** | **$5/month** | Full app (backend + frontend + DB + cache) |

### Limitations to know

- Railway Hobby **spins down** after 15 min of inactivity (~1 min cold start)
- For 24/7 uptime (no cold starts), upgrade to Railway Pro ($20/month)
- Free Redis (Railway or Upstash) has memory limits — sufficient for rate-limiting and AI cache

---

## CI/CD Summary

| Service | Deployment | Trigger |
| ------- | ---------- | ------- |
| Backend | Railway | Push to `main` (GitHub auto-deploy) |
| Frontend | Vercel | Push to `main` (GitHub auto-deploy) |
| Tests | GitHub Actions CI | PR / push to any branch |

The GitHub Actions workflow (`.github/workflows/deploy.yml`) handles frontend Vercel deployments. Backend deploys automatically via Railway's GitHub integration. No backend CI deploy step is needed.

---

## File Reference

| File | Purpose |
| ---- | ------- |
| `railway.toml` | Railway deployment config (build, deploy, env) |
| `backend/Dockerfile` | Docker build for Railway container |
| `backend/package.json` | Scripts (`start:all`, `start`, `migrate`, etc.) |
| `backend/.env.example` | Full env var template for local/Railway |
| `backend/.env` | Local env (never commit real secrets) |
| `.github/workflows/deploy.yml` | Frontend Vercel CI/CD |
| `.github/workflows/ci.yml` | Backend + frontend test/lint CI |
| `DEPLOY.md` | This guide |
| `DEPLOY_RENDER.md` | Legacy Render deployment reference (deprecated) |
| `render.yaml` | Deprecated Render Blueprint (do not use) |