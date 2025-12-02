import React from "react";
import { Badge } from "@/components/ui/badge";

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
      className: "bg-ace-green/10 text-ace-green hover:bg-ace-green/20 border-ace-green/20",
      icon: "↗",
      tooltip: "Search interest is ≥ +20% vs previous period",
    },
    Stable: {
      className: "bg-ace-blue/10 text-ace-blue hover:bg-ace-blue/20 border-ace-blue/20",
      icon: "→",
      tooltip: "Within ±10% of prior period",
    },
    Waning: {
      className: "bg-ace-orange/10 text-ace-orange hover:bg-ace-orange/20 border-ace-orange/20",
      icon: "↘",
      tooltip: "Search interest is ≤ −20% vs previous period",
    },
  };

  // eslint-disable-next-line security/detect-object-injection
  const { className, icon, tooltip } = config[status];
  const sign = momentumPct >= 0 ? "+" : "";

  return (
    <div className="flex items-center gap-2">
      <Badge className={className}>{`${icon} ${status}`}</Badge>
      <span className="text-sm font-semibold text-ace-black" title={tooltip}>
        {sign}
        {momentumPct.toFixed(1)}%
      </span>
    </div>
  );
}
