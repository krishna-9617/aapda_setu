#!/bin/bash
set -e

echo "=== Starting custom Vercel build script (from frontend dir) ==="

echo "1. Installing dependencies (skipping browsers)"
export PUPPETEER_SKIP_DOWNLOAD=true
export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
npm install --legacy-peer-deps

echo "2. Building frontend with production API URL"
export VITE_API_URL="https://aapda-setu-backend.onrender.com"
npm run build

echo "=== Build script completed successfully ==="
