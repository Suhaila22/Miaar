#!/usr/bin/env bash
# Restore the application's MySQL database from a backup produced by
# scripts/backup-db.sh.
#
# Usage:
#   ./scripts/restore-db.sh <backup-file.sql.gz>
#
# Reads connection details from DATABASE_URL, same as backup-db.sh.
#
# WARNING: this overwrites the target database's tables with the contents
# of the dump. Double-check DATABASE_URL points at the intended
# environment (never run this against production without a fresh backup
# and a deliberate, reviewed decision to do so).

set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL is not set. Export it or source your .env file first." >&2
  exit 1
fi

BACKUP_FILE="${1:-}"
if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup-file.sql.gz>" >&2
  exit 1
fi

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

echo "About to restore '$BACKUP_FILE' into database '$DB_NAME' on $DB_HOST:$DB_PORT."
read -r -p "Type the database name to confirm ($DB_NAME): " CONFIRM
if [ "$CONFIRM" != "$DB_NAME" ]; then
  echo "Confirmation did not match. Aborting." >&2
  exit 1
fi

echo "Restoring..."
gunzip -c "$BACKUP_FILE" | MYSQL_PWD="$DB_PASSWORD" mysql \
  --host="$DB_HOST" \
  --port="$DB_PORT" \
  --user="$DB_USER" \
  "$DB_NAME"

echo "Restore complete."
