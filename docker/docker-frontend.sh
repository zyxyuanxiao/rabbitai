#!/usr/bin/env bash

set -e

cd /app/rabbitai-frontend
npm install -f --no-optional --global webpack webpack-cli
npm install -f --no-optional

echo "Running frontend"
npm run dev
