#!/bin/bash

# MongoDB Restore Script
# Restores from timestamped backup with verification

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check arguments
if [ $# -lt 1 ]; then
    echo -e "${RED}Usage: $0 <backup_path> [target_uri]${NC}"
    echo "Example: $0 /backup/backup_20260116_120000"
    exit 1
fi

BACKUP_PATH="$1"
TARGET_URI="${2:-mongodb://localhost:27017/shipcrowd_restore_test}"

# Verify backup exists
if [ ! -d "${BACKUP_PATH}" ]; then
    echo -e "${RED}❌ Backup directory not found: ${BACKUP_PATH}${NC}"
    exit 1
fi

echo -e "${GREEN}🔄 Starting MongoDB restore...${NC}"
echo "   Source: ${BACKUP_PATH}"
echo "   Target: ${TARGET_URI}"

# Show metadata if exists
if [ -f "${BACKUP_PATH}/metadata.json" ]; then
    echo -e "${YELLOW}📋 Backup metadata:${NC}"
    cat "${BACKUP_PATH}/metadata.json"
fi

# Confirm restore
read -p "⚠️  This will restore to ${TARGET_URI}. Continue? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled"
    exit 0
fi

# Run mongorestore
echo -e "${YELLOW}📦 Running mongorestore...${NC}"
if mongorestore --uri="${TARGET_URI}" --dir="${BACKUP_PATH}" --gzip --drop; then
    echo -e "${GREEN}✅ Restore completed successfully${NC}"
else
    echo -e "${RED}❌ Restore failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Restore process completed${NC}"
