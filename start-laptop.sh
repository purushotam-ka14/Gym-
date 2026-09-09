#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then echo "Node.js 18+ is required. Download it from https://nodejs.org"; exit 1; fi
npm install
npm run dev
