"use client";

import React, { useState, useEffect } from "react";
import {
  Card,
  ResourceList,
  ResourceItem,
  Badge,
  Button,
  Text,
  InlineStack,
  BlockStack,
} from "@shopify/polaris";
import { useShopifyAuth } from "../UnifiedShopifyAuth";

interface Theme {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  active_start: string;
  active_end: string;
  inSeason: boolean;
}

interface ThemeSelectorProps {
  onThemeEnabled?: () => void;
  onViewDashboard?: () => void;
}

interface ShopTheme {
  id: string;
  theme_id: string;
}

export function ThemeSelector({ onThemeEnabled, onViewDashboard }: ThemeSelectorProps) {
  const { shop } = useShopifyAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [enabledThemeIds, setEnabledThemeIds] = useState<Set<string>>(new Set());
  const [shopThemeMap, setShopThemeMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [enablingTheme, setEnablingTheme] = useState<string | null>(null);

  useEffect(() => {
    if (shop) {
      loadThemes();
      loadEnabledThemes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop]);

  async function loadThemes() {
    if (!shop) return;

    try {
      const res = await fetch(`/api/trends/themes?shop=${encodeURIComponent(shop)}`);
      const data = await res.json();

      if (data.success) {
        setThemes(data.themes);
      }
    } catch (error) {
      console.error("Failed to load themes:", error);
    } finally {
      setLoading(false);
    }
  }

  async function loadEnabledThemes() {
    if (!shop) return;

    try {
      const res = await fetch(`/api/trends/shop-themes/enabled?shop=${encodeURIComponent(shop)}`);
      const data = await res.json();

      if (data.success && data.themes) {
        const enabledIds = new Set(data.themes.map((t: any) => t.theme_id));
        const shopThemeMapping = data.themes.reduce((acc: Record<string, string>, t: any) => {
          acc[t.theme_id] = t.shopThemeId;
          return acc;
        }, {});
        setEnabledThemeIds(enabledIds);
        setShopThemeMap(shopThemeMapping);
        console.log("✅ Loaded enabled themes:", enabledIds);
      }
    } catch (error) {
      console.error("Failed to load enabled themes:", error);
    }
  }

  async function enableTheme(themeId: string) {
    console.log("🚀 enableTheme called with:", { themeId, shopValue: shop, hasShop: !!shop });

    if (!shop) {
      console.error("❌ No shop available - cannot enable theme");
      alert("Error: Shop information not available. Please refresh the page and try again.");
      return;
    }

    console.log("✅ Shop available, proceeding with enable:", { themeId, shop });
    setEnablingTheme(themeId);

    try {
      const url = `/api/trends/shop-themes?shop=${encodeURIComponent(shop)}`;
      console.log("Calling API:", url);

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId,
          market: "US", // Default to US market
          priority: 1,
        }),
      });

      console.log("API response status:", res.status);
      const data = await res.json();
      console.log("API response data:", data);

      if (data.success) {
        console.log("✅ Theme enabled successfully");
        // Reload enabled themes to show updated status
        await loadEnabledThemes();
        // Don't call onThemeEnabled - let user stay on manage themes page
      } else {
        console.error("❌ Failed to enable theme:", data.error);
        alert(`Failed to enable theme: ${data.error || "Unknown error"}`);
      }
    } catch (error) {
      console.error("❌ Error enabling theme:", error);
      alert(`Error enabling theme: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setEnablingTheme(null);
    }
  }

  async function disableTheme(themeId: string) {
    if (!shop) {
      alert("Error: Shop information not available. Please refresh the page and try again.");
      return;
    }

    const shopThemeId = shopThemeMap[themeId];
    if (!shopThemeId) {
      console.error("Shop theme ID not found for theme:", themeId);
      return;
    }

    setEnablingTheme(themeId);

    try {
      const res = await fetch(
        `/api/trends/shop-themes?shop=${encodeURIComponent(shop)}&id=${shopThemeId}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (data.success) {
        await loadEnabledThemes();
      } else {
        alert(`Failed to disable theme: ${data.error}`);
      }
    } catch (error) {
      alert(`Error disabling theme: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setEnablingTheme(null);
    }
  }

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between" blockAlign="center">
          <div>
            <Text variant="headingMd" as="h2">
              Available Themes
            </Text>
          </div>
          <InlineStack gap="200">
            <Button
              url={`/theme-manager?shop=${encodeURIComponent(shop)}`}
              variant="plain"
            >
              Create Custom Theme
            </Button>
            {onViewDashboard && (
              <Button onClick={onViewDashboard} variant="primary">
                View Dashboard
              </Button>
            )}
          </InlineStack>
        </InlineStack>
        <Text variant="bodySm" as="p" tone="subdued">
          Select seasonal themes to track demand trends for your products
        </Text>

        <ResourceList
          loading={loading}
          resourceName={{ singular: "theme", plural: "themes" }}
          items={themes}
          renderItem={(theme) => {
            const { id, name, description, category, inSeason } = theme;
            const isEnabled = enabledThemeIds.has(id);

            return (
              <ResourceItem
                key={id}
                id={id}
                onClick={() => {}}
                media={
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 8,
                      background: getCategoryColor(category),
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "20px",
                    }}
                  >
                    {getCategoryIcon(category)}
                  </div>
                }
              >
                <BlockStack gap="200">
                  <InlineStack align="space-between" blockAlign="center">
                    <Text variant="bodyMd" fontWeight="semibold" as="h3">
                      {name}
                    </Text>
                    <InlineStack gap="200">
                      {isEnabled && (
                        <Badge tone="success">Enabled</Badge>
                      )}
                      {inSeason && (
                        <Badge key={`season-${id}`} tone="info">
                          In Season
                        </Badge>
                      )}
                      <Badge key={`category-${id}`}>{category}</Badge>
                    </InlineStack>
                  </InlineStack>

                  <Text variant="bodySm" as="p" tone="subdued">
                    {description}
                  </Text>

                  <InlineStack gap="200">
                    {!isEnabled ? (
                      <Button
                        onClick={() => enableTheme(id)}
                        loading={enablingTheme === id}
                        size="slim"
                        variant="primary"
                      >
                        Enable Theme
                      </Button>
                    ) : (
                      <Button
                        onClick={() => disableTheme(id)}
                        loading={enablingTheme === id}
                        size="slim"
                      >
                        Disable
                      </Button>
                    )}
                  </InlineStack>
                </BlockStack>
              </ResourceItem>
            );
          }}
        />
      </BlockStack>
    </Card>
  );
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Holiday: "#D4F1F4",
    Sports: "#FFE5E5",
    "Back to School": "#FFF4CC",
    Weather: "#E8F5E9",
    Romance: "#FCE4EC",
    Celebration: "#F3E5F5",
  };
  // eslint-disable-next-line security/detect-object-injection
  return colors[category] || "#F5F5F5";
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    Holiday: "🎄",
    Sports: "🏈",
    "Back to School": "📚",
    Weather: "🌤️",
    Romance: "💝",
    Celebration: "🎉",
  };
  // eslint-disable-next-line security/detect-object-injection
  return icons[category] || "📊";
}
