"use client";

import { Card, Text, BlockStack, TextField } from "@shopify/polaris";

interface Step4AudienceProps {
  data: {
    audience_description: string;
  };
  onChange: (field: string, value: string) => void;
}

export default function Step4Audience({ data, onChange }: Step4AudienceProps) {
  return (
    <BlockStack gap="600">
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          Step 4: Audience Snapshot
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Who do you primarily sell to?
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Describe your typical customer in your own words.
        </Text>
      </BlockStack>

      <Card>
        <TextField
          label=""
          value={data.audience_description}
          onChange={(value) => onChange("audience_description", value)}
          placeholder="Describe your typical customer..."
          autoComplete="off"
          multiline={4}
        />
      </Card>
    </BlockStack>
  );
}
