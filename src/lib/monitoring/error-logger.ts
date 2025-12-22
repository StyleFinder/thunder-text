/**
 * Error Logger
 *
 * Centralized error tracking with automatic alert triggering
 * for critical error patterns.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { triggerAlert, AlertSeverity, AlertType, alertHighErrorRate } from './alerting';
import crypto from 'crypto';

export interface ErrorLog {
  errorType: 'api_error' | 'validation_error' | 'auth_error' | 'timeout' | 'rate_limit' | 'database_error' | 'unknown';
  errorCode?: string;
  errorMessage: string;
  shopId?: string;
  endpoint?: string;
  operationType?: string;
  stackTrace?: string;
  requestData?: Record<string, unknown>;
  responseData?: Record<string, unknown>;
}

// In-memory error rate tracking for alert detection
const recentErrors: { timestamp: number; type: string }[] = [];
const ERROR_RATE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const ERROR_RATE_THRESHOLD = 0.5; // 50%
const MIN_REQUESTS_FOR_ALERT = 10; // Need at least 10 requests to calculate error rate
let lastErrorRateAlertTime = 0;
const ERROR_RATE_ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes between alerts

/**
 * Log an error to the database
 */
export async function logError(error: ErrorLog): Promise<void> {
  try {
    // Generate hash for error deduplication
    const errorHash = generateErrorHash(error.errorType, error.errorMessage);

    // Check if we've seen this error recently (last hour)
    const { data: existingError } = await supabaseAdmin
      .from('error_logs')
      .select('id, occurrence_count')
      .eq('error_hash', errorHash)
      .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .single();

    if (existingError) {
      // Increment occurrence count for existing error
      await supabaseAdmin
        .from('error_logs')
        .update({
          occurrence_count: existingError.occurrence_count + 1,
          last_seen_at: new Date().toISOString(),
        })
        .eq('id', existingError.id);
    } else {
      // Insert new error
      await supabaseAdmin.from('error_logs').insert({
        error_type: error.errorType,
        error_code: error.errorCode || null,
        error_message: error.errorMessage,
        shop_id: error.shopId || null,
        endpoint: error.endpoint || null,
        operation_type: error.operationType || null,
        stack_trace: error.stackTrace || null,
        request_data: error.requestData || {},
        response_data: error.responseData || {},
        error_hash: errorHash,
        occurrence_count: 1,
        first_seen_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
      });
    }

    // Track for error rate monitoring
    trackRecentError(error.errorType);

    // Check for critical error patterns
    await checkForCriticalPatterns(error);
  } catch (dbError) {
    // Don't let error logging break the app
    logger.error('Failed to log error to database', dbError as Error, {
      component: 'error-logger',
      originalError: error.errorMessage,
    });
  }
}

/**
 * Generate a hash for error deduplication
 */
function generateErrorHash(errorType: string, errorMessage: string): string {
  // Normalize message by removing variable parts like IDs, timestamps
  const normalizedMessage = errorMessage
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[UUID]')
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]')
    .replace(/\d+/g, '[NUM]');

  const hash = crypto
    .createHash('md5')
    .update(`${errorType}:${normalizedMessage}`)
    .digest('hex')
    .substring(0, 16);

  return hash;
}

/**
 * Track recent errors for rate monitoring
 */
function trackRecentError(errorType: string): void {
  const now = Date.now();

  // Add new error
  recentErrors.push({ timestamp: now, type: errorType });

  // Remove old errors outside the window
  const cutoff = now - ERROR_RATE_WINDOW_MS;
  while (recentErrors.length > 0 && recentErrors[0].timestamp < cutoff) {
    recentErrors.shift();
  }
}

/**
 * Check for critical error patterns that need immediate alerting
 */
async function checkForCriticalPatterns(error: ErrorLog): Promise<void> {
  // Check for OpenAI API failures
  if (
    error.errorType === 'api_error' &&
    (error.errorMessage.includes('OpenAI') ||
      error.errorMessage.includes('openai') ||
      error.errorCode === '401' ||
      error.errorCode === '403')
  ) {
    // Count recent OpenAI errors
    const recentOpenAIErrors = recentErrors.filter(
      (e) => e.type === 'api_error' && Date.now() - e.timestamp < 60000
    ).length;

    // If 5+ OpenAI errors in last minute, trigger alert
    if (recentOpenAIErrors >= 5) {
      await triggerAlert({
        severity: AlertSeverity.CRITICAL,
        type: AlertType.OPENAI_API_FAILURE,
        title: 'OpenAI API Failure Detected',
        message: `${recentOpenAIErrors} OpenAI API errors in the last minute. AI generation may be unavailable.`,
        details: {
          recentErrorCount: recentOpenAIErrors,
          lastError: error.errorMessage,
          errorCode: error.errorCode,
        },
        affectedComponent: 'openai',
      });
    }
  }

  // Check for database errors
  if (error.errorType === 'database_error') {
    await triggerAlert({
      severity: AlertSeverity.CRITICAL,
      type: AlertType.DATABASE_WRITE_FAILURE,
      title: 'Database Error Detected',
      message: `Database operation failed: ${error.errorMessage}`,
      details: {
        endpoint: error.endpoint,
        operationType: error.operationType,
      },
      affectedComponent: 'supabase',
    });
  }

  // Check overall error rate
  await checkErrorRate();
}

/**
 * Check if error rate exceeds threshold
 */
async function checkErrorRate(): Promise<void> {
  const now = Date.now();

  // Don't alert too frequently
  if (now - lastErrorRateAlertTime < ERROR_RATE_ALERT_COOLDOWN_MS) {
    return;
  }

  // Get total requests in window from database
  try {
    const { data } = await supabaseAdmin.rpc('get_error_rate', { p_minutes: 5 });

    if (data && data.length > 0) {
      const { total_requests, error_count, error_rate } = data[0];

      if (total_requests >= MIN_REQUESTS_FOR_ALERT && error_rate >= ERROR_RATE_THRESHOLD * 100) {
        lastErrorRateAlertTime = now;
        await alertHighErrorRate(error_rate, total_requests, 5);
      }
    }
  } catch (error) {
    // Silently fail - this is just monitoring
    logger.warn('Failed to check error rate', { component: 'error-logger', error });
  }
}

/**
 * Get recent error summary for dashboard
 */
export async function getRecentErrorSummary(hours: number = 24): Promise<{
  totalErrors: number;
  errorsByType: Record<string, number>;
  topErrors: Array<{
    errorMessage: string;
    errorType: string;
    occurrenceCount: number;
    lastSeen: string;
  }>;
}> {
  try {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get error counts by type
    const { data: errors } = await supabaseAdmin
      .from('error_logs')
      .select('error_type, error_message, occurrence_count, last_seen_at')
      .gte('created_at', since)
      .order('occurrence_count', { ascending: false })
      .limit(100);

    if (!errors || errors.length === 0) {
      return {
        totalErrors: 0,
        errorsByType: {},
        topErrors: [],
      };
    }

    const errorsByType: Record<string, number> = {};
    let totalErrors = 0;

    for (const error of errors) {
      errorsByType[error.error_type] = (errorsByType[error.error_type] || 0) + error.occurrence_count;
      totalErrors += error.occurrence_count;
    }

    const topErrors = errors.slice(0, 10).map((e) => ({
      errorMessage: e.error_message,
      errorType: e.error_type,
      occurrenceCount: e.occurrence_count,
      lastSeen: e.last_seen_at,
    }));

    return {
      totalErrors,
      errorsByType,
      topErrors,
    };
  } catch (error) {
    logger.error('Failed to get error summary', error as Error, {
      component: 'error-logger',
    });
    return {
      totalErrors: 0,
      errorsByType: {},
      topErrors: [],
    };
  }
}
