// Normalized trend data point
export type TrendPoint = {
  date: string; // ISO date 'YYYY-MM-DD'
  value: number; // Normalized 0–100
};

// Time series response
export type TrendSeries = {
  points: TrendPoint[];
  granularity: "daily" | "weekly";
  source: string; // 'google_trends' | 'serpapi' | 'manual'
};

// Provider options
export type TrendProviderOptions = {
  keywords: Array<{ term: string; weight?: number }>;
  market: string; // 'US', 'GB', 'CA', etc.
  region?: string; // optional state/DMA
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  granularity?: "daily" | "weekly";
};

// Provider interface
export interface TrendProvider {
  getSeries(opts: TrendProviderOptions): Promise<TrendSeries>;
}

// Computed signal metrics
export type TrendSignal = {
  latestValue: number; // most recent index (0–100)
  momentumPct: number; // recent vs baseline change
  status: "Rising" | "Stable" | "Waning";
  lastPeakDate?: string;
  peakRecencyDays?: number;
};
