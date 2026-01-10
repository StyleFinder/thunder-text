# Incident Response Playbook

Last Updated: January 2025

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **SEV-1** | Complete outage, all users affected | Immediate | App down, DB unreachable, auth broken |
| **SEV-2** | Major feature broken, many users affected | < 1 hour | Content generation failing, Shopify sync broken |
| **SEV-3** | Minor feature broken, some users affected | < 4 hours | UI glitch, non-critical API slow |
| **SEV-4** | Cosmetic/minor issue | Next business day | Typo, styling issue |

---

## Incident Response Flow

```
DETECT → ASSESS → COMMUNICATE → MITIGATE → RESOLVE → REVIEW
```

---

## 1. Detection

### Automated Alerts (Already Configured)

| Alert Source | What It Catches |
|--------------|-----------------|
| Sentry | JavaScript errors, API errors, performance issues |
| Render | Deploy failures, service crashes |
| Upstash | Rate limit breaches |
| Health check | Service availability |

### Alert Channels
- Slack: `#alerts` (configure webhook in alerting.ts)
- Email: Via Resend to admin email
- Sentry: Dashboard + email notifications

### Manual Detection
- User reports via support
- Monitoring dashboards
- Social media mentions

---

## 2. Assessment

### First 5 Minutes Checklist

```
□ Is the site accessible? (visit app.zunosai.com)
□ What's the error? (check Sentry)
□ How many users affected? (check Sentry user count)
□ When did it start? (check Sentry timeline)
□ What changed? (check recent deploys in Render)
□ Is it us or external? (check status pages)
```

### Quick Diagnostic Commands

```bash
# Check if app is responding
curl -I https://app.zunosai.com/api/health

# Deep health check
curl https://app.zunosai.com/api/health?deep=true | jq

# Check recent Sentry errors (via dashboard)
# https://sentry.io/organizations/YOUR_ORG/issues/
```

### Status Pages to Check
- Render: https://status.render.com
- Supabase: https://status.supabase.com
- OpenAI: https://status.openai.com
- Shopify: https://www.shopifystatus.com
- Stripe: https://status.stripe.com

---

## 3. Communication

### Internal Communication

**SEV-1/SEV-2**: Immediately post in Slack
```
🚨 INCIDENT: [Brief description]
Severity: SEV-[X]
Impact: [Who/what is affected]
Status: Investigating
Lead: [Your name]
```

### External Communication (If Needed)

**For prolonged outages (>30 minutes):**
- Update status page (if you have one)
- Email affected users
- Post on social media if appropriate

**Template:**
```
We're aware of an issue affecting [feature/service] and are actively
working on a fix. We apologize for any inconvenience and will update
you when resolved.
```

---

## 4. Mitigation

### Quick Mitigation Options

| Issue | Quick Fix |
|-------|-----------|
| Bad deploy | Rollback in Render (see rollback-procedure.md) |
| Feature broken | Disable via feature flag |
| External API down | Enable fallback/graceful degradation |
| High traffic | Scale up in Render |
| Rate limit hit | Temporarily increase limits |

### Feature Flag Emergency Disable

In Render Environment Variables:
```bash
# Disable experimental features
NEXT_PUBLIC_ENABLE_EXPERIMENTAL_FEATURES=false

# After changing, service will auto-restart
```

### Scale Up (If Traffic Spike)

1. Render Dashboard → Service → Settings
2. Increase instance count or upgrade plan
3. Monitor performance

---

## 5. Resolution

### Confirm Resolution

```
□ Error rate back to normal in Sentry
□ /api/health?deep=true returns all green
□ Test affected feature manually
□ Monitor for 15 minutes for recurrence
```

### Close the Incident

Post in Slack:
```
✅ RESOLVED: [Brief description]
Duration: [X minutes/hours]
Root Cause: [Brief explanation]
Resolution: [What fixed it]
Follow-up: [Any actions needed]
```

---

## 6. Post-Incident Review

### For SEV-1 and SEV-2 Incidents

Create an incident report within 48 hours:

```markdown
## Incident Report: [Title]

**Date:** [Date]
**Duration:** [Start time] - [End time] ([X] minutes)
**Severity:** SEV-[X]
**Lead:** [Name]

### Summary
[1-2 sentence description of what happened]

### Timeline
- HH:MM - [Event]
- HH:MM - [Event]
- HH:MM - [Event]

### Root Cause
[Detailed explanation of why this happened]

### Impact
- Users affected: [Number]
- Revenue impact: [If applicable]
- Data loss: [Yes/No, details]

### Resolution
[What was done to fix it]

### Action Items
- [ ] [Action to prevent recurrence]
- [ ] [Process improvement]
- [ ] [Monitoring improvement]

### Lessons Learned
[What we learned from this incident]
```

---

## Common Incident Runbooks

### Runbook: App Not Loading

1. Check Render service status
2. Check deploy logs for errors
3. Hit `/api/health` - does it respond?
4. If 503: Check Supabase connection
5. If 500: Check Sentry for error details
6. If timeout: Check for infinite loops, DB queries
7. Rollback to previous deploy if needed

### Runbook: Authentication Broken

1. Check NextAuth configuration
2. Verify `NEXTAUTH_SECRET` is set correctly
3. Verify `NEXTAUTH_URL` matches production domain
4. Check Supabase connection (users table)
5. Check for rate limiting on login
6. Test OAuth flow manually
7. Check Shopify app credentials if OAuth broken

### Runbook: Shopify Integration Broken

1. Check Shopify status page
2. Verify API credentials in env vars
3. Check webhook delivery in Shopify Partner Dashboard
4. Look for 401/403 errors in logs (token expired?)
5. Test API call manually with curl
6. Re-authenticate if token issues

### Runbook: Content Generation Failing

1. Check OpenAI status page
2. Check rate limits (are we over quota?)
3. Check API key is valid
4. Look for specific error in Sentry
5. Test with simple prompt directly
6. Check if specific model is available
7. Fall back to different model if needed

### Runbook: Database Issues

1. Check Supabase status page
2. Check connection pooling (too many connections?)
3. Look for slow queries in Supabase dashboard
4. Check if migrations were recently run
5. Verify RLS policies aren't blocking
6. Check disk space usage
7. Consider read replica if load issue

### Runbook: High Error Rate

1. Open Sentry dashboard
2. Sort by frequency to find top error
3. Check if error started after a deploy
4. Check if error correlates with traffic spike
5. Check if external service is the cause
6. Fix or rollback depending on cause

---

## Escalation Path

```
You (Primary)
    ↓ (If can't resolve in 30 min)
External Support
    ├─ Render Support (infrastructure)
    ├─ Supabase Support (database)
    └─ Service-specific support
```

---

## Incident Response Checklist

### During Incident
- [ ] Assess severity and impact
- [ ] Communicate status internally
- [ ] Apply quick mitigation if possible
- [ ] Document timeline as you go
- [ ] Communicate externally if prolonged

### After Resolution
- [ ] Confirm issue is fully resolved
- [ ] Monitor for recurrence (15-30 min)
- [ ] Post resolution message
- [ ] Schedule post-mortem for SEV-1/2
- [ ] Create follow-up action items
- [ ] Update runbooks if new scenario
