"use client";

import { Card, Text, BlockStack, TextField, Banner } from "@shopify/polaris";

interface Step5ExamplesProps {
  data: {
    writing_samples: string;
  };
  onChange: (field: string, value: string) => void;
}

export default function Step5Examples({ data, onChange }: Step5ExamplesProps) {
  return (
    <BlockStack gap="600">
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          Step 5: Example Content
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Paste 2–3 product descriptions you've written before that sound exactly how you want Thunder Text to write.
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          This helps Thunder Text understand your style through real examples.
        </Text>
      </BlockStack>

      <Banner tone="info">
        <Text as="p" variant="bodySm">
          Include product descriptions, emails, social posts, or any writing that sounds like your brand.
        </Text>
      </Banner>

      <Card>
        <TextField
          label=""
          value={data.writing_samples}
          onChange={(value) => onChange("writing_samples", value)}
          placeholder="Example 1: 'This cozy fleece hoodie is perfect for those cool autumn mornings...'

Example 2: 'Designed for real life, these jeans move with you...'"
          autoComplete="off"
          multiline={8}
        />
      </Card>
    </BlockStack>
  );
}
