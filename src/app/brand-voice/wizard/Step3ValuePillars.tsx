"use client";

import { Card, Text, BlockStack, Checkbox, InlineGrid, Banner } from "@shopify/polaris";

const VALUE_OPTIONS = [
  "Comfort",
  "Fit",
  "Quality",
  "Trends",
  "Sustainability",
  "Inclusivity",
  "Affordability",
  "Luxury",
  "Everyday wear",
  "Statement pieces",
  "Community",
  "Fast shipping"
];

interface Step3ValuePillarsProps {
  data: {
    value_pillars: string[];
  };
  onChange: (field: string, value: string[]) => void;
}

export default function Step3ValuePillars({ data, onChange }: Step3ValuePillarsProps) {
  const handleToggle = (value: string) => {
    const currentPillars = data.value_pillars || [];

    if (currentPillars.includes(value)) {
      // Remove if already selected
      onChange("value_pillars", currentPillars.filter(p => p !== value));
    } else {
      // Add if not selected (max 3)
      if (currentPillars.length < 3) {
        onChange("value_pillars", [...currentPillars, value]);
      }
    }
  };

  const selectedCount = data.value_pillars?.length || 0;
  const showMaxedOut = selectedCount === 3;

  return (
    <BlockStack gap="600">
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          Step 3: Value Pillars
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          What are the top things your customer cares about most when shopping with you?
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Pick up to 3. Think about what matters most to them when they decide to buy.
        </Text>
      </BlockStack>

      {showMaxedOut && (
        <Banner tone="info">
          You've selected the maximum of 3 priorities. Uncheck one to select a different option.
        </Banner>
      )}

      <Card>
        <BlockStack gap="400">
          <InlineGrid columns={{xs: 1, sm: 2, md: 3}} gap="400">
            {VALUE_OPTIONS.map(option => {
              const isChecked = data.value_pillars?.includes(option) || false;
              const isDisabled = !isChecked && selectedCount >= 3;

              return (
                <Checkbox
                  key={option}
                  label={option}
                  checked={isChecked}
                  onChange={() => handleToggle(option)}
                  disabled={isDisabled}
                />
              );
            })}
          </InlineGrid>

          {selectedCount > 0 && (
            <Text as="p" variant="bodySm" tone="subdued">
              Selected: {selectedCount} of 3 maximum
            </Text>
          )}
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
