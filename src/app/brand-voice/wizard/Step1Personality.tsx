"use client";

import { Card, Text, BlockStack, RangeSlider, InlineStack } from "@shopify/polaris";

interface ToneSliderProps {
  label: string;
  leftLabel: string;
  rightLabel: string;
  value: number;
  onChange: (value: number) => void;
  examples?: {
    left: string;
    right: string;
  };
}

function ToneSlider({ label, leftLabel, rightLabel, value, onChange, examples }: ToneSliderProps) {
  return (
    <BlockStack gap="200">
      <Text as="h3" variant="headingMd">
        {label}
      </Text>
      <InlineStack align="space-between" blockAlign="center">
        <Text as="span" variant="bodyMd" tone="subdued">
          {leftLabel}
        </Text>
        <Text as="span" variant="bodyMd" tone="subdued">
          {rightLabel}
        </Text>
      </InlineStack>
      <RangeSlider
        label=""
        value={value}
        onChange={onChange}
        min={0}
        max={10}
        output
      />
      {examples && (
        <InlineStack align="space-between" blockAlign="start">
          <Text as="span" variant="bodySm" tone="subdued" alignment="start">
            {examples.left}
          </Text>
          <Text as="span" variant="bodySm" tone="subdued" alignment="end">
            {examples.right}
          </Text>
        </InlineStack>
      )}
    </BlockStack>
  );
}

interface Step1PersonalityProps {
  data: {
    tone_playful_serious: number;
    tone_casual_elevated: number;
    tone_trendy_classic: number;
    tone_friendly_professional: number;
    tone_simple_detailed: number;
    tone_bold_soft: number;
  };
  onChange: (field: string, value: number) => void;
}

export default function Step1Personality({ data, onChange }: Step1PersonalityProps) {
  return (
    <BlockStack gap="600">
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          Step 1: Brand Personality
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Use the sliders below to define your brand's personality. Move each slider to where it feels most like your brand.
        </Text>
      </BlockStack>

      <Card>
        <BlockStack gap="500">
          <ToneSlider
            label="Playful ↔ Serious"
            leftLabel="Playful"
            rightLabel="Serious"
            value={data.tone_playful_serious}
            onChange={(value) => onChange("tone_playful_serious", value)}
            examples={{
              left: "Fun, lighthearted, witty",
              right: "Professional, dignified, formal"
            }}
          />

          <ToneSlider
            label="Casual ↔ Elevated"
            leftLabel="Casual"
            rightLabel="Elevated"
            value={data.tone_casual_elevated}
            onChange={(value) => onChange("tone_casual_elevated", value)}
            examples={{
              left: "Everyday, approachable, relaxed",
              right: "Refined, sophisticated, polished"
            }}
          />

          <ToneSlider
            label="Trendy ↔ Classic"
            leftLabel="Trendy"
            rightLabel="Classic"
            value={data.tone_trendy_classic}
            onChange={(value) => onChange("tone_trendy_classic", value)}
            examples={{
              left: "Fashion-forward, contemporary",
              right: "Timeless, traditional, enduring"
            }}
          />

          <ToneSlider
            label="Friendly ↔ Professional"
            leftLabel="Friendly"
            rightLabel="Professional"
            value={data.tone_friendly_professional}
            onChange={(value) => onChange("tone_friendly_professional", value)}
            examples={{
              left: "Warm, conversational, personal",
              right: "Expert, authoritative, business-like"
            }}
          />

          <ToneSlider
            label="Simple ↔ Detailed"
            leftLabel="Simple"
            rightLabel="Detailed"
            value={data.tone_simple_detailed}
            onChange={(value) => onChange("tone_simple_detailed", value)}
            examples={{
              left: "Concise, straightforward, brief",
              right: "Comprehensive, thorough, descriptive"
            }}
          />

          <ToneSlider
            label="Bold ↔ Soft"
            leftLabel="Bold"
            rightLabel="Soft"
            value={data.tone_bold_soft}
            onChange={(value) => onChange("tone_bold_soft", value)}
            examples={{
              left: "Strong, confident, direct",
              right: "Gentle, subtle, understated"
            }}
          />
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
