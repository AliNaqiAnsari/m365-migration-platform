#!/bin/sh
set -e

echo "Running Prisma migrations..."
cd /app/packages/database
npx prisma migrate deploy 2>&1 || {
  echo "ERROR: Prisma migration failed!"
  echo "Attempting to start anyway (schema may already be up to date)..."
}
cd /app

echo "Starting API server..."
exec node apps/api/dist/main.js
