cd backend
# SECURITY: secrets are read from environment variables, NOT hardcoded here.
# Set these in your shell / CI / secrets manager before running this script:
#   $env:DATABASE_URL, $env:BOT_TOKEN, $env:JWT_SECRET, $env:OPENROUTER_API_KEY,
#   $env:ADMIN_TELEGRAM_IDS, $env:REDIS_URL, $env:TON_WALLET_ADDRESS, $env:FRONTEND_URL,
#   $env:RB_DATABASE_URL, $env:ALLOW_RB_PII
flyctl secrets set `
  DATABASE_URL="$env:DATABASE_URL" `
  BOT_TOKEN="$env:BOT_TOKEN" `
  JWT_SECRET="$env:JWT_SECRET" `
  OPENROUTER_API_KEY="$env:OPENROUTER_API_KEY" `
  OPENROUTER_FAST_MODEL="openrouter/free" `
  OPENROUTER_QUALITY_MODEL="openrouter/free" `
  OPENROUTER_MODEL="openrouter/free" `
  ADMIN_TELEGRAM_IDS="$env:ADMIN_TELEGRAM_IDS" `
  AI_TIMEOUT_MS="30000" `
  ALLOWED_ORIGINS="https://java-interview-tinder.vercel.app,https://java-tinder-stg.vercel.app,https://web.telegram.org" `
  RB_DATABASE_URL="$env:RB_DATABASE_URL" `
  ALLOW_RB_PII="$env:ALLOW_RB_PII" `
  REDIS_URL="$env:REDIS_URL" `
  SENTRY_DSN="$env:SENTRY_DSN" `
  LOGTAIL_TOKEN="$env:LOGTAIL_TOKEN" `
  STARS_PRO_MONTHLY_AMOUNT="450" `
  STARS_PRO_YEARLY_AMOUNT="3000" `
  TON_WALLET_ADDRESS="$env:TON_WALLET_ADDRESS" `
  FRONTEND_URL="$env:FRONTEND_URL" `
  NODE_ENV="production" `
  --app java-interwiew-tinder-1
