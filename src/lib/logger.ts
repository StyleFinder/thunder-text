/**
 * Centralized Logger with Sentry Integration
 *
 * Provides structured logging with automatic error tracking via Sentry.
 * Use this instead of console.error for production error logging.
 */

import * as Sentry from '@sentry/nextjs'

type LogLevel = 'error' | 'warn' | 'info' | 'debug'

interface LogContext {
  [key: string]: unknown
}

/**
 * Logger class with Sentry integration
 */
class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development'

  /**
   * Log error with Sentry tracking
   * @param message - Error message
   * @param error - Error object (optional)
   * @param context - Additional context data
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    // Always log to console in development
    if (this.isDevelopment) {
      console.error(`❌ ${message}`, error, context)
    }

    // Send to Sentry with context
    Sentry.captureException(error || new Error(message), {
      level: 'error',
      tags: {
        component: context?.component as string | undefined,
        operation: context?.operation as string | undefined,
      },
      contexts: {
        details: context || {},
      },
    })
  }

  /**
   * Log warning with Sentry tracking
   * @param message - Warning message
   * @param context - Additional context data
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`⚠️ ${message}`, context)
    }

    Sentry.captureMessage(message, {
      level: 'warning',
      contexts: {
        details: context || {},
      },
    })
  }

  /**
   * Log info message (development only, not sent to Sentry)
   * @param message - Info message
   * @param context - Additional context data
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`ℹ️ ${message}`, context)
    }
  }

  /**
   * Log debug message (development only, not sent to Sentry)
   * @param message - Debug message
   * @param context - Additional context data
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.log(`🔍 ${message}`, context)
    }
  }

  /**
   * Set user context for Sentry error tracking
   * @param userId - User/store ID
   * @param metadata - Additional user metadata
   */
  setUser(userId: string, metadata?: { email?: string; shop?: string }): void {
    Sentry.setUser({
      id: userId,
      ...metadata,
    })
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    Sentry.setUser(null)
  }

  /**
   * Add breadcrumb for debugging context
   * @param message - Breadcrumb message
   * @param category - Category (e.g., 'api', 'ui', 'auth')
   * @param level - Log level
   */
  addBreadcrumb(
    message: string,
    category: string,
    level: LogLevel = 'info'
  ): void {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      timestamp: Date.now() / 1000,
    })
  }
}

// Export singleton instance
export const logger = new Logger()
