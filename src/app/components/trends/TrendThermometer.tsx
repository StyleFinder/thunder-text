import React from "react";
import { Card, Text, Tooltip, Icon } from "@shopify/polaris";
import { InfoIcon } from "@shopify/polaris-icons";
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
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Text variant="headingMd" as="h3">
              {themeName}
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              Seasonal Trend
            </Text>
          </div>
          <Tooltip content="Based on Google search interest data">
            <Icon source={InfoIcon} tone="base" />
          </Tooltip>
        </div>

        {/* Status Badge */}
        <TrendStatusBadge status={status} momentumPct={momentumPct} />

        {/* Sparkline */}
        <TrendSparkline series={series} height={60} />

        {/* Peak Info */}
        {lastPeakDate && peakRecencyDays !== undefined && (
          <Text variant="bodySm" as="p" tone="subdued">
            Peak: {new Date(lastPeakDate).toLocaleDateString()} (
            {peakRecencyDays} days ago)
          </Text>
        )}

        {/* Playbook Recommendation */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <Text variant="bodyMd" as="p" fontWeight="semibold">
            💡 {playbook.title}
          </Text>
          <Text variant="bodySm" as="p" tone="subdued">
            {playbook.action}
          </Text>
        </div>

        {/* View Details Link */}
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="text-sm text-blue-600 hover:underline"
          >
            View full analysis →
          </button>
        )}
      </div>
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
