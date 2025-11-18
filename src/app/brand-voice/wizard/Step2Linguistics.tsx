"use client";

import { useState } from "react";
import {
  Card,
  Text,
  BlockStack,
  TextField,
  Tag,
  InlineStack,
  Box
} from "@shopify/polaris";

interface Step2LinguisticsProps {
  data: {
    voice_vocabulary: {
      words_love: string[];
      words_avoid: string[];
    };
    customer_term: string;
    signature_sentence: string;
  };
  onChange: (field: string, value: any) => void;
}

const SUGGESTED_WORDS = [
  "cozy", "elevated", "everyday", "confident", "bold", "timeless",
  "effortless", "polished", "modern", "classic", "versatile", "chic",
  "sophisticated", "minimalist", "edgy", "feminine", "luxe"
];

export default function Step2Linguistics({ data, onChange }: Step2LinguisticsProps) {
  const [loveInput, setLoveInput] = useState("");
  const [avoidInput, setAvoidInput] = useState("");

  const addWordLove = (word: string) => {
    if (word.trim() && !data.voice_vocabulary.words_love.includes(word.trim())) {
      onChange("voice_vocabulary", {
        ...data.voice_vocabulary,
        words_love: [...data.voice_vocabulary.words_love, word.trim()]
      });
      setLoveInput("");
    }
  };

  const removeWordLove = (word: string) => {
    onChange("voice_vocabulary", {
      ...data.voice_vocabulary,
      words_love: data.voice_vocabulary.words_love.filter(w => w !== word)
    });
  };

  const addWordAvoid = (word: string) => {
    if (word.trim() && !data.voice_vocabulary.words_avoid.includes(word.trim())) {
      onChange("voice_vocabulary", {
        ...data.voice_vocabulary,
        words_avoid: [...data.voice_vocabulary.words_avoid, word.trim()]
      });
      setAvoidInput("");
    }
  };

  const removeWordAvoid = (word: string) => {
    onChange("voice_vocabulary", {
      ...data.voice_vocabulary,
      words_avoid: data.voice_vocabulary.words_avoid.filter(w => w !== word)
    });
  };

  const handleLoveKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && loveInput.trim()) {
      event.preventDefault();
      addWordLove(loveInput);
    }
  };

  const handleAvoidKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && avoidInput.trim()) {
      event.preventDefault();
      addWordAvoid(avoidInput);
    }
  };

  return (
    <BlockStack gap="600">
      <BlockStack gap="300">
        <Text as="h2" variant="headingLg">
          Step 2: Brand Linguistics
        </Text>
        <Text as="p" variant="bodyMd" tone="subdued">
          Help Thunder Text learn the specific words and phrases that make your brand unique.
        </Text>
      </BlockStack>

      {/* Words You Love */}
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="h3" variant="headingMd">
              Words You Love to Use
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Which words feel most like your brand? Pick a few from the suggestions or type your own. 3–7 is plenty.
            </Text>
          </BlockStack>

          {/* Suggested words */}
          <Box>
            <InlineStack gap="200" wrap>
              {SUGGESTED_WORDS.filter(
                word => !data.voice_vocabulary.words_love.includes(word)
              ).map(word => (
                <Tag
                  key={word}
                  onClick={() => addWordLove(word)}
                >
                  {word}
                </Tag>
              ))}
            </InlineStack>
          </Box>

          {/* Input field */}
          <TextField
            label=""
            value={loveInput}
            onChange={setLoveInput}
            onKeyDown={handleLoveKeyDown}
            placeholder="Type a word and press Enter"
            autoComplete="off"
          />

          {/* Selected words */}
          {data.voice_vocabulary.words_love.length > 0 && (
            <Box>
              <InlineStack gap="200" wrap>
                {data.voice_vocabulary.words_love.map(word => (
                  <Tag
                    key={word}
                    onRemove={() => removeWordLove(word)}
                  >
                    {word}
                  </Tag>
                ))}
              </InlineStack>
            </Box>
          )}
        </BlockStack>
      </Card>

      {/* Words You Never Want Used */}
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="h3" variant="headingMd">
              Words You Never Want Used
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              Any words or phrases you never want Thunder Text to use? Think of words that feel off-brand, overused, or that your customers don't like. You can leave this blank if nothing comes to mind.
            </Text>
          </BlockStack>

          <TextField
            label=""
            value={avoidInput}
            onChange={setAvoidInput}
            onKeyDown={handleAvoidKeyDown}
            placeholder="Type a word and press Enter (optional)"
            autoComplete="off"
          />

          {data.voice_vocabulary.words_avoid.length > 0 && (
            <Box>
              <InlineStack gap="200" wrap>
                {data.voice_vocabulary.words_avoid.map(word => (
                  <Tag
                    key={word}
                    onRemove={() => removeWordAvoid(word)}
                  >
                    {word}
                  </Tag>
                ))}
              </InlineStack>
            </Box>
          )}
        </BlockStack>
      </Card>

      {/* Customer Term */}
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="h3" variant="headingMd">
              How You Refer to Your Customer
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              How do you usually refer to your customer in your copy?
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Examples: "you", "girl", "friend", "babe", "mama", "shopper", "beauty"
            </Text>
          </BlockStack>

          <TextField
            label=""
            value={data.customer_term}
            onChange={(value) => onChange("customer_term", value)}
            placeholder="you"
            autoComplete="off"
          />
        </BlockStack>
      </Card>

      {/* Brand Tagline/Motto */}
      <Card>
        <BlockStack gap="400">
          <BlockStack gap="200">
            <Text as="h3" variant="headingMd">
              Brand Tagline or Motto
            </Text>
            <Text as="p" variant="bodyMd" tone="subdued">
              What is your brand tagline or motto? If you don't have an official tagline, write one sentence you'd love customers to remember about your brand.
            </Text>
          </BlockStack>

          <TextField
            label=""
            value={data.signature_sentence}
            onChange={(value) => onChange("signature_sentence", value)}
            placeholder="Style that actually fits your real life."
            autoComplete="off"
            multiline={2}
          />
        </BlockStack>
      </Card>
    </BlockStack>
  );
}
