/**
 * Alerting System
 *
 * Handles critical and high-severity alerts via:
 * - Slack webhooks (critical + high)
 * - Email via Resend (critical only)
 * - Database logging (all alerts)
 */

import { supabaseAdmin } from '@/lib/supabase';
import { sendEmail } from '@/lib/services/resend-service';
import { logger } from '@/lib/logger';

// Alert severity levels
export enum AlertSeverity {
  CRITICAL = 'critical', // App non-functional - immediate Slack + Email
  HIGH = 'high',         // Feature degraded - Slack only
  MEDIUM = 'medium',     // Isolated failures - Dashboard only
  LOW = 'low',           // Warnings - Log only
}

// Alert types
export enum AlertType {
  // Critical
  OPENAI_API_FAILURE = 'openai_api_failure',
  EXTERNAL_API_FAILURE = 'external_api_failure',
  SUPABASE_CONNECTION_FAILURE = 'supabase_connection_failure',
  SHOPIFY_AUTH_FAILURE = 'shopify_auth_failure',
  HIGH_ERROR_RATE = 'high_error_rate',
  GENERATION_FAILURE_SPIKE = 'generation_failure_spike',
  DATABASE_WRITE_FAILURE = 'database_write_failure',

  // High
  RATE_LIMIT_APPROACHING = 'rate_limit_approaching',
  LATENCY_SPIKE = 'latency_spike',
  SINGLE_STORE_AUTH_FAILURE = 'single_store_auth_failure',
  WEBHOOK_DELIVERY_FAILURE = 'webhook_delivery_failure',

  // Medium
  INDIVIDUAL_TIMEOUT = 'individual_timeout',
  IMAGE_PROCESSING_SLOW = 'image_processing_slow',

  // Low
  DEPRECATION_WARNING = 'deprecation_warning',
  USAGE_ANOMALY = 'usage_anomaly',
}

interface AlertDetails {
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  message: string;
  details?: Record<string, unknown>;
  shopId?: string;
  affectedComponent?: string;
}

// Environment configuration
const SLACK_WEBHOOK_URL = process.env.SLACK_ALERT_WEBHOOK;
const DEV_ALERT_EMAIL = process.env.DEV_ALERT_EMAIL;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.thundertext.app';

/**
 * Main alert trigger function
 */
export async function triggerAlert(alert: AlertDetails): Promise<void> {
  const startTime = Date.now();

  try {
    // 1. Log to database first (always)
    const alertRecord = await logAlertToDatabase(alert);

    // 2. Send Slack notification (critical + high)
    if (alert.severity === AlertSeverity.CRITICAL || alert.severity === AlertSeverity.HIGH) {
      await sendSlackAlert(alert, alertRecord?.id);
    }

    // 3. Send email (critical only)
    if (alert.severity === AlertSeverity.CRITICAL && DEV_ALERT_EMAIL) {
      await sendEmailAlert(alert, alertRecord?.id);
    }

    logger.info(`Alert triggered: ${alert.type}`, {
      component: 'alerting',
      severity: alert.severity,
      alertId: alertRecord?.id,
      durationMs: Date.now() - startTime,
    });
  } catch (error) {
    // Don't let alerting failures break the app
    logger.error('Failed to trigger alert', error as Error, {
      component: 'alerting',
      alertType: alert.type,
    });
  }
}

/**
 * Log alert to database
 */
async function logAlertToDatabase(alert: AlertDetails): Promise<{ id: string } | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('alert_history')
      .insert({
        severity: alert.severity,
        alert_type: alert.type,
        title: alert.title,
        message: alert.message,
        details: alert.details || {},
        shop_id: alert.shopId || null,
        affected_component: alert.affectedComponent || null,
      })
      .select('id')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    logger.error('Failed to log alert to database', error as Error, {
      component: 'alerting',
    });
    return null;
  }
}

/**
 * Send Slack alert via webhook
 */
async function sendSlackAlert(alert: AlertDetails, alertId?: string): Promise<boolean> {
  if (!SLACK_WEBHOOK_URL) {
    logger.warn('SLACK_ALERT_WEBHOOK not configured, skipping Slack notification', {
      component: 'alerting',
    });
    return false;
  }

  const emoji = alert.severity === AlertSeverity.CRITICAL ? ':rotating_light:' : ':warning:';
  const color = alert.severity === AlertSeverity.CRITICAL ? '#dc2626' : '#f59e0b';

  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `${emoji} ${alert.severity.toUpperCase()}: ${alert.title}`,
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: alert.message,
      },
    },
  ];

  // Add details if present
  if (alert.details && Object.keys(alert.details).length > 0) {
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '```' + JSON.stringify(alert.details, null, 2) + '```',
      },
    });
  }

  // Add context footer
  const contextElements = [
    `*Type:* ${alert.type}`,
    `*Component:* ${alert.affectedComponent || 'unknown'}`,
    `*Time:* ${new Date().toISOString()}`,
  ];

  if (alertId) {
    contextElements.push(`*Alert ID:* ${alertId}`);
  }

  blocks.push({
    type: 'context',
    elements: contextElements.map((text) => ({
      type: 'mrkdwn',
      text,
    })),
  } as unknown as typeof blocks[0]);

  // Add action button for dashboard
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: {
          type: 'plain_text',
          text: 'View Dashboard',
          emoji: true,
        },
        url: `${APP_URL}/dev`,
        style: alert.severity === AlertSeverity.CRITICAL ? 'danger' : 'primary',
      },
    ],
  } as unknown as typeof blocks[0]);

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attachments: [
          {
            color,
            blocks,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.status}`);
    }

    // Update database with notification status
    if (alertId) {
      await supabaseAdmin
        .from('alert_history')
        .update({
          notified_slack: true,
          notified_slack_at: new Date().toISOString(),
        })
        .eq('id', alertId);
    }

    return true;
  } catch (error) {
    logger.error('Failed to send Slack alert', error as Error, {
      component: 'alerting',
    });
    return false;
  }
}

/**
 * Send email alert for critical issues
 */
async function sendEmailAlert(alert: AlertDetails, alertId?: string): Promise<boolean> {
  if (!DEV_ALERT_EMAIL) {
    logger.warn('DEV_ALERT_EMAIL not configured, skipping email notification', {
      component: 'alerting',
    });
    return false;
  }

  const html = generateAlertEmailHTML(alert, alertId);

  const result = await sendEmail({
    to: [DEV_ALERT_EMAIL],
    subject: `🚨 CRITICAL: ${alert.title} - Thunder Text`,
    html,
  });

  if (result.success && alertId) {
    await supabaseAdmin
      .from('alert_history')
      .update({
        notified_email: true,
        notified_email_at: new Date().toISOString(),
      })
      .eq('id', alertId);
  }

  return result.success;
}

/**
 * Generate HTML email for critical alerts
 */
function generateAlertEmailHTML(alert: AlertDetails, alertId?: string): string {
  const detailsHtml = alert.details
    ? `<pre style="background-color: #f4f4f5; padding: 16px; border-radius: 8px; overflow-x: auto; font-size: 12px;">${JSON.stringify(alert.details, null, 2)}</pre>`
    : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Critical Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    <!-- Header -->
    <div style="background-color: #dc2626; padding: 24px; text-align: center;">
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
        🚨 CRITICAL ALERT
      </h1>
    </div>

    <!-- Content -->
    <div style="padding: 32px 24px;">
      <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 600; color: #18181b;">
        ${escapeHtml(alert.title)}
      </h2>

      <p style="margin: 0 0 24px 0; font-size: 16px; color: #3f3f46; line-height: 1.6;">
        ${escapeHtml(alert.message)}
      </p>

      <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin-bottom: 24px;">
        <p style="margin: 0; font-size: 14px; color: #991b1b;">
          <strong>Type:</strong> ${alert.type}<br>
          <strong>Component:</strong> ${alert.affectedComponent || 'Unknown'}<br>
          <strong>Time:</strong> ${new Date().toISOString()}<br>
          ${alertId ? `<strong>Alert ID:</strong> ${alertId}` : ''}
        </p>
      </div>

      ${detailsHtml}

      <div style="margin: 32px 0; text-align: center;">
        <a href="${APP_URL}/dev" style="display: inline-block; background-color: #dc2626; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
          View Dashboard →
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f4f4f5; padding: 24px; text-align: center; border-top: 1px solid #e4e4e7;">
      <p style="margin: 0; font-size: 12px; color: #71717a;">
        Thunder Text Developer Alert System
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
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

// ============================================
// Convenience functions for common alerts
// ============================================

/**
 * Trigger OpenAI API failure alert
 */
export async function alertOpenAIFailure(error: Error, context?: Record<string, unknown>): Promise<void> {
  await triggerAlert({
    severity: AlertSeverity.CRITICAL,
    type: AlertType.OPENAI_API_FAILURE,
    title: 'OpenAI API Failure',
    message: `OpenAI API is not responding or returning errors. AI generation is unavailable.`,
    details: {
      error: error.message,
      ...context,
    },
    affectedComponent: 'openai',
  });
}

/**
 * Trigger high error rate alert
 */
export async function alertHighErrorRate(
  errorRate: number,
  totalRequests: number,
  timeWindowMinutes: number
): Promise<void> {
  await triggerAlert({
    severity: AlertSeverity.CRITICAL,
    type: AlertType.HIGH_ERROR_RATE,
    title: 'High Error Rate Detected',
    message: `Error rate is ${errorRate.toFixed(1)}% over the last ${timeWindowMinutes} minutes.`,
    details: {
      errorRate,
      totalRequests,
      timeWindowMinutes,
    },
    affectedComponent: 'generation',
  });
}

/**
 * Trigger rate limit approaching alert
 */
export async function alertRateLimitApproaching(
  service: string,
  currentUsage: number,
  limit: number
): Promise<void> {
  const percentage = (currentUsage / limit) * 100;
  await triggerAlert({
    severity: AlertSeverity.HIGH,
    type: AlertType.RATE_LIMIT_APPROACHING,
    title: `${service} Rate Limit Approaching`,
    message: `${service} API usage is at ${percentage.toFixed(1)}% of limit.`,
    details: {
      service,
      currentUsage,
      limit,
      percentage,
    },
    affectedComponent: service.toLowerCase(),
  });
}

/**
 * Trigger latency spike alert
 */
export async function alertLatencySpike(
  p95LatencyMs: number,
  thresholdMs: number,
  operationType?: string
): Promise<void> {
  await triggerAlert({
    severity: AlertSeverity.HIGH,
    type: AlertType.LATENCY_SPIKE,
    title: 'Latency Spike Detected',
    message: `P95 latency is ${(p95LatencyMs / 1000).toFixed(2)}s, exceeding threshold of ${(thresholdMs / 1000).toFixed(2)}s.`,
    details: {
      p95LatencyMs,
      thresholdMs,
      operationType,
    },
    affectedComponent: 'performance',
  });
}
