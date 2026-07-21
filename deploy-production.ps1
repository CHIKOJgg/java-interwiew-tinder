Write-Host "--> Starting Local Docker Build for PRODUCTION..." -ForegroundColor Cyan
cd backend

# 1. Deploy API (Building locally)
Write-Host "--> Building and Deploying API..." -ForegroundColor Yellow
flyctl deploy --config fly.toml --local-only

# 2. Deploy Worker (Building locally)
Write-Host "--> Building and Deploying Worker..." -ForegroundColor Yellow
flyctl deploy --config fly.worker.toml --local-only

# 3. Check status
Write-Host "--> Checking Status..." -ForegroundColor Green
flyctl status --app java-interwiew-tinder-1
flyctl status --app interview-tinder-worker-1

Write-Host "Production Deployment Complete!" -ForegroundColor Green
