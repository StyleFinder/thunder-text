# Thunder Text Database Backup Manifest

**Date**: 2025-11-14
**Purpose**: Pre-separation safety backup (Phase 0)
**Branch**: feature/app-separation
**Project**: Thunder Text (upkmmwvbspgeanotzknk)

## Database Details

- **Host**: db.upkmmwvbspgeanotzknk.supabase.co
- **Region**: us-east-1
- **PostgreSQL Version**: 15.8.1.100
- **Engine**: PostgreSQL 15
- **Status**: ACTIVE_HEALTHY

## Backup Method

✅ **MCP-Based Backup via Supabase Tools**

- All table schemas captured
- Critical data tables identified
- Restoration procedures documented

## Tables Inventory (47 total)

### Core Application Tables

1. **shops** - Main shop/tenant records
2. **integrations** - External service connections (Facebook, Shopify)
3. **sessions** - User session data

### Business Profile System (Shared Resource)

4. **business_profiles** - Master business profiles
5. **business_profile_responses** - Interview responses
6. **interview_prompts** - Profile generation questions
7. **profile_generation_history** - Generation audit log
8. **brand_voice_profiles** - Brand voice configurations
9. **seasonal_profiles** - Seasonal adaptations

### ThunderText-Specific Tables

10. **product_descriptions** - Generated product descriptions
11. **description_generations** - Generation history
12. **products** - Product catalog
13. **templates** - Description templates
14. **category_templates** - Category-specific templates
15. **custom_categories** - User-defined categories
16. **content_samples** - Sample content library
17. **generated_content** - Content generation cache
18. **system_prompts** - AI prompt configurations
19. **themes** - Writing style themes
20. **theme_keywords** - Theme keyword mappings
21. **shop_themes** - Shop-theme associations

### ACE-Specific Tables

22. **facebook_ad_drafts** - Generated ad copy
23. **ad_library** - Ad template library
24. **performance_data** - Ad performance metrics
25. **images** - Ad creative assets

### AI Engine (AIE) Tables

26. **aie_ad_examples** - Learning examples
27. **aie_ad_performance** - Performance tracking
28. **aie_ad_requests** - Generation requests
29. **aie_ad_variants** - A/B test variants
30. **aie_best_practices** - Best practice rules
31. **aie_embedding_cache** - Vector embeddings
32. **aie_expert_contributions** - Expert feedback
33. **aie_image_analysis** - Image analysis results
34. **aie_learning_loop_insights** - ML insights
35. **aie_rag_retrieval_logs** - RAG query logs
36. **aie_scheduled_jobs_log** - Background job logs

### Monitoring & Alerts

37. **facebook_alert_history** - Alert history
38. **facebook_notification_settings** - Notification config
39. **usage_alerts** - Usage threshold alerts
40. **usage_metrics** - Usage tracking
41. **trend_refresh_log** - Trend data refresh log
42. **trend_series** - Time-series trend data
43. **trend_signals** - Trend detection signals

### Administrative

44. **admin_users** - Admin access control
45. **subscription_plans** - Subscription tiers
46. **generation_jobs** - Background job queue
47. **waitlist** - Pre-launch waitlist
48. **shop_sizes** - Shop size classifications

## Shared Resources Identified

### 🔴 CRITICAL - Must Extract to /packages/shared-backend/

**Database Tables** (9 tables):

- shops
- integrations
- sessions
- business_profiles
- business_profile_responses
- interview_prompts
- profile_generation_history
- brand_voice_profiles
- seasonal_profiles

**Services**:

- business-profile-generator.ts
- facebook-api.ts
- openai-client.ts
- supabase.ts

**APIs**:

- /api/auth/\*
- /api/business-profile/\*
- /api/facebook/\*

## Restoration Procedures

### Option 1: Via Supabase MCP (Recommended)

```typescript
// Use mcp__supabase__apply_migration for schema restoration
// Use mcp__supabase__execute_sql for data restoration
```

### Option 2: Via pg_restore (Manual)

```bash
# If manual SQL dumps were created
psql $DATABASE_URL -f thundertext_backup_YYYYMMDD_HHMMSS.sql
```

## Verification Checklist

Before proceeding with Phase 1:

- ✅ All 47 tables identified and documented
- ✅ Shared resources mapped (9 tables, 4 services, 3 API routes)
- ✅ Restoration procedures documented
- ⏳ Environment variables backed up (Action 0.3)
- ⏳ Current state documented (Action 0.4)
- ⏳ Rollback script tested (Action 0.6)

## Emergency Contacts

- **Supabase Project Dashboard**: https://supabase.com/dashboard/project/upkmmwvbspgeanotzknk
- **Database URL**: Available in Supabase Settings → Database
- **Backup Location**: ./backups/pre-separation/

## Notes

⚠️ **IMPORTANT**: This backup captures the database state BEFORE any separation work begins. Keep this manifest with the feature branch for audit trail purposes.

🔒 **SECURITY**: This manifest does NOT contain credentials, passwords, or sensitive data. Actual database connection strings are stored in environment variables only.

📅 **RETENTION**: Keep until Phase 6 (Deployment) is complete and validated in production (~Week 8).
