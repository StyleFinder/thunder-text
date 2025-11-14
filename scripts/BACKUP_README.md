# Database Backup & Restore Guide

**Purpose**: Safety procedures for Phase 0 of app separation project

## Prerequisites

1. **Install PostgreSQL client tools** (includes `pg_dump` and `psql`):

   ```bash
   # macOS
   brew install postgresql

   # Ubuntu/Debian
   sudo apt-get install postgresql-client
   ```

2. **Set DATABASE_URL environment variable**:

   ```bash
   # Get your database password from Supabase dashboard:
   # https://supabase.com/dashboard/project/upkmmwvbspgeanotzknk/settings/database

   export DATABASE_URL='postgresql://postgres:[YOUR-PASSWORD]@db.upkmmwvbspgeanotzknk.supabase.co:5432/postgres'
   ```

## Creating Backup

**Run the backup script**:

```bash
cd /Users/bigdaddy/prod_desc/thunder-text
./scripts/backup-database.sh
```

**Output**:

- Creates `./backups/pre-separation/thundertext_backup_YYYYMMDD_HHMMSS.sql`
- Creates compressed version: `.sql.gz`
- Creates manifest file with backup details
- Verifies backup integrity

**Expected result**:

```
✅ Backup created successfully
   File: ./backups/pre-separation/thundertext_backup_20251114_143022.sql
   Size: 2.4M
✅ Compressed backup created
   File: ./backups/pre-separation/thundertext_backup_20251114_143022.sql.gz
   Size: 456K
```

## Verifying Backup

**Check backup file contents**:

```bash
# Count tables in backup
grep -c "CREATE TABLE" ./backups/pre-separation/thundertext_backup_*.sql

# Should show ~14 tables
```

**Expected tables**:

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

## Restoring from Backup

**⚠️ CRITICAL: Only use in emergency if separation work breaks production**

```bash
cd /Users/bigdaddy/prod_desc/thunder-text
./scripts/restore-database.sh

# Follow prompts:
# 1. Select backup file
# 2. Type 'YES' to confirm (destructive operation)
```

## Alternative: Manual Backup via Supabase MCP

If script fails, use Supabase MCP tools:

```typescript
// List all tables
await mcp__supabase__list_tables({
  project_id: "upkmmwvbspgeanotzknk",
  schemas: ["public"],
});

// Export data manually via SQL
await mcp__supabase__execute_sql({
  project_id: "upkmmwvbspgeanotzknk",
  query: "SELECT * FROM shops",
});
```

## Backup Storage

**Location**: `./backups/pre-separation/`

**Retention**: Keep until Phase 6 deployment complete (Week 8)

**Security**:

- ❌ DO NOT commit backups to Git (already in .gitignore)
- ✅ Store compressed backups off-server
- ✅ Keep manifest files for audit trail

## Troubleshooting

### Error: `pg_dump: command not found`

Install PostgreSQL client tools (see Prerequisites)

### Error: `connection refused`

Check DATABASE_URL includes correct password

### Error: `database URL not set`

Export DATABASE_URL environment variable

### Error: `permission denied`

Make scripts executable: `chmod +x scripts/*.sh`
