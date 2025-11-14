#!/bin/bash

# Phase 0 Rollback Script
# Date: 2025-11-14
# Purpose: Emergency rollback to pre-separation state

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${RED}========================================${NC}"
echo -e "${RED}⚠️  PHASE 0 ROLLBACK SCRIPT${NC}"
echo -e "${RED}========================================${NC}"

echo -e "\n${YELLOW}This script will:${NC}"
echo "1. Switch back to main branch"
echo "2. Restore stashed work (if needed)"
echo "3. Remove separation branch"
echo "4. Revert Sentry config changes"
echo ""
echo -e "${RED}⚠️  WARNING: This will discard all Phase 0 work!${NC}"
echo -e "\n${YELLOW}Type 'ROLLBACK' to confirm:${NC}"
read -r CONFIRM

if [ "$CONFIRM" != "ROLLBACK" ]; then
  echo -e "${YELLOW}Rollback cancelled${NC}"
  exit 0
fi

echo -e "\n${YELLOW}Step 1: Checking git status...${NC}"
git status

echo -e "\n${YELLOW}Step 2: Switching to main branch...${NC}"
git checkout main

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ ERROR: Failed to checkout main branch${NC}"
  exit 1
fi

echo -e "${GREEN}✅ Switched to main branch${NC}"

echo -e "\n${YELLOW}Step 3: Checking for stashed work...${NC}"
STASH_COUNT=$(git stash list | grep -c "WIP: title-variations" || true)

if [ "$STASH_COUNT" -gt 0 ]; then
  echo -e "${YELLOW}Found stashed work from feature/title-variations${NC}"
  echo -e "${YELLOW}Apply stash? (y/n):${NC}"
  read -r APPLY_STASH

  if [ "$APPLY_STASH" == "y" ]; then
    git stash pop stash@{0}
    echo -e "${GREEN}✅ Stash applied${NC}"
  else
    echo -e "${YELLOW}Stash preserved for manual recovery${NC}"
  fi
else
  echo -e "${GREEN}No stashed work found${NC}"
fi

echo -e "\n${YELLOW}Step 4: Removing feature/app-separation branch...${NC}"
echo -e "${YELLOW}Delete local branch? (y/n):${NC}"
read -r DELETE_LOCAL

if [ "$DELETE_LOCAL" == "y" ]; then
  git branch -D feature/app-separation 2>/dev/null || echo "Local branch not found"
  echo -e "${GREEN}✅ Local branch deleted${NC}"
fi

echo -e "\n${YELLOW}Delete remote branch? (y/n):${NC}"
read -r DELETE_REMOTE

if [ "$DELETE_REMOTE" == "y" ]; then
  git push origin --delete feature/app-separation 2>/dev/null || echo "Remote branch not found"
  echo -e "${GREEN}✅ Remote branch deleted${NC}"
fi

echo -e "\n${YELLOW}Step 5: Reverting Sentry config changes...${NC}"

# Revert sentry.server.config.ts
git checkout HEAD -- sentry.server.config.ts 2>/dev/null || echo "sentry.server.config.ts already clean"

# Revert sentry.client.config.ts
git checkout HEAD -- sentry.client.config.ts 2>/dev/null || echo "sentry.client.config.ts already clean"

# Revert sentry.edge.config.ts
git checkout HEAD -- sentry.edge.config.ts 2>/dev/null || echo "sentry.edge.config.ts already clean"

echo -e "${GREEN}✅ Sentry configs reverted${NC}"

echo -e "\n${YELLOW}Step 6: Cleaning up backup artifacts...${NC}"
echo -e "${YELLOW}Remove backup files? (y/n):${NC}"
read -r REMOVE_BACKUPS

if [ "$REMOVE_BACKUPS" == "y" ]; then
  rm -rf ./backups/pre-separation 2>/dev/null || true
  rm -rf ./scripts/backup-database.sh 2>/dev/null || true
  rm -rf ./scripts/restore-database.sh 2>/dev/null || true
  rm -rf ./scripts/BACKUP_README.md 2>/dev/null || true
  echo -e "${GREEN}✅ Backup files removed${NC}"
else
  echo -e "${YELLOW}Backup files preserved${NC}"
fi

echo -e "\n${YELLOW}Step 7: Final verification...${NC}"
git status

echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Rollback Complete!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\nCurrent state:"
echo "  Branch: $(git branch --show-current)"
echo "  Uncommitted changes: $(git status --short | wc -l | tr -d ' ')"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Review git status output above"
echo "  2. Verify application still runs: npm run dev"
echo "  3. Review any remaining uncommitted changes"
