# Facebook Campaign Alert System Setup

This guide covers setting up the daily email alert system for Facebook ad campaigns that fall below performance benchmarks.

## Overview

The system monitors Facebook ad campaigns daily at 6 AM Eastern Time and sends email alerts when campaigns fall below configured benchmarks for:
- Conversion Rate (default: 3%)
- ROAS - Return on Ad Spend (default: 3x)

## Architecture

```
┌─────────────────────────────────────────────┐
│  Daily 6 AM ET Cron Job                     │
│  (Supabase Edge Function)                   │
├─────────────────────────────────────────────┤
│  1. Fetch all shops with alerts enabled     │
│  2. For each shop:                          │
│     - Get Facebook campaign insights        │
│     - Check against benchmarks              │
│     - Send email if below threshold         │
│  3. Log alert history                       │
└─────────────────────────────────────────────┘
```

## Prerequisites

1. **Resend Account** (Email Service)
   - Sign up at https://resend.com
   - Get API key from https://resend.com/api-keys
   - Verify your sending domain

2. **Supabase Project**
   - Existing Thunder Text Supabase project
   - Access to Supabase CLI for migrations and edge functions

3. **Facebook Integration**
   - Facebook app with Marketing API access
   - Shops must have Facebook connected via OAuth

## Setup Steps

### 1. Database Migration

Run the migration to create notification settings tables:

```bash
cd thunder-text
npx supabase db push
```

This creates two tables:
- `facebook_notification_settings` - Stores email preferences and benchmarks
- `facebook_alert_history` - Tracks sent alerts

### 2. Environment Variables

Add to Render environment variables:

```bash
# Resend Email Service
RESEND_API_KEY=re_your_api_key_here
RESEND_FROM_EMAIL=Thunder Text <alerts@yourdomain.com>
```

Add to Supabase Edge Function secrets:

```bash
supabase secrets set RESEND_API_KEY=re_your_api_key_here
supabase secrets set APP_URL=https://thunder-text.onrender.com
```

### 3. Deploy Edge Function

Deploy the daily alerts function to Supabase:

```bash
cd thunder-text
supabase functions deploy facebook-daily-alerts --no-verify-jwt
```

### 4. Configure Cron Schedule

In Supabase Dashboard → Edge Functions → facebook-daily-alerts:

**During Daylight Saving Time (March - November):**
```
0 10 * * *
```
(10 AM UTC = 6 AM ET)

**During Standard Time (November - March):**
```
0 11 * * *
```
(11 AM UTC = 6 AM ET)

Or configure both and handle timezone conversion in the function.

### 5. Verify Resend Domain

In Resend Dashboard:
1. Add your sending domain (e.g., thundertext.app)
2. Add DNS records to your domain registrar
3. Verify domain ownership
4. Wait for verification (usually a few minutes)

## User Configuration

Users configure alerts in the Settings page:

1. Navigate to `/settings?shop=store-name`
2. Scroll to "Facebook Ad Alert Settings" card
3. Configure:
   - Primary email (required)
   - Additional recipients (optional)
   - Custom benchmarks (defaults: 3% conversion, 3x ROAS)
   - Alert threshold percentage (default: 10%)
   - Which metrics trigger alerts
4. Click "Save Settings"

## Email Template

Alerts are sent with:

**Subject:** 🚨 Facebook Ad Campaign Below Benchmark

**Content:**
- List of underperforming campaigns
- Actual vs. benchmark metrics
- Total spend per campaign
- Link to Thunder Text dashboard
- Actionable recommendations

## Testing

### Test Locally

1. Create test notification settings:
```sql
INSERT INTO facebook_notification_settings (
  shop_id,
  primary_email,
  custom_conversion_benchmark,
  custom_roas_benchmark,
  is_enabled
) VALUES (
  'your-shop-id-here',
  'test@example.com',
  3.0,
  3.0,
  true
);
```

2. Manually invoke the edge function:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/facebook-daily-alerts \
  -H "Authorization: Bearer YOUR_SUPABASE_ANON_KEY"
```

### Test Email Sending

Use the Resend API directly:

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Thunder Text <alerts@yourdomain.com>",
    "to": ["test@example.com"],
    "subject": "Test Email",
    "html": "<p>This is a test email</p>"
  }'
```

## Monitoring

### Check Alert History

Query sent alerts:

```sql
SELECT
  sent_at,
  campaign_name,
  alert_type,
  conversion_rate,
  roas,
  emails_sent
FROM facebook_alert_history
WHERE shop_id = 'your-shop-id'
ORDER BY sent_at DESC
LIMIT 10;
```

### View Supabase Logs

In Supabase Dashboard → Logs → Edge Functions:
- Filter by `facebook-daily-alerts`
- Look for success/error messages
- Check execution time

### Resend Logs

In Resend Dashboard → Logs:
- View all sent emails
- Check delivery status
- See bounce/spam reports

## Troubleshooting

### Alerts Not Sending

1. **Check cron schedule is active**
   - Supabase Dashboard → Edge Functions → Cron Jobs

2. **Verify environment variables**
   ```bash
   supabase secrets list
   ```

3. **Check notification settings exist**
   ```sql
   SELECT * FROM facebook_notification_settings WHERE is_enabled = true;
   ```

4. **Review edge function logs**
   - Look for error messages
   - Check Facebook API responses

### Emails Not Delivering

1. **Verify Resend domain**
   - Must be verified before sending

2. **Check from email matches verified domain**
   - `alerts@yourdomain.com` must use verified domain

3. **Review Resend logs**
   - Check for bounce/spam issues

### Wrong Timezone

Edge function runs at UTC time. Adjust cron schedule:
- DST (March-Nov): `0 10 * * *` (6 AM ET)
- Standard (Nov-March): `0 11 * * *` (6 AM ET)

Or implement timezone conversion in the function.

## Cost Estimates

**Resend Free Tier:**
- 3,000 emails/month
- 100 emails/day

**Typical Usage:**
- 1 shop with 5 campaigns = 1 email/day
- 100 shops = 100 emails/day (within limits)

**Supabase Edge Functions:**
- Minimal cost (free tier covers most usage)
- Charges apply for >500K requests/month

## Security Considerations

1. **Email validation** - All emails validated before storage
2. **Rate limiting** - One alert per shop per day maximum
3. **RLS policies** - Shops can only see their own settings
4. **Service role** - Edge function uses service role for full access
5. **API keys** - Stored as environment secrets, not in code

## Future Enhancements

Potential improvements:
- [ ] Timezone customization per shop
- [ ] Alert frequency options (daily, weekly, etc.)
- [ ] SMS alerts via Twilio
- [ ] Slack/Discord integration
- [ ] Historical performance charts in email
- [ ] Auto-pause campaigns option
- [ ] A/B test recommendations

## Support

For issues or questions:
1. Check Supabase logs
2. Review Resend delivery logs
3. Verify environment variables
4. Test manually with curl
5. Check database permissions
