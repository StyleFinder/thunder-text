"use client";

import React from "react";
import { Star, Check, Minus, AlertTriangle, AlertCircle } from "lucide-react";

type PerformanceTier = "excellent" | "good" | "average" | "poor" | "critical";

interface PerformanceBadgeProps {
  tier: PerformanceTier;
  size?: "sm" | "md";
  showLabel?: boolean;
}

const tierConfig: Record<
  PerformanceTier,
  {
    label: string;
    icon: React.ElementType;
    bgColor: string;
    textColor: string;
    iconColor: string;
  }
> = {
  excellent: {
    label: "Excellent",
    icon: Star,
    bgColor: "bg-amber-100",
    textColor: "text-amber-800",
    iconColor: "text-amber-500",
  },
  good: {
    label: "Good",
    icon: Check,
    bgColor: "bg-emerald-100",
    textColor: "text-emerald-800",
    iconColor: "text-emerald-500",
  },
  average: {
    label: "Average",
    icon: Minus,
    bgColor: "bg-blue-100",
    textColor: "text-blue-800",
    iconColor: "text-blue-500",
  },
  poor: {
    label: "Poor",
    icon: AlertTriangle,
    bgColor: "bg-orange-100",
    textColor: "text-orange-800",
    iconColor: "text-orange-500",
  },
  critical: {
    label: "Critical",
    icon: AlertCircle,
    bgColor: "bg-rose-100",
    textColor: "text-rose-800",
    iconColor: "text-rose-500",
  },
};

export function PerformanceBadge({
  tier,
  size = "md",
  showLabel = true,
}: PerformanceBadgeProps) {
  /* eslint-disable security/detect-object-injection -- Safe: tier is validated by TypeScript enum */
  const config = tierConfig[tier];
  /* eslint-enable security/detect-object-injection */
  const Icon = config.icon;

  const sizeClasses: Record<"sm" | "md", string> = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-sm gap-1.5",
  };

  const iconSizes: Record<"sm" | "md", string> = {
    sm: "w-3 h-3",
    md: "w-4 h-4",
  };

  /* eslint-disable security/detect-object-injection -- Safe: size is validated by TypeScript */
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  /* eslint-enable security/detect-object-injection */

  return (
    <span
      className={`
        inline-flex items-center font-medium rounded-full
        ${config.bgColor} ${config.textColor} ${sizeClass}
      `}
    >
      <Icon className={`${iconSize} ${config.iconColor}`} />
      {showLabel && <span>{config.label}</span>}
    </span>
  );
}

// Legend component for explaining tiers
export function PerformanceLegend() {
  const tiers: { tier: PerformanceTier; description: string }[] = [
    { tier: "excellent", description: "ROAS ≥ 4.0, Conv ≥ 3%, Spend ≥ $100" },
    { tier: "good", description: "ROAS ≥ 2.5 or Conv ≥ 2%" },
    { tier: "average", description: "ROAS ≥ 1.5 or Conv ≥ 1%" },
    { tier: "poor", description: "ROAS < 1.5, Conv < 1%" },
    { tier: "critical", description: "Spend > $500, ROAS < 1.0" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">
        Performance Tier Legend
      </h3>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {tiers.map(({ tier, description }) => (
          <div key={tier} className="flex items-center gap-2">
            <PerformanceBadge tier={tier} size="sm" />
            <span className="text-xs text-gray-500">{description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
