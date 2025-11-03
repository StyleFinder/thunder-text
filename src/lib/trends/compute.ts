import { TrendSeries, TrendSignal } from "./types";

/**
 * Compute momentum and status from trend series
 *
 * Algorithm:
 * 1. Split series into recent (last 14 days) vs baseline (prior 28 days)
 * 2. momentum_pct = (avg_recent - avg_baseline) / max(1, avg_baseline) * 100
 * 3. Status thresholds:
 *    - Rising: >= +20%
 *    - Waning: <= -20%
 *    - Stable: between -20% and +20%
 * 4. Find last peak date (local maximum in last 12 weeks)
 */
export function computeMomentum(series: TrendSeries): TrendSignal {
  const points = series.points;

  if (points.length < 7) {
    // Insufficient data
    return {
      latestValue: 0,
      momentumPct: 0,
      status: "Stable",
      lastPeakDate: undefined,
      peakRecencyDays: undefined,
    };
  }

  // Sort by date (newest first)
  const sorted = [...points].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  const latestValue = sorted[0].value;

  // Define windows (adjust for weekly vs daily)
  const isWeekly = series.granularity === "weekly";
  const recentCount = isWeekly ? 2 : 14; // 2 weeks or 14 days
  const baselineCount = isWeekly ? 4 : 28; // 4 weeks or 28 days

  const recentPoints = sorted.slice(0, recentCount);
  const baselinePoints = sorted.slice(recentCount, recentCount + baselineCount);

  const avgRecent = average(recentPoints.map((p) => p.value));
  const avgBaseline = average(baselinePoints.map((p) => p.value));

  const momentumPct =
    avgBaseline > 0 ? ((avgRecent - avgBaseline) / avgBaseline) * 100 : 0;

  // Determine status
  let status: "Rising" | "Stable" | "Waning";
  if (momentumPct >= 20) {
    status = "Rising";
  } else if (momentumPct <= -20) {
    status = "Waning";
  } else {
    status = "Stable";
  }

  // Find last peak (local max in last 12 weeks / 84 days)
  const peakWindow = isWeekly ? 12 : 84;
  const peakCandidates = sorted.slice(0, Math.min(peakWindow, sorted.length));

  const peak = peakCandidates.reduce((max, curr) =>
    curr.value > max.value ? curr : max,
  );

  const lastPeakDate = peak.date;
  const peakRecencyDays = daysBetween(new Date(lastPeakDate), new Date());

  return {
    latestValue,
    momentumPct: Math.round(momentumPct * 10) / 10, // 1 decimal
    status,
    lastPeakDate,
    peakRecencyDays,
  };
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function daysBetween(from: Date, to: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.floor((to.getTime() - from.getTime()) / MS_PER_DAY);
}
