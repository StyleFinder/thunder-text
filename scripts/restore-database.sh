#!/bin/bash

# Database Restore Script for Emergency Rollback
# Date: 2025-11-14
# Purpose: Restore database from backup if separation work causes issues

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}⚠️  DATABASE RESTORE UTILITY${NC}"
echo -e "${RED}========================================${NC}"

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
  exit 1
fi

# List available backups
BACKUP_DIR="./backups/pre-separation"
if [ ! -d "$BACKUP_DIR" ]; then
  echo -e "${RED}❌ ERROR: Backup directory not found${NC}"
  exit 1
fi

echo -e "\n${YELLOW}Available backups:${NC}"
ls -lh "$BACKUP_DIR"/*.sql 2>/dev/null || echo "No .sql backups found"
ls -lh "$BACKUP_DIR"/*.sql.gz 2>/dev/null || echo "No compressed backups found"

# Prompt for backup file
echo -e "\n${YELLOW}Enter backup filename to restore:${NC}"
read -r BACKUP_FILE

if [ ! -f "$BACKUP_FILE" ]; then
  # Try with path
  BACKUP_FILE="$BACKUP_DIR/$BACKUP_FILE"
  if [ ! -f "$BACKUP_FILE" ]; then
    echo -e "${RED}❌ ERROR: Backup file not found${NC}"
    exit 1
  fi
fi

# Decompress if needed
if [[ "$BACKUP_FILE" == *.gz ]]; then
  echo -e "${YELLOW}Decompressing backup...${NC}"
  DECOMPRESSED="${BACKUP_FILE%.gz}"
  gunzip -c "$BACKUP_FILE" > "$DECOMPRESSED"
  BACKUP_FILE="$DECOMPRESSED"
fi

# Confirmation prompt
echo -e "\n${RED}⚠️  WARNING: This will REPLACE all data in the database!${NC}"
echo -e "   Backup file: $BACKUP_FILE"
echo -e "   Database: $DATABASE_URL"
echo -e "\n${YELLOW}Type 'YES' to confirm restore:${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "YES" ]; then
  echo -e "${YELLOW}Restore cancelled${NC}"
  exit 0
fi

# Perform restore
echo -e "\n${YELLOW}Restoring database...${NC}"
psql "$DATABASE_URL" -f "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo -e "\n${GREEN}========================================${NC}"
  echo -e "${GREEN}✅ Database restored successfully${NC}"
  echo -e "${GREEN}========================================${NC}"
else
  echo -e "${RED}❌ ERROR: Restore failed${NC}"
  exit 1
fi
