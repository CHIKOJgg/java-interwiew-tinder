<#
  Deploy the frontend (Web/PWA landing + Mini App) to Vercel or Netlify.

  Usage:
    .\deploy-frontend.ps1 -Target vercel      # deploy to Vercel (needs Vercel CLI)
    .\deploy-frontend.ps1 -Target netlify     # deploy to Netlify (needs Netlify CLI)
    .\deploy-frontend.ps1 -Target build       # only build dist/ locally

  Prereqs:
    - Set VITE_API_URL in frontend/.env (point to your backend /api).
    - For Google One Tap: set VITE_GOOGLE_CLIENT_ID in frontend/.env.
#>
param(
  [ValidateSet('vercel', 'netlify', 'build')]
  [string]$Target = 'build'
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$frontend = Join-Path $root 'frontend'

Write-Host "--> Frontend deploy (target: $Target)" -ForegroundColor Cyan
Push-Location $frontend

try {
  # Ensure deps + env present
  if (-not (Test-Path 'node_modules')) {
    Write-Host '--> Installing dependencies...' -ForegroundColor Yellow
    npm install
  }
  if (-not (Test-Path '.env')) {
    Write-Host '!! frontend/.env not found. Copy .env.example and set VITE_API_URL.' -ForegroundColor Red
    Pop-Location
    exit 1
  }

  Write-Host '--> Building dist/...' -ForegroundColor Yellow
  node scripts/build.mjs
  if (-not (Test-Path 'dist')) {
    Write-Host '!! Build failed: dist/ not produced.' -ForegroundColor Red
    Pop-Location
    exit 1
  }
  Write-Host '✓ Build ok' -ForegroundColor Green

  switch ($Target) {
    'vercel' {
      Write-Host '--> Deploying to Vercel...' -ForegroundColor Yellow
      npx vercel --prod --yes
    }
    'netlify' {
      Write-Host '--> Deploying to Netlify...' -ForegroundColor Yellow
      npx netlify deploy --prod --dir=dist
    }
    'build' {
      Write-Host '✓ Build only. Upload frontend/dist to your static host.' -ForegroundColor Green
    }
  }
} finally {
  Pop-Location
}

Write-Host 'Frontend deployment step complete.' -ForegroundColor Green
