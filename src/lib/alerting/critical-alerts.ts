/**
 * Critical Error Alerting System
 *
 * Sends alerts for critical errors that should never fail silently.
 * Supports multiple channels: Discord webhook, Slack webhook, email (via API).
 *
 * Usage:
 *   import { alertCriticalError } from '@/lib/alerting/critical-alerts';
 *
 *   await alertCriticalError({
 *     type: 'BILLING_EVENT_LOST',
 *     message: 'Failed to log billing event',
 *     context: { shopId, chargeId },
 *     error: error
 *   });
 */

import { logger } from "@/lib/logger";

export type AlertType =
  | "BILLING_EVENT_LOST"
  | "AUDIT_TRAIL_FAILURE"
  | "INTEGRATION_SAVE_FAILED"
  | "WEBHOOK_PROCESSING_ERROR"
  | "AUTH_FAILURE"
  | "DATABASE_ERROR"
  | "CRITICAL_API_FAILURE";

export interface AlertPayload {
  type: AlertType;
  message: string;
  context?: Record<string, unknown>;
  error?: Error | unknown;
  severity?: "warning" | "critical";
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
  fields: Array<{ name: string; value: string; inline?: boolean }>;
  timestamp: string;
}

/**
 * Send alert to Discord webhook
 */
async function sendDiscordAlert(payload: AlertPayload): Promise<boolean> {
  const webhookUrl = process.env.DISCORD_ALERT_WEBHOOK_URL;

  if (!webhookUrl) {
    return false;
  }

  const color = payload.severity === "critical" ? 0xff0000 : 0xffa500; // Red or Orange

  const embed: DiscordEmbed = {
    title: `🚨 ${payload.type}`,
    description: payload.message,
    color,
    fields: [],
    timestamp: new Date().toISOString(),
  };

  // Add context fields
  if (payload.context) {
    for (const [key, value] of Object.entries(payload.context)) {
      embed.fields.push({
        name: key,
        value: String(value).substring(0, 1000), // Discord field limit
        inline: true,
      });
    }
  }

  // Add error info
  if (payload.error) {
    const errorMessage =
      payload.error instanceof Error
        ? payload.error.message
        : String(payload.error);
    embed.fields.push({
      name: "Error",
      value: errorMessage.substring(0, 1000),
      inline: false,
    });
  }

  // Add environment
  embed.fields.push({
    name: "Environment",
    value: process.env.NODE_ENV || "development",
    inline: true,
  });

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: "Thunder Text Alerts",
        embeds: [embed],
      }),
    });

    return response.ok;
  } catch (error) {
    logger.error("Failed to send Discord alert", error as Error, {
      component: "critical-alerts",
      alertType: payload.type,
    });
    return false;
  }
}

/**
 * Send alert to Slack webhook
 */
async function sendSlackAlert(payload: AlertPayload): Promise<boolean> {
  const webhookUrl = process.env.SLACK_ALERT_WEBHOOK_URL;

  if (!webhookUrl) {
    return false;
  }

  const emoji =
    payload.severity === "critical" ? ":rotating_light:" : ":warning:";

  const blocks = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${emoji} ${payload.type}`,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: payload.message,
      },
    },
  ];

  // Add context as fields
  if (payload.context && Object.keys(payload.context).length > 0) {
    const contextFields = Object.entries(payload.context).map(
      ([key, value]) => ({
        type: "mrkdwn",
        text: `*${key}:*\n${String(value).substring(0, 500)}`,
      }),
    );

    blocks.push({
      type: "section",
      // @ts-expect-error - Slack block kit typing
      fields: contextFields.slice(0, 10), // Slack field limit
    });
  }

  // Add error
  if (payload.error) {
    const errorMessage =
      payload.error instanceof Error
        ? payload.error.message
        : String(payload.error);
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Error:*\n\`\`\`${errorMessage.substring(0, 500)}\`\`\``,
      },
    });
  }

  // Add timestamp
  blocks.push({
    type: "context",
    // @ts-expect-error - Slack block kit typing
    elements: [
      {
        type: "mrkdwn",
        text: `Environment: ${process.env.NODE_ENV || "development"} | Time: ${new Date().toISOString()}`,
      },
    ],
  });

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    return response.ok;
  } catch (error) {
    logger.error("Failed to send Slack alert", error as Error, {
      component: "critical-alerts",
      alertType: payload.type,
    });
    return false;
  }
}

/**
 * Log to database for persistence and analysis
 */
async function logAlertToDatabase(payload: AlertPayload): Promise<boolean> {
  try {
    // Lazy import to avoid circular dependencies
    const { supabaseAdmin } = await import("@/lib/supabase");

    const { error } = await supabaseAdmin.from("critical_alerts").insert({
      alert_type: payload.type,
      message: payload.message,
      context: payload.context || {},
      error_message:
        payload.error instanceof Error
          ? payload.error.message
          : payload.error
            ? String(payload.error)
            : null,
      error_stack: payload.error instanceof Error ? payload.error.stack : null,
      severity: payload.severity || "warning",
      environment: process.env.NODE_ENV || "development",
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Don't throw - we still want other channels to work
      logger.warn("Failed to log alert to database", {
        component: "critical-alerts",
        error: error.message,
      });
      return false;
    }

    return true;
  } catch (error) {
    // Database table might not exist yet - that's OK
    logger.warn("Alert database logging failed", {
      component: "critical-alerts",
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

/**
 * Send a critical error alert to all configured channels
 *
 * This function is fire-and-forget safe - it will never throw.
 * It attempts to send to all channels and logs failures.
 */
export async function alertCriticalError(payload: AlertPayload): Promise<void> {
  // Always log locally first
  logger.error(
    `[CRITICAL ALERT] ${payload.type}: ${payload.message}`,
    payload.error as Error,
    {
      component: "critical-alerts",
      alertType: payload.type,
      ...payload.context,
    },
  );

  // Send to all channels in parallel
  const results = await Promise.allSettled([
    sendDiscordAlert(payload),
    sendSlackAlert(payload),
    logAlertToDatabase(payload),
  ]);

  // Log which channels succeeded
  const [discord, slack, database] = results;

  const channelResults = {
    discord: discord.status === "fulfilled" && discord.value,
    slack: slack.status === "fulfilled" && slack.value,
    database: database.status === "fulfilled" && database.value,
  };

  const anySuccess = Object.values(channelResults).some(Boolean);

  if (!anySuccess) {
    // Last resort - console.error will at least show in container logs
    console.error("[CRITICAL ALERT - NO CHANNELS AVAILABLE]", {
      type: payload.type,
      message: payload.message,
      context: payload.context,
      error:
        payload.error instanceof Error ? payload.error.message : payload.error,
    });
  }
}

/**
 * Helper for billing-related alerts
 */
export async function alertBillingError(
  message: string,
  context: Record<string, unknown>,
  error?: Error | unknown,
): Promise<void> {
  return alertCriticalError({
    type: "BILLING_EVENT_LOST",
    message,
    context,
    error,
    severity: "critical",
  });
}

/**
 * Helper for audit trail failures
 */
export async function alertAuditFailure(
  message: string,
  context: Record<string, unknown>,
  error?: Error | unknown,
): Promise<void> {
  return alertCriticalError({
    type: "AUDIT_TRAIL_FAILURE",
    message,
    context,
    error,
    severity: "warning",
  });
}

/**
 * Helper for integration save failures
 */
export async function alertIntegrationError(
  message: string,
  context: Record<string, unknown>,
  error?: Error | unknown,
): Promise<void> {
  return alertCriticalError({
    type: "INTEGRATION_SAVE_FAILED",
    message,
    context,
    error,
    severity: "critical",
  });
}
