import {
  TrendProvider,
  TrendProviderOptions,
  TrendSeries,
  TrendPoint,
} from "../types";

interface TimelineValue {
  query: string;
  value: number;
}

interface TimelineEntry {
  date: string;
  values: TimelineValue[];
}

interface SerpApiResponse {
  interest_over_time?: {
    timeline_data: TimelineEntry[];
  };
}

/**
 * SerpAPI Google Trends Provider
 * Docs: https://serpapi.com/google-trends-api
 *
 * Pricing: Free tier 100 searches/month, paid plans start at $50/month
 */
export class SerpApiTrendsProvider implements TrendProvider {
  private apiKey: string;
  private baseUrl = "https://serpapi.com/search";

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("SerpAPI key required");
    }
    this.apiKey = apiKey;
  }

  async getSeries(opts: TrendProviderOptions): Promise<TrendSeries> {
    const {
      keywords,
      market,
      region,
      startDate,
      endDate,
      granularity = "weekly",
    } = opts;

    // Combine keywords with weighted average
    const combinedQuery = keywords
      .sort((a, b) => (b.weight || 1) - (a.weight || 1))
      .map((k) => k.term)
      .slice(0, 5) // SerpAPI supports max 5 comparisons
      .join(",");

    const params = new URLSearchParams({
      engine: "google_trends",
      q: combinedQuery,
      geo: region ? `${market}-${region}` : market,
      date: `${startDate} ${endDate}`,
      data_type: "TIMESERIES",
      api_key: this.apiKey,
    });

    const response = await fetch(`${this.baseUrl}?${params.toString()}`);

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`SerpAPI error: ${response.status} - ${error}`);
    }

    const data = await response.json();

    // Parse SerpAPI response (structure varies, adjust based on actual API)
    const points: TrendPoint[] = this.parseSerpApiResponse(data, keywords);

    return {
      points,
      granularity,
      source: "serpapi",
    };
  }

  private parseSerpApiResponse(
    data: SerpApiResponse,
    keywords: Array<{ term: string; weight?: number }>,
  ): TrendPoint[] {
    // SerpAPI returns data like:
    // { interest_over_time: { timeline_data: [{ date, values: [{ query, value }] }] } }

    const timeline = data.interest_over_time?.timeline_data || [];

    return timeline.map((entry: TimelineEntry) => {
      const date = this.parseDateString(entry.date);

      // Weighted average across keywords
      let weightedSum = 0;
      let totalWeight = 0;

      entry.values.forEach((v: TimelineValue) => {
        const keyword = keywords.find((k) =>
          v.query.toLowerCase().includes(k.term.toLowerCase()),
        );
        const weight = keyword?.weight || 1.0;
        weightedSum += v.value * weight;
        totalWeight += weight;
      });

      const value = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

      return { date, value };
    });
  }

  private parseDateString(dateStr: string): string {
    // SerpAPI returns dates like "Jan 1, 2024" or "Jan 1-7, 2024"
    // Convert to ISO format YYYY-MM-DD

    // eslint-disable-next-line security/detect-unsafe-regex
    const match = dateStr.match(/(\w+)\s+(\d+)(?:-\d+)?,\s+(\d{4})/);
    if (!match) return new Date().toISOString().split("T")[0];

    const [, month, day, year] = match;
    const monthMap: Record<string, string> = {
      Jan: "01",
      Feb: "02",
      Mar: "03",
      Apr: "04",
      May: "05",
      Jun: "06",
      Jul: "07",
      Aug: "08",
      Sep: "09",
      Oct: "10",
      Nov: "11",
      Dec: "12",
    };

    // eslint-disable-next-line security/detect-object-injection
    const mm = monthMap[month] || "01";
    const dd = day.padStart(2, "0");

    return `${year}-${mm}-${dd}`;
  }
}
