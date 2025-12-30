"use client";

import React from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string | React.ReactNode;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ElementType;
  valueColor?: "default" | "success" | "warning" | "error";
  className?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  trend,
  trendValue,
  icon: Icon,
  valueColor = "default",
  className = "",
}: StatCardProps) {
  const valueColors = {
    default: "text-gray-900",
    success: "text-emerald-600",
    warning: "text-amber-600",
    error: "text-rose-600",
  };

  const trendIcons = {
    up: TrendingUp,
    down: TrendingDown,
    neutral: Minus,
  };

  const trendColors: Record<"up" | "down" | "neutral", string> = {
    up: "text-emerald-600 bg-emerald-50",
    down: "text-rose-600 bg-rose-50",
    neutral: "text-gray-500 bg-gray-100",
  };

  /* eslint-disable security/detect-object-injection -- Safe: trend is validated by TypeScript enum */
  const TrendIcon = trend ? trendIcons[trend] : null;
  /* eslint-enable security/detect-object-injection */

  return (
    <div
      className={`
        relative overflow-hidden bg-white rounded-2xl border border-gray-200
        p-5 transition-all duration-300
        hover:shadow-lg hover:shadow-gray-200/50 hover:border-gray-300
        ${className}
      `}
    >
      {/* Subtle gradient overlay on hover */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-blue-50/0 to-blue-50/0
                      hover:from-blue-50/30 hover:to-transparent transition-all duration-300 pointer-events-none"
      />

      <div className="relative">
        {/* Header: Label and Icon */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            {label}
          </span>
          {Icon && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #0066cc 0%, #0099ff 100%)",
              }}
            >
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
        </div>

        {/* Value */}
        {/* eslint-disable-next-line security/detect-object-injection -- Safe: valueColor is validated by TypeScript */}
        <div className={`text-3xl font-bold ${valueColors[valueColor]} mb-1`}>
          {value}
        </div>

        {/* Subtext and Trend */}
        <div className="flex items-center justify-between">
          {subtext && <div className="text-sm text-gray-500">{subtext}</div>}

          {trend && trendValue && TrendIcon && (
            /* eslint-disable-next-line security/detect-object-injection -- Safe: trend is validated by TypeScript */
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${trendColors[trend]}`}
            >
              <TrendIcon className="w-3 h-3" />
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Preset configurations for common stat cards
export function TotalStoresCard({
  total,
  withFacebook,
}: {
  total: number;
  withFacebook: number;
}) {
  return (
    <StatCard
      label="Total Stores"
      value={total}
      subtext={`${withFacebook} with Facebook Ads`}
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
  );
}

export function TotalCampaignsCard({
  total,
  excellent,
  good,
  poor,
  critical,
}: {
  total: number;
  excellent: number;
  good: number;
  poor: number;
  critical: number;
}) {
  return (
    <StatCard
      label="Total Campaigns"
      value={total}
      subtext={
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
            {excellent} ★
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
            {good} ✓
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
            {poor} ⚠
          </span>
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-rose-100 text-rose-800">
            {critical} ✕
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
  );
}

export function TotalSpendCard({
  spend,
  purchases,
}: {
  spend: string;
  purchases: number;
}) {
  return (
    <StatCard
      label="Total Spend (30d)"
      value={spend}
      subtext={`${purchases.toLocaleString()} purchases`}
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
  );
}

export function AvgROASCard({
  roas,
  revenue,
}: {
  roas: number;
  revenue: string;
}) {
  const getROASColor = (
    value: number,
  ): "success" | "warning" | "error" | "default" => {
    if (value >= 2.0) return "success";
    if (value >= 1.0) return "warning";
    if (value > 0) return "error";
    return "default";
  };

  return (
    <StatCard
      label="Average ROAS"
      value={`${roas.toFixed(2)}x`}
      valueColor={getROASColor(roas)}
      subtext={`${revenue} revenue`}
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
  );
}
