#!/bin/sh
set -e

echo "Starting Worker..."
exec node apps/worker/dist/main.js
