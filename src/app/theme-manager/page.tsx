"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Page,
  Card,
  Button,
  TextField,
  Modal,
  Text,
  Badge,
  Icon,
  InlineStack,
  BlockStack,
  Banner,
} from "@shopify/polaris";
import { PlusIcon, DeleteIcon } from "@shopify/polaris-icons";
import { useShopifyAuth } from "../components/UnifiedShopifyAuth";

interface Keyword {
  keyword: string;
  weight: number;
}

interface Theme {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  isCustom: boolean;
  isGlobal: boolean;
  keywordCount: number;
  keywords: Keyword[];
}

export default function ThemeManagerPage() {
  const { shop } = useShopifyAuth();
  const [themes, setThemes] = useState<Theme[]>([]);
  const [enabledThemes, setEnabledThemes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [enablingTheme, setEnablingTheme] = useState<string | null>(null);

  // Form state
  const [themeName, setThemeName] = useState("");
  const [themeDescription, setThemeDescription] = useState("");
  const [keywordInputs, setKeywordInputs] = useState<Keyword[]>([
    { keyword: "", weight: 1.0 },
  ]);
  const [error, setError] = useState("");

  const loadThemes = useCallback(async () => {
    if (!shop) return;

    try {
      const res = await fetch(`/api/trends/themes?shop=${encodeURIComponent(shop)}`);
      const data = await res.json();

      if (data.success) {
        setThemes(data.themes);
      }
    } catch (err) {
      console.error("Failed to load themes:", err);
    } finally {
      setLoading(false);
    }
  }, [shop]);

  const loadEnabledThemes = useCallback(async () => {
    if (!shop) return;

    try {
      const res = await fetch(`/api/trends/shop-themes/enabled?shop=${encodeURIComponent(shop)}`);
      const data = await res.json();

      if (data.success && data.themes) {
        const enabledMap = data.themes.reduce((acc: Record<string, string>, t: any) => {
          acc[t.theme_id] = t.shopThemeId;
          return acc;
        }, {});
        setEnabledThemes(enabledMap);
      }
    } catch (err) {
      console.error("Failed to load enabled themes:", err);
    }
  }, [shop]);

  useEffect(() => {
    loadThemes();
    loadEnabledThemes();
  }, [loadThemes, loadEnabledThemes]);

  const handleAddKeyword = () => {
    setKeywordInputs([...keywordInputs, { keyword: "", weight: 1.0 }]);
  };

  const handleRemoveKeyword = (index: number) => {
    setKeywordInputs(keywordInputs.filter((_, i) => i !== index));
  };

  const handleKeywordChange = (index: number, field: "keyword" | "weight", value: string) => {
    const updated = [...keywordInputs];
    if (field === "keyword") {
      updated[index].keyword = value;
    } else {
      updated[index].weight = parseFloat(value) || 0;
    }
    setKeywordInputs(updated);
  };

  const handleCreateTheme = async () => {
    setError("");

    // Validation
    if (!themeName.trim()) {
      setError("Theme name is required");
      return;
    }

    const validKeywords = keywordInputs.filter(
      (kw) => kw.keyword.trim().length > 0 && kw.weight > 0
    );

    if (validKeywords.length === 0) {
      setError("At least one keyword is required");
      return;
    }

    setCreating(true);

    try {
      const res = await fetch(`/api/trends/themes/custom?shop=${encodeURIComponent(shop)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: themeName,
          description: themeDescription,
          keywords: validKeywords,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // Reset form
        setThemeName("");
        setThemeDescription("");
        setKeywordInputs([{ keyword: "", weight: 1.0 }]);
        setShowCreateModal(false);
        // Reload themes
        await loadThemes();
      } else {
        setError(data.error || "Failed to create theme");
      }
    } catch (err) {
      setError("Failed to create theme");
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTheme = async (themeId: string, themeName: string) => {
    if (!confirm(`Are you sure you want to delete the custom theme "${themeName}"?`)) {
      return;
    }

    try {
      const res = await fetch(
        `/api/trends/themes/custom?shop=${encodeURIComponent(shop)}&themeId=${themeId}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (data.success) {
        await loadThemes();
        await loadEnabledThemes();
      } else {
        alert(`Failed to delete theme: ${data.error}`);
      }
    } catch (err) {
      alert("Failed to delete theme");
      console.error(err);
    }
  };

  const handleEnableTheme = async (themeId: string) => {
    if (!shop) return;

    setEnablingTheme(themeId);

    try {
      const res = await fetch(`/api/trends/shop-themes?shop=${encodeURIComponent(shop)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          themeId,
          market: "US",
          priority: 5,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await loadEnabledThemes();
      } else {
        alert(`Failed to enable theme: ${data.error}`);
      }
    } catch (err) {
      alert("Failed to enable theme");
      console.error(err);
    } finally {
      setEnablingTheme(null);
    }
  };

  const handleDisableTheme = async (themeId: string) => {
    if (!shop) return;

    const shopThemeId = enabledThemes[themeId];
    if (!shopThemeId) return;

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
    } catch (err) {
      alert("Failed to disable theme");
      console.error(err);
    } finally {
      setEnablingTheme(null);
    }
  };

  return (
    <Page
      title="Theme Manager"
      subtitle="Manage global themes and create custom seasonal themes"
      primaryAction={{
        content: "Create Custom Theme",
        icon: PlusIcon,
        onAction: () => setShowCreateModal(true),
      }}
    >
      <BlockStack gap="400">
        <Banner>
          <p>
            <strong>Global themes</strong> are available to all stores.{" "}
            <strong>Custom themes</strong> are specific to your store.{" "}
            Enable themes to track their trends on your dashboard. Custom themes can be deleted.
          </p>
        </Banner>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">
              Available Themes ({themes.length})
            </Text>

            {loading ? (
              <Text as="p" tone="subdued">
                Loading themes...
              </Text>
            ) : themes.length === 0 ? (
              <Text as="p" tone="subdued">
                No themes available
              </Text>
            ) : (
              <div className="space-y-3">
                {themes.map((theme) => {
                  const isEnabled = theme.id in enabledThemes;
                  const isProcessing = enablingTheme === theme.id;

                  return (
                    <Card key={theme.id}>
                      <BlockStack gap="200">
                        <InlineStack align="space-between" blockAlign="center">
                          <InlineStack gap="200" blockAlign="center">
                            <Text as="h3" variant="headingSm" fontWeight="semibold">
                              {theme.name}
                            </Text>
                            {isEnabled && (
                              <Badge tone="success">Enabled</Badge>
                            )}
                            {theme.isCustom && (
                              <Badge tone="info">Custom</Badge>
                            )}
                            {theme.isGlobal && (
                              <Badge>Global</Badge>
                            )}
                          </InlineStack>

                          <InlineStack gap="200">
                            {isEnabled ? (
                              <Button
                                onClick={() => handleDisableTheme(theme.id)}
                                loading={isProcessing}
                                size="slim"
                              >
                                Disable
                              </Button>
                            ) : (
                              <Button
                                onClick={() => handleEnableTheme(theme.id)}
                                loading={isProcessing}
                                size="slim"
                                variant="primary"
                              >
                                Enable
                              </Button>
                            )}
                            {theme.isCustom && (
                              <Button
                                icon={DeleteIcon}
                                tone="critical"
                                onClick={() => handleDeleteTheme(theme.id, theme.name)}
                                size="slim"
                              >
                                Delete
                              </Button>
                            )}
                          </InlineStack>
                        </InlineStack>

                        {theme.description && (
                          <Text as="p" tone="subdued">
                            {theme.description}
                          </Text>
                        )}

                        <Text as="p" tone="subdued">
                          {theme.keywordCount} keyword{theme.keywordCount !== 1 ? "s" : ""}:{" "}
                          {theme.keywords.map((kw) => kw.keyword).join(", ")}
                        </Text>
                      </BlockStack>
                    </Card>
                  );
                })}
              </div>
            )}
          </BlockStack>
        </Card>
      </BlockStack>

      <Modal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setError("");
        }}
        title="Create Custom Theme"
        primaryAction={{
          content: "Create Theme",
          onAction: handleCreateTheme,
          loading: creating,
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: () => setShowCreateModal(false),
          },
        ]}
      >
        <Modal.Section>
          <BlockStack gap="400">
            {error && (
              <Banner tone="critical">
                <p>{error}</p>
              </Banner>
            )}

            <TextField
              label="Theme Name"
              value={themeName}
              onChange={setThemeName}
              autoComplete="off"
              placeholder="e.g., Spring Sale"
            />

            <TextField
              label="Description (optional)"
              value={themeDescription}
              onChange={setThemeDescription}
              autoComplete="off"
              multiline={2}
              placeholder="Brief description of this theme"
            />

            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">
                Keywords (for Google Trends)
              </Text>

              {keywordInputs.map((kw, index) => (
                <InlineStack key={index} gap="200" blockAlign="center">
                  <div style={{ flex: 2 }}>
                    <TextField
                      label=""
                      value={kw.keyword}
                      onChange={(value) => handleKeywordChange(index, "keyword", value)}
                      autoComplete="off"
                      placeholder="e.g., spring fashion"
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <TextField
                      label=""
                      type="number"
                      value={kw.weight.toString()}
                      onChange={(value) => handleKeywordChange(index, "weight", value)}
                      autoComplete="off"
                      placeholder="Weight (0-1)"
                      min="0"
                      max="1"
                      step="0.1"
                    />
                  </div>
                  {keywordInputs.length > 1 && (
                    <Button
                      icon={DeleteIcon}
                      onClick={() => handleRemoveKeyword(index)}
                    />
                  )}
                </InlineStack>
              ))}

              <Button onClick={handleAddKeyword} icon={PlusIcon}>
                Add Keyword
              </Button>
            </BlockStack>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </Page>
  );
}
