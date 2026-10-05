#!/usr/bin/env bash
# ==============================================================================
# LENS Platform Production Deployment Script
# https://lens.alperentoker.com
# ==============================================================================
set -e

echo "=== [LENS] Production Deployment Starting ==="

# 1. Environment file check
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
  else
    cat <<EOF > .env
PORT=3001
NODE_ENV=production
DATA_DIR=/app/data
SITE_URL=https://lens.alperentoker.com
EOF
  fi
fi

# 2. Ensure data directory exists
mkdir -p data

# 3. Build and launch containers via Docker Compose
echo "Building and launching Docker containers..."
docker compose up -d --build

# 4. Wait for health check
echo "Waiting for services to become healthy..."
sleep 5
docker compose ps

echo "======================================================================"
echo "  ✅ LENS CMS & Edge Research Platform is deployed and running!"
echo "  Public URL: http://localhost (or your VPS IP / domain)"
echo "  Admin Panel: Alt+A or /#admin (create your master password on first visit)"
echo "======================================================================"
