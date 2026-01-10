"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";

// Types
interface OverviewMetrics {
  totalGenerations: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  errorRate: number;
  activeStores: number;
}

interface RealTimeStats {
  requestsPerMinute: number;
  currentErrorRate: number;
  avgLatencyMs: number;
  activeOperations: number;
}

interface TopStore {
  shopId: string;
  shopName: string;
  planTier: string;
  totalGenerations: number;
  planLimit: number;
  usagePercent: number;
}

interface RecentError {
  id: string;
  errorType: string;
  errorMessage: string;
  occurrenceCount: number;
  lastSeen: string;
}

interface RecentAlert {
  id: string;
  severity: string;
  title: string;
  createdAt: string;
}

type ApiHealthStatus = 'healthy' | 'degraded' | 'down' | 'unknown';

interface ApiHealthInfo {
  name: string;
  status: ApiHealthStatus;
  avgLatencyMs: number;
  errorRate: number;
  requestCount: number;
  lastRequest: string | null;
}

interface ApiHealthMetrics {
  services: ApiHealthInfo[];
  lastChecked: string;
}

interface CostBreakdown {
  byModel: Record<string, number>;
  byOperation: Record<string, number>;
  dailyTrend: Array<{ date: string; cost: number }>;
}

interface DashboardData {
  overview: OverviewMetrics;
  costBreakdown: CostBreakdown;
  topStores: TopStore[];
  recentErrors: RecentError[];
  alerts: {
    unresolvedCount: number;
    recentAlerts: RecentAlert[];
  };
}

type TimeRange = "7d" | "30d" | "90d";

export default function DevDashboard() {
  const searchParams = useSearchParams();
  const [devKey, setDevKey] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [realTimeStats, setRealTimeStats] = useState<RealTimeStats | null>(null);
  const [apiHealth, setApiHealth] = useState<ApiHealthMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Helper to make authenticated requests
  const authFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!devKey) throw new Error("No dev key");
    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        "X-Dev-Key": devKey,
      },
    });
  }, [devKey]);

  // Check authentication - just validate the key exists and is valid
  useEffect(() => {
    const key = searchParams.get("key");
    if (key) {
      // Validate the key with a simple check
      fetch("/api/dev/auth", {
        method: "POST",
        headers: { "X-Dev-Key": key },
      })
        .then((res) => {
          if (res.ok) {
            setDevKey(key);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        })
        .catch(() => setIsAuthenticated(false))
        .finally(() => setIsLoading(false));
    } else {
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }, [searchParams]);

  // Fetch dashboard data
  const fetchData = useCallback(async () => {
    if (!isAuthenticated || !devKey) return;

    try {
      const res = await authFetch(`/api/dev/metrics?range=${timeRange}`);
      if (!res.ok) throw new Error("Failed to fetch metrics");
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, [isAuthenticated, devKey, timeRange, authFetch]);

  // Fetch real-time stats
  const fetchRealTimeStats = useCallback(async () => {
    if (!isAuthenticated || !devKey) return;

    try {
      const res = await authFetch("/api/dev/realtime");
      if (!res.ok) return;
      const json = await res.json();
      setRealTimeStats(json);
    } catch {
      // Silently fail for real-time stats
    }
  }, [isAuthenticated, devKey, authFetch]);

  // Fetch API health
  const fetchApiHealth = useCallback(async () => {
    if (!isAuthenticated || !devKey) return;

    try {
      const res = await authFetch("/api/dev/health");
      if (!res.ok) return;
      const json = await res.json();
      setApiHealth(json);
    } catch {
      // Silently fail for health stats
    }
  }, [isAuthenticated, devKey, authFetch]);

  // Initial fetch and polling
  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
      fetchRealTimeStats();
      fetchApiHealth();

      // Poll real-time stats every 10 seconds
      const realTimeInterval = setInterval(fetchRealTimeStats, 10000);
      // Poll API health every 30 seconds
      const healthInterval = setInterval(fetchApiHealth, 30000);
      // Refresh full data every 60 seconds
      const dataInterval = setInterval(fetchData, 60000);

      return () => {
        clearInterval(realTimeInterval);
        clearInterval(healthInterval);
        clearInterval(dataInterval);
      };
    }
  }, [isAuthenticated, fetchData, fetchRealTimeStats, fetchApiHealth]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-[#0066cc] border-t-transparent rounded-full" />
      </div>
    );
  }

  // Auth required
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg border border-[#e5e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.08)] max-w-md w-full">
          <h1 className="text-xl font-bold mb-4 text-center text-[#003366]">🔐 Dev Dashboard</h1>
          <p className="text-[#6b7280] text-center mb-4">
            Authentication required. Access this page with:
          </p>
          <code className="block bg-[#f0f7ff] border border-[#bfdbfe] p-3 rounded-lg text-sm text-[#0066cc] text-center">
            /dev?key=YOUR_DEV_SECRET
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-[#003366]">
              ⚡ Thunder Text Dev Dashboard
            </h1>
            <p className="text-[#6b7280] text-sm mt-1">
              Real-time monitoring and analytics
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Time Range Selector */}
            <div className="flex bg-white border border-[#e5e7eb] rounded-lg p-1">
              {(["7d", "30d", "90d"] as TimeRange[]).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={`px-3 py-1 rounded text-sm font-semibold transition-all ${
                    timeRange === range
                      ? "bg-[#0066cc] text-white"
                      : "text-[#6b7280] hover:text-[#003366] hover:bg-[#f9fafb]"
                  }`}
                >
                  {range}
                </button>
              ))}
            </div>
            {/* Refresh Button */}
            <button
              onClick={fetchData}
              className="p-2 bg-white border border-[#e5e7eb] rounded-lg hover:bg-[#f9fafb] hover:border-[#0066cc] transition-all"
              title="Refresh"
            >
              🔄
            </button>
          </div>
        </div>
        {lastUpdated && (
          <p className="text-xs text-[#6b7280] mt-2">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </header>

      {/* Error State */}
      {error && (
        <div className="bg-[#fff5f5] border border-[#fecaca] rounded-lg p-4 mb-6">
          <p className="text-[#b91c1c]">⚠️ {error}</p>
        </div>
      )}

      {/* Real-time Status Bar */}
      {realTimeStats && (
        <div className="bg-white rounded-lg p-4 mb-6 border border-[#e5e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="flex items-center gap-2 mb-3">
            <span className="h-2 w-2 bg-[#16a34a] rounded-full animate-pulse" />
            <span className="text-sm font-semibold text-[#003366]">Live Status</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-[#6b7280]">Requests/min</p>
              <p className="text-lg font-bold text-[#003366]">{realTimeStats.requestsPerMinute}</p>
            </div>
            <div>
              <p className="text-xs text-[#6b7280]">Error Rate</p>
              <p className={`text-lg font-bold ${realTimeStats.currentErrorRate > 5 ? "text-[#dc2626]" : "text-[#16a34a]"}`}>
                {realTimeStats.currentErrorRate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6b7280]">Avg Latency</p>
              <p className="text-lg font-bold text-[#003366]">{realTimeStats.avgLatencyMs}ms</p>
            </div>
            <div>
              <p className="text-xs text-[#6b7280]">Active Ops (5m)</p>
              <p className="text-lg font-bold text-[#003366]">{realTimeStats.activeOperations}</p>
            </div>
          </div>
        </div>
      )}

      {/* API Health Status */}
      {apiHealth && (
        <div className="bg-white rounded-lg p-4 mb-6 border border-[#e5e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-[#003366]">🔌 API Health</span>
            </div>
            <span className="text-xs text-[#6b7280]">
              Last checked: {new Date(apiHealth.lastChecked).toLocaleTimeString()}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-4">
            {apiHealth.services.map((service) => (
              <div
                key={service.name}
                className={`p-3 rounded-lg border ${
                  service.status === 'healthy'
                    ? 'bg-[#f0fdf4] border-[#86efac]'
                    : service.status === 'degraded'
                    ? 'bg-[#fffbeb] border-[#fcd34d]'
                    : service.status === 'down'
                    ? 'bg-[#fef2f2] border-[#fecaca]'
                    : 'bg-[#f9fafb] border-[#e5e7eb]'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      service.status === 'healthy'
                        ? 'bg-[#16a34a]'
                        : service.status === 'degraded'
                        ? 'bg-[#f59e0b]'
                        : service.status === 'down'
                        ? 'bg-[#dc2626]'
                        : 'bg-[#9ca3af]'
                    }`}
                  />
                  <span className="text-sm font-medium text-[#003366]">{service.name}</span>
                </div>
                <div className="text-xs text-[#6b7280] space-y-0.5">
                  <p>
                    Status:{' '}
                    <span
                      className={`font-medium ${
                        service.status === 'healthy'
                          ? 'text-[#16a34a]'
                          : service.status === 'degraded'
                          ? 'text-[#f59e0b]'
                          : service.status === 'down'
                          ? 'text-[#dc2626]'
                          : 'text-[#6b7280]'
                      }`}
                    >
                      {service.status}
                    </span>
                  </p>
                  {service.requestCount > 0 && (
                    <>
                      <p>Latency: {service.avgLatencyMs}ms</p>
                      <p>Error rate: {service.errorRate}%</p>
                      <p>Requests (15m): {service.requestCount}</p>
                    </>
                  )}
                  {service.lastRequest && (
                    <p className="text-[10px]">
                      Last: {new Date(service.lastRequest).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {data && (
        <>
          {/* Overview Cards */}
          <div className="grid grid-cols-5 gap-6 mb-6">
            <MetricCard
              title="Total Generations"
              value={data.overview.totalGenerations.toLocaleString()}
              subtitle={`Last ${timeRange}`}
            />
            <MetricCard
              title="Total Cost"
              value={`$${data.overview.totalCostUsd.toFixed(4)}`}
              subtitle={`Last ${timeRange}`}
            />
            <MetricCard
              title="Avg Latency"
              value={`${Math.round(data.overview.avgLatencyMs)}ms`}
              subtitle="Response time"
            />
            <MetricCard
              title="Error Rate"
              value={`${data.overview.errorRate.toFixed(1)}%`}
              subtitle={data.overview.errorRate > 5 ? "⚠️ High" : "✅ Normal"}
              alert={data.overview.errorRate > 5}
            />
            <MetricCard
              title="Active Stores"
              value={data.overview.activeStores.toString()}
              subtitle={`Last ${timeRange}`}
            />
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-3 gap-6">
            {/* Cost Breakdown */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <h2 className="text-lg font-bold mb-4 text-[#003366]">💰 Cost Breakdown</h2>

              <div className="mb-4">
                <h3 className="text-sm text-[#6b7280] mb-2 font-semibold">By Model</h3>
                {Object.entries(data.costBreakdown.byModel).map(([model, cost]) => (
                  <div key={model} className="flex justify-between py-1">
                    <span className="text-sm text-[#003366]">{model}</span>
                    <span className="text-sm font-medium text-[#003366]">${cost.toFixed(4)}</span>
                  </div>
                ))}
                {Object.keys(data.costBreakdown.byModel).length === 0 && (
                  <p className="text-[#6b7280] text-sm">No data</p>
                )}
              </div>

              <div>
                <h3 className="text-sm text-[#6b7280] mb-2 font-semibold">By Operation</h3>
                {Object.entries(data.costBreakdown.byOperation).map(([op, cost]) => (
                  <div key={op} className="flex justify-between py-1">
                    <span className="text-sm text-[#003366]">{op.replace(/_/g, " ")}</span>
                    <span className="text-sm font-medium text-[#003366]">${cost.toFixed(4)}</span>
                  </div>
                ))}
                {Object.keys(data.costBreakdown.byOperation).length === 0 && (
                  <p className="text-[#6b7280] text-sm">No data</p>
                )}
              </div>
            </div>

            {/* Top Stores */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <h2 className="text-lg font-bold mb-4 text-[#003366]">🏪 Top Stores (≥75% Usage)</h2>
              <div className="space-y-3">
                {data.topStores
                  .filter((s) => s.usagePercent >= 75)
                  .slice(0, 10)
                  .map((store, i) => (
                    <div key={store.shopId} className="flex items-center gap-3">
                      <span className="text-[#6b7280] text-sm w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-[#003366]">{store.shopName}</p>
                        <p className="text-xs text-[#6b7280]">
                          {store.planTier} • {store.totalGenerations}/{store.planLimit}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-bold ${
                            store.usagePercent >= 90
                              ? "text-[#dc2626]"
                              : store.usagePercent >= 75
                              ? "text-[#92400e]"
                              : "text-[#16a34a]"
                          }`}
                        >
                          {store.usagePercent.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  ))}
                {data.topStores.filter((s) => s.usagePercent >= 75).length === 0 && (
                  <p className="text-[#6b7280] text-sm">No high-volume stores</p>
                )}
              </div>
            </div>

            {/* Alerts & Errors */}
            <div className="bg-white rounded-lg p-6 border border-[#e5e7eb] shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <h2 className="text-lg font-bold mb-4 text-[#003366]">
                🚨 Alerts{" "}
                {data.alerts.unresolvedCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-[#dc2626] text-white text-xs rounded-full">
                    {data.alerts.unresolvedCount}
                  </span>
                )}
              </h2>

              <div className="space-y-2 mb-6">
                {data.alerts.recentAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg text-sm ${
                      alert.severity === "critical"
                        ? "bg-[#fff5f5] border border-[#fecaca]"
                        : alert.severity === "high"
                        ? "bg-[#fffbeb] border border-[#fcd34d]"
                        : "bg-[#f9fafb] border border-[#e5e7eb]"
                    }`}
                  >
                    <p className={`font-medium ${
                      alert.severity === "critical" ? "text-[#b91c1c]" :
                      alert.severity === "high" ? "text-[#92400e]" : "text-[#003366]"
                    }`}>{alert.title}</p>
                    <p className="text-xs text-[#6b7280]">
                      {new Date(alert.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
                {data.alerts.recentAlerts.length === 0 && (
                  <p className="text-[#6b7280] text-sm">No recent alerts ✅</p>
                )}
              </div>

              <h3 className="text-sm text-[#6b7280] mb-2 font-semibold">Recent Errors (24h)</h3>
              <div className="space-y-2">
                {data.recentErrors.slice(0, 5).map((err) => (
                  <div key={err.id} className="p-3 bg-[#fff5f5] border border-[#fecaca] rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#dc2626] font-medium">{err.errorType}</span>
                      <span className="text-[#6b7280]">×{err.occurrenceCount}</span>
                    </div>
                    <p className="text-xs text-[#b91c1c] truncate">{err.errorMessage}</p>
                  </div>
                ))}
                {data.recentErrors.length === 0 && (
                  <p className="text-[#6b7280] text-sm">No errors in last 24h ✅</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// Metric Card Component
function MetricCard({
  title,
  value,
  subtitle,
  alert = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  alert?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-lg p-4 border shadow-[0_2px_8px_rgba(0,0,0,0.08)] ${
        alert ? "border-[#fecaca]" : "border-[#e5e7eb]"
      }`}
    >
      <p className="text-xs text-[#6b7280] mb-1 font-medium">{title}</p>
      <p className={`text-2xl font-bold ${alert ? "text-[#dc2626]" : "text-[#003366]"}`}>{value}</p>
      <p className="text-xs text-[#6b7280] mt-1">{subtitle}</p>
    </div>
  );
}
