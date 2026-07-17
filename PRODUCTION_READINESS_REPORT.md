# Production Readiness — Status

> ⚠️ **This file previously claimed a "90% (45/50)" readiness score. That
> score was inaccurate and contradicted `PRODUCTION_READINESS_CHECKLIST.md`
> (which rates the project far lower) and `BUGS_AND_IMPROVEMENTS.md`. It has
> been replaced with an honest summary.**

## Current status: NOT production-ready

The authoritative sources of truth are:

- **`PRODUCTION_READINESS_CHECKLIST.md`** — the real go/no-go checklist.
- **`BUGS_AND_IMPROVEMENTS.md`** — the tracked bug log (P0–P3).
- **`ARCHITECTURE.md`** — system design (verify it matches the deployed stack).

## What is genuinely solid

- CI/CD exists: `.github/workflows/ci.yml` + `deploy.yml` run lint + tests
  before deploy (backend: `eslint .` + `vitest`; frontend: `eslint` + build + test).
- Backend lint is configured (`eslint .`), not a no-op.
- Auth: Telegram `initData` HMAC validation with `timingSafeEqual`, JWT,
  signed webhooks (YooKassa/TON).
- Billing writes are transactional (`BEGIN`/`COMMIT`/`ROLLBACK`).
- `aiService` is resilient (timeout, abort, cache, multi-stage JSON repair).

## What blocks production (see BUGS_AND_IMPROVEMENTS.md)

- P0: live secrets were committed in plaintext (`backend/.env`, `set-secrets-*.ps1`)
  — rotate all secrets and remove them from disk. They are git-ignored, but
  must not sit in the working tree.
- P1: infrastructure wiring (docker `env_file`, Fly app-name drift in CI).
- P1: test coverage is thin (~4% backend, ~0% frontend logic).
- P1: `server.js` is an 1800-line god-file; no repository/DAO layer.
- P2/P3: schema drift between `schema.sql` and migrations; accessibility gaps.

## Action before any launch

1. Rotate every secret (DB, Telegram, OpenRouter, JWT, Redis, TON).
2. Resolve all P0/P1 items in `BUGS_AND_IMPROVEMENTS.md`.
3. Fix the Fly app-name mismatch in `deploy.yml` (now aligned to `*-1`).
4. Reconcile `ARCHITECTURE.md` with the actual Fly.io + Vercel + Supabase stack.
