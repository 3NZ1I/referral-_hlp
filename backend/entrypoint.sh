#!/bin/sh
set -e

# Optional auto migration execution
if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "[entrypoint] Running alembic migrations (RUN_MIGRATIONS=true)"
  alembic upgrade head
else
  echo "[entrypoint] RUN_MIGRATIONS not enabled; skipping migrations"
fi

# Start the application
exec uvicorn backend.main:app --host 0.0.0.0 --port 8000
