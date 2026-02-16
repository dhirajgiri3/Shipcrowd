#!/usr/bin/env bash
set -euo pipefail

if ! command -v mongodump >/dev/null 2>&1; then
  echo "Error: mongodump not found. Install MongoDB Database Tools first." >&2
  exit 1
fi

if [ -z "${MONGODB_URI:-}" ]; then
  echo "Error: MONGODB_URI is not set." >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_ROOT="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TARGET_DIR="$BACKUP_ROOT/$TIMESTAMP"
ARCHIVE_PATH="$BACKUP_ROOT/${TIMESTAMP}.archive.gz"

mkdir -p "$TARGET_DIR"

echo "Creating MongoDB dump at: $TARGET_DIR"
mongodump --uri="$MONGODB_URI" --out="$TARGET_DIR"

echo "Creating compressed archive at: $ARCHIVE_PATH"
mongodump --uri="$MONGODB_URI" --archive="$ARCHIVE_PATH" --gzip

echo "Backup complete"
echo "Directory dump: $TARGET_DIR"
echo "Archive dump:  $ARCHIVE_PATH"

