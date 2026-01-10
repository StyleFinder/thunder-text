# Operations Documentation

This directory contains operational runbooks and procedures for Thunder-Text production environment.

## Documents

| Document | Purpose | When to Use |
|----------|---------|-------------|
| [01-rollback-procedure.md](./01-rollback-procedure.md) | How to rollback deployments and database changes | When a deploy causes issues |
| [02-incident-response-playbook.md](./02-incident-response-playbook.md) | Step-by-step incident handling | When something breaks |
| [03-secret-rotation-procedure.md](./03-secret-rotation-procedure.md) | How to rotate API keys and secrets | Scheduled rotation or compromise |
| [04-database-backup-restore.md](./04-database-backup-restore.md) | Backup and restore procedures | Before migrations, disaster recovery |
| [05-slo-definitions.md](./05-slo-definitions.md) | Service level objectives and monitoring | Understanding reliability targets |

## Quick Links

### Emergency Actions
- **App broken after deploy?** → [Rollback Procedure](./01-rollback-procedure.md#1-application-rollback-render)
- **Something is down?** → [Incident Response](./02-incident-response-playbook.md#2-assessment)
- **Secret compromised?** → [Secret Rotation](./03-secret-rotation-procedure.md#emergency-rotation-checklist)
- **Data corrupted?** → [Database Restore](./04-database-backup-restore.md#3-restore-procedures)

### Routine Operations
- **Before deploying** → Run `npm run build` locally, backup DB if migrations
- **After deploying** → Check `/api/health?deep=true`, monitor Sentry for 15 min
- **Monthly** → Review SLOs, test backup restore, rotate scheduled secrets

## Key Contacts

| Service | Dashboard | Support |
|---------|-----------|---------|
| Render | [dashboard.render.com](https://dashboard.render.com) | [render.com/support](https://render.com/support) |
| Supabase | [supabase.com/dashboard](https://supabase.com/dashboard) | [supabase.com/support](https://supabase.com/support) |
| Sentry | [sentry.io](https://sentry.io) | [sentry.io/support](https://sentry.io/support) |
| OpenAI | [platform.openai.com](https://platform.openai.com) | [help.openai.com](https://help.openai.com) |

## Status Pages

Bookmark these for quick access during incidents:
- Render: https://status.render.com
- Supabase: https://status.supabase.com
- OpenAI: https://status.openai.com
- Shopify: https://www.shopifystatus.com
- Stripe: https://status.stripe.com

---

Last Updated: January 2025
