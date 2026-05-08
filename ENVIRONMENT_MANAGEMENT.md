# 🌍 Environment Management Reglament

This document establishes the official rules and workflows for managing the dual-environment setup (**Staging** and **Production**) for the Java Interview Tinder application. 

Maintaining strict separation between these environments is critical for preventing downtime, data corruption, and ensuring high-quality releases.

---

## 1. Environment Definitions

### 🟡 Staging Environment (`staging` branch)
*   **Purpose:** Pre-production environment for QA, integration testing, and final review before releasing to real users.
*   **Stability Expectation:** Moderate. Might experience temporary breakage during active deployments, but should generally be stable for testing.
*   **Data:** Contains mock data, test users, and sanitized data. **Never** contains real production user data.

### 🟢 Production Environment (`main` branch)
*   **Purpose:** The live application serving actual users.
*   **Stability Expectation:** High (99.9% Uptime). No experimental or untested code should ever be deployed here.
*   **Data:** Real user data. Extremely sensitive and protected by strict backup policies.

---

## 2. Strict Infrastructure Separation

To prevent cross-contamination, Staging and Production must be completely isolated. You must provision separate resources for each:

| Resource | Production | Staging |
| :--- | :--- | :--- |
| **Telegram Bot** | `@JavaInterviewBot` (Real Bot Token) | `@JavaInterviewStagingBot` (Test Bot Token) |
| **Database (Supabase)** | `Project A` (Prod DB connection string) | `Project B` (Staging DB connection string) |
| **Backend (Fly.io)** | `java-interview-tinder` | `java-interview-tinder-staging` |
| **Frontend (Vercel)** | `java-interview-tinder.vercel.app` | `staging.interview-tinder.vercel.app` |
| **Redis Cache** | Prod Redis Instance | Staging Redis Instance (or local mock) |

**CRITICAL RULE:** A Staging service must *never* have access to Production environment variables (e.g., Production DB URI or Production Bot Token). 

---

## 3. Git Workflow & Deployment Pipeline

We utilize a strict promotion-based workflow. Code moves upwards: `feature` ➡️ `staging` ➡️ `main`.

### Phase 1: Development
1.  Developers branch off from `staging` to create a feature branch (`feature/add-new-quiz`).
2.  Developers test locally using a local PostgreSQL database and a local Vite server.
3.  Once the feature is complete, the developer opens a Pull Request (PR) targeting the `staging` branch.

### Phase 2: Staging Deployment & QA
1.  When the PR is approved and merged into `staging`, **GitHub Actions** automatically deploys the code to the Staging infrastructure.
2.  Database migrations are automatically run against the Staging Database.
3.  The QA team (or the developer) tests the feature using the Staging Telegram Bot.

### Phase 3: Production Release
1.  Once Staging is verified and signed off, a Release PR is opened from `staging` to `main`.
2.  Merging this PR triggers the Production deployment pipeline.
3.  The pipeline deploys to Fly.io/Vercel and runs migrations against the Production Database.

---

## 4. Emergency Workflow: Hotfixes
If a critical bug is discovered in Production that cannot wait for the standard Staging cycle:

1.  Branch directly off `main` to create a `hotfix/fix-critical-bug` branch.
2.  Fix the bug, test locally.
3.  Open a PR targeting `main`.
4.  Once merged into `main` and deployed to Production, you **must backport** (cherry-pick or merge) the hotfix branch back into `staging` to ensure the environments remain in sync.

---

## 5. Database Migration Regulations

Managing database schemas across two environments requires discipline:
1.  **Immutability:** Once a migration script (e.g., `src/scripts/migrations/001-init.js`) has been executed in Production, it must **never** be edited.
2.  **Forward-Only:** If you made a mistake in a migration, do not edit the old file. Create a new migration file (`002-fix-init.js`) that corrects the issue.
3.  **Testing First:** Migrations are always executed against the Staging database first. If the migration fails on Staging, the deployment stops, preventing Production from breaking.

---

## 6. Checklist for Provisioning a New Environment

If you ever need to recreate Staging or build a third environment (e.g., UAT):

- [ ] Create a new Bot via BotFather and save the Token.
- [ ] Create a new Supabase Project and save the Database URL.
- [ ] Run `npm run init-db` locally, pointing to the new Database URL.
- [ ] Create a new Fly.io app: `fly launch --name your-app-name --no-deploy`.
- [ ] Add all Secrets to the new Fly.io app (`BOT_TOKEN`, `DATABASE_URL`, etc.).
- [ ] Create a new Vercel project (or environment) and link the Frontend repository.
- [ ] Set Vercel environment variables (`VITE_API_URL`).
- [ ] Update `.github/workflows/deploy.yml` to support the new branch/environment triggers.
