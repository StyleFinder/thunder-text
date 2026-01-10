# Database Backup and Restore Guide

Last Updated: January 2025

## Backup Overview

| Backup Type | Frequency | Retention | Recovery Time | Plan Required |
|-------------|-----------|-----------|---------------|---------------|
| Daily Backup | Every 24h | 7 days | 30-60 min | Free |
| Point-in-Time (PITR) | Continuous | 7 days | 10-30 min | Pro |
| Manual Export | On-demand | Forever | 30-60 min | Any |

---

## Current Configuration

**Supabase Project**: Zeus (Production)
**Project ID**: `odsompikqjxektpiiysy`
**Region**: [Check Supabase dashboard]
**Plan**: [Free/Pro - determines backup options]

---

## 1. Automated Backups (Supabase Managed)

### Daily Backups (All Plans)

Supabase automatically creates daily backups:

1. **Location**: Supabase Dashboard → Project Settings → Database → Backups
2. **Retention**: Last 7 days
3. **Time**: Typically runs at low-traffic hours (check dashboard for exact time)

### Point-in-Time Recovery (Pro Plan)

If on Pro plan, PITR allows recovery to any point in the last 7 days:

1. **Enable**: Project Settings → Add-ons → Enable PITR
2. **Cost**: Additional ~$100/month for Pro projects
3. **Benefit**: Recover to any second, not just daily snapshots

---

## 2. Manual Backup Procedures

### Option A: Supabase Dashboard Export

1. Go to Supabase Dashboard
2. Select your project
3. Navigate to: Settings → Database → Backups
4. Click "Download" on desired backup
5. Store securely (encrypted, off-site)

### Option B: pg_dump (Full Control)

```bash
# Set your connection string
export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"

# Full backup (schema + data)
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema only (for migration reference)
pg_dump $DATABASE_URL --schema-only > schema_$(date +%Y%m%d).sql

# Data only (if schema unchanged)
pg_dump $DATABASE_URL --data-only > data_$(date +%Y%m%d).sql

# Specific tables only
pg_dump $DATABASE_URL -t users -t shops -t generated_content > critical_tables_$(date +%Y%m%d).sql
```

### Option C: Supabase CLI

```bash
# Install Supabase CLI if not installed
npm install -g supabase

# Login
supabase login

# Link to project
supabase link --project-ref odsompikqjxektpiiysy

# Dump database
supabase db dump > backup_$(date +%Y%m%d).sql

# Dump specific schema
supabase db dump --schema public > public_schema_$(date +%Y%m%d).sql
```

---

## 3. Restore Procedures

### Scenario A: Restore to Same Project (Data Corruption)

**Warning**: This overwrites current data. Create a backup first!

```bash
# First, backup current state (just in case)
pg_dump $DATABASE_URL > pre_restore_backup.sql

# Restore from backup file
psql $DATABASE_URL < backup_file.sql
```

### Scenario B: Restore to New Project (Disaster Recovery)

1. **Create New Supabase Project**
   - Go to https://supabase.com/dashboard
   - Click "New Project"
   - Choose same region as original
   - Wait for project to initialize (~2 minutes)

2. **Get New Connection String**
   - Project Settings → Database → Connection string
   - Copy the URI format

3. **Restore Database**
   ```bash
   export NEW_DATABASE_URL="postgresql://postgres:[NEW_PASSWORD]@db.[NEW_PROJECT_REF].supabase.co:5432/postgres"

   # Restore schema and data
   psql $NEW_DATABASE_URL < backup_file.sql
   ```

4. **Verify Restoration**
   ```bash
   # Connect and check tables
   psql $NEW_DATABASE_URL -c "\dt"

   # Check row counts
   psql $NEW_DATABASE_URL -c "SELECT COUNT(*) FROM users;"
   psql $NEW_DATABASE_URL -c "SELECT COUNT(*) FROM shops;"
   ```

5. **Update Application**
   - Go to Render → Environment
   - Update these variables:
     - `DATABASE_URL`
     - `SUPABASE_URL`
     - `SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Redeploy

### Scenario C: Point-in-Time Recovery (Pro Plan)

1. Go to Supabase Dashboard → Your Project
2. Settings → Database → Backups
3. Click "Point in Time Recovery"
4. Select the exact timestamp to recover to
5. Click "Restore"
6. **Note**: This creates a NEW project with recovered data
7. Update application env vars to point to new project

---

## 4. Pre-Migration Backup Checklist

Before running any migration:

```bash
# 1. Create timestamped backup
pg_dump $DATABASE_URL > pre_migration_$(date +%Y%m%d_%H%M%S).sql

# 2. Verify backup file size (should be non-zero)
ls -lh pre_migration_*.sql

# 3. Test backup is valid (optional but recommended for critical changes)
# Create a test database and restore to it
createdb test_restore
psql test_restore < pre_migration_*.sql
dropdb test_restore

# 4. Now safe to run migration
supabase db push  # or npm run db:migrate
```

---

## 5. Backup Storage Best Practices

### Where to Store Backups

| Location | Pros | Cons |
|----------|------|------|
| Local machine | Fast access | Single point of failure |
| Cloud storage (S3, GCS) | Durable, cheap | Requires setup |
| Encrypted USB | Offline, secure | Manual process |
| Git (schema only) | Version controlled | Never store data |

### Recommended Setup

1. **Daily**: Supabase automatic backups (7 days)
2. **Weekly**: Manual pg_dump to cloud storage
3. **Pre-deployment**: Always backup before migrations
4. **Monthly**: Download and archive off-site

### Backup Naming Convention

```
thunder_text_backup_YYYYMMDD_HHMMSS.sql
thunder_text_schema_YYYYMMDD.sql
thunder_text_pre_migration_[migration_name]_YYYYMMDD.sql
```

---

## 6. Recovery Time Objectives

| Scenario | Target Recovery Time | Method |
|----------|---------------------|--------|
| Single table corruption | < 30 minutes | Restore specific table from backup |
| Full database corruption | < 1 hour | Restore full backup |
| Complete project loss | < 2 hours | New project + restore |
| Region failure | < 4 hours | New project in different region |

---

## 7. Testing Your Backups

### Monthly Backup Test Procedure

```bash
# 1. Download latest backup
# (from Supabase dashboard or your storage)

# 2. Create test database locally or new Supabase project
createdb thunder_text_restore_test

# 3. Restore backup
psql thunder_text_restore_test < latest_backup.sql

# 4. Verify critical data exists
psql thunder_text_restore_test << EOF
SELECT COUNT(*) as user_count FROM users;
SELECT COUNT(*) as shop_count FROM shops;
SELECT COUNT(*) as content_count FROM generated_content;
SELECT MAX(created_at) as latest_record FROM generated_content;
EOF

# 5. Clean up
dropdb thunder_text_restore_test

# 6. Document the test
echo "Backup test completed: $(date)" >> backup_test_log.txt
```

---

## 8. Emergency Contacts

| Issue | Contact |
|-------|---------|
| Supabase database issues | https://supabase.com/support |
| Cannot access backups | Supabase Discord: https://discord.supabase.com |
| Data recovery assistance | support@supabase.io |

---

## 9. Backup Checklist

### Daily (Automated)
- [ ] Supabase daily backup runs (check dashboard weekly)

### Before Each Deploy
- [ ] Run pre-migration backup if database changes
- [ ] Verify backup completed successfully

### Weekly
- [ ] Download backup to secondary location
- [ ] Verify backup file integrity

### Monthly
- [ ] Test restore procedure
- [ ] Review backup retention policy
- [ ] Archive important backups off-site
- [ ] Document any schema changes

### Quarterly
- [ ] Full disaster recovery drill
- [ ] Review and update this document
- [ ] Verify all backup locations accessible
