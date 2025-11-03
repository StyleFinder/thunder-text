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
}

export function ThemeSelector({ onThemeEnabled }: ThemeSelectorProps) {
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [enablingTheme, setEnablingTheme] = useState<string | null>(null);

  useEffect(() => {
    loadThemes();
  }, []);

  async function loadThemes() {
    try {
      const res = await fetch("/api/trends/themes");
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

  async function enableTheme(themeId: string) {
    setEnablingTheme(themeId);
    try {
      const res = await fetch("/api/trends/shop-themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId,
          market: "US", // Default to US market
          priority: 1,
        }),
      });

      const data = await res.json();

      if (data.success) {
        if (onThemeEnabled) {
          onThemeEnabled();
        }
      } else {
        console.error("Failed to enable theme:", data.error);
      }
    } catch (error) {
      console.error("Error enabling theme:", error);
    } finally {
      setEnablingTheme(null);
    }
  }

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Available Themes
        </Text>
        <Text variant="bodySm" as="p" tone="subdued">
          Select seasonal themes to track demand trends for your products
        </Text>

        <ResourceList
          loading={loading}
          resourceName={{ singular: "theme", plural: "themes" }}
          items={themes}
          renderItem={(theme) => {
            const { id, name, description, category, inSeason } = theme;

            return (
              <ResourceItem
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
                      {inSeason && <Badge tone="success">In Season</Badge>}
                      <Badge>{category}</Badge>
                    </InlineStack>
                  </InlineStack>

                  <Text variant="bodySm" as="p" tone="subdued">
                    {description}
                  </Text>

                  <Button
                    onClick={() => enableTheme(id)}
                    loading={enablingTheme === id}
                    size="slim"
                  >
                    Enable Theme
                  </Button>
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
