# Rollback Procedure

Last Updated: January 2025

## Quick Reference

| Scenario | Action | Time to Recover |
|----------|--------|-----------------|
| Bad deploy (app broken) | Render rollback | 2-5 minutes |
| Bad migration (data issue) | Database restore | 10-30 minutes |
| Compromised secrets | Rotate credentials | 15-30 minutes |
| Complete outage | Full restore | 30-60 minutes |

---

## 1. Application Rollback (Render)

### When to Use
- New deploy causes errors/crashes
- Features not working as expected
- Performance degradation after deploy

### Steps

1. **Go to Render Dashboard**
   - https://dashboard.render.com
   - Select `thunder-text` service

2. **Find Previous Working Deploy**
   - Click "Deploys" tab
   - Look for last deploy with green "Live" status before the bad one

3. **Rollback**
   - Click on the good deploy
   - Click "Rollback to this deploy"
   - Confirm the rollback

4. **Verify**
   - Wait for deploy to complete (1-2 minutes)
   - Check `/api/health` returns 200
   - Check `/api/health?deep=true` shows all services healthy
   - Test critical user flows (login, Shopify OAuth)

5. **Notify Team**
   - Post in Slack: "Rolled back to deploy [commit hash] due to [reason]"
   - Create issue to investigate the failed deploy

### If Rollback Button Not Available
```bash
# From local machine, revert to previous commit
git log --oneline -10  # Find the good commit
git revert HEAD        # Revert the bad commit
git push origin main   # Trigger new deploy with reverted code
```

---

## 2. Database Rollback (Supabase)

### When to Use
- Migration corrupted data
- Accidental data deletion
- Schema change broke application

### Option A: Point-in-Time Recovery (PITR) - Pro Plan Only

1. **Go to Supabase Dashboard**
   - https://supabase.com/dashboard
   - Select your project

2. **Access Backups**
   - Settings → Database → Backups
   - Click "Point in Time Recovery"

3. **Select Recovery Point**
   - Choose timestamp BEFORE the bad migration
   - Note: This creates a NEW project with restored data

4. **Update Application**
   - Update `DATABASE_URL` in Render to point to new project
   - Update all Supabase env vars
   - Redeploy application

### Option B: Daily Backup Restore (All Plans)

1. **Download Backup**
   - Supabase Dashboard → Settings → Database → Backups
   - Download the most recent backup before the issue

2. **Restore to New Project**
   - Create new Supabase project
   - Use `psql` to restore:
   ```bash
   psql -h db.NEW_PROJECT_REF.supabase.co -U postgres -d postgres < backup.sql
   ```

3. **Switch Application**
   - Update env vars in Render
   - Redeploy

### Option C: Manual Data Fix (If Issue is Small)

```sql
-- Example: Undo a bad UPDATE
-- First, check what was changed
SELECT * FROM your_table WHERE updated_at > '2025-01-09 10:00:00';

-- Restore from audit log if you have one
-- Or manually fix the affected rows
```

---

## 3. Environment Variable Rollback

### When to Use
- Wrong value deployed
- Service integration broken
- Need to disable a feature quickly

### Steps

1. **Render Dashboard**
   - Select service → Environment
   - Find the variable to change

2. **Update Value**
   - Click edit
   - Enter correct value (or previous value)
   - Save

3. **Restart Service**
   - Manual Restart button OR
   - Render will auto-restart after env change

### Feature Flag Emergency Disable
```bash
# In Render Environment Variables
NEXT_PUBLIC_ENABLE_EXPERIMENTAL_FEATURES=false  # Disables experimental features
```

---

## 4. DNS/Domain Rollback

### If Custom Domain Has Issues

1. **Temporary**: Update DNS to point back to Render's default domain
   - `thunder-text.onrender.com` always works

2. **Check Render Domain Settings**
   - Dashboard → Service → Settings → Custom Domains
   - Verify DNS records are correct

---

## 5. Full Disaster Recovery

### Complete Outage Recovery Steps

1. **Assess the Situation**
   - Check Render status: https://status.render.com
   - Check Supabase status: https://status.supabase.com
   - Check if it's your code or infrastructure

2. **If Render is Down**
   - Wait for Render to resolve
   - Nothing you can do except wait
   - Communicate with users if prolonged

3. **If Your App is Down**
   - Check Render deploy logs
   - Check `/api/health?deep=true` for specific failures
   - Rollback to last known good deploy

4. **If Database is Down**
   - Check Supabase dashboard for issues
   - If corrupted, restore from backup
   - Update connection strings if needed

5. **Post-Incident**
   - Document what happened
   - Create incident report
   - Implement fixes to prevent recurrence

---

## Rollback Decision Tree

```
Is the app responding?
├─ No → Check Render status
│       ├─ Render down → Wait
│       └─ Render up → Check deploy logs → Rollback deploy
│
└─ Yes, but errors → Check error type
        ├─ UI/Feature broken → Rollback deploy
        ├─ Data incorrect → Consider DB restore
        ├─ Auth broken → Check env vars first
        └─ External service down → Wait or disable feature
```

---

## Emergency Contacts

| Service | Support Link | Response Time |
|---------|--------------|---------------|
| Render | https://render.com/support | Hours |
| Supabase | https://supabase.com/support | Hours |
| Shopify | Partner Dashboard support | Hours |
| OpenAI | https://help.openai.com | Days |

---

## Post-Rollback Checklist

- [ ] Verify app is functional
- [ ] Check error rates in Sentry
- [ ] Notify affected users if needed
- [ ] Create incident report
- [ ] Schedule post-mortem if significant
- [ ] Fix the root cause before re-deploying
