"use client";

import React, { useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Spinner,
  Text,
  Banner,
} from "@shopify/polaris";
import { TrendThermometer } from "../components/trends/TrendThermometer";
import { ThemeSelector } from "../components/trends/ThemeSelector";

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
  placeholder?: boolean; // Indicates no data exists yet
}

interface SeriesPoint {
  date: string;
  value: number;
}

export default function TrendsPage() {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [signals, setSignals] = useState<Record<string, Signal>>({});
  const [series, setSeries] = useState<Record<string, SeriesPoint[]>>({});
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadThemes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadThemes() {
    try {
      const res = await fetch("/api/trends/themes");
      const data = await res.json();

      if (data.success) {
        setThemes(data.themes);

        // Load signals for in-season themes
        const inSeasonThemes = data.themes.filter((t: Theme) => t.inSeason);
        for (const theme of inSeasonThemes.slice(0, 5)) {
          // Load first 5
          await loadSignalForTheme(theme.slug);
        }
      }
    } catch (error) {
      console.error("Failed to load themes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadSignalForTheme(themeSlug: string) {
    try {
      const res = await fetch(`/api/trends/signals?themeSlug=${themeSlug}`);
      const data = await res.json();

      if (data.success) {
        // Set signal even if null (indicates data doesn't exist yet)
        setSignals((prev) => ({
          ...prev,
          [themeSlug]: data.signal || { placeholder: true },
        }));
        setSeries((prev) => ({ ...prev, [themeSlug]: data.series || [] }));
      }
    } catch (error) {
      console.error(`Failed to load signal for ${themeSlug}:`, error);
    }
  }

  async function handleUpdateTrends() {
    setUpdating(true);
    try {
      const res = await fetch("/api/trends/update-signals", {
        method: "POST",
      });
      const data = await res.json();

      if (data.success) {
        // Reload all themes and signals
        await loadThemes();
      } else {
        console.error("Failed to update trends:", data.error);
        alert(`Failed to update trends: ${data.error}`);
      }
    } catch (error) {
      console.error("Error updating trends:", error);
      alert("Error updating trends. Check console for details.");
    } finally {
      setUpdating(false);
    }
  }

  const inSeasonThemes = themes.filter((t) => t.inSeason);

  if (loading) {
    return (
      <Page title="Seasonal Trends">
        <div className="flex items-center justify-center h-64">
          <Spinner size="large" />
        </div>
      </Page>
    );
  }

  if (inSeasonThemes.length === 0) {
    return (
      <Page
        title="Seasonal Trends"
        subtitle="Track search interest and optimize merchandising timing"
      >
        <Layout>
          <Layout.Section>
            <ThemeSelector onThemeEnabled={() => loadThemes()} />
          </Layout.Section>
        </Layout>
      </Page>
    );
  }

  return (
    <Page
      title="Seasonal Trends"
      subtitle="Track search interest and optimize merchandising timing"
      primaryAction={{
        content: updating ? "Updating..." : "Update Trends",
        onAction: handleUpdateTrends,
        loading: updating,
        disabled: updating,
      }}
    >
      <Layout>
        {/* Info Banner */}
        <Layout.Section>
          <Banner tone="info">
            <p>
              <strong>Manual Update:</strong> Click &quot;Update Trends&quot; to
              fetch the latest Google Trends data via SerpAPI. This will update
              all active themes with current trend signals and momentum.
            </p>
          </Banner>
        </Layout.Section>

        {/* Trend Thermometers */}
        <Layout.Section>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inSeasonThemes.slice(0, 6).map((theme) => {
              const signal = signals[theme.slug];
              const themeSeries = series[theme.slug] || [];

              if (!signal) {
                return (
                  <Card key={theme.id}>
                    <div className="p-4">
                      <p className="text-sm text-gray-500">
                        {theme.name} - Loading...
                      </p>
                    </div>
                  </Card>
                );
              }

              // Check if this is a placeholder (no data yet)
              if (signal.placeholder) {
                return (
                  <Card key={theme.id}>
                    <div className="p-4 space-y-2">
                      <Text variant="headingMd" as="h3">
                        {theme.name}
                      </Text>
                      <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                        <Text variant="bodySm" as="p">
                          📊 Trend data not yet available. Background jobs will
                          fetch Google Trends data for this theme.
                        </Text>
                      </div>
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
              rows={inSeasonThemes.map((theme, index) => {
                const signal = signals[theme.slug];
                const isPlaceholder = signal?.placeholder;
                return [
                  theme.name,
                  theme.category,
                  signal && !isPlaceholder ? (
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
                    <Text variant="bodySm" as="span" tone="subdued">
                      {isPlaceholder ? "Pending" : "-"}
                    </Text>
                  ),
                  signal && !isPlaceholder
                    ? `${signal.momentum_pct >= 0 ? "+" : ""}${signal.momentum_pct.toFixed(1)}%`
                    : isPlaceholder
                      ? "—"
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
