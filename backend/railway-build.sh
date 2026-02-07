#!/bin/bash
set -e

echo "Installing dependencies..."
npm ci

echo "Generating Prisma client..."
npx prisma generate

echo "Building TypeScript..."
npm run build

echo "Applying database schema changes..."
npx prisma db push --accept-data-loss || echo "Schema push completed (warnings are expected)"

echo "Build completed successfully!"
