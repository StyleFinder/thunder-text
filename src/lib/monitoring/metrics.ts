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

export type ApiHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

export interface ApiHealthInfo {
  name: string;
  status: ApiHealthStatus;
  avgLatencyMs: number;
  errorRate: number;
  requestCount: number;
  lastRequest: string | null;
}

export interface ApiHealthMetrics {
  services: ApiHealthInfo[];
  lastChecked: string;
}

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
 * Falls back to api_request_logs if daily_usage_rollups is empty
 */
async function getOverviewMetrics(days: number): Promise<MonitoringMetrics['overview']> {
  try {
    // First try the rollup-based RPC
    const { data } = await supabaseAdmin.rpc('get_dashboard_summary', { p_days: days });

    if (data && data.length > 0 && data[0].total_generations > 0) {
      return {
        totalGenerations: data[0].total_generations || 0,
        totalCostUsd: parseFloat(data[0].total_cost_usd) || 0,
        avgLatencyMs: parseFloat(data[0].avg_latency_ms) || 0,
        errorRate: parseFloat(data[0].error_rate) || 0,
        activeStores: data[0].active_stores || 0,
      };
    }

    // Fall back to direct query from api_request_logs
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    const { data: logs } = await supabaseAdmin
      .from('api_request_logs')
      .select('shop_id, cost_usd, latency_ms, status')
      .gte('created_at', since);

    if (!logs || logs.length === 0) {
      return {
        totalGenerations: 0,
        totalCostUsd: 0,
        avgLatencyMs: 0,
        errorRate: 0,
        activeStores: 0,
      };
    }

    const totalGenerations = logs.length;
    const totalCostUsd = logs.reduce((sum, r) => sum + (parseFloat(String(r.cost_usd)) || 0), 0);
    const avgLatencyMs = logs.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / logs.length;
    const errorCount = logs.filter(r => r.status === 'error').length;
    const errorRate = (errorCount / totalGenerations) * 100;
    const activeStores = new Set(logs.map(r => r.shop_id).filter(Boolean)).size;

    return {
      totalGenerations,
      totalCostUsd,
      avgLatencyMs: Math.round(avgLatencyMs),
      errorRate: Math.round(errorRate * 10) / 10,
      activeStores,
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
 * Falls back to api_request_logs if daily_usage_rollups is empty
 */
async function getCostBreakdown(days: number): Promise<MonitoringMetrics['costBreakdown']> {
  try {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Get rollups for the period
    const { data: rollups } = await supabaseAdmin
      .from('daily_usage_rollups')
      .select('date, model, operation_type, total_cost_usd')
      .gte('date', sinceDate);

    const byModel: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    const dailyMap: Record<string, number> = {};

    if (rollups && rollups.length > 0) {
      for (const row of rollups) {
        const cost = parseFloat(row.total_cost_usd) || 0;
        byModel[row.model] = (byModel[row.model] || 0) + cost;
        byOperation[row.operation_type] = (byOperation[row.operation_type] || 0) + cost;
        dailyMap[row.date] = (dailyMap[row.date] || 0) + cost;
      }
    } else {
      // Fall back to api_request_logs
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data: logs } = await supabaseAdmin
        .from('api_request_logs')
        .select('model, operation_type, cost_usd, created_at')
        .gte('created_at', since);

      if (logs) {
        for (const row of logs) {
          const cost = parseFloat(String(row.cost_usd)) || 0;
          const date = row.created_at.split('T')[0];

          byModel[row.model] = (byModel[row.model] || 0) + cost;
          byOperation[row.operation_type] = (byOperation[row.operation_type] || 0) + cost;
          dailyMap[date] = (dailyMap[date] || 0) + cost;
        }
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
 * Falls back to api_request_logs if daily_usage_rollups is empty
 */
async function getUsageMetrics(days: number): Promise<MonitoringMetrics['usage']> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Get today's count from request logs (more accurate)
    const { count: todayCount } = await supabaseAdmin
      .from('api_request_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Get weekly and monthly from rollups first
    const { data: weekRollups } = await supabaseAdmin
      .from('daily_usage_rollups')
      .select('operation_type, request_count')
      .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const byOperation: Record<string, number> = {};
    let weekTotal = 0;
    let monthTotal = 0;

    if (weekRollups && weekRollups.length > 0) {
      for (const row of weekRollups) {
        weekTotal += row.request_count;
        byOperation[row.operation_type] = (byOperation[row.operation_type] || 0) + row.request_count;
      }

      const { data: monthRollups } = await supabaseAdmin
        .from('daily_usage_rollups')
        .select('operation_type, request_count')
        .gte('date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

      if (monthRollups) {
        for (const row of monthRollups) {
          monthTotal += row.request_count;
        }
      }
    } else {
      // Fall back to api_request_logs
      const { data: weekLogs } = await supabaseAdmin
        .from('api_request_logs')
        .select('operation_type')
        .gte('created_at', weekAgo);

      if (weekLogs) {
        weekTotal = weekLogs.length;
        for (const row of weekLogs) {
          byOperation[row.operation_type] = (byOperation[row.operation_type] || 0) + 1;
        }
      }

      const { count: monthCount } = await supabaseAdmin
        .from('api_request_logs')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', monthAgo);

      monthTotal = monthCount || 0;
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
 * Falls back to api_request_logs if daily_usage_rollups is empty
 */
async function getPerformanceMetrics(days: number): Promise<MonitoringMetrics['performance']> {
  try {
    const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data: rollups } = await supabaseAdmin
      .from('daily_usage_rollups')
      .select('request_count, success_count, error_count, timeout_count, avg_latency_ms, p95_latency_ms')
      .gte('date', sinceDate);

    if (rollups && rollups.length > 0) {
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
    }

    // Fall back to api_request_logs
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await supabaseAdmin
      .from('api_request_logs')
      .select('status, latency_ms')
      .gte('created_at', since);

    if (!logs || logs.length === 0) {
      return {
        avgLatencyMs: 0,
        p95LatencyMs: 0,
        successRate: 100,
        timeoutRate: 0,
      };
    }

    const totalRequests = logs.length;
    const successCount = logs.filter(r => r.status === 'success').length;
    const timeoutCount = logs.filter(r => r.status === 'timeout').length;
    const avgLatencyMs = logs.reduce((sum, r) => sum + (r.latency_ms || 0), 0) / totalRequests;

    // Calculate p95 latency
    const sortedLatencies = logs.map(r => r.latency_ms || 0).sort((a, b) => a - b);
    const p95Index = Math.floor(totalRequests * 0.95);
    const p95LatencyMs = sortedLatencies[p95Index] || sortedLatencies[sortedLatencies.length - 1] || 0;

    return {
      avgLatencyMs: Math.round(avgLatencyMs),
      p95LatencyMs,
      successRate: Math.round((successCount / totalRequests) * 1000) / 10,
      timeoutRate: Math.round((timeoutCount / totalRequests) * 1000) / 10,
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
 * Falls back to api_request_logs if RPC returns no data
 */
async function getTopStores(days: number): Promise<MonitoringMetrics['topStores']> {
  try {
    const { data } = await supabaseAdmin.rpc('get_top_stores_by_usage', {
      p_days: days,
      p_limit: 10,
    });

    if (data && data.length > 0 && data.some((r: { total_generations: number }) => r.total_generations > 0)) {
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
    }

    // Fall back to api_request_logs
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    const { data: logs } = await supabaseAdmin
      .from('api_request_logs')
      .select('shop_id')
      .gte('created_at', since)
      .not('shop_id', 'is', null);

    if (!logs || logs.length === 0) return [];

    // Count by shop_id
    const shopCounts: Record<string, number> = {};
    for (const log of logs) {
      if (log.shop_id) {
        shopCounts[log.shop_id] = (shopCounts[log.shop_id] || 0) + 1;
      }
    }

    // Get shop details
    const shopIds = Object.keys(shopCounts);
    const { data: shops } = await supabaseAdmin
      .from('shops')
      .select('id, display_name, shop_domain, plan')
      .in('id', shopIds);

    if (!shops) return [];

    // Build results
    const results = shops.map(shop => {
      const count = shopCounts[shop.id] || 0;
      const planLimit = shop.plan === 'pro' ? 5000 : shop.plan === 'starter' ? 2000 : 30;
      return {
        shopId: shop.id,
        shopName: shop.display_name || shop.shop_domain || 'Unknown Store',
        planTier: shop.plan || 'free',
        totalGenerations: count,
        planLimit,
        usagePercent: Math.round((count / planLimit) * 1000) / 10,
      };
    });

    // Sort by usage percent descending
    return results.sort((a, b) => b.usagePercent - a.usagePercent).slice(0, 10);
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

/**
 * Service matching configuration for health checks
 *
 * Services are identified by:
 * - model: OpenAI models (gpt-*, gpt-image-*)
 * - endpoint: API endpoint paths
 * - operation_type: Type of operation performed
 */
interface ServiceMatcher {
  displayName: string;
  matchFn: (log: { endpoint?: string; model?: string; operation_type?: string }) => boolean;
}

const SERVICE_MATCHERS: Record<string, ServiceMatcher> = {
  openai: {
    displayName: 'OpenAI API',
    // Match any request that uses a GPT model
    matchFn: (log) => log.model?.startsWith('gpt') || false,
  },
  imageGeneration: {
    displayName: 'Image Generation',
    // Match image generation operations specifically
    matchFn: (log) => log.operation_type === 'image_generation' || log.model === 'gpt-image-1',
  },
  productDescriptions: {
    displayName: 'Product Descriptions',
    // Match product description operations
    matchFn: (log) => log.operation_type === 'product_description',
  },
  adGeneration: {
    displayName: 'Ad Generation',
    // Match ad/content generation operations
    matchFn: (log) => log.operation_type === 'ad_generation' || log.operation_type === 'content_generation',
  },
};

/**
 * Calculate health status based on error rate, latency, and last request status
 */
function calculateHealthStatus(
  errorRate: number,
  avgLatencyMs: number,
  requestCount: number,
  lastRequestAge: number | null,
  lastRequestStatus?: string
): ApiHealthStatus {
  // If no requests in last 24 hours, status is unknown
  if (lastRequestAge === null) {
    return 'unknown';
  }

  // If last request was more than 1 hour ago, status depends on what that request was
  if (lastRequestAge > 60 * 60 * 1000) {
    // If the last request (>1 hour ago) was an error, mark as unknown
    if (lastRequestStatus === 'error' || lastRequestStatus === 'timeout') {
      return 'unknown';
    }
    // If no recent requests but last known request was successful, show "idle" as healthy
    // This prevents services from showing unknown just because there's low traffic
    return 'healthy';
  }

  // If we have recent requests (within 15 min), use those metrics
  if (requestCount > 0) {
    // Down: >50% error rate
    if (errorRate > 50) {
      return 'down';
    }

    // Degraded: >10% error rate or high latency (>30s)
    if (errorRate > 10 || avgLatencyMs > 30000) {
      return 'degraded';
    }

    // Healthy: <10% error rate and reasonable latency
    return 'healthy';
  }

  // No requests in 15 min window, but we have a recent request (< 1 hour)
  // Use the last request's status to determine health
  if (lastRequestStatus === 'error' || lastRequestStatus === 'timeout') {
    return 'degraded'; // Last known request failed, but not enough data to say "down"
  }

  // Last known request was successful, consider healthy
  return 'healthy';
}

/**
 * Get API health metrics for all services
 */
export async function getApiHealthMetrics(): Promise<ApiHealthMetrics> {
  try {
    // Get logs from last 15 minutes for real-time health
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch recent logs with operation_type for better matching
    const { data: recentLogs } = await supabaseAdmin
      .from('api_request_logs')
      .select('endpoint, status, latency_ms, created_at, model, operation_type')
      .gte('created_at', fifteenMinutesAgo)
      .order('created_at', { ascending: false });

    // Also get last request for each service (broader window)
    const { data: dayLogs } = await supabaseAdmin
      .from('api_request_logs')
      .select('endpoint, status, latency_ms, created_at, model, operation_type')
      .gte('created_at', oneDayAgo)
      .order('created_at', { ascending: false });

    const services: ApiHealthInfo[] = [];

    // First add overall Thunder Text API health
    const allLogs = recentLogs || [];
    const totalRequests = allLogs.length;
    const totalErrors = allLogs.filter(log => log.status === 'error' || log.status === 'timeout').length;
    const overallErrorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;
    const overallLatency = totalRequests > 0
      ? allLogs.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / totalRequests
      : 0;

    const lastAnyRequestLog = (dayLogs || [])[0];
    const lastAnyRequest = lastAnyRequestLog?.created_at || null;
    const lastAnyRequestAge = lastAnyRequest ? Date.now() - new Date(lastAnyRequest).getTime() : null;
    const lastAnyRequestStatus = lastAnyRequestLog?.status;

    services.push({
      name: 'Thunder Text API',
      status: calculateHealthStatus(overallErrorRate, overallLatency, totalRequests, lastAnyRequestAge, lastAnyRequestStatus),
      avgLatencyMs: Math.round(overallLatency),
      errorRate: Math.round(overallErrorRate * 10) / 10,
      requestCount: totalRequests,
      lastRequest: lastAnyRequest,
    });

    // Add health for each tracked service using matchers
    for (const [, serviceMatcher] of Object.entries(SERVICE_MATCHERS)) {
      // Filter logs for this service using the match function
      const serviceLogs = (recentLogs || []).filter(log => serviceMatcher.matchFn(log));

      // Get last request from day logs
      const lastServiceLog = (dayLogs || []).find(log => serviceMatcher.matchFn(log));

      const requestCount = serviceLogs.length;
      const errorCount = serviceLogs.filter(log => log.status === 'error' || log.status === 'timeout').length;
      const errorRate = requestCount > 0 ? (errorCount / requestCount) * 100 : 0;
      const avgLatencyMs = requestCount > 0
        ? serviceLogs.reduce((sum, log) => sum + (log.latency_ms || 0), 0) / requestCount
        : 0;

      const lastRequest = lastServiceLog?.created_at || null;
      const lastRequestAge = lastRequest ? Date.now() - new Date(lastRequest).getTime() : null;
      const lastRequestStatus = lastServiceLog?.status;

      const status = calculateHealthStatus(errorRate, avgLatencyMs, requestCount, lastRequestAge, lastRequestStatus);

      services.push({
        name: serviceMatcher.displayName,
        status,
        avgLatencyMs: Math.round(avgLatencyMs),
        errorRate: Math.round(errorRate * 10) / 10,
        requestCount,
        lastRequest,
      });
    }

    return {
      services,
      lastChecked: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Failed to get API health metrics', error as Error, {
      component: 'metrics',
    });

    // Return unknown status for all services on error
    return {
      services: [
        { name: 'Thunder Text API', status: 'unknown', avgLatencyMs: 0, errorRate: 0, requestCount: 0, lastRequest: null },
        { name: 'OpenAI API', status: 'unknown', avgLatencyMs: 0, errorRate: 0, requestCount: 0, lastRequest: null },
        { name: 'Image Generation', status: 'unknown', avgLatencyMs: 0, errorRate: 0, requestCount: 0, lastRequest: null },
        { name: 'Product Descriptions', status: 'unknown', avgLatencyMs: 0, errorRate: 0, requestCount: 0, lastRequest: null },
        { name: 'Ad Generation', status: 'unknown', avgLatencyMs: 0, errorRate: 0, requestCount: 0, lastRequest: null },
      ],
      lastChecked: new Date().toISOString(),
    };
  }
}
