#!/usr/bin/env bash
# Simple health check script for services
set -e

API_URL=${API_URL:-http://localhost:8000/api/health}
FRONTEND_URL=${FRONTEND_URL:-http://localhost:8080/health}

echo "Checking backend: $API_URL"
curl -fsS $API_URL || { echo "Backend health check failed"; exit 1; }
echo "Backend OK"

echo "Checking frontend: $FRONTEND_URL"
curl -fsS $FRONTEND_URL || { echo "Frontend health check failed"; exit 2; }
echo "Frontend OK"

echo "All health checks passed"
exit 0
