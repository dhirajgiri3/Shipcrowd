#!/usr/bin/env bash
set -euo pipefail

if ! command -v mongorestore >/dev/null 2>&1; then
  echo "Error: mongorestore not found. Install MongoDB Database Tools first." >&2
  exit 1
fi

if [ -z "${MONGODB_URI:-}" ]; then
  echo "Error: MONGODB_URI is not set." >&2
  exit 1
fi

if [ -z "${BACKUP_PATH:-}" ]; then
  cat >&2 <<EOF
Error: BACKUP_PATH is not set.
Usage:
  BACKUP_PATH=/abs/path/to/20260216_221500 npm run db:restore
  BACKUP_PATH=/abs/path/to/20260216_221500.archive.gz npm run db:restore
EOF
  exit 1
fi

if [ ! -e "$BACKUP_PATH" ]; then
  echo "Error: BACKUP_PATH does not exist: $BACKUP_PATH" >&2
  exit 1
fi

if [ "${CONFIRM_RESTORE:-}" != "YES" ]; then
  echo "Error: Restore is destructive. Set CONFIRM_RESTORE=YES to continue." >&2
  exit 1
fi

echo "Restoring database from: $BACKUP_PATH"

if [ -d "$BACKUP_PATH" ]; then
  mongorestore --uri="$MONGODB_URI" --drop "$BACKUP_PATH"
else
  mongorestore --uri="$MONGODB_URI" --drop --archive="$BACKUP_PATH" --gzip
fi

echo "Restore complete"

