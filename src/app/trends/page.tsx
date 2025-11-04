"use client";

import React, { useEffect, useState } from "react";
import {
  Page,
  Layout,
  Card,
  DataTable,
  Badge,
  Spinner,
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

      if (data.success && data.signal) {
        setSignals((prev) => ({ ...prev, [themeSlug]: data.signal }));
        setSeries((prev) => ({ ...prev, [themeSlug]: data.series }));
      }
    } catch (error) {
      console.error(`Failed to load signal for ${themeSlug}:`, error);
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
    >
      <Layout>
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
