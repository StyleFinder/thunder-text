import React, { useState } from "react";
import { Card, Text, Tooltip, Icon, Button } from "@shopify/polaris";
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
  onHide?: () => void | Promise<void>;
}

export function TrendThermometer({
  themeName,
  status,
  momentumPct,
  lastPeakDate,
  peakRecencyDays,
  series,
  onViewDetails,
  onHide,
}: TrendThermometerProps) {
  const [isHiding, setIsHiding] = useState(false);

  // Playbook recommendations
  const playbook = getPlaybookForStatus(status);

  async function handleHide() {
    if (!onHide) return;

    setIsHiding(true);
    try {
      await onHide();
    } catch (error) {
      console.error("Failed to hide theme:", error);
      setIsHiding(false);
    }
  }

  return (
    <Card>
      <div className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Text variant="headingMd" as="h3">
              {themeName}
            </Text>
            <Text variant="bodySm" as="p" tone="subdued">
              Seasonal Trend
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Tooltip content="Based on Google search interest data">
              <Icon source={InfoIcon} tone="base" />
            </Tooltip>
            {onHide && (
              <Button
                size="slim"
                onClick={handleHide}
                loading={isHiding}
                tone="critical"
                variant="plain"
              >
                Hide
              </Button>
            )}
          </div>
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
