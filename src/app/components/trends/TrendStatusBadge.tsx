import React from "react";
import { Badge } from "@shopify/polaris";

type TrendStatus = "Rising" | "Stable" | "Waning";

interface TrendStatusBadgeProps {
  status: TrendStatus;
  momentumPct: number;
}

export function TrendStatusBadge({
  status,
  momentumPct,
}: TrendStatusBadgeProps) {
  const config = {
    Rising: {
      tone: "success" as const,
      icon: "↗",
      tooltip: "Search interest is ≥ +20% vs previous period",
    },
    Stable: {
      tone: "info" as const,
      icon: "→",
      tooltip: "Within ±10% of prior period",
    },
    Waning: {
      tone: "warning" as const,
      icon: "↘",
      tooltip: "Search interest is ≤ −20% vs previous period",
    },
  };

  // eslint-disable-next-line security/detect-object-injection
  const { tone, icon, tooltip } = config[status];
  const sign = momentumPct >= 0 ? "+" : "";

  return (
    <div className="flex items-center gap-2">
      <Badge tone={tone}>{`${icon} ${status}`}</Badge>
      <span className="text-sm font-semibold" title={tooltip}>
        {sign}
        {momentumPct.toFixed(1)}%
      </span>
    </div>
  );
}
