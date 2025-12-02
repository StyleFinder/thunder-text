import { logger } from '@/lib/logger'

/**
 * Resend Email Service
 *
 * Handles sending transactional emails via Resend API
 * Used for Facebook campaign alert notifications
 */

interface SendEmailParams {
  to: string[]
  subject: string
  html: string
  from?: string
}

interface SendEmailResponse {
  success: boolean
  messageId?: string
  error?: string
}

const RESEND_API_KEY = process.env.RESEND_API_KEY
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Thunder Text <alerts@thundertext.app>'

/**
 * Send email via Resend API
 */
export async function sendEmail({
  to,
  subject,
  html,
  from = FROM_EMAIL,
}: SendEmailParams): Promise<SendEmailResponse> {
  try {
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || `Resend API error: ${response.status}`)
    }

    return {
      success: true,
      messageId: data.id,
    }
  } catch (error) {
    logger.error('Error sending email via Resend:', error as Error, { component: 'resend-service' })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send Facebook campaign alert email
 */
export async function sendFacebookAlertEmail(params: {
  to: string[]
  storeName: string
  campaigns: Array<{
    name: string
    conversion_rate: number
    conversion_benchmark: number
    roas: number
    roas_benchmark: number
    spend: number
    failed_metrics: ('conversion_rate' | 'roas')[]
  }>
  dashboardUrl: string
}): Promise<SendEmailResponse> {
  const { to, storeName, campaigns, dashboardUrl } = params

  const html = generateFacebookAlertEmailHTML({
    storeName,
    campaigns,
    dashboardUrl,
  })

  return sendEmail({
    to,
    subject: '🚨 Facebook Ad Campaign Below Benchmark',
    html,
  })
}

/**
 * Generate HTML email template for Facebook alerts
 */
function generateFacebookAlertEmailHTML(params: {
  storeName: string
  campaigns: Array<{
    name: string
    conversion_rate: number
    conversion_benchmark: number
    roas: number
    roas_benchmark: number
    spend: number
    failed_metrics: ('conversion_rate' | 'roas')[]
  }>
  dashboardUrl: string
}): string {
  const { storeName, campaigns, dashboardUrl } = params

  const campaignRows = campaigns
    .map(
      (campaign) => `
    <div style="background-color: #F6F6F7; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #202223;">
        ${escapeHtml(campaign.name)}
      </h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${
          campaign.failed_metrics.includes('conversion_rate')
            ? `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #D72C0D; font-size: 20px;">❌</span>
          <span style="color: #202223;">
            Conversion Rate: <strong>${campaign.conversion_rate.toFixed(2)}%</strong>
            (Benchmark: ${campaign.conversion_benchmark.toFixed(2)}%)
          </span>
        </div>
        `
            : ''
        }
        ${
          campaign.failed_metrics.includes('roas')
            ? `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #D72C0D; font-size: 20px;">❌</span>
          <span style="color: #202223;">
            ROAS: <strong>${campaign.roas.toFixed(2)}x</strong>
            (Benchmark: ${campaign.roas_benchmark.toFixed(2)}x)
          </span>
        </div>
        `
            : ''
        }
        <div style="color: #6D7175;">
          Spend: $${campaign.spend.toFixed(2)}
        </div>
      </div>
    </div>
  `
    )
    .join('')

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Facebook Ad Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F6F6F7;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
    <!-- Header -->
    <div style="background-color: #D72C0D; padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: #FFFFFF; font-size: 24px; font-weight: 600;">
        🚨 Campaign Performance Alert
      </h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <p style="margin: 0 0 16px 0; font-size: 16px; color: #202223;">
        Hi <strong>${escapeHtml(storeName)}</strong>,
      </p>

      <p style="margin: 0 0 24px 0; font-size: 16px; color: #202223;">
        ⚠️ Your Facebook ad campaigns need attention.
      </p>

      <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #202223;">
        Underperforming Campaigns (Last 30 Days):
      </h2>

      ${campaignRows}

      <div style="margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; background-color: #008060; color: #FFFFFF; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: 600; font-size: 16px;">
          View Dashboard →
        </a>
      </div>

      <h3 style="margin: 24px 0 12px 0; font-size: 16px; font-weight: 600; color: #202223;">
        What you can do:
      </h3>
      <ul style="margin: 0 0 24px 0; padding-left: 24px; color: #202223; font-size: 14px;">
        <li style="margin-bottom: 8px;">Review your ad creative and messaging</li>
        <li style="margin-bottom: 8px;">Check your targeting settings</li>
        <li style="margin-bottom: 8px;">Analyze your landing page performance</li>
        <li style="margin-bottom: 8px;">Consider pausing underperforming campaigns</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="background-color: #F6F6F7; padding: 24px; text-align: center; border-top: 1px solid #E1E3E5;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6D7175;">
        You're receiving this because your campaigns fell below your benchmarks.
      </p>
      <p style="margin: 0; font-size: 12px; color: #6D7175;">
        <a href="${dashboardUrl}/settings" style="color: #008060; text-decoration: none;">
          Update alert settings
        </a>
      </p>
    </div>
  </div>
</body>
</html>
  `
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (char) => map[char])
}
