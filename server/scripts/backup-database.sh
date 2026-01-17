#!/bin/bash

# MongoDB Backup Script
# Creates timestamped backups with verification

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/backup}"
MONGODB_URI="${MONGODB_URI:-mongodb://localhost:27017/shipcrowd}"
RETENTION_DAYS="${RETENTION_DAYS:-90}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/backup_${TIMESTAMP}"

echo -e "${GREEN}🔄 Starting MongoDB backup...${NC}"
echo "   URI: ${MONGODB_URI}"
echo "   Destination: ${BACKUP_PATH}"

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# Run mongodump
echo -e "${YELLOW}📦 Running mongodump...${NC}"
if mongodump --uri="${MONGODB_URI}" --out="${BACKUP_PATH}" --gzip; then
    echo -e "${GREEN}✅ Backup completed successfully${NC}"
else
    echo -e "${RED}❌ Backup failed${NC}"
    exit 1
fi

# Calculate backup size
BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
echo "   Backup size: ${BACKUP_SIZE}"

# Verify backup
echo -e "${YELLOW}🔍 Verifying backup...${NC}"
if [ -d "${BACKUP_PATH}" ] && [ "$(ls -A ${BACKUP_PATH})" ]; then
    COLLECTION_COUNT=$(find "${BACKUP_PATH}" -name "*.bson.gz" | wc -l)
    echo -e "${GREEN}✅ Backup verified: ${COLLECTION_COUNT} collections${NC}"
else
    echo -e "${RED}❌ Backup verification failed${NC}"
    exit 1
fi

# Create metadata file
cat > "${BACKUP_PATH}/metadata.json" <<EOF
{
  "timestamp": "${TIMESTAMP}",
  "uri": "${MONGODB_URI}",
  "size": "${BACKUP_SIZE}",
  "collections": ${COLLECTION_COUNT},
  "hostname": "$(hostname)",
  "created_by": "$(whoami)"
}
EOF

echo -e "${GREEN}✅ Metadata saved${NC}"

# Cleanup old backups
echo -e "${YELLOW}🧹 Cleaning up old backups (older than ${RETENTION_DAYS} days)...${NC}"
find "${BACKUP_DIR}" -name "backup_*" -type d -mtime +${RETENTION_DAYS} -exec rm -rf {} \; 2>/dev/null || true

echo -e "${GREEN}✅ Backup process completed${NC}"
echo "   Backup location: ${BACKUP_PATH}"
