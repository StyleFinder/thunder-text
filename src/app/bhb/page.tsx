"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Loader2, AlertCircle, Store } from "lucide-react";
import { logger } from "@/lib/logger";

// New Luminous Depth components
import {
  BHBLayout,
  StatCard,
  SearchFilterBar,
  PerformanceTable,
  PerformanceLegend,
} from "@/components/bhb";

interface CampaignPerformance {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  purchases: number;
  purchase_value: number;
  conversion_rate: number;
  roas: number;
  performance_tier: "excellent" | "good" | "average" | "poor" | "critical";
}

interface ShopPerformance {
  shop_id: string;
  shop_domain: string;
  shop_is_active: boolean;
  facebook_connected: boolean;
  ad_account_id: string | null;
  ad_account_name: string | null;
  google_ads_connected?: boolean;
  google_ad_account_id?: string | null;
  tiktok_ads_connected?: boolean;
  tiktok_ad_account_id?: string | null;
  coach_assigned: string | null;
  campaigns: CampaignPerformance[];
  total_spend: number;
  total_purchases: number;
  total_purchase_value: number;
  avg_roas: number;
  avg_conversion_rate: number;
  error?: string;
}

interface InsightsResponse {
  success: boolean;
  data: ShopPerformance[];
  summary: {
    total_shops: number;
    shops_with_facebook: number;
    total_campaigns: number;
    total_spend: number;
    total_purchases: number;
    total_purchase_value: number;
    avg_roas: number;
    excellent_campaigns: number;
    good_campaigns: number;
    average_campaigns: number;
    poor_campaigns: number;
    critical_campaigns: number;
  };
  generated_at: string;
  data_period: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function BHBDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [insights, setInsights] = useState<InsightsResponse | null>(null);
  const [selectedCoach, setSelectedCoach] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [allFavorites, setAllFavorites] = useState<Map<string, string[]>>(
    new Map(),
  );
  const [coachesList, setCoachesList] = useState<
    Array<{ name: string; email: string }>
  >([]);
  const { data: session } = useSession();

  // Get coach info from session
  const coachEmail = session?.user?.email || "";
  const coachName = session?.user?.name || "";
  const isAdmin = (session?.user as { role?: string })?.role === "admin";

  useEffect(() => {
    if (coachEmail) {
      fetchInsights();
      fetchFavorites();
      fetchAllFavorites();
      fetchCoaches();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coachEmail]);

  async function fetchInsights() {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/bhb/insights");
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch campaign insights");
      }

      setInsights(data);
    } catch (err) {
      logger.error("Error fetching insights:", err as Error, {
        component: "bhb",
      });
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function fetchFavorites() {
    try {
      const response = await fetch(
        `/api/coach/favorites?coach_email=${encodeURIComponent(coachEmail)}`,
      );
      const data = await response.json();

      if (data.success) {
        setFavorites(new Set(data.favorites));
      }
    } catch (err) {
      logger.error("Error fetching favorites:", err as Error, {
        component: "bhb",
      });
    }
  }

  async function fetchAllFavorites() {
    try {
      const response = await fetch(`/api/coach/favorites/all`);
      const data = await response.json();

      if (data.success) {
        const favMap = new Map<string, string[]>();
        data.favorites.forEach(
          (fav: { shop_id: string; coach_emails: string[] }) => {
            favMap.set(fav.shop_id, fav.coach_emails);
          },
        );
        setAllFavorites(favMap);
      }
    } catch (err) {
      logger.error("Error fetching all favorites:", err as Error, {
        component: "bhb",
      });
    }
  }

  async function fetchCoaches() {
    try {
      const response = await fetch("/api/coaches");
      const data = await response.json();

      if (data.success) {
        setCoachesList(data.coaches);
      }
    } catch (err) {
      logger.error("Error fetching coaches:", err as Error, {
        component: "bhb",
      });
    }
  }

  async function toggleFavorite(shopId: string) {
    const isFavorited = favorites.has(shopId);

    try {
      if (isFavorited) {
        const response = await fetch(
          `/api/coach/favorites?coach_email=${encodeURIComponent(coachEmail)}&shop_id=${shopId}`,
          { method: "DELETE" },
        );
        const data = await response.json();

        if (data.success) {
          const newFavorites = new Set(favorites);
          newFavorites.delete(shopId);
          setFavorites(newFavorites);
        }
      } else {
        const response = await fetch("/api/coach/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ coach_email: coachEmail, shop_id: shopId }),
        });
        const data = await response.json();

        if (data.success) {
          const newFavorites = new Set(favorites);
          newFavorites.add(shopId);
          setFavorites(newFavorites);
        }
      }
    } catch (err) {
      logger.error("Error toggling favorite:", err as Error, {
        component: "bhb",
      });
    }
  }

  // Loading state
  if (loading) {
    return (
      <BHBLayout
        coachName={coachName}
        coachEmail={coachEmail}
        isAdmin={isAdmin}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-gray-500">Loading campaign performance data...</p>
        </div>
      </BHBLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <BHBLayout
        coachName={coachName}
        coachEmail={coachEmail}
        isAdmin={isAdmin}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-rose-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Failed to load dashboard
          </h2>
          <p className="text-gray-500 max-w-md text-center">{error}</p>
          <button
            onClick={() => fetchInsights()}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg
                       hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </BHBLayout>
    );
  }

  // Empty state
  if (!insights || insights.data.length === 0) {
    return (
      <BHBLayout
        coachName={coachName}
        coachEmail={coachEmail}
        isAdmin={isAdmin}
      >
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
            <Store className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            No active stores found
          </h2>
          <p className="text-gray-500">
            There are currently no active ACE stores to display.
          </p>
        </div>
      </BHBLayout>
    );
  }

  const { summary, data: shops } = insights;

  // Filter shops by selected coach and search query
  let filteredShops = [...shops];

  // Filter by coach - when a coach is selected, show only their favorited stores
  if (selectedCoach !== "all") {
    const selectedCoachFavorites = new Set<string>();
    if (allFavorites.size > 0) {
      allFavorites.forEach((coachEmails, shopId) => {
        if (coachEmails.includes(selectedCoach)) {
          selectedCoachFavorites.add(shopId);
        }
      });

      filteredShops = filteredShops.filter((shop) =>
        selectedCoachFavorites.has(shop.shop_id),
      );
    }
  }

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredShops = filteredShops.filter((shop) =>
      shop.shop_domain.toLowerCase().includes(query),
    );
  }

  // Sort: logged-in coach's favorites first, then alphabetically
  filteredShops.sort((a, b) => {
    const aFavorite = favorites.has(a.shop_id);
    const bFavorite = favorites.has(b.shop_id);

    if (aFavorite && !bFavorite) return -1;
    if (!aFavorite && bFavorite) return 1;

    return a.shop_domain.localeCompare(b.shop_domain);
  });

  return (
    <BHBLayout coachName={coachName} coachEmail={coachEmail} isAdmin={isAdmin}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="animate-bhb-fade-in">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Campaign Performance
          </h1>
          <p className="text-gray-500 mt-1">
            Monitor store performance across all ACE stores
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="animate-bhb-fade-in animate-stagger-1">
            <StatCard
              label="Total Stores"
              value={summary.total_shops}
              subtext={`${summary.shops_with_facebook} with Facebook Ads`}
              icon={() => (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              )}
            />
          </div>

          <div className="animate-bhb-fade-in animate-stagger-2">
            <StatCard
              label="Total Campaigns"
              value={summary.total_campaigns}
              subtext={
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                    {summary.excellent_campaigns} ★
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                    {summary.good_campaigns} ✓
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    {summary.poor_campaigns} ⚠
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
                    {summary.critical_campaigns} ✕
                  </span>
                </div>
              }
              icon={() => (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              )}
            />
          </div>

          <div className="animate-bhb-fade-in animate-stagger-3">
            <StatCard
              label="Total Spend (30days)"
              value={formatCurrency(summary.total_spend)}
              subtext={`${summary.total_purchases.toLocaleString()} purchases`}
              icon={() => (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              )}
            />
          </div>

          <div className="animate-bhb-fade-in animate-stagger-4">
            <StatCard
              label="Average ROAS (30days)"
              value={`${summary.avg_roas.toFixed(2)}x`}
              valueColor={
                summary.avg_roas >= 2.0
                  ? "success"
                  : summary.avg_roas >= 1.0
                    ? "default"
                    : "error"
              }
              subtext={`${formatCurrency(summary.total_purchase_value)} revenue`}
              icon={() => (
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              )}
            />
          </div>
        </div>

        {/* Search and Filter */}
        <div
          className="animate-bhb-fade-in"
          style={{ animationDelay: "200ms" }}
        >
          <SearchFilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            selectedCoach={selectedCoach}
            onCoachChange={setSelectedCoach}
            coaches={coachesList}
            resultCount={filteredShops.length}
            totalCount={shops.length}
          />
        </div>

        {/* Performance Table */}
        <div
          className="animate-bhb-fade-in"
          style={{ animationDelay: "300ms" }}
        >
          <PerformanceTable
            shops={filteredShops}
            favorites={favorites}
            allFavorites={allFavorites}
            onToggleFavorite={toggleFavorite}
            lastUpdated={insights.generated_at}
          />
        </div>

        {/* Legend */}
        <div
          className="animate-bhb-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <PerformanceLegend />
        </div>
      </div>
    </BHBLayout>
  );
}
