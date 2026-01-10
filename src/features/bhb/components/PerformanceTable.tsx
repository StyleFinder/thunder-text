"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Star, ChevronDown, ChevronRight, XCircle, Users } from "lucide-react";
import { PerformanceBadge } from "./PerformanceBadge";

type PerformanceTier = "excellent" | "good" | "average" | "poor" | "critical";

interface Campaign {
  campaign_id: string;
  campaign_name: string;
  spend: number;
  purchases: number;
  purchase_value: number;
  conversion_rate: number;
  roas: number;
  performance_tier: PerformanceTier;
}

interface Shop {
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
  campaigns: Campaign[];
  total_spend: number;
  total_purchases: number;
  total_purchase_value: number;
  avg_roas: number;
  avg_conversion_rate: number;
  error?: string;
}

interface PerformanceTableProps {
  shops: Shop[];
  favorites: Set<string>;
  allFavorites: Map<string, string[]>;
  onToggleFavorite: (shopId: string) => void;
  lastUpdated?: string;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function PerformanceTable({
  shops,
  favorites,
  allFavorites,
  onToggleFavorite,
  lastUpdated,
}: PerformanceTableProps) {
  const [expandedShops, setExpandedShops] = useState<Set<string>>(new Set());

  const toggleExpand = (shopId: string) => {
    const newExpanded = new Set(expandedShops);
    if (newExpanded.has(shopId)) {
      newExpanded.delete(shopId);
    } else {
      newExpanded.add(shopId);
    }
    setExpandedShops(newExpanded);
  };

  // Check for disconnected platforms
  const getDisconnectedPlatforms = (shop: Shop): string[] => {
    const disconnected: string[] = [];
    if (!shop.facebook_connected && shop.ad_account_id) {
      disconnected.push("Facebook Ads");
    }
    if (shop.google_ads_connected === false && shop.google_ad_account_id) {
      disconnected.push("Google Ads");
    }
    if (shop.tiktok_ads_connected === false && shop.tiktok_ad_account_id) {
      disconnected.push("TikTok Ads");
    }
    return disconnected;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">
          Store Campaign Performance
        </h2>
        {lastUpdated && (
          <span className="text-xs text-gray-500">
            Updated {new Date(lastUpdated).toLocaleString()}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="w-12 px-4 py-3 text-center">
                <Star className="w-4 h-4 text-gray-400 mx-auto" />
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Store
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Coach
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Campaigns
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Spend
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Purchases
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Revenue
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Conv. Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                ROAS
              </th>
              <th className="w-32 px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {shops.map((shop) => {
              const isExpanded = expandedShops.has(shop.shop_id);
              const isFavorited = favorites.has(shop.shop_id);
              const disconnectedPlatforms = getDisconnectedPlatforms(shop);
              const coachesWhoFavorited = allFavorites.get(shop.shop_id) || [];
              const multipleCoaches = coachesWhoFavorited.length > 1;

              return (
                <React.Fragment key={shop.shop_id}>
                  {/* Shop Row */}
                  <tr className="hover:bg-gray-50/50 transition-colors group">
                    {/* Favorite */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onToggleFavorite(shop.shop_id)}
                        className="p-1 rounded-lg hover:bg-gray-100 transition-all duration-200
                                   transform hover:scale-110"
                        title={isFavorited ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star
                          className={`w-5 h-5 transition-colors ${isFavorited
                            ? "fill-amber-400 text-amber-400"
                            : "text-gray-300 group-hover:text-gray-400"
                            }`}
                        />
                      </button>
                    </td>

                    {/* Store Name */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/bhb/store/${shop.shop_id}`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          {shop.shop_domain}
                        </Link>
                        {disconnectedPlatforms.length > 0 && (
                          <div
                            title={`Disconnected: ${disconnectedPlatforms.join(", ")}`}
                            className="flex items-center justify-center w-5 h-5 rounded bg-rose-100 cursor-help"
                          >
                            <XCircle className="w-3.5 h-3.5 text-rose-600" />
                          </div>
                        )}
                        {shop.error && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 rounded-full">
                            Error
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Coach */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {shop.coach_assigned || "—"}
                        </span>
                        {multipleCoaches && (
                          <div
                            title={`Favorited by: ${coachesWhoFavorited.join(", ")}`}
                            className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 rounded-full cursor-help"
                          >
                            <Users className="w-3 h-3 text-blue-600" />
                            <span className="text-xs font-medium text-blue-700">
                              {coachesWhoFavorited.length}
                            </span>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Campaigns */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {shop.campaigns.length}
                      </span>
                    </td>

                    {/* Spend */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-900">
                        {formatCurrency(shop.total_spend)}
                      </span>
                    </td>

                    {/* Purchases */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-900">
                        {shop.total_purchases}
                      </span>
                    </td>

                    {/* Revenue */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-900">
                        {formatCurrency(shop.total_purchase_value)}
                      </span>
                    </td>

                    {/* Conversion Rate */}
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-gray-900">
                        {formatPercentage(shop.avg_conversion_rate)}
                      </span>
                    </td>

                    {/* ROAS */}
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`text-sm font-semibold ${shop.avg_roas >= 2.0
                          ? "text-emerald-600"
                          : shop.avg_roas >= 1.0
                            ? "text-gray-900"
                            : "text-rose-600"
                          }`}
                      >
                        {shop.avg_roas.toFixed(2)}x
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-center">
                      {shop.campaigns.length > 0 && (
                        <button
                          onClick={() => toggleExpand(shop.shop_id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
                        >
                          {isExpanded ? (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Hide
                            </>
                          ) : (
                            <>
                              <ChevronRight className="w-4 h-4" />
                              Show
                            </>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>

                  {/* Expanded Campaign Rows */}
                  {isExpanded &&
                    shop.campaigns.map((campaign) => (
                      <tr
                        key={campaign.campaign_id}
                        className="bg-gray-50/70 animate-in slide-in-from-top-1 duration-200"
                      >
                        <td className="px-4 py-2.5" />
                        <td className="px-4 py-2.5" colSpan={2}>
                          <div className="flex items-center gap-3 pl-6">
                            <span className="text-gray-400">↳</span>
                            <span className="text-sm text-gray-700">
                              {campaign.campaign_name}
                            </span>
                            <PerformanceBadge tier={campaign.performance_tier} size="sm" />
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-gray-600" />
                        <td className="px-4 py-2.5 text-right text-sm text-gray-600">
                          {formatCurrency(campaign.spend)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-gray-600">
                          {campaign.purchases}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-gray-600">
                          {formatCurrency(campaign.purchase_value)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-gray-600">
                          {formatPercentage(campaign.conversion_rate)}
                        </td>
                        <td className="px-4 py-2.5 text-right text-sm text-gray-600">
                          {campaign.roas.toFixed(2)}x
                        </td>
                        <td className="px-4 py-2.5" />
                      </tr>
                    ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {shops.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-gray-500">No stores match your filters</p>
        </div>
      )}
    </div>
  );
}
