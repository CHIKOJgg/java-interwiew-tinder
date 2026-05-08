# 🚀 Full Step-by-Step Deployment and Management Guide

This document provides a comprehensive guide on how to deploy the Java Interview Tinder application from scratch and how to manage it in a production environment.

## 🏗 Architecture Overview
*   **Frontend:** React (Vite) deployed on Vercel.
*   **Backend:** Node.js (Express) deployed on Fly.io (API & Background Workers).
*   **Database:** PostgreSQL hosted on Supabase.
*   **Caching:** Redis for caching AI responses.
*   **Platform:** Telegram Mini App interface.

---

## 🛠 Prerequisites
Before starting, ensure you have:
1.  **Node.js v18+** installed locally.
2.  **Git** installed.
3.  Accounts created on:
    *   [Telegram](https://telegram.org) (for @BotFather)
    *   [Supabase](https://supabase.com) (Database)
    *   [Fly.io](https://fly.io) (Backend hosting)
    *   [Vercel](https://vercel.com) (Frontend hosting)
    *   [GitHub](https://github.com) (for CI/CD)
4.  CLI tools installed: `flyctl` and `vercel`.

---

## 🚀 Step-by-Step Deployment Guide

### Step 1: Create a Telegram Bot
1.  Open [@BotFather](https://t.me/BotFather) in Telegram.
2.  Send `/newbot` and follow the prompts to choose a name and username.
3.  Copy the **Bot Token** (you will need it for the Backend).
4.  Send `/setmenubutton`, select your bot, and set the Web App URL (leave the URL blank for now, you will update it in Step 5).

### Step 2: Database Setup (Supabase)
1.  Log in to [Supabase](https://supabase.com) and create a new project.
2.  Go to **Project Settings -> Database** and copy the **Connection String** (URI format).
3.  Replace `[YOUR-PASSWORD]` in the URI with your actual database password.
4.  Run initial migrations from your local machine:
    ```bash
    export DATABASE_URL="postgresql://postgres:[password]@db.xxxx.supabase.co:5432/postgres"
    cd backend
    npm install
    npm run init-db
    npm run seed-db
    ```

### Step 3: Backend Deployment (Fly.io)
1.  Log in to Fly.io CLI: `fly auth login`.
2.  Initialize the app (if not already created):
    ```bash
    fly launch --no-deploy
    ```
    *(Note: The project already has a `fly.toml` configured).*
3.  Set the production environment variables (Secrets) in Fly.io:
    ```bash
    fly secrets set DATABASE_URL="your-supabase-url"
    fly secrets set BOT_TOKEN="your-telegram-token"
    fly secrets set OPENROUTER_API_KEY="your-openrouter-key"
    fly secrets set REDIS_URL="your-redis-url"
    fly secrets set NODE_ENV="production"
    ```
4.  Deploy the backend API:
    ```bash
    fly deploy
    ```
5.  *(Optional but recommended)* Deploy the background worker using the secondary config:
    ```bash
    fly deploy -c fly.worker.toml
    ```

### Step 4: Frontend Deployment (Vercel)
1.  Log in to Vercel CLI: `vercel login`.
2.  Link the frontend directory:
    ```bash
    cd frontend
    vercel link
    ```
3.  Set Environment Variables in Vercel Dashboard (or via CLI):
    *   `VITE_API_URL` = `https://your-fly-backend.fly.dev/api`
4.  Deploy to production:
    ```bash
    vercel --prod
    ```
5.  Copy the provided Production URL (e.g., `https://java-interview-tinder.vercel.app`).

### Step 5: Link Telegram Bot to Frontend
1.  Return to [@BotFather](https://t.me/BotFather) in Telegram.
2.  Send `/setmenubutton`, select your bot.
3.  Set the URL to your Vercel Production URL (e.g., `https://java-interview-tinder.vercel.app`).
4.  Your users can now open the app directly from your bot!

---

## ⚙️ Automated CI/CD (GitHub Actions)
The project is configured to automatically deploy using GitHub Actions.

### Setting up CI/CD
In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add the following:
1.  `FLY_API_TOKEN`: Get this by running `fly auth token`.
2.  `VERCEL_TOKEN`: Generate this in your Vercel Account Settings -> Tokens.
3.  `VERCEL_ORG_ID`: Your Vercel organization/team ID.
4.  `VERCEL_PROJECT_ID`: Your Vercel project ID (found in `.vercel/project.json` after running `vercel link`).

**Pipeline Logic:**
*   **PRs / Commits:** Triggers linting and unit tests (`ci.yml`).
*   **Push to `main`:** Deploys backend to Fly.io and frontend to Vercel Production (`deploy.yml`).
*   **Push to `staging`:** Deploys to staging environments.

---

## 🛠 Managing the Project in Production

### 1. Database Migrations
When you update the schema, you must run migrations in production.
*   **Via GitHub Actions (Automated):** The CI/CD pipeline is configured to automatically run `npm run migrate` on the Fly.io instance after successful deployment.
*   **Manual Execution:** If you need to run a specific script manually in production:
    ```bash
    flyctl ssh console --app java-interwiew-tinder -C "node src/scripts/migrate-stars.js"
    ```

### 2. Monitoring & Observability
*   **Logs:** Use Fly.io dashboard or CLI to view backend logs:
    ```bash
    fly logs -a java-interwiew-tinder
    ```
*   **Error Tracking:** Sentry is integrated. Log in to your Sentry dashboard to view unhandled exceptions and React component crashes.
*   **Performance Monitoring:** Backend uses Pino/Logtail. Ensure your Logtail source token is set (`LOGTAIL_SOURCE_TOKEN`) to aggregate logs centrally.

### 3. Background Workers
The background worker (`worker.js`) handles database integrity checks, Telegram notifications, and metric aggregation.
*   To check worker health:
    ```bash
    fly logs -a java-interwiew-tinder-worker
    ```

### 4. Backups and Disaster Recovery
*   **Automated:** Supabase performs daily logical backups automatically.
*   **Point-in-Time Recovery (PITR):** Enable PITR in Supabase Pro tier for fine-grained rollbacks.
*   **Manual Restoration:** If database corruption occurs, please strictly follow the procedures outlined in `RESTORE_PROCEDURE.md`.

### 5. Managing AI Tokens (OpenRouter)
Monitor your OpenRouter dashboard to track API token usage. The system utilizes Redis to cache AI explanations and reduce costs. You can monitor the cache hit rate in the Sentry or Logtail dashboards.
