"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { logger } from '@/lib/logger'

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
      logger.error("Failed to load themes:", error as Error, { component: 'ThemeSelector' });
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
        logger.error(`Failed to enable theme: ${data.error}`, undefined, { component: 'ThemeSelector' });
      }
    } catch (error) {
      logger.error("Error enabling theme:", error as Error, { component: 'ThemeSelector' });
    } finally {
      setEnablingTheme(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Available Themes</CardTitle>
        <CardDescription>
          Select seasonal themes to track demand trends for your products
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-ace-blue" />
          </div>
        ) : (
          <div className="space-y-4">
            {themes.map((theme) => {
              const { id, name, description, category, inSeason } = theme;

              return (
                <div
                  key={id}
                  className="flex items-start gap-4 p-4 border border-ace-gray-light rounded-lg hover:border-ace-blue transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl flex-shrink-0"
                    style={{
                      background: getCategoryColor(category),
                    }}
                  >
                    {getCategoryIcon(category)}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-ace-black">{name}</h3>
                        <p className="text-sm text-ace-gray-dark mt-1">
                          {description}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {inSeason && (
                          <Badge className="bg-ace-green/10 text-ace-green hover:bg-ace-green/20 border-ace-green/20">
                            In Season
                          </Badge>
                        )}
                        <Badge variant="outline" className="border-ace-gray-light text-ace-gray-dark">
                          {category}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      onClick={() => enableTheme(id)}
                      disabled={enablingTheme === id}
                      size="sm"
                      className="bg-ace-blue hover:bg-ace-blue-dark text-white"
                    >
                      {enablingTheme === id ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Enabling...
                        </>
                      ) : (
                        "Enable Theme"
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
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
