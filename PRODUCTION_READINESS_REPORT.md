# Production Readiness — Status

> ⚠️ **This file previously claimed a "90% (45/50)" readiness score. That
> score was inaccurate and contradicted `PRODUCTION_READINESS_CHECKLIST.md`
> (which rates the project far lower) and `BUGS_AND_IMPROVEMENTS.md`. It has
> been replaced with an honest summary.**

## Current status: READY FOR RAILWAY DEPLOYMENT (PENDING SECRET ROTATION)

Railway deployment is fully prepared. The project runs on Railway (backend), Vercel (frontend), Supabase (Postgres), and Redis.

## What blocks immediate launch (not Railway-related):

- P0: live secrets exist in working tree (`backend/.env`, `set-secrets-*.ps1`) — rotate all secrets and remove from disk before launch. They are git-ignored but must not sit in the working tree.
- P1: test coverage is thin (~4% backend, ~0% frontend logic).
- P1: `server.js` is an 1800+ line god-file; no repository/DAO layer.

## Railway deployment status:

| Item | Status |
|------|--------|
| Dockerfile (node:22-alpine) | ✅ Ready (PORT env-aware) |
| railway.toml | ✅ Ready (backend/backend/) |
| start-all.mjs (API + worker) | ✅ Ready |
| /health endpoint (DB + Redis) | ✅ Ready |
| .dockerignore | ✅ Added at root + backend/ |
| ENV vars documented in DEPLOY.md | ✅ Ready |
