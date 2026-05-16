# Java Interview Tinder — Full Deployment Guide

**Stack:** Supabase (PostgreSQL) · Fly.io (API + Worker) · Vercel (React frontend)  
**Environments:** `staging` (branch `staging`) and `production` (branch `main`)

---

## Architecture Overview

```
                ┌─────────────────────────────────────────────────────┐
                │                  STAGING                            │
                │                                                     │
  Telegram ───► │  Vercel (staging)          Fly.io API (staging)    │
  Mini App       │  java-tinder-stg.vercel.app ─► java-tinder-stg.fly.dev │
                │                             │                       │
                │                    Fly.io Worker (staging)         │
                │                    java-tinder-worker-stg.fly.dev  │
                │                             │                       │
                │                    Supabase (staging project)      │
                └─────────────────────────────────────────────────────┘

                ┌─────────────────────────────────────────────────────┐
                │                  PRODUCTION                         │
                │                                                     │
  Telegram ───► │  Vercel (prod)             Fly.io API (prod)       │
  Mini App       │  java-tinder.vercel.app ───► java-interwiew-tinder.fly.dev │
                │                             │                       │
                │                    Fly.io Worker (prod)            │
                │                    interview-tinder-worker.fly.dev  │
                │                             │                       │
                │                    Supabase (production project)   │
                └─────────────────────────────────────────────────────┘
```

**Git branch → environment mapping:**
| Branch    | Environment | Backend Fly app                  | Frontend Vercel         |
|-----------|------------|----------------------------------|-------------------------|
| `staging` | Staging    | `java-interwiew-tinder-staging`  | Staging Vercel project  |
| `main`    | Production | `java-interwiew-tinder`          | Production Vercel project|

---

## Prerequisites

Install these tools before you start:

```powershell
# Fly.io CLI
iwr https://fly.io/install.ps1 -useb | iex

# Vercel CLI
npm install -g vercel

# Supabase CLI (optional but useful for schema push)
npm install -g supabase

# Verify
flyctl version
vercel --version
```

---

## PHASE 1 — Supabase (Database)

### 1.1 Create Two Supabase Projects

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard) → **New Project**
2. Create **Staging** project:
   - Name: `java-interview-tinder-staging`
   - Region: `EU West 1` (same as Fly.io `fra`)
   - Password: generate a strong one, save it
3. Create **Production** project:
   - Name: `java-interview-tinder-production`
   - Region: `EU West 1`
   - Password: generate a strong one, save it (different from staging)

### 1.2 Collect Connection Strings

For **each** project, go to:  
`Project Settings → Database → Connection string`

Collect two variants per project:

| Mode             | Port | Used for                        |
|------------------|------|---------------------------------|
| Session (direct) | 5432 | Migrations / scripts            |
| Transaction pool | 6543 | Application runtime (pg pool)   |

> [!IMPORTANT]
> Your app uses **transaction pooler (port 6543)** at runtime (`DATABASE_URL`).  
> Use the **direct connection (port 5432)** only for running migrations and `psql` scripts.

Save these — you'll use them in the next steps:
```
# STAGING
STAGING_DB_URL_DIRECT=postgresql://postgres.<project-ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
STAGING_DB_URL_POOL=postgresql://postgres.<project-ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres

# PRODUCTION
PROD_DB_URL_DIRECT=postgresql://postgres.<project-ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:5432/postgres
PROD_DB_URL_POOL=postgresql://postgres.<project-ref>:<password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres
```

### 1.3 Apply Schema to Staging

Go to **Supabase Dashboard → Staging Project → SQL Editor** and run in order:

**Step 1 — Base schema** (`database/schema.sql`):
```sql
-- Paste full contents of database/schema.sql here
-- Creates: users, questions, user_progress + indexes + seed questions
```

**Step 2 — Full migration** (`backend/database-migration.sql`):
```sql
-- Paste full contents of backend/database-migration.sql here
-- Adds: user_preferences, ai_cache, subscription_plans, user_subscriptions,
--        user_rate_limits, analytics_events, Python/TypeScript questions
```

Verify:
```sql
SELECT language, COUNT(*) as total FROM questions GROUP BY language ORDER BY language;
-- Expected: Java ~40+, Python ~8, TypeScript ~7 rows
```

### 1.4 Apply Schema to Production

Repeat **Step 1.3** for the **Production** project in its own SQL Editor.

> [!TIP]
> Always apply to staging first, verify it works, then apply to production.

---

## PHASE 2 — Fly.io (Backend API + Worker)

### 2.1 Login to Fly.io

```powershell
flyctl auth login
# Opens browser — sign in / create account
```

### 2.2 Create the Four Fly.io Apps

```powershell
# API — Staging
flyctl apps create java-interwiew-tinder-staging

# Worker — Staging
flyctl apps create interview-tinder-worker-staging

# API — Production (already exists if you deployed before, skip if so)
flyctl apps create java-interwiew-tinder

# Worker — Production (already exists if you deployed before, skip if so)
flyctl apps create interview-tinder-worker
```

### 2.3 Create the Staging fly.toml

Create file `backend/fly.staging.toml`:

```toml
app = "java-interwiew-tinder-staging"
primary_region = "fra"

[build]

[env]
  NODE_ENV = "staging"
  PORT     = "3000"

[http_service]
  internal_port       = 3000
  force_https         = true
  auto_stop_machines  = true     # save cost on staging
  auto_start_machines = true
  min_machines_running = 0       # can sleep on staging

  [http_service.concurrency]
    type       = "connections"
    hard_limit = 50
    soft_limit = 40

[[vm]]
  size   = "shared-cpu-1x"
  memory = "256mb"

[checks]
  [checks.health]
    grace_period = "10s"
    interval     = "30s"
    method       = "GET"
    path         = "/health"
    port         = 3000
    timeout      = "5s"
    type         = "http"
```

Create file `backend/fly.worker.staging.toml`:

```toml
app = "interview-tinder-worker-staging"
primary_region = "fra"

[build]

[env]
  NODE_ENV = "staging"

[processes]
  worker = "node src/worker.js"

[[vm]]
  size      = "shared-cpu-1x"
  memory    = "256mb"
  processes = ["worker"]
```

### 2.4 Set Secrets for Staging API

```powershell
cd backend

# Set all secrets for STAGING API
flyctl secrets set `
  DATABASE_URL="postgresql://postgres.<stg-ref>:<stg-password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" `
  BOT_TOKEN="<your-staging-bot-token>" `
  JWT_SECRET="<generate-strong-secret-staging>" `
  OPENROUTER_API_KEY="<your-openrouter-key>" `
  OPENROUTER_FAST_MODEL="openrouter/free" `
  OPENROUTER_QUALITY_MODEL="openrouter/free" `
  OPENROUTER_MODEL="openrouter/free" `
  ADMIN_TELEGRAM_IDS="5915824444" `
  AI_TIMEOUT_MS="3000" `
  ALLOWED_ORIGINS="https://java-tinder-stg.vercel.app,https://web.telegram.org" `
  REDIS_URL="" `
  SENTRY_DSN="" `
  LOGTAIL_TOKEN="" `
  STARS_PRO_MONTHLY_AMOUNT="450" `
  STARS_PRO_YEARLY_AMOUNT="3000" `
  TON_WALLET_ADDRESS="" `
  FRONTEND_URL="https://java-tinder-stg.vercel.app" `
  --app java-interwiew-tinder-staging
```

> [!NOTE]
> For staging you can reuse the same Telegram bot or create a separate `@YourAppStagingBot` via `@BotFather`. A separate bot is recommended so staging notifications don't pollute production admin alerts.

Generate a strong JWT secret:
```powershell
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 2.5 Set Secrets for Production API

```powershell
flyctl secrets set `
  DATABASE_URL="postgresql://postgres.<prod-ref>:<prod-password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" `
  BOT_TOKEN="<your-production-bot-token>" `
  JWT_SECRET="<generate-strong-secret-production>" `
  OPENROUTER_API_KEY="<your-openrouter-key>" `
  OPENROUTER_FAST_MODEL="openrouter/free" `
  OPENROUTER_QUALITY_MODEL="openrouter/free" `
  OPENROUTER_MODEL="openrouter/free" `
  ADMIN_TELEGRAM_IDS="5915824444" `
  AI_TIMEOUT_MS="3000" `
  ALLOWED_ORIGINS="https://java-tinder.vercel.app,https://web.telegram.org" `
  REDIS_URL="" `
  SENTRY_DSN="" `
  LOGTAIL_TOKEN="" `
  STARS_PRO_MONTHLY_AMOUNT="450" `
  STARS_PRO_YEARLY_AMOUNT="3000" `
  TON_WALLET_ADDRESS="" `
  FRONTEND_URL="https://java-tinder.vercel.app" `
  --app java-interwiew-tinder
```

### 2.6 Set Secrets for Workers

Workers share the same DATABASE_URL and BOT_TOKEN as their corresponding API app.

```powershell
# Staging worker
flyctl secrets set `
  DATABASE_URL="postgresql://postgres.<stg-ref>:<stg-password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" `
  BOT_TOKEN="<staging-bot-token>" `
  OPENROUTER_API_KEY="<your-openrouter-key>" `
  ADMIN_TELEGRAM_IDS="5915824444" `
  --app interview-tinder-worker-staging

# Production worker
flyctl secrets set `
  DATABASE_URL="postgresql://postgres.<prod-ref>:<prod-password>@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" `
  BOT_TOKEN="<production-bot-token>" `
  OPENROUTER_API_KEY="<your-openrouter-key>" `
  ADMIN_TELEGRAM_IDS="5915824444" `
  --app interview-tinder-worker
```

### 2.7 First Deploy — Staging

```powershell
cd backend

# Deploy API
flyctl deploy --config fly.staging.toml --remote-only

# Deploy Worker
flyctl deploy --config fly.worker.staging.toml --remote-only

# Check status
flyctl status --app java-interwiew-tinder-staging
flyctl status --app interview-tinder-worker-staging
```

### 2.8 First Deploy — Production

```powershell
cd backend

# Deploy API
flyctl deploy --config fly.toml --remote-only

# Deploy Worker
flyctl deploy --config fly.worker.toml --remote-only

# Check status
flyctl status --app java-interwiew-tinder
flyctl status --app interview-tinder-worker
```

### 2.9 Verify Health Endpoints

```powershell
# Staging
Invoke-RestMethod https://java-interwiew-tinder-staging.fly.dev/health

# Production
Invoke-RestMethod https://java-interwiew-tinder.fly.dev/health
```

Expected response:
```json
{ "status": "ok", "env": "staging" }
{ "status": "ok", "env": "production" }
```

---

## PHASE 3 — Vercel (Frontend)

### 3.1 Login to Vercel

```powershell
vercel login
# Follow the prompt (GitHub recommended)
```

### 3.2 Update Frontend vercel.json for Both Environments

The current `frontend/vercel.json` hard-codes the production URL. Vercel uses environment variables for routing, so keep it simple — the `VITE_API_URL` env var handles the switch.

Keep `frontend/vercel.json` as:
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "https://java-interwiew-tinder.fly.dev/api/:path*"
    }
  ]
}
```

> [!NOTE]
> Staging frontend will use `VITE_API_URL` env var pointing to the staging backend. The rewrite in `vercel.json` is only a fallback for SSR-style proxying; the frontend app reads `VITE_API_URL` directly.

### 3.3 Create Staging Vercel Project

```powershell
cd frontend

# Link to a NEW project for staging
vercel --name java-interview-tinder-staging

# When prompted:
# - Set up and deploy: Y
# - Which scope: <your account>
# - Link to existing project: N
# - Project name: java-interview-tinder-staging
# - Directory: ./
# - Detected framework: Vite → Y
```

After it deploys, note the project URL (e.g. `java-interview-tinder-staging.vercel.app`).

Set environment variables for staging:
```powershell
vercel env add VITE_API_URL production --force
# value: https://java-interwiew-tinder-staging.fly.dev/api

vercel env add VITE_SENTRY_DSN production
# value: (leave blank or paste Sentry DSN for staging)
```

Or via the Vercel dashboard:  
`Project → Settings → Environment Variables`

| Variable        | Value (Staging)                                           |
|-----------------|-----------------------------------------------------------|
| `VITE_API_URL`  | `https://java-interwiew-tinder-staging.fly.dev/api`       |
| `VITE_SENTRY_DSN` | *(staging Sentry DSN or leave empty)*                  |

### 3.4 Create Production Vercel Project

```powershell
cd frontend

# Unlink from staging project first
Remove-Item .vercel -Recurse -Force

# Link to a NEW project for production
vercel --name java-interview-tinder-prod

# When prompted: same answers, name: java-interview-tinder-prod
```

Set environment variables for production:

| Variable          | Value (Production)                                      |
|-------------------|---------------------------------------------------------|
| `VITE_API_URL`    | `https://java-interwiew-tinder.fly.dev/api`             |
| `VITE_SENTRY_DSN` | *(production Sentry DSN)*                              |

### 3.5 Get Vercel IDs for GitHub Actions

```powershell
# In the frontend directory (after linking)
cat .vercel/project.json
# Note: "projectId" and "orgId"
```

You'll need these for GitHub secrets (Phase 4).

---

## PHASE 4 — GitHub Actions CI/CD

### 4.1 Set GitHub Repository Secrets

Go to your repo on GitHub:  
`Settings → Secrets and variables → Actions → New repository secret`

Add all of these:

| Secret Name                 | Value                                                    |
|-----------------------------|----------------------------------------------------------|
| `FLY_API_TOKEN`             | From `flyctl auth token`                                 |
| `VERCEL_TOKEN`              | From Vercel Dashboard → Account → Tokens                 |
| `VERCEL_ORG_ID`             | From `.vercel/project.json` → `orgId`                    |
| `VERCEL_PROJECT_ID`         | Production Vercel project ID                             |
| `VERCEL_STAGING_PROJECT_ID` | Staging Vercel project ID                                |
| `STG_DATABASE_URL`          | Staging Supabase pooler URL (port 6543)                  |
| `PROD_DATABASE_URL`         | Production Supabase pooler URL (port 6543)               |

Get your Fly.io API token:
```powershell
flyctl auth token
```

### 4.2 Update deploy.yml for Two Vercel Projects

The current `deploy.yml` uses a single `VERCEL_PROJECT_ID`. Update it to use separate project IDs:

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [ main, staging ]

jobs:
  ci:
    uses: ./.github/workflows/ci.yml

  deploy-staging:
    needs: ci
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Fly.io
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy API to Staging
        run: flyctl deploy --config backend/fly.staging.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Run Migrations (Staging)
        run: flyctl ssh console --app java-interwiew-tinder-staging -C "node src/scripts/migrate.js"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Deploy Worker to Staging
        run: flyctl deploy --config backend/fly.worker.staging.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Deploy Frontend to Vercel (Staging)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_STAGING_PROJECT_ID }}
          working-directory: ./frontend

  deploy-production:
    needs: ci
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Fly.io
        uses: superfly/flyctl-actions/setup-flyctl@master

      - name: Deploy API to Production
        run: flyctl deploy --config backend/fly.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Run Migrations (Production)
        run: flyctl ssh console --app java-interwiew-tinder -C "node src/scripts/migrate.js"
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Deploy Worker to Production
        run: flyctl deploy --config backend/fly.worker.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

      - name: Deploy Frontend to Vercel (Production)
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./frontend
```

---

## PHASE 5 — Branch Strategy & First Full Deploy

### 5.1 Create the `staging` Branch

```powershell
cd c:\Users\Honor\Desktop\Code\java-interview-tinder

git checkout main
git checkout -b staging
git push -u origin staging
```

From now on:
- Push to `staging` → auto-deploys to staging environment
- Push to `main` → auto-deploys to production environment

### 5.2 Add the New Config Files to Git

```powershell
cd c:\Users\Honor\Desktop\Code\java-interview-tinder

git add backend/fly.staging.toml
git add backend/fly.worker.staging.toml
git add .github/workflows/deploy.yml

git commit -m "chore: add staging fly configs and update deploy workflow"
git push origin staging
```

This triggers the first automated staging deploy via GitHub Actions.

### 5.3 Promote Staging to Production

After staging looks good:
```powershell
git checkout main
git merge staging
git push origin main
# Triggers production deploy
```

---

## PHASE 6 — Post-Deployment Validation

### 6.1 Verify All Services

```powershell
# Backend health checks
Invoke-RestMethod https://java-interwiew-tinder-staging.fly.dev/health
Invoke-RestMethod https://java-interwiew-tinder.fly.dev/health

# Check API responds
Invoke-RestMethod https://java-interwiew-tinder-staging.fly.dev/api/questions?language=Java&limit=5
Invoke-RestMethod https://java-interwiew-tinder.fly.dev/api/questions?language=Java&limit=5
```

### 6.2 Check Worker Logs

```powershell
# Staging worker
flyctl logs --app interview-tinder-worker-staging

# Production worker
flyctl logs --app interview-tinder-worker
```

### 6.3 Check API Logs

```powershell
flyctl logs --app java-interwiew-tinder-staging
flyctl logs --app java-interwiew-tinder
```

### 6.4 Verify Database Connections

```powershell
# SSH into the staging machine and test DB
flyctl ssh console --app java-interwiew-tinder-staging -C "node -e \"import('./src/config/database.js').then(m => m.pool.query('SELECT COUNT(*) FROM questions')).then(r => console.log(r.rows))\""
```

---

## Full Environment Variable Reference

### Backend `.env` per environment

| Variable                    | Staging                                     | Production                                   |
|-----------------------------|---------------------------------------------|----------------------------------------------|
| `DATABASE_URL`              | Supabase staging pooler (port 6543)         | Supabase production pooler (port 6543)       |
| `BOT_TOKEN`                 | `@YourAppStagingBot` token                  | `@YourAppBot` token                          |
| `JWT_SECRET`                | Random 64-byte hex (staging)                | Random 64-byte hex (production, different!)  |
| `OPENROUTER_API_KEY`        | Same key OK                                 | Same key OK                                  |
| `OPENROUTER_FAST_MODEL`     | `openrouter/free`                           | `openrouter/free`                            |
| `OPENROUTER_QUALITY_MODEL`  | `openrouter/free`                           | `openrouter/free`                            |
| `OPENROUTER_MODEL`          | `openrouter/free`                           | `openrouter/free`                            |
| `ADMIN_TELEGRAM_IDS`        | `5915824444`                                | `5915824444`                                 |
| `AI_TIMEOUT_MS`             | `3000`                                      | `3000`                                       |
| `ALLOWED_ORIGINS`           | `https://java-tinder-stg.vercel.app,...`    | `https://java-tinder.vercel.app,...`         |
| `PORT`                      | `3000`                                      | `3000`                                       |
| `NODE_ENV`                  | `staging`                                   | `production`                                 |
| `REDIS_URL`                 | *(optional — leave empty)*                  | *(optional — Upstash or Fly Redis)*          |
| `SENTRY_DSN`                | *(optional — staging project DSN)*          | *(optional — production project DSN)*        |
| `LOGTAIL_TOKEN`             | *(optional)*                                | *(optional)*                                 |
| `STARS_PRO_MONTHLY_AMOUNT`  | `450`                                       | `450`                                        |
| `STARS_PRO_YEARLY_AMOUNT`   | `3000`                                      | `3000`                                       |
| `FRONTEND_URL`              | `https://java-tinder-stg.vercel.app`        | `https://java-tinder.vercel.app`             |

### Frontend `.env` per environment

| Variable          | Staging                                               | Production                                    |
|-------------------|-------------------------------------------------------|-----------------------------------------------|
| `VITE_API_URL`    | `https://java-interwiew-tinder-staging.fly.dev/api`   | `https://java-interwiew-tinder.fly.dev/api`   |
| `VITE_SENTRY_DSN` | *(optional)*                                          | *(optional)*                                  |

---

## Fly.io App Name Summary

| App Name                           | Purpose            | Config File                   |
|------------------------------------|--------------------|-------------------------------|
| `java-interwiew-tinder-staging`    | API — Staging      | `fly.staging.toml`            |
| `interview-tinder-worker-staging`  | Worker — Staging   | `fly.worker.staging.toml`     |
| `java-interwiew-tinder`            | API — Production   | `fly.toml`                    |
| `interview-tinder-worker`          | Worker — Production| `fly.worker.toml`             |

---

## Common Troubleshooting

### App fails to start on Fly.io
```powershell
# View recent deployment logs
flyctl logs --app java-interwiew-tinder-staging -n 50

# SSH in to inspect manually
flyctl ssh console --app java-interwiew-tinder-staging
```

### Database connection refused
- Confirm you're using **port 6543** (transaction pooler), not 5432, in `DATABASE_URL`
- Check that the Supabase project is in the "Active" state (not paused)
- Verify `DATABASE_URL` secret is set: `flyctl secrets list --app <app-name>`

### Frontend shows wrong API URL
- Go to Vercel Dashboard → Project → Settings → Environment Variables
- Ensure `VITE_API_URL` is set for the **Production** environment (not just preview)
- Redeploy after changing env vars: `vercel --prod` (from `frontend/` directory)

### Worker not processing jobs
```powershell
flyctl logs --app interview-tinder-worker-staging
# Common cause: DATABASE_URL or BOT_TOKEN not set for worker app
flyctl secrets list --app interview-tinder-worker-staging
```

### GitHub Actions deploy fails
- Check that all secrets are set in `Settings → Secrets → Actions`
- `FLY_API_TOKEN` must have deploy permissions (from `flyctl auth token`)
- `VERCEL_TOKEN` must be a user token, not a project token

---

## Quick Reference Commands

```powershell
# View all your Fly.io apps
flyctl apps list

# Scale up/down
flyctl scale count 1 --app java-interwiew-tinder-staging
flyctl scale count 0 --app java-interwiew-tinder-staging  # pause staging

# Restart an app
flyctl apps restart java-interwiew-tinder-staging

# View secrets (names only, not values)
flyctl secrets list --app java-interwiew-tinder-staging

# Update a single secret
flyctl secrets set JWT_SECRET="new-value" --app java-interwiew-tinder-staging

# Trigger manual deploy without git push
cd backend
flyctl deploy --config fly.staging.toml --remote-only

# Run one-off migration manually
flyctl ssh console --app java-interwiew-tinder-staging -C "node src/scripts/migrate.js"
```
