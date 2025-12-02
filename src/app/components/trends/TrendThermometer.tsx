import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TrendStatusBadge } from "./TrendStatusBadge";
import { TrendSparkline } from "./TrendSparkline";

interface TrendThermometerProps {
  themeName: string;
  status: "Rising" | "Stable" | "Waning";
  momentumPct: number;
  lastPeakDate?: string;
  peakRecencyDays?: number;
  series: Array<{ date: string; value: number }>;
  onViewDetails?: () => void;
}

export function TrendThermometer({
  themeName,
  status,
  momentumPct,
  lastPeakDate,
  peakRecencyDays,
  series,
  onViewDetails,
}: TrendThermometerProps) {
  // Playbook recommendations
  const playbook = getPlaybookForStatus(status);

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ace-black">{themeName}</h3>
            <p className="text-sm text-ace-gray-dark">Seasonal Trend</p>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-ace-gray-dark hover:text-ace-blue transition-colors">
                  <Info className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Based on Google search interest data</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Status Badge */}
        <TrendStatusBadge status={status} momentumPct={momentumPct} />

        {/* Sparkline */}
        <TrendSparkline series={series} height={60} />

        {/* Peak Info */}
        {lastPeakDate && peakRecencyDays !== undefined && (
          <p className="text-sm text-ace-gray-dark">
            Peak: {new Date(lastPeakDate).toLocaleDateString()} (
            {peakRecencyDays} days ago)
          </p>
        )}

        {/* Playbook Recommendation */}
        <div className="bg-ace-blue/5 border border-ace-blue/20 rounded-lg p-3 space-y-1">
          <p className="text-sm font-semibold text-ace-black">
            💡 {playbook.title}
          </p>
          <p className="text-sm text-ace-gray-dark">{playbook.action}</p>
        </div>

        {/* View Details Link */}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-sm text-ace-blue hover:text-ace-blue-dark hover:underline transition-colors"
          >
            View full analysis →
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function getPlaybookForStatus(status: "Rising" | "Stable" | "Waning") {
  const playbooks = {
    Rising: {
      title: "Capitalize on Growing Interest",
      action:
        "Lead with full price. Feature prominently in collections. Consider increasing ad spend.",
    },
    Stable: {
      title: "Maintain Momentum",
      action: "Keep current pricing. Test bundles or cross-sell opportunities.",
    },
    Waning: {
      title: "Clear Inventory Strategically",
      action:
        "Begin markdown ladder. Offer free shipping or bundle deals to clear remaining stock.",
    },
  };

  // eslint-disable-next-line security/detect-object-injection
  return playbooks[status];
}
