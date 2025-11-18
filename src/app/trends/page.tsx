"use client";

import React, { useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Spinner,
  Button,
  Text,
} from "@shopify/polaris";
import { TrendThermometer } from "../components/trends/TrendThermometer";
import { ThemeSelector } from "../components/trends/ThemeSelector";
import { useShopifyAuth } from "../components/UnifiedShopifyAuth";

interface Theme {
  id: string;
  slug: string;
  name: string;
  category: string;
  inSeason: boolean;
}

interface Signal {
  status: "Rising" | "Stable" | "Waning";
  momentum_pct: number;
  latest_value: number;
  last_peak_date?: string;
  peak_recency_days?: number;
}

interface SeriesPoint {
  date: string;
  value: number;
}

export default function TrendsPage() {
  const { shop } = useShopifyAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  // Record of theme_id -> shop_themes.id for deletion
  const [enabledThemes, setEnabledThemes] = useState<Record<string, string>>({});
  const [signals, setSignals] = useState<Record<string, Signal>>({});
  const [series, setSeries] = useState<Record<string, SeriesPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  // Track when themes started loading (theme_id -> timestamp)
  const [loadingStartTimes, setLoadingStartTimes] = useState<Record<string, number>>({});
  // Track retry state (theme_id -> boolean)
  const [retryingThemes, setRetryingThemes] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (shop) {
      loadThemes();
      loadEnabledThemes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  // Track loading start times for themes without signals
  useEffect(() => {
    const now = Date.now();
    const updates: Record<string, number> = {};

    Object.keys(enabledThemes).forEach((themeId) => {
      const theme = themes.find((t) => t.id === themeId);
      if (theme && !signals[theme.slug] && !loadingStartTimes[themeId]) {
        updates[themeId] = now;
      }
    });

    if (Object.keys(updates).length > 0) {
      setLoadingStartTimes((prev) => ({ ...prev, ...updates }));
    }
  }, [enabledThemes, signals, themes, loadingStartTimes]);

  async function loadEnabledThemes() {
    if (!shop) return;

    try {
      const res = await fetch(
        `/api/trends/shop-themes/enabled?shop=${encodeURIComponent(shop)}`
      );
      const data = await res.json();

      if (data.success && data.themes) {
        // Create object mapping theme_id -> shopThemeId for deletion
        const enabledMap = data.themes.reduce((acc: Record<string, string>, t: any) => {
          acc[t.theme_id] = t.shopThemeId;
          return acc;
        }, {});
        setEnabledThemes(enabledMap);

        // Load signals for enabled themes
        for (const theme of data.themes.slice(0, 6)) {
          await loadSignalForTheme(theme.slug);
        }
      }
    } catch (error) {
      console.error("Failed to load enabled themes:", error);
    }
  }

  async function loadThemes() {
    if (!shop) return;

    try {
      const res = await fetch(`/api/trends/themes?shop=${encodeURIComponent(shop)}`);
      const data = await res.json();

      if (data.success) {
        setThemes(data.themes);
      }
    } catch (error) {
      console.error("Failed to load themes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSignalForTheme(themeSlug: string) {
    if (!shop) return;

    try {
      const res = await fetch(
        `/api/trends/signals?themeSlug=${themeSlug}&shop=${encodeURIComponent(shop)}`
      );
      const data = await res.json();

      if (data.success && data.signal) {
        setSignals((prev) => ({ ...prev, [themeSlug]: data.signal }));
        setSeries((prev) => ({ ...prev, [themeSlug]: data.series }));
      }
    } catch (error) {
      console.error(`Failed to load signal for ${themeSlug}:`, error);
    }
  }

  async function disableTheme(themeId: string) {
    if (!shop) return;

    // Get the shop_themes.id from the record
    const shopThemeId = enabledThemes[themeId];
    if (!shopThemeId) {
      console.error("Shop theme ID not found for theme:", themeId);
      return;
    }

    try {
      const res = await fetch(`/api/trends/shop-themes?shop=${encodeURIComponent(shop)}&id=${shopThemeId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        // Remove from enabled themes record
        setEnabledThemes((prev) => {
          const updated = { ...prev };
          delete updated[themeId];
          return updated;
        });
      } else {
        console.error("Failed to disable theme:", data.error);
      }
    } catch (error) {
      console.error("Failed to disable theme:", error);
      throw error;
    }
  }

  async function retryBackfill(themeId: string) {
    if (!shop) return;

    const shopThemeId = enabledThemes[themeId];
    if (!shopThemeId) {
      console.error("Shop theme ID not found for theme:", themeId);
      return;
    }

    setRetryingThemes((prev) => ({ ...prev, [themeId]: true }));

    try {
      const res = await fetch("/api/trends/refresh/backfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shopThemeId }),
      });

      const data = await res.json();

      if (data.success) {
        // Reset loading start time
        setLoadingStartTimes((prev) => ({ ...prev, [themeId]: Date.now() }));
        // Start polling for signal
        const theme = themes.find((t) => t.id === themeId);
        if (theme) {
          await loadSignalForTheme(theme.slug);
        }
      } else {
        console.error("Failed to retry backfill:", data.error);
      }
    } catch (error) {
      console.error("Failed to retry backfill:", error);
    } finally {
      setRetryingThemes((prev) => ({ ...prev, [themeId]: false }));
    }
  }

  // Filter to show only enabled themes (merchant controls visibility)
  const enabledThemesFiltered = themes.filter(
    (t) => t.id in enabledThemes
  );

  if (loading) {
    return (
      <Page title="Seasonal Trends">
        <div className="flex items-center justify-center h-64">
          <Spinner size="large" />
        </div>
      </Page>
    );
  }

  // Show ThemeSelector if no themes are enabled yet or user clicks "Manage Themes"
  if (Object.keys(enabledThemes).length === 0 || showThemeSelector) {
    return (
      <Page
        title="Seasonal Trends"
        subtitle="Track search interest and optimize merchandising timing"
        backAction={
          showThemeSelector ? { onAction: () => setShowThemeSelector(false) } : undefined
        }
      >
        <Layout>
          <Layout.Section>
            <ThemeSelector
              onThemeEnabled={async () => {
                // Just reload data, don't hide selector
                await loadThemes();
                await loadEnabledThemes();
              }}
              onViewDashboard={async () => {
                // Reload data before closing selector
                await loadThemes();
                await loadEnabledThemes();
                setShowThemeSelector(false);
              }}
            />
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Seasonal Trends"
      subtitle="Track search interest and optimize merchandising timing"
      secondaryActions={[
        {
          content: "Manage Themes",
          onAction: () => setShowThemeSelector(true),
        },
      ]}
    >
      <Layout>
        {/* Trend Thermometers */}
        <Layout.Section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {enabledThemesFiltered.slice(0, 6).map((theme) => {
              const signal = signals[theme.slug];
              const themeSeries = series[theme.slug] || [];
              const loadingStartTime = loadingStartTimes[theme.id];
              const isTimedOut = loadingStartTime && (Date.now() - loadingStartTime) > 60000;
              const isRetrying = retryingThemes[theme.id];

              if (!signal) {
                return (
                  <Card key={theme.id}>
                    <div className="p-4 space-y-3">
                      <Text variant="headingMd" as="h3">
                        {theme.name}
                      </Text>
                      {isTimedOut ? (
                        <>
                          <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                            <Text variant="bodySm" as="p" tone="critical">
                              ⚠️ Data loading is taking longer than expected. This may indicate an issue with the backfill process.
                            </Text>
                          </div>
                          <Button
                            size="medium"
                            onClick={() => retryBackfill(theme.id)}
                            loading={isRetrying}
                          >
                            Retry Loading Data
                          </Button>
                        </>
                      ) : (
                        <Text variant="bodySm" as="p" tone="subdued">
                          Loading... This can take up to 60 seconds to complete.
                        </Text>
                      )}
                    </div>
                  </Card>
                );
              }

              return (
                <TrendThermometer
                  key={theme.id}
                  themeName={theme.name}
                  status={signal.status}
                  momentumPct={signal.momentum_pct}
                  lastPeakDate={signal.last_peak_date}
                  peakRecencyDays={signal.peak_recency_days}
                  series={themeSeries}
                  onHide={() => disableTheme(theme.id)}
                />
              );
            })}
          </div>
        </Layout.Section>

        {/* All Themes Table */}
        <Layout.Section>
          <Card>
            <DataTable
              columnContentTypes={["text", "text", "text", "numeric", "text"]}
              headings={["Theme", "Category", "Status", "Momentum", "Season"]}
              rows={enabledThemesFiltered.map((theme, index) => {
                const signal = signals[theme.slug];
                return [
                  theme.name,
                  theme.category,
                  signal ? (
                    <Badge
                      key={`status-${index}`}
                      tone={
                        signal.status === "Rising"
                          ? "success"
                          : signal.status === "Waning"
                            ? "warning"
                            : "info"
                      }
                    >
                      {signal.status}
                    </Badge>
                  ) : (
                    "-"
                  ),
                  signal
                    ? `${signal.momentum_pct >= 0 ? "+" : ""}${signal.momentum_pct.toFixed(1)}%`
                    : "-",
                  <Badge key={`active-${index}`} tone="info">
                    Active
                  </Badge>,
                ];
              })}
            />
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
