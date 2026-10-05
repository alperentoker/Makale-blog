#!/usr/bin/env bash
# ==============================================================================
# LENS Platform Production Update & Deployment Script
# Supports native PM2 + Nginx VPS deployment
# ==============================================================================
set -e

echo "=== [LENS] Production Update Starting ==="

# 1. Ensure we are in project directory
PROJECT_DIR="/var/www/lens-blog"
if [ -d "$PROJECT_DIR" ]; then
  cd "$PROJECT_DIR"
else
  cd "$(dirname "$0")"
fi

# 2. Pull latest commits from GitHub
echo "[1/4] Pulling latest changes from GitHub main branch..."
git pull origin main

# 3. Install production dependencies
echo "[2/4] Installing dependencies..."
npm ci --prefer-offline --no-audit

# 4. Build Vite frontend bundle
echo "[3/4] Building production frontend (dist)..."
npm run build

# 5. Reload / Restart PM2 Backend Service
echo "[4/4] Reloading PM2 backend service..."
if command -v pm2 &> /dev/null; then
  if pm2 list | grep -q "lens-api"; then
    pm2 restart lens-api --update-env
  else
    pm2 start "npm run server" --name lens-api
  fi
  pm2 save
else
  echo "⚠️ PM2 not found. If running manually, start with: npm run server"
fi

echo "======================================================================"
echo "  ✅ LENS Platform successfully updated and deployed!"
echo "  Backend API: Running via PM2 (lens-api)"
echo "  Frontend: Built into dist/ and served via Nginx"
echo "======================================================================"
