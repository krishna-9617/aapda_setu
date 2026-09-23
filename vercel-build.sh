#!/bin/bash
set -e

echo "=== Starting custom Vercel build script ==="

echo "1. Changing to frontend directory"
cd frontend

echo "2. Installing dependencies (skipping browsers)"
export PUPPETEER_SKIP_DOWNLOAD=true
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm install --legacy-peer-deps

echo "3. Building frontend with production API URL"
export VITE_API_URL="https://aapda-setu-backend.onrender.com"
npm run build

echo "=== Build script completed successfully ==="
