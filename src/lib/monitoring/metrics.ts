/**
 * Monitoring Metrics
 *
 * Functions to retrieve aggregated metrics for the dev dashboard.
 */

import { supabaseAdmin } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface MonitoringMetrics {
  overview: {
    totalGenerations: number;
    totalCostUsd: number;
    avgLatencyMs: number;
    errorRate: number;
    activeStores: number;
  };
  costBreakdown: {
    byModel: Record<string, number>;
    byOperation: Record<string, number>;
    dailyTrend: Array<{ date: string; cost: number }>;
  };
  usage: {
    generationsToday: number;
    generationsThisWeek: number;
    generationsThisMonth: number;
    byOperation: Record<string, number>;
  };
  performance: {
    avgLatencyMs: number;
    p95LatencyMs: number;
    successRate: number;
    timeoutRate: number;
  };
  topStores: Array<{
    shopId: string;
    shopName: string;
    planTier: string;
    totalGenerations: number;
    planLimit: number;
    usagePercent: number;
  }>;
  recentErrors: Array<{
    id: string;
    errorType: string;
    errorMessage: string;
    occurrenceCount: number;
    lastSeen: string;
  }>;
  alerts: {
    unresolvedCount: number;
    recentAlerts: Array<{
      id: string;
      severity: string;
      title: string;
      createdAt: string;
    }>;
  };
}

export type TimeRange = '7d' | '30d' | '90d';

/**
 * Get all monitoring metrics for the dashboard
 */
export async function getMonitoringMetrics(timeRange: TimeRange = '7d'): Promise<MonitoringMetrics> {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

  const [
    overview,
    costBreakdown,
    usage,
    performance,
    topStores,
    recentErrors,
    alerts,
  ] = await Promise.all([
    getOverviewMetrics(days),
    getCostBreakdown(days),
    getUsageMetrics(days),
    getPerformanceMetrics(days),
    getTopStores(days),
    getRecentErrors(),
    getAlertMetrics(),
  ]);

  return {
    overview,
    costBreakdown,
    usage,
    performance,
    topStores,
    recentErrors,
    alerts,
  };
}

/**
 * Get overview metrics
 */
async function getOverviewMetrics(days: number): Promise<MonitoringMetrics['overview']> {
  try {
    const { data } = await supabaseAdmin.rpc('get_dashboard_summary', { p_days: days });

    if (data && data.length > 0) {
      return {
        totalGenerations: data[0].total_generations || 0,
        totalCostUsd: parseFloat(data[0].total_cost_usd) || 0,
        avgLatencyMs: parseFloat(data[0].avg_latency_ms) || 0,
        errorRate: parseFloat(data[0].error_rate) || 0,
        activeStores: data[0].active_stores || 0,
      };
    }

    return {
      totalGenerations: 0,
      totalCostUsd: 0,
      avgLatencyMs: 0,
      errorRate: 0,
      activeStores: 0,
    };
  } catch (error) {
    logger.error('Failed to get overview metrics', error as Error, {
      component: 'metrics',
    });
    return {
      totalGenerations: 0,
      totalCostUsd: 0,
      avgLatencyMs: 0,
      errorRate: 0,
      activeStores: 0,
    };
  }
}

/**
 * Get cost breakdown
 */
async function getCostBreakdown(days: number): Promise<MonitoringMetrics['costBreakdown']> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get rollups for the period
    const { data: rollups } = await supabaseAdmin
      .from('daily_usage_rollups')
      .select('date, model, operation_type, total_cost_usd')
      .gte('date', since);

    const byModel: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};

    if (rollups) {
      for (const row of rollups) {
        const cost = parseFloat(row.total_cost_usd) || 0;

        // By model
        byModel[row.model] = (byModel[row.model] || 0) + cost;

        // By operation
        byOperation[row.operation_type] = (byOperation[row.operation_type] || 0) + cost;

        // By date
        dailyMap[row.date] = (dailyMap[row.date] || 0) + cost;
      }
    }

    // Convert daily map to sorted array
    const dailyTrend = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, cost]) => ({ date, cost }));

    return { byModel, byOperation, dailyTrend };
  } catch (error) {
    logger.error('Failed to get cost breakdown', error as Error, {
      component: 'metrics',
    });
    return { byModel: {}, byOperation: {}, dailyTrend: [] };
  }
}

/**
 * Get usage metrics
 */
async function getUsageMetrics(days: number): Promise<MonitoringMetrics['usage']> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get today's count from request logs (more accurate)
    const { count: todayCount } = await supabaseAdmin
      .from('api_request_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Get weekly and monthly from rollups
    const { data: weekRollups } = await supabaseAdmin
      .from('daily_usage_rollups')
      .select('operation_type, request_count')
      .gte('date', weekAgo);

    const { data: monthRollups } = await supabaseAdmin
      .from('daily_usage_rollups')
      .select('operation_type, request_count')
      .gte('date', monthAgo);

    const byOperation: Record<string, number> = {};
    let weekTotal = 0;
    let monthTotal = 0;

    if (weekRollups) {
      for (const row of weekRollups) {
        weekTotal += row.request_count;
        byOperation[row.operation_type] = (byOperation[row.operation_type] || 0) + row.request_count;
      }
    }

    if (monthRollups) {
      for (const row of monthRollups) {
        monthTotal += row.request_count;
      }
    }

    return {
      generationsToday: todayCount || 0,
      generationsThisWeek: weekTotal,
      generationsThisMonth: monthTotal,
      byOperation,
    };
  } catch (error) {
    logger.error('Failed to get usage metrics', error as Error, {
      component: 'metrics',
    });
    return {
      generationsToday: 0,
      generationsThisWeek: 0,
      generationsThisMonth: 0,
      byOperation: {},
    };
  }
}

/**
 * Get performance metrics
 */
async function getPerformanceMetrics(days: number): Promise<MonitoringMetrics['performance']> {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: rollups } = await supabaseAdmin
      .from('daily_usage_rollups')
      .select('request_count, success_count, error_count, timeout_count, avg_latency_ms, p95_latency_ms')
      .gte('date', since);

    if (!rollups || rollups.length === 0) {
      return {
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        successRate: 100,
        timeoutRate: 0,
      };
    }

    let totalRequests = 0;
    let totalSuccess = 0;
    let totalTimeouts = 0;
    let latencySum = 0;
    let maxP95 = 0;

    for (const row of rollups) {
      totalRequests += row.request_count;
      totalSuccess += row.success_count;
      totalTimeouts += row.timeout_count;
      latencySum += (row.avg_latency_ms || 0) * row.request_count;
      maxP95 = Math.max(maxP95, row.p95_latency_ms || 0);
    }

    return {
      avgLatencyMs: totalRequests > 0 ? Math.round(latencySum / totalRequests) : 0,
      p95LatencyMs: maxP95,
      successRate: totalRequests > 0 ? Math.round((totalSuccess / totalRequests) * 1000) / 10 : 100,
      timeoutRate: totalRequests > 0 ? Math.round((totalTimeouts / totalRequests) * 1000) / 10 : 0,
    };
  } catch (error) {
    logger.error('Failed to get performance metrics', error as Error, {
      component: 'metrics',
    });
    return {
      avgLatencyMs: 0,
      p95LatencyMs: 0,
      successRate: 100,
      timeoutRate: 0,
    };
  }
}

/**
 * Get top stores by usage
 */
async function getTopStores(days: number): Promise<MonitoringMetrics['topStores']> {
  try {
    const { data } = await supabaseAdmin.rpc('get_top_stores_by_usage', {
      p_days: days,
      p_limit: 10,
    });

    if (!data) return [];

    return data.map((row: {
      shop_id: string;
      shop_name: string;
      plan_tier: string;
      total_generations: number;
      plan_limit: number;
      usage_percent: number;
    }) => ({
      shopId: row.shop_id,
      shopName: row.shop_name || 'Unknown Store',
      planTier: row.plan_tier || 'free',
      totalGenerations: row.total_generations || 0,
      planLimit: row.plan_limit || 30,
      usagePercent: parseFloat(String(row.usage_percent)) || 0,
    }));
  } catch (error) {
    logger.error('Failed to get top stores', error as Error, {
      component: 'metrics',
    });
    return [];
  }
}

/**
 * Get recent errors
 */
async function getRecentErrors(): Promise<MonitoringMetrics['recentErrors']> {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data } = await supabaseAdmin
      .from('error_logs')
      .select('id, error_type, error_message, occurrence_count, last_seen_at')
      .gte('created_at', since)
      .order('occurrence_count', { ascending: false })
      .limit(10);

    if (!data) return [];

    return data.map((row) => ({
      id: row.id,
      errorType: row.error_type,
      errorMessage: row.error_message.substring(0, 100) + (row.error_message.length > 100 ? '...' : ''),
      occurrenceCount: row.occurrence_count,
      lastSeen: row.last_seen_at,
    }));
  } catch (error) {
    logger.error('Failed to get recent errors', error as Error, {
      component: 'metrics',
    });
    return [];
  }
}

/**
 * Get alert metrics
 */
async function getAlertMetrics(): Promise<MonitoringMetrics['alerts']> {
  try {
    // Count unresolved alerts
    const { count: unresolvedCount } = await supabaseAdmin
      .from('alert_history')
      .select('*', { count: 'exact', head: true })
      .eq('is_resolved', false);

    // Get recent alerts
    const { data: recentAlerts } = await supabaseAdmin
      .from('alert_history')
      .select('id, severity, title, created_at')
      .order('created_at', { ascending: false })
      .limit(5);

    return {
      unresolvedCount: unresolvedCount || 0,
      recentAlerts: (recentAlerts || []).map((row) => ({
        id: row.id,
        severity: row.severity,
        title: row.title,
        createdAt: row.created_at,
      })),
    };
  } catch (error) {
    logger.error('Failed to get alert metrics', error as Error, {
      component: 'metrics',
    });
    return {
      unresolvedCount: 0,
      recentAlerts: [],
    };
  }
}

/**
 * Get real-time stats (last 5 minutes)
 */
export async function getRealTimeStats(): Promise<{
  requestsPerMinute: number;
  currentErrorRate: number;
  avgLatencyMs: number;
  activeOperations: number;
}> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: recentLogs, count } = await supabaseAdmin
      .from('api_request_logs')
      .select('status, latency_ms', { count: 'exact' })
      .gte('created_at', fiveMinutesAgo);

    if (!recentLogs || recentLogs.length === 0) {
      return {
        requestsPerMinute: 0,
        currentErrorRate: 0,
        avgLatencyMs: 0,
        activeOperations: 0,
      };
    }

    const errorCount = recentLogs.filter((r) => r.status === 'error').length;
    const avgLatency = recentLogs.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / recentLogs.length;

    return {
      requestsPerMinute: Math.round(((count || 0) / 5) * 10) / 10,
      currentErrorRate: Math.round((errorCount / recentLogs.length) * 1000) / 10,
      avgLatencyMs: Math.round(avgLatency),
      activeOperations: count || 0,
    };
  } catch (error) {
    logger.error('Failed to get real-time stats', error as Error, {
      component: 'metrics',
    });
    return {
      requestsPerMinute: 0,
      currentErrorRate: 0,
      avgLatencyMs: 0,
      activeOperations: 0,
    };
  }
}
