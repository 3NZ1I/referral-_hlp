#!/usr/bin/env bash
set -euo pipefail

# Simple Postgres backup via docker compose
# Usage: ./scripts/db_backup.sh [output_dir]

OUT_DIR=${1:-$HOME/backups}
TS=$(date +%F_%H-%M-%S)
mkdir -p "$OUT_DIR"

echo "Backing up referral_db to $OUT_DIR/referral_db_${TS}.sql"
docker compose exec -T db pg_dump -U hlp_user -d referral_db > "$OUT_DIR/referral_db_${TS}.sql"
echo "Backup complete: $OUT_DIR/referral_db_${TS}.sql"
