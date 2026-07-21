Write-Host "--> Starting Local Docker Build for STAGING..." -ForegroundColor Cyan
cd backend

# 1. Deploy API (Building locally)
Write-Host "--> Building and Deploying API..." -ForegroundColor Yellow
flyctl deploy --config fly.staging.toml --local-only

# 2. Deploy Worker (Building locally)
Write-Host "--> Building and Deploying Worker..." -ForegroundColor Yellow
flyctl deploy --config fly.worker.staging.toml --local-only

# 3. Check status
Write-Host "--> Checking Status..." -ForegroundColor Green
flyctl status --app java-interwiew-tinder-staging-1
flyctl status --app interview-tinder-worker-staging-1 

Write-Host "Staging Deployment Complete!" -ForegroundColor Green
