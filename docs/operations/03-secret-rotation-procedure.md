# Secret Rotation Procedure

Last Updated: January 2025

## Secret Inventory

| Secret | Location | Rotation Frequency | Impact if Compromised |
|--------|----------|-------------------|----------------------|
| `NEXTAUTH_SECRET` | Render | Annually or if compromised | All sessions invalidated |
| `DATABASE_URL` | Render | On compromise only | Full database access |
| `SUPABASE_SERVICE_ROLE_KEY` | Render | On compromise only | Full database access |
| `SUPABASE_ANON_KEY` | Render | On compromise only | Public API access |
| `OPENAI_API_KEY` | Render | Annually or on compromise | API charges |
| `SHOPIFY_API_SECRET` | Render | On compromise only | App impersonation |
| `STRIPE_SECRET_KEY` | Render | Annually or on compromise | Payment access |
| `STRIPE_WEBHOOK_SECRET` | Render | When endpoint changes | Webhook validation |
| `RESEND_API_KEY` | Render | Annually or on compromise | Email sending |
| `UPSTASH_REDIS_REST_TOKEN` | Render | On compromise only | Cache/rate limit bypass |
| `SENTRY_AUTH_TOKEN` | Render | Annually | Error reporting |

---

## General Rotation Process

```
1. Generate new credential in service dashboard
2. Update in Render environment variables
3. Verify app still works
4. Revoke old credential (if possible)
5. Document rotation in log
```

---

## Service-Specific Procedures

### NextAuth Secret

**When to Rotate**: Annually, or immediately if exposed

**Impact**: All active user sessions will be invalidated (users must log in again)

**Steps**:
1. Generate new secret:
   ```bash
   openssl rand -base64 32
   ```
2. Go to Render → Environment → `NEXTAUTH_SECRET`
3. Update value with new secret
4. Save and redeploy
5. All users will need to log in again

**Verification**: Test login flow works

---

### Supabase Credentials

**When to Rotate**: Only if compromised (rotation requires new project)

**Warning**: Supabase doesn't support key rotation without creating a new project

**If Compromised**:
1. Create new Supabase project
2. Migrate schema (apply all migrations)
3. Migrate data (export/import or use pg_dump)
4. Update all Supabase env vars in Render:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Redeploy
6. Delete compromised project

**Prevention**: Never commit `.env` files, use Render secrets

---

### OpenAI API Key

**When to Rotate**: Annually, or if usage spike detected

**Steps**:
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Copy the new key (only shown once!)
4. Go to Render → Environment → `OPENAI_API_KEY`
5. Update with new key
6. Save and redeploy
7. **Verify**: Test content generation
8. Go back to OpenAI and delete the old key

**Monitoring**: Set up usage alerts in OpenAI dashboard

---

### Shopify API Credentials

**When to Rotate**: Only if compromised

**Steps**:
1. Go to Shopify Partners → Apps → Your App
2. Navigate to App Setup → API credentials
3. **For API Secret**: Click "Regenerate" (this will break existing sessions)
4. Update in Render:
   - `SHOPIFY_API_KEY` (only if regenerated)
   - `SHOPIFY_API_SECRET`
5. Redeploy
6. Test Shopify OAuth flow

**Warning**: Regenerating breaks all existing store installations - stores need to reinstall

---

### Stripe Keys

**When to Rotate**: Annually, or if compromised

**Steps for Secret Key**:
1. Go to https://dashboard.stripe.com/apikeys
2. Click "Roll key" on the secret key
3. Copy the new key
4. Update in Render → `STRIPE_SECRET_KEY`
5. Redeploy
6. Old key remains valid for 24 hours (grace period)

**Steps for Webhook Secret**:
1. Go to Stripe Dashboard → Developers → Webhooks
2. Select your endpoint
3. Click "Reveal" on signing secret, or create new endpoint
4. Update in Render → `STRIPE_WEBHOOK_SECRET`
5. Redeploy

**Verification**: Test a payment flow in test mode

---

### Resend API Key

**When to Rotate**: Annually, or if compromised

**Steps**:
1. Go to https://resend.com/api-keys
2. Click "Create API Key"
3. Copy the new key
4. Update in Render → `RESEND_API_KEY`
5. Redeploy
6. Delete old key in Resend dashboard

**Verification**: Trigger a test email (password reset, etc.)

---

### Upstash Redis Credentials

**When to Rotate**: Only if compromised

**Steps**:
1. Go to https://console.upstash.com
2. Select your database
3. Go to "Details" tab
4. Click "Reset Password" (this invalidates old token)
5. Copy new REST URL and Token
6. Update in Render:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
7. Redeploy

**Warning**: This immediately invalidates the old token

---

### Sentry Auth Token

**When to Rotate**: Annually

**Steps**:
1. Go to https://sentry.io/settings/auth-tokens/
2. Create new token with same scopes
3. Update in Render → `SENTRY_AUTH_TOKEN`
4. Redeploy
5. Revoke old token

**Verification**: Check Sentry dashboard receives errors

---

## Emergency Rotation Checklist

If you suspect a secret has been compromised:

```
□ Identify which secret(s) are affected
□ Rotate immediately (don't wait)
□ Check logs for unauthorized access
□ Monitor for unusual activity
□ Review how compromise occurred
□ Implement additional protections
□ Document the incident
```

---

## Rotation Schedule

| Quarter | Secrets to Rotate |
|---------|-------------------|
| Q1 (Jan) | `NEXTAUTH_SECRET`, `SENTRY_AUTH_TOKEN` |
| Q2 (Apr) | `OPENAI_API_KEY` |
| Q3 (Jul) | `STRIPE_SECRET_KEY`, `RESEND_API_KEY` |
| Q4 (Oct) | Review all, rotate any >1 year old |

---

## Rotation Log Template

Keep a record of all rotations:

```markdown
## Secret Rotation Log

| Date | Secret | Reason | Rotated By | Verified |
|------|--------|--------|------------|----------|
| 2025-01-15 | OPENAI_API_KEY | Annual rotation | [Name] | Yes |
| 2025-01-15 | NEXTAUTH_SECRET | Annual rotation | [Name] | Yes |
```

---

## Prevention Best Practices

1. **Never commit secrets to git**
   - Use `.env.local` for local dev
   - Keep `.env*` in `.gitignore`

2. **Use Render's secret management**
   - Secrets are encrypted at rest
   - Only revealed to the application

3. **Limit secret scope**
   - OpenAI: Use project-specific keys
   - Stripe: Use restricted keys where possible

4. **Monitor for leaks**
   - GitHub secret scanning (enabled by default)
   - Set up billing alerts on services

5. **Audit access**
   - Review who has access to Render dashboard
   - Use 2FA on all service accounts
