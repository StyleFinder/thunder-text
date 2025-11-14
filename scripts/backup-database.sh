#!/bin/bash

# Database Backup Script for App Separation (Phase 0)
# Date: 2025-11-14
# Purpose: Create complete database backup before separation work

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Thunder Text Database Backup${NC}"
echo -e "${YELLOW}========================================${NC}"

# Check if required env vars exist
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}❌ ERROR: DATABASE_URL not set${NC}"
  echo "Please set your Supabase database URL:"
  echo "export DATABASE_URL='postgresql://postgres:[YOUR-PASSWORD]@db.upkmmwvbspgeanotzknk.supabase.co:5432/postgres'"
  exit 1
fi

# Create backup directory
BACKUP_DIR="./backups/pre-separation"
mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/thundertext_backup_$TIMESTAMP.sql"

echo -e "\n${YELLOW}Creating database backup...${NC}"
echo "Target: $BACKUP_FILE"

# Perform backup using pg_dump
pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --format=plain \
  --file="$BACKUP_FILE"

# Check if backup was successful
if [ $? -eq 0 ] && [ -f "$BACKUP_FILE" ]; then
  FILE_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
  echo -e "${GREEN}✅ Backup created successfully${NC}"
  echo "   File: $BACKUP_FILE"
  echo "   Size: $FILE_SIZE"

  # Create a compressed version
  echo -e "\n${YELLOW}Compressing backup...${NC}"
  gzip -c "$BACKUP_FILE" > "$BACKUP_FILE.gz"
  COMPRESSED_SIZE=$(du -h "$BACKUP_FILE.gz" | cut -f1)
  echo -e "${GREEN}✅ Compressed backup created${NC}"
  echo "   File: $BACKUP_FILE.gz"
  echo "   Size: $COMPRESSED_SIZE"

  # Create backup manifest
  MANIFEST_FILE="$BACKUP_DIR/backup_manifest_$TIMESTAMP.txt"
  cat > "$MANIFEST_FILE" << EOF
Thunder Text Database Backup Manifest
=====================================
Date: $(date)
Purpose: Pre-separation safety backup (Phase 0)
Branch: feature/app-separation

Database Details:
- Project: Thunder Text
- Region: us-east-1
- Host: db.upkmmwvbspgeanotzknk.supabase.co

Backup Files:
- SQL: $BACKUP_FILE ($FILE_SIZE)
- Compressed: $BACKUP_FILE.gz ($COMPRESSED_SIZE)

Tables Backed Up:
- shops
- integrations
- business_profiles
- business_profile_responses
- interview_prompts
- profile_generation_history
- product_descriptions
- facebook_ad_drafts
- shopify_stores
- shopify_products
- description_generations
- ad_generations
- seasonal_trends
- trend_analyses

Verification:
To verify backup integrity:
  psql "\$DATABASE_URL" -c "SELECT COUNT(*) FROM shops"

To restore backup:
  psql "\$DATABASE_URL" -f "$BACKUP_FILE"

EOF

  echo -e "${GREEN}✅ Manifest created: $MANIFEST_FILE${NC}"

  # Verify critical tables exist in backup
  echo -e "\n${YELLOW}Verifying backup contents...${NC}"
  TABLES_COUNT=$(grep -c "CREATE TABLE" "$BACKUP_FILE" || true)
  echo "   Tables found: $TABLES_COUNT"

  if [ "$TABLES_COUNT" -gt 10 ]; then
    echo -e "${GREEN}✅ Backup verification passed${NC}"
  else
    echo -e "${RED}⚠️  WARNING: Expected more tables in backup${NC}"
  fi

  echo -e "\n${GREEN}========================================${NC}"
  echo -e "${GREEN}Backup Complete!${NC}"
  echo -e "${GREEN}========================================${NC}"

else
  echo -e "${RED}❌ ERROR: Backup failed${NC}"
  exit 1
fi
