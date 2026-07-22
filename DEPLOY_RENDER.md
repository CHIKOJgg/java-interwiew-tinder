# Deploying Java Interview Tinder for free (Vercel + Render + Supabase)

This is the cheapest end-to-end deploy path as of 2026 — everything runs on
free tiers, with **one** Render web service that hosts BOTH the API and the
background worker.

```
                       ┌─────────────────┐
                       │   Vercel        │   (frontend, free)
                       │   SPA + PWA     │
                       └────────┬────────┘
                                │ HTTPS / VITE_API_URL
                                ▼
┌──────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Supabase        │◀───▶│  Render         │◀───▶│  Render         │
│  (Postgres free) │     │  Web Service    │     │  Key Value      │
└──────────────────┘     │  (Free tier)    │     │  (Redis, free)  │
                        │  API + worker   │     └─────────────────┘
                        └─────────────────┘
```

## 0. Prerequisites

- GitHub account
- Vercel account (free)
- Render account (free)
- Supabase account (free)
- Telegram bot token from [@BotFather](https://t.me/BotFather)
- (optional) OpenRouter API key from [openrouter.ai](https://openrouter.ai)

## 1. Prepare the code

Push this repo to a GitHub repo you own (or a fork). The Blueprint in
`render.yaml` and the `frontend/vercel.json` are already wired up.

## 2. Database — Supabase

1. Go to https://supabase.com → New project.
2. Save the database password somewhere safe.
3. Project Settings → Database → Connection string → **URI** → copy the URL.
   It looks like:
   ```
   postgresql://postgres.<ref>:<PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres
   ```
   Use the **pooler (port 6543)** URL — it scales to thousands of connections
   and is what Render will hit from a single instance.
4. From your laptop, run the migrations against that URL (one-time):
   ```bash
   cd backend
   DATABASE_URL="postgresql://postgres.<ref>:<PASSWORD>@aws-0-eu-central-1.pooler.supabase.com:6543/postgres" \
     npm run setup-db
   ```
   This is idempotent — running it twice is safe.

## 3. Backend on Render

### Option A — Blueprint (one click)

1. In the Render Dashboard: **New** → **Blueprint**.
2. Connect your GitHub repo.
3. Render parses `render.yaml` and previews the resources it will create:
   - `jit-redis` (Key Value, free)
   - `jit-backend` (Web Service, free, Node 22)
4. Render prompts for the secret env vars. Fill in:
   - `DATABASE_URL` → your Supabase pooler URL
   - `BOT_TOKEN` → from @BotFather
   - `OPENROUTER_API_KEY` → optional but recommended
   - `ADMIN_TELEGRAM_IDS` → your numeric Telegram ID (get it from @userinfobot)
   - `ALLOWED_ORIGINS` → your Vercel URL (set after step 4, then redeploy)
   - `FRONTEND_URL` → your Vercel URL
5. Click **Apply** → wait for the first deploy (~2–3 min).
6. Verify the service is up:
   ```
   curl https://jit-backend.onrender.com/health
   ```
   Should return `{"status":"ok","db":"connected","redis":"connected",...}`.

### Option B — Manual

If you prefer the dashboard, create:

| Field         | Value                                |
| ------------- | ------------------------------------ |
| Runtime       | Node                                 |
| Root Dir      | `backend`                            |
| Build Command | `npm install`                        |
| Start Command | `npm run start:all`                  |
| Instance Type | Free                                 |
| Health Path   | `/health`                            |

Then add the same env vars as above. Add a **Key Value** service named
`jit-redis` and wire it through `REDIS_URL` (or paste the connection string).

### Run the migrations

The Blueprint's `startCommand` is `npm run start:all`, which DOES NOT run
migrations. Run them once from your laptop as shown in step 2, OR temporarily
change the start command to `npm run setup-db && npm run start:all`, trigger
a manual deploy, then change it back to `npm run start:all`.

> The `setup-db` command is idempotent and seeds the questions, so running
> it on every deploy is safe but wasteful — keep it for the first deploy only.

## 4. Frontend on Vercel

1. https://vercel.com → New Project → import your repo.
2. **Root Directory** → `frontend`
3. **Build Command** → `npm run build`
4. **Output Directory** → `dist`
5. **Environment Variables**:
   - `VITE_API_URL` → `https://jit-backend.onrender.com/api`
6. Click **Deploy**. Wait ~1 min.
7. Copy the production URL (`https://<project>.vercel.app`).
8. Go back to the Render dashboard → backend service → Environment → set
   `ALLOWED_ORIGINS` and `FRONTEND_URL` to this URL → Save (auto-redeploys).

## 5. Telegram bot

1. @BotFather → `/setmenubutton` → choose your bot → send the Vercel URL.
2. @BotFather → `/setdomain` → register `<project>.vercel.app`.
3. (Optional, for Stars billing) Bot Settings → Payments → Connect Telegram
   Stars.

## 6. Verify

- `curl https://jit-backend.onrender.com/health` → `status: ok`.
- Open `https://<project>.vercel.app` → sign in with the bot → swipe cards.
- Check Render logs (`Dashboard → jit-backend → Logs`) — you should see
  `✅ Database connected`, `✅ Redis connected`, `👷 Background worker started`.

## 7. Cold-start pinger (optional but recommended on free tier)

Render Free spins the service down after 15 min of idle. The next request
takes ~1 min to wake up. To keep it warm for Telegram users, point a free
cron service (UptimeRobot, cron-job.org) at `https://jit-backend.onrender.com/health`
every 5–10 minutes.

The frontend (Vercel) and the database (Supabase) are not affected — only
the API service is paged in/out.

## 8. Going beyond the free tier

| When you need…           | Upgrade to                                  | Cost     |
| ------------------------ | ------------------------------------------- | -------- |
| No cold start            | Render Starter plan, 1 service              | $7/mo    |
| Real AI + multi-region   | Render Standard + dedicated worker service  | $25+/mo  |
| Persistent Redis         | Render Key Value Starter                    | $10/mo   |
| More DB                 | Supabase Pro or Render Postgres basic-1gb   | $25/mo   |
| Custom domain + email    | Domain registrar + Resend free tier         | $0–12/yr |

To move the worker to its own service (so AI jobs keep running even during
deploys), change the Render `startCommand` from `npm run start:all` to
`npm start` and add a second service of type `worker` with
`startCommand: npm run start:worker`.

## Troubleshooting

- **Cold-start login failed** — first request after idle can take 1+ minute.
  Wait and retry; the client auto-retries on `pending` for AI calls.
- **`/health` returns `db: disconnected`** — your `DATABASE_URL` is wrong, or
  the Supabase pooler URL is not the right one. Check the password and the
  region (must match Render's region for the private network to be usable;
  public pooler works from any region).
- **CORS error in browser** — `ALLOWED_ORIGINS` on Render does not include
  your Vercel URL. Update and redeploy.
- **`JWT_SECRET must be at least 16 characters`** — the Blueprint auto-generates
  one, so this only happens if you set it manually to a short string.
- **`Daily AI explanation limit reached`** — the free tier caps at
  `FREE_DAILY_AI_EXPLAIN_LIMIT` explanations/day per user. Change it in env,
  or set the user's plan to `pro` in the DB.
