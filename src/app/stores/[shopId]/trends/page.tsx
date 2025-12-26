"use client";

import React, { useEffect, useState, Suspense } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { TrendThermometer } from "@/app/components/trends/TrendThermometer";
import { ThemeSelector } from "@/app/components/trends/ThemeSelector";
import { logger } from "@/lib/logger";
import { useShop } from "@/hooks/useShop";

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
  no_data?: boolean;
}

interface SeriesPoint {
  date: string;
  value: number;
}

function TrendsContent() {
  const { shop, hasShop, isLoading: shopLoading } = useShop();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [signals, setSignals] = useState<Record<string, Signal>>({});
  const [series, setSeries] = useState<Record<string, SeriesPoint[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (hasShop && shop) {
      loadThemes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShop, shop]);

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
      logger.error("Failed to load themes:", error as Error, {
        component: "trends",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSignalForTheme(themeSlug: string) {
    if (!shop) return;

    try {
      const res = await fetch(
        `/api/trends/signals?themeSlug=${themeSlug}&shop=${encodeURIComponent(shop)}`,
      );
      const data = await res.json();

      if (data.success) {
        // Always update state, even if signal is null - this marks the theme as "loaded"
        // Use a placeholder signal for themes without data
        if (data.signal) {
          setSignals((prev) => ({ ...prev, [themeSlug]: data.signal }));
        } else {
          // Mark as loaded with default "no data" state
          setSignals((prev) => ({
            ...prev,
            [themeSlug]: {
              status: "Stable" as const,
              momentum_pct: 0,
              latest_value: 0,
              no_data: true,
            },
          }));
        }
        setSeries((prev) => ({ ...prev, [themeSlug]: data.series || [] }));
      }
    } catch (error) {
      logger.error(`Failed to load signal for ${themeSlug}:`, error as Error, {
        component: "trends",
      });
    }
  }

  const inSeasonThemes = themes.filter((t) => t.inSeason);

  if (shopLoading || loading) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          background: "#fafaf9",
          minHeight: "100vh",
          padding: "32px 16px",
        }}
      >
        <div className="w-full" style={{ maxWidth: "1000px" }}>
          <div
            className="flex items-center justify-center"
            style={{ minHeight: "256px" }}
          >
            <Loader2
              className="h-8 w-8 animate-spin"
              style={{ color: "#0066cc" }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (inSeasonThemes.length === 0) {
    return (
      <div
        className="w-full flex flex-col items-center"
        style={{
          background: "#fafaf9",
          minHeight: "100vh",
          padding: "32px 16px",
        }}
      >
        <div className="w-full" style={{ maxWidth: "1000px" }}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "24px" }}
          >
            <div>
              <h1
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "#003366",
                  marginBottom: "8px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Seasonal Trends
              </h1>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                Track search interest and optimize merchandising timing
              </p>
            </div>
            <ThemeSelector onThemeEnabled={() => loadThemes()} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full flex flex-col items-center"
      style={{
        background: "#fafaf9",
        minHeight: "100vh",
        padding: "32px 16px",
      }}
    >
      <div className="w-full" style={{ maxWidth: "1000px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <div>
            <h1
              style={{
                fontSize: "32px",
                fontWeight: 700,
                color: "#003366",
                marginBottom: "8px",
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Seasonal Trends
            </h1>
            <p
              style={{
                fontSize: "14px",
                color: "#6b7280",
                margin: 0,
                fontFamily:
                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              }}
            >
              Track search interest and optimize merchandising timing
            </p>
          </div>

          {/* Trend Thermometers */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "16px",
            }}
          >
            {inSeasonThemes.slice(0, 8).map((theme) => {
              const signal = signals[theme.slug];
              const themeSeries = series[theme.slug] || [];

              if (!signal) {
                return (
                  <div
                    key={theme.id}
                    style={{
                      background: "#ffffff",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
                    }}
                  >
                    <div style={{ padding: "24px" }}>
                      <p
                        style={{
                          fontSize: "14px",
                          color: "#6b7280",
                          fontFamily:
                            'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        }}
                      >
                        {theme.name} - Loading...
                      </p>
                    </div>
                  </div>
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
                  noData={signal.no_data}
                />
              );
            })}
          </div>

          {/* All Themes Table */}
          <div
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div style={{ padding: "24px", borderBottom: "1px solid #e5e7eb" }}>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: 700,
                  color: "#003366",
                  marginBottom: "4px",
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                All Seasonal Themes
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#6b7280",
                  margin: 0,
                  fontFamily:
                    'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                }}
              >
                View trends and momentum for all active seasonal themes
              </p>
            </div>
            <div style={{ padding: "24px" }}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      style={{
                        color: "#003366",
                        fontWeight: 600,
                        fontSize: "14px",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      Theme
                    </TableHead>
                    <TableHead
                      style={{
                        color: "#003366",
                        fontWeight: 600,
                        fontSize: "14px",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      Category
                    </TableHead>
                    <TableHead
                      style={{
                        color: "#003366",
                        fontWeight: 600,
                        fontSize: "14px",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      Status
                    </TableHead>
                    <TableHead
                      style={{
                        color: "#003366",
                        fontWeight: 600,
                        fontSize: "14px",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                        textAlign: "right",
                      }}
                    >
                      Momentum
                    </TableHead>
                    <TableHead
                      style={{
                        color: "#003366",
                        fontWeight: 600,
                        fontSize: "14px",
                        fontFamily:
                          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                      }}
                    >
                      Season
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {inSeasonThemes.map((theme) => {
                    const signal = signals[theme.slug];
                    return (
                      <TableRow key={theme.id}>
                        <TableCell
                          style={{
                            fontWeight: 600,
                            color: "#003366",
                            fontSize: "14px",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          {theme.name}
                        </TableCell>
                        <TableCell
                          style={{
                            fontSize: "14px",
                            color: "#6b7280",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          {theme.category}
                        </TableCell>
                        <TableCell>
                          {signal ? (
                            <span
                              style={{
                                background:
                                  signal.status === "Rising"
                                    ? "#0066cc"
                                    : signal.status === "Waning"
                                      ? "#dc2626"
                                      : "#6b7280",
                                color: "#ffffff",
                                fontSize: "12px",
                                fontWeight: 600,
                                padding: "4px 12px",
                                borderRadius: "4px",
                                fontFamily:
                                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              }}
                            >
                              {signal.status}
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: "14px",
                                color: "#6b7280",
                                fontFamily:
                                  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                              }}
                            >
                              -
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          style={{
                            textAlign: "right",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "#003366",
                            fontFamily:
                              'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                          }}
                        >
                          {signal
                            ? `${signal.momentum_pct >= 0 ? "+" : ""}${signal.momentum_pct.toFixed(1)}%`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <span
                            style={{
                              background: "#f3f4f6",
                              color: "#374151",
                              fontSize: "12px",
                              fontWeight: 600,
                              padding: "4px 12px",
                              borderRadius: "4px",
                              fontFamily:
                                'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                            }}
                          >
                            Active
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrendsPage() {
  return (
    <Suspense
      fallback={
        <div
          className="w-full flex flex-col items-center"
          style={{
            background: "#fafaf9",
            minHeight: "100vh",
            padding: "32px 16px",
          }}
        >
          <div className="w-full" style={{ maxWidth: "1000px" }}>
            <div
              className="flex items-center justify-center"
              style={{ minHeight: "256px" }}
            >
              <Loader2
                className="h-8 w-8 animate-spin"
                style={{ color: "#0066cc" }}
              />
            </div>
          </div>
        </div>
      }
    >
      <TrendsContent />
    </Suspense>
  );
}
