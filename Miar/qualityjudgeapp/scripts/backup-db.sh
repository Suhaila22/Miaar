#!/usr/bin/env bash
# Back up the application's MySQL database using mysqldump.
#
# Usage:
#   ./scripts/backup-db.sh [output-directory]
#
# Reads connection details from DATABASE_URL (same variable the app uses,
# see .env.example), e.g.:
#   mysql://user:password@host:3306/miyar
#
# Produces a timestamped, gzip-compressed SQL dump such as:
#   backups/miyar-20260828-071500.sql.gz
#
# Intended to be run on a schedule (cron, systemd timer, or your hosting
# provider's scheduled-job feature) to satisfy the platform's backup/DR
# requirements. Retention/off-site copying is environment-specific and left
# to the deployment (e.g. pipe the output to `aws s3 cp -`, rclone, etc.).

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Export it or source your .env file first." >&2
  exit 1
fi

OUT_DIR="${1:-backups}"
mkdir -p "$OUT_DIR"

# Parse mysql://user:password@host:port/dbname out of DATABASE_URL.
url="$DATABASE_URL"
url="${url#mysql://}"
credentials="${url%%@*}"
rest="${url#*@}"
DB_USER="${credentials%%:*}"
DB_PASSWORD="${credentials#*:}"
hostport="${rest%%/*}"
DB_NAME="${rest#*/}"
DB_NAME="${DB_NAME%%\?*}"
DB_HOST="${hostport%%:*}"
DB_PORT="${hostport#*:}"
if [ "$DB_PORT" = "$DB_HOST" ]; then DB_PORT=3306; fi

TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/${DB_NAME}-${TIMESTAMP}.sql.gz"

echo "Backing up database '$DB_NAME' from $DB_HOST:$DB_PORT to $OUT_FILE ..."
MYSQL_PWD="$DB_PASSWORD" mysqldump \
  --single-transaction \
  --routines \
  --triggers \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  "$DB_NAME" | gzip > "$OUT_FILE"

echo "Backup complete: $OUT_FILE ($(du -h "$OUT_FILE" | cut -f1))"
