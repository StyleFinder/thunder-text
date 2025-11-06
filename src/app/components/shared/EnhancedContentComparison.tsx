"use client";

import React, { useState, useEffect } from "react";
import {
  Modal,
  Card,
  BlockStack,
  InlineGrid,
  Text,
  Badge,
  Divider,
  InlineStack,
  TextField,
  Box,
  Banner,
  Icon,
  Checkbox,
  RadioButton,
} from "@shopify/polaris";
import { DuplicateIcon, MagicIcon } from "@shopify/polaris-icons";
import styles from "./EnhancedContentComparison.module.css";
import { RichTextEditor } from "./RichTextEditor";

interface ContentData {
  title?: string;
  titleOptions?: string[];
  description?: string;
  seoTitle?: string;
  seoDescription?: string;
  promoText?: string;
  bulletPoints?: string[];
}

interface EnhancedContentComparisonProps {
  active: boolean;
  onClose: () => void;
  onApply: (content: ContentData) => void;
  originalContent: {
    title?: string;
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    promoText?: string;
  };
  enhancedContent: {
    title?: string;
    titleOptions?: string[];
    description?: string;
    seoTitle?: string;
    seoDescription?: string;
    promoText?: string;
    bulletPoints?: string[];
    confidence?: number;
  };
  loading?: boolean;
}

export default function EnhancedContentComparison({
  active,
  onClose,
  onApply,
  originalContent,
  enhancedContent,
  loading = false,
}: EnhancedContentComparisonProps) {
  const [mounted, setMounted] = useState(false);
  const [editedContent, setEditedContent] = useState(enhancedContent);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);

  // Prevent hydration mismatch by only rendering modal on client
  useEffect(() => {
    setMounted(true);
  }, []);

  // Track which fields to apply
  const [fieldsToApply, setFieldsToApply] = useState({
    title: !!(
      (enhancedContent.titleOptions &&
        enhancedContent.titleOptions.length > 0) ||
      enhancedContent.title
    ),
    description: !!enhancedContent.description,
    seoTitle: !!enhancedContent.seoTitle,
    seoDescription: !!enhancedContent.seoDescription,
    promoText: !!enhancedContent.promoText,
    bulletPoints:
      !!enhancedContent.bulletPoints && enhancedContent.bulletPoints.length > 0,
  });

  // Sync editedContent when enhancedContent prop changes
  useEffect(() => {
    console.log("🔄 EnhancedContent prop changed, updating editedContent:", {
      "enhancedContent.description length":
        enhancedContent.description?.length || 0,
      "enhancedContent.description preview":
        enhancedContent.description?.substring(0, 100),
      "enhancedContent.titleOptions": enhancedContent.titleOptions,
      "enhancedContent.title": enhancedContent.title,
      "has titleOptions": !!enhancedContent.titleOptions,
      "titleOptions count": enhancedContent.titleOptions?.length || 0,
    });
    setEditedContent(enhancedContent);

    // Also update fieldsToApply based on new content
    setFieldsToApply({
      title: !!(
        (enhancedContent.titleOptions &&
          enhancedContent.titleOptions.length > 0) ||
        enhancedContent.title
      ),
      description: !!enhancedContent.description,
      seoTitle: !!enhancedContent.seoTitle,
      seoDescription: !!enhancedContent.seoDescription,
      promoText: !!enhancedContent.promoText,
      bulletPoints:
        !!enhancedContent.bulletPoints &&
        enhancedContent.bulletPoints.length > 0,
    });
  }, [enhancedContent]);

  // Helper function to render HTML content properly
  const renderFormattedHTML = (htmlContent: string) => {
    // Process the HTML to ensure proper formatting
    const processedHTML = htmlContent
      .replace(/<b>/g, "<strong>")
      .replace(/<\/b>/g, "</strong>")
      .replace(/\n\n/g, "</p><p>")
      .replace(/^(?!<p>)/, "<p>")
      .replace(/(?!<\/p>)$/, "</p>");

    return (
      <div
        dangerouslySetInnerHTML={{ __html: processedHTML }}
        style={{
          lineHeight: 1.8,
          fontSize: "14px",
          color: "#202223",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        }}
      />
    );
  };

  // Force modal to be wider when it opens
  useEffect(() => {
    if (active) {
      // Wait for modal to render
      setTimeout(() => {
        // Find all modal-related elements and force their width
        const modalDialog = document.querySelector(".Polaris-Modal-Dialog");
        const modalContainer = document.querySelector(
          ".Polaris-Modal-Dialog__Container",
        );
        const modalModal = document.querySelector(
          ".Polaris-Modal-Dialog__Modal",
        );

        if (modalDialog) {
          (modalDialog as HTMLElement).style.maxWidth = "95vw";
          (modalDialog as HTMLElement).style.width = "95vw";
        }
        if (modalContainer) {
          (modalContainer as HTMLElement).style.maxWidth = "100%";
          (modalContainer as HTMLElement).style.width = "100%";
        }
        if (modalModal) {
          (modalModal as HTMLElement).style.maxWidth = "100%";
          (modalModal as HTMLElement).style.width = "100%";
        }
      }, 100);
    }
  }, [active]);

  const handleApplyChanges = () => {
    // Only apply fields that are checked
    const contentToApply: ContentData = {};

    console.log("🔧 DEBUG handleApplyChanges:", {
      fieldsToApply,
      editedContent,
      "editedContent.description length":
        editedContent.description?.length || 0,
      "editedContent.description preview": editedContent.description?.substring(
        0,
        100,
      ),
    });

    if (fieldsToApply.title) {
      if (editedContent.titleOptions && editedContent.titleOptions.length > 0) {
        // New format: use selected title from options
        // eslint-disable-next-line security/detect-object-injection
        contentToApply.title = editedContent.titleOptions[selectedTitleIndex];
      } else if (editedContent.title) {
        // Old format: use single title
        contentToApply.title = editedContent.title;
      }
    }
    if (fieldsToApply.description && editedContent.description) {
      contentToApply.description = editedContent.description;
    }
    if (fieldsToApply.seoTitle && editedContent.seoTitle) {
      contentToApply.seoTitle = editedContent.seoTitle;
    }
    if (fieldsToApply.seoDescription && editedContent.seoDescription) {
      contentToApply.seoDescription = editedContent.seoDescription;
    }
    if (fieldsToApply.promoText && editedContent.promoText) {
      contentToApply.promoText = editedContent.promoText;
    }
    if (fieldsToApply.bulletPoints && editedContent.bulletPoints) {
      contentToApply.bulletPoints = editedContent.bulletPoints;
    }

    onApply(contentToApply);
    onClose();
  };

  const renderModernField = (
    label: string,
    fieldName: string,
    original: string | undefined,
    enhanced: string | undefined,
    multiline: boolean = false,
    isHtml: boolean = false,
  ) => {
    const currentValue =
      (editedContent[fieldName as keyof typeof editedContent] as string) ||
      enhanced ||
      "";
    const hasChanged = original !== enhanced && enhanced;

    const fieldKey = fieldName as keyof typeof fieldsToApply;

    return (
      <Card roundedAbove="sm">
        <Box padding="400">
          <BlockStack gap="400">
            {/* Header with checkbox - always editable, no edit button */}
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="300" blockAlign="center">
                <Checkbox
                  label=""
                  // eslint-disable-next-line security/detect-object-injection
                  checked={fieldsToApply[fieldKey]}
                  onChange={(checked) =>
                    setFieldsToApply((prev) => ({
                      ...prev,
                      [fieldName]: checked,
                    }))
                  }
                />
                <BlockStack gap="100">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="headingMd" as="h3">
                      {label}
                    </Text>
                    {hasChanged && (
                      <Badge tone="success" icon={MagicIcon}>
                        AI Enhanced
                      </Badge>
                    )}
                  </InlineStack>
                  {/* eslint-disable-next-line security/detect-object-injection */}
                  {fieldsToApply[fieldKey] && (
                    <Text variant="bodySm" as="p" tone="success">
                      ✓ Will be applied to product
                    </Text>
                  )}
                </BlockStack>
              </InlineStack>
            </InlineStack>

            {/* Content comparison */}
            <InlineGrid columns={2} gap="400">
              {/* Original Content */}
              <Box
                background="bg-surface-secondary"
                padding="400"
                borderRadius="200"
              >
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Box>
                      <Icon source={DuplicateIcon} tone="subdued" />
                    </Box>
                    <Text variant="headingSm" as="h4" tone="subdued">
                      Current Version
                    </Text>
                  </InlineStack>
                  <Divider />
                  <Box paddingBlockStart="200">
                    {original ? (
                      isHtml ? (
                        renderFormattedHTML(original)
                      ) : (
                        <Text as="p" breakWord>
                          {original}
                        </Text>
                      )
                    ) : (
                      <Text as="p" tone="subdued">
                        No current content
                      </Text>
                    )}
                  </Box>
                </BlockStack>
              </Box>

              {/* Enhanced Content - Always Editable */}
              <Box
                background="bg-surface"
                padding="400"
                borderRadius="200"
                borderWidth="025"
                borderColor={
                  // eslint-disable-next-line security/detect-object-injection
                  fieldsToApply[fieldKey] ? "border-success" : "border"
                }
              >
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Box>
                      <Icon source={MagicIcon} tone="magic" />
                    </Box>
                    <Text variant="headingSm" as="h4" tone="magic">
                      AI Enhanced Version
                    </Text>
                  </InlineStack>
                  <Divider />
                  <Box paddingBlockStart="200">
                    {enhanced ? (
                      fieldName === "description" ? (
                        <RichTextEditor
                          value={currentValue}
                          onChange={(value) =>
                            setEditedContent((prev) => ({
                              ...prev,
                              [fieldName]: value,
                            }))
                          }
                        />
                      ) : (
                        <TextField
                          label=""
                          value={currentValue}
                          onChange={(value) =>
                            setEditedContent((prev) => ({
                              ...prev,
                              [fieldName]: value,
                            }))
                          }
                          multiline={multiline ? 5 : false}
                          autoComplete="off"
                        />
                      )
                    ) : (
                      <Text as="p" tone="subdued">
                        No enhanced content generated
                      </Text>
                    )}
                  </Box>
                </BlockStack>
              </Box>
            </InlineGrid>
          </BlockStack>
        </Box>
      </Card>
    );
  };

  const renderTitleOptions = () => {
    if (!editedContent.titleOptions || editedContent.titleOptions.length === 0)
      return null;

    // eslint-disable-next-line security/detect-object-injection
    const hasChanged =
      originalContent.title !== editedContent.titleOptions[selectedTitleIndex];

    return (
      <Card roundedAbove="sm">
        <Box padding="400">
          <BlockStack gap="400">
            {/* Header with checkbox */}
            <InlineStack align="space-between" blockAlign="center">
              <InlineStack gap="300" blockAlign="center">
                <Checkbox
                  label=""
                  checked={fieldsToApply.title}
                  onChange={(checked) =>
                    setFieldsToApply((prev) => ({
                      ...prev,
                      title: checked,
                    }))
                  }
                />
                <BlockStack gap="100">
                  <InlineStack gap="200" blockAlign="center">
                    <Text variant="headingMd" as="h3">
                      Product Title
                    </Text>
                    {hasChanged && (
                      <Badge tone="success" icon={MagicIcon}>
                        AI Enhanced
                      </Badge>
                    )}
                  </InlineStack>
                  {fieldsToApply.title && (
                    <Text variant="bodySm" as="p" tone="success">
                      ✓ Will be applied to product
                    </Text>
                  )}
                </BlockStack>
              </InlineStack>
            </InlineStack>

            {/* Content comparison */}
            <InlineGrid columns={2} gap="400">
              {/* Original Title */}
              <Box
                background="bg-surface-secondary"
                padding="400"
                borderRadius="200"
              >
                <BlockStack gap="200">
                  <InlineStack gap="200" blockAlign="center">
                    <Box>
                      <Icon source={DuplicateIcon} tone="subdued" />
                    </Box>
                    <Text variant="headingSm" as="h4" tone="subdued">
                      Current Version
                    </Text>
                  </InlineStack>
                  <Divider />
                  <Box paddingBlockStart="200">
                    {originalContent.title ? (
                      <Text as="p" breakWord>
                        {originalContent.title}
                      </Text>
                    ) : (
                      <Text as="p" tone="subdued">
                        No current title
                      </Text>
                    )}
                  </Box>
                </BlockStack>
              </Box>

              {/* AI-Generated Title Options */}
              <Box
                background="bg-surface"
                padding="400"
                borderRadius="200"
                borderWidth="025"
                borderColor={fieldsToApply.title ? "border-success" : "border"}
              >
                <BlockStack gap="300">
                  <InlineStack gap="200" blockAlign="center">
                    <Box>
                      <Icon source={MagicIcon} tone="magic" />
                    </Box>
                    <Text variant="headingSm" as="h4" tone="magic">
                      AI Enhanced Variations
                    </Text>
                  </InlineStack>
                  <Divider />
                  <BlockStack gap="200">
                    {editedContent.titleOptions.map((title, index) => (
                      <Box
                        key={index}
                        padding="200"
                        background={
                          selectedTitleIndex === index
                            ? "bg-surface-selected"
                            : "bg-surface-secondary"
                        }
                        borderRadius="100"
                        borderWidth="025"
                        borderColor={
                          selectedTitleIndex === index
                            ? "border-success"
                            : "border"
                        }
                      >
                        <InlineStack gap="200" blockAlign="start">
                          <Box paddingBlockStart="050">
                            <RadioButton
                              label=""
                              checked={selectedTitleIndex === index}
                              onChange={() => setSelectedTitleIndex(index)}
                            />
                          </Box>
                          <div style={{ flex: 1 }}>
                            <BlockStack gap="100">
                              <TextField
                                label=""
                                value={title}
                                onChange={(value) => {
                                  const newTitleOptions = [
                                    ...editedContent.titleOptions!,
                                  ];
                                  // eslint-disable-next-line security/detect-object-injection
                                  newTitleOptions[index] = value;
                                  setEditedContent((prev) => ({
                                    ...prev,
                                    titleOptions: newTitleOptions,
                                  }));
                                }}
                                autoComplete="off"
                              />
                              <Text variant="bodySm" as="p" tone="subdued">
                                {index === 0
                                  ? "Descriptive"
                                  : index === 1
                                    ? "Benefit-Focused"
                                    : "Creative"}
                              </Text>
                            </BlockStack>
                          </div>
                        </InlineStack>
                      </Box>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Box>
            </InlineGrid>
          </BlockStack>
        </Box>
      </Card>
    );
  };

  // Don't render Modal during SSR to prevent hydration mismatch
  if (!mounted) {
    return null;
  }

  return (
    <div className={styles.wideModalWrapper}>
      <Modal
        open={active}
        onClose={onClose}
        title="AI Enhanced Content Review"
        primaryAction={{
          content: "Apply Selected Changes",
          onAction: handleApplyChanges,
          loading: loading,
          disabled: !Object.values(fieldsToApply).some(Boolean),
        }}
        secondaryActions={[
          {
            content: "Cancel",
            onAction: onClose,
          },
        ]}
        size="large"
      >
        <Modal.Section>
          <BlockStack gap="400">
            {/* Main Content */}
            <Card>
              <Box padding="400">
                <BlockStack gap="600">
                  {/* Show title variations if available (new format) */}
                  {enhancedContent.titleOptions &&
                    enhancedContent.titleOptions.length > 0 &&
                    renderTitleOptions()}

                  {/* Fallback to single title if titleOptions not available (old format) */}
                  {!enhancedContent.titleOptions &&
                    enhancedContent.title &&
                    renderModernField(
                      "Product Title",
                      "title",
                      originalContent.title,
                      enhancedContent.title,
                      false,
                      false,
                    )}

                  {enhancedContent.description &&
                    renderModernField(
                      "Product Description",
                      "description",
                      originalContent.description,
                      enhancedContent.description,
                      true,
                      true,
                    )}

                  {!enhancedContent.titleOptions &&
                    !enhancedContent.title &&
                    !enhancedContent.description && (
                      <Banner tone="info">
                        <Text as="p">
                          No main content was generated. Try enabling title or
                          description generation in enhancement options.
                        </Text>
                      </Banner>
                    )}
                </BlockStack>
              </Box>
            </Card>
          </BlockStack>
        </Modal.Section>
      </Modal>
    </div>
  );
}
