/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
import { logger } from "@/lib/logger";

/**
 * Resend Email Service
 *
 * Handles sending transactional emails via Resend API
 * Used for Facebook campaign alert notifications
 */

interface SendEmailParams {
  to: string[];
  subject: string;
  html: string;
  from?: string;
}

interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "Thunder Text <alerts@thundertext.app>";

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
      throw new Error("RESEND_API_KEY environment variable is not set");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Resend API error: ${response.status}`);
    }

    return {
      success: true,
      messageId: data.id,
    };
  } catch (error) {
    logger.error("Error sending email via Resend:", error as Error, {
      component: "resend-service",
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send Facebook campaign alert email
 */
export async function sendFacebookAlertEmail(params: {
  to: string[];
  storeName: string;
  campaigns: Array<{
    name: string;
    conversion_rate: number;
    conversion_benchmark: number;
    roas: number;
    roas_benchmark: number;
    spend: number;
    failed_metrics: ("conversion_rate" | "roas")[];
  }>;
  dashboardUrl: string;
}): Promise<SendEmailResponse> {
  const { to, storeName, campaigns, dashboardUrl } = params;

  const html = generateFacebookAlertEmailHTML({
    storeName,
    campaigns,
    dashboardUrl,
  });

  return sendEmail({
    to,
    subject: "🚨 Facebook Ad Campaign Below Benchmark",
    html,
  });
}

/**
 * Generate HTML email template for Facebook alerts
 */
function generateFacebookAlertEmailHTML(params: {
  storeName: string;
  campaigns: Array<{
    name: string;
    conversion_rate: number;
    conversion_benchmark: number;
    roas: number;
    roas_benchmark: number;
    spend: number;
    failed_metrics: ("conversion_rate" | "roas")[];
  }>;
  dashboardUrl: string;
}): string {
  const { storeName, campaigns, dashboardUrl } = params;

  const campaignRows = campaigns
    .map(
      (campaign) => `
    <div style="background-color: #F6F6F7; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #202223;">
        ${escapeHtml(campaign.name)}
      </h3>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${
          campaign.failed_metrics.includes("conversion_rate")
            ? `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #D72C0D; font-size: 20px;">❌</span>
          <span style="color: #202223;">
            Conversion Rate: <strong>${campaign.conversion_rate.toFixed(2)}%</strong>
            (Benchmark: ${campaign.conversion_benchmark.toFixed(2)}%)
          </span>
        </div>
        `
            : ""
        }
        ${
          campaign.failed_metrics.includes("roas")
            ? `
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #D72C0D; font-size: 20px;">❌</span>
          <span style="color: #202223;">
            ROAS: <strong>${campaign.roas.toFixed(2)}x</strong>
            (Benchmark: ${campaign.roas_benchmark.toFixed(2)}x)
          </span>
        </div>
        `
            : ""
        }
        <div style="color: #6D7175;">
          Spend: $${campaign.spend.toFixed(2)}
        </div>
      </div>
    </div>
  `,
    )
    .join("");

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
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Send staff invitation email
 */
export async function sendStaffInvitationEmail(params: {
  to: string;
  storeName: string;
  inviterName: string;
  inviteUrl: string;
  expiresInDays: number;
}): Promise<SendEmailResponse> {
  const { to, storeName, inviterName, inviteUrl, expiresInDays } = params;

  const html = generateStaffInvitationEmailHTML({
    storeName,
    inviterName,
    inviteUrl,
    expiresInDays,
  });

  return sendEmail({
    to: [to],
    subject: `You've been invited to join ${storeName} on Thunder Text`,
    html,
  });
}

/**
 * Generate HTML email template for staff invitations
 */
function generateStaffInvitationEmailHTML(params: {
  storeName: string;
  inviterName: string;
  inviteUrl: string;
  expiresInDays: number;
}): string {
  const { storeName, inviterName, inviteUrl, expiresInDays } = params;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're Invited to Thunder Text</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #F6F6F7;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #FFFFFF;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #0066cc 0%, #0099ff 100%); padding: 32px; text-align: center;">
      <div style="display: inline-flex; align-items: center; gap: 12px;">
        <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #ffcc00 0%, #ff9900 100%); border-radius: 12px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 24px;">⚡</span>
        </div>
        <h1 style="margin: 0; color: #FFFFFF; font-size: 28px; font-weight: 700;">
          Thunder Text
        </h1>
      </div>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #202223; text-align: center;">
        You've Been Invited! 🎉
      </h2>

      <p style="margin: 0 0 24px 0; font-size: 16px; color: #202223; text-align: center; line-height: 1.6;">
        <strong>${escapeHtml(inviterName)}</strong> has invited you to join
        <strong>${escapeHtml(storeName)}</strong> on Thunder Text.
      </p>

      <div style="background-color: #F6F6F7; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px; font-weight: 600; color: #202223;">
          What you'll get access to:
        </h3>
        <ul style="margin: 0; padding-left: 20px; color: #202223; font-size: 14px; line-height: 1.8;">
          <li>AI-powered product description generation</li>
          <li>High-converting ad copy creation</li>
          <li>Brand voice customization</li>
          <li>Social media integrations</li>
        </ul>
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #0066cc 0%, #0099ff 100%); color: #FFFFFF; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 18px; box-shadow: 0 4px 14px rgba(0, 102, 204, 0.3);">
          Accept Invitation
        </a>
      </div>

      <p style="margin: 0; font-size: 14px; color: #6D7175; text-align: center;">
        This invitation expires in <strong>${expiresInDays} days</strong>.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #F6F6F7; padding: 24px; text-align: center; border-top: 1px solid #E1E3E5;">
      <p style="margin: 0 0 8px 0; font-size: 12px; color: #6D7175;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
      <p style="margin: 0; font-size: 12px; color: #6D7175;">
        Questions? Contact us at <a href="mailto:support@thundertext.app" style="color: #0066cc; text-decoration: none;">support@thundertext.app</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;
}
