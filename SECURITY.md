# Security & Secret Rotation

This document describes how to handle secrets for the production deployment. It is
intentionally lightweight — the goal is that any maintainer can rotate a leaked
or expiring credential in under 15 minutes.

## Guiding rules

1. **Never commit secrets.** `.env`, `*.ps1` and `*.local` are git-ignored
   (see `.gitignore`). The deploy scripts under `set-secrets-*.ps1` only read
   values from **environment variables** (`$env:VAR`) and push them to Fly.io
   secrets — they do **not** contain literal secret values.
2. **Source of truth is the secret store, not the working tree.** Local `.env`
   is for development only. Production reads from Fly.io `secrets` / CI secrets.
3. **Rotate on suspicion, not just on expiry.** If you are unsure whether a
   secret leaked, rotate it.

## Inventory

| Secret | Where it lives | How to rotate |
|---------|----------------|----------------|
| `DATABASE_URL` (Supabase) | Fly secret / CI | Supabase → Project Settings → Database → reset password. Update the connection string. |
| `BOT_TOKEN` (Telegram) | Fly secret / CI | @BotFather → `/revoke` → copy new token. Old token stops working immediately. |
| `OPENROUTER_API_KEY` | Fly secret / CI | OpenRouter → Keys → delete old, create new. |
| `JWT_SECRET` | Fly secret / CI | `openssl rand -base64 32`. **All existing sessions are invalidated** on rotation — acceptable. |
| `REDIS_URL` | Fly secret / CI | Reset the Redis password in your Redis provider. |
| `TON_WALLET_ADDRESS` | Fly secret / CI | Generate a new TON wallet; migrate any balance first. |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | Fly secret / CI | Stripe Dashboard → Developers → roll key. Reconfigure webhook endpoint secret. |
| `UKASSA_TOKEN` | Fly secret / CI | YooKassa merchant panel → issue new API token. |
| `SENTRY_DSN` / `LOGTAIL_TOKEN` | Fly secret / CI | Regenerate in the observability provider. |

## Rotation procedure

1. Generate/revoke the new value at the provider (table above).
2. Set it as a Fly secret (example for backend app `jit-backend`):

   ```powershell
   fly secrets set JWT_SECRET=$(openssl rand -base64 32) --app jit-backend
   fly secrets set OPENROUTER_API_KEY=sk-or-... --app jit-backend
   ```

   Or, if you use the bundled scripts, export the env vars and run:

   ```powershell
   $env:JWT_SECRET = (openssl rand -base64 32)
   .\set-secrets-production.ps1
   ```

3. Roll the app so the new secret is picked up:

   ```powershell
   fly deploy --app jit-backend
   ```

4. Verify: hit `/health` (should return 200) and perform a real login +
   one AI explanation to confirm the OpenRouter key works.

## If a secret was leaked

1. Rotate it **immediately** (table above) — most providers invalidate the
   old value the moment you roll.
2. Check recent usage in the provider dashboard for unauthorized activity
   (DB queries, OpenRouter spend, Telegram messages sent).
3. If the database password leaked, **also** review `user_subscriptions`,
   `ai_cache` and `analytics_events` for tampering and notify affected users if
   their data was accessed.
4. Force a re-deploy so the leaked value is no longer in any running process.

## Reporting a vulnerability

Open a private security advisory on the GitHub repository or email the
maintainer directly. Do **not** open a public issue for credential leaks.
