/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/**
 * Questionnaire Configuration
 *
 * Defines the questions and options for the image generation guided questionnaire.
 * These questions are shown to users after they upload a product image to help
 * guide the AI in creating better, more targeted lifestyle images.
 *
 * Question Flow:
 * 1. productType (dynamic from Shopify) - determines if size question is shown
 * 2. style - always shown
 * 3. productSize - conditional based on productType (skip for clothing, jewelry auto-applies)
 * 4. environment - always shown
 * 5. mood - always shown
 * 6. lighting - always shown
 * 7. usage - always shown
 */

import type { Question, QuestionnaireAnswer } from "@/types/image-generation";
import {
  shouldShowSizeQuestion,
  getAutoSize as _getAutoSize,
} from "./product-category-config";

// Re-export for convenience
export { shouldShowSizeQuestion, getAutoSize } from "./product-category-config";

/**
 * Questions for the guided questionnaire flow
 * Presented one at a time after image upload
 */
export const QUESTIONNAIRE_QUESTIONS: Question[] = [
  {
    id: "productType",
    text: "What type of product is this?",
    options: [], // Options are loaded dynamically from Shopify product types
    allowCustom: true,
    isDynamic: true,
  },
  {
    id: "style",
    text: "What style of photo are you looking for?",
    options: [
      {
        label: "Professional/Studio",
        value: "professional",
        icon: "📸",
        description:
          "Clean, polished shots like those in catalogs or e-commerce sites",
      },
      {
        label: "Lifestyle/Contextual",
        value: "lifestyle",
        icon: "🏠",
        description:
          "Product shown in real-life settings, being used naturally",
      },
      {
        label: "Bold & Vibrant",
        value: "bold",
        icon: "🎨",
        description:
          "Eye-catching colors and creative compositions that stand out",
      },
      {
        label: "Minimalist/Clean",
        value: "minimal",
        icon: "✨",
        description: "Simple, uncluttered designs with lots of white space",
      },
    ],
    allowCustom: true,
  },
  {
    id: "productSize",
    text: "How big is your product?",
    options: [
      {
        label: "Tiny (fits in palm)",
        value: "tiny",
        icon: "💎",
        description: "Jewelry, coins, small accessories that fit in your hand",
      },
      {
        label: "Small (handheld)",
        value: "small",
        icon: "📱",
        description: "Phone, wallet, cosmetics, small electronics",
      },
      {
        label: "Tabletop/Decorative",
        value: "tabletop",
        icon: "🏺",
        description:
          "Small decorative items, mini trees, vases, figurines (6-24 inches)",
      },
      {
        label: "Medium (fits on desk)",
        value: "medium",
        icon: "💻",
        description: "Laptop, small appliances, desk accessories",
      },
      {
        label: "Large (floor-standing)",
        value: "large",
        icon: "🪴",
        description: "Floor lamps, full-size trees, standing items (3-6 feet)",
      },
      {
        label: "Extra Large (furniture)",
        value: "xlarge",
        icon: "🛋️",
        description: "Furniture, large equipment, oversized items",
      },
    ],
    allowCustom: true,
    conditionalOn: "productType",
    shouldShow: (answers: QuestionnaireAnswer[]) => {
      const productTypeAnswer = answers.find(
        (a) => a.questionId === "productType",
      );
      if (!productTypeAnswer) return true; // Show by default if no answer yet
      return shouldShowSizeQuestion(productTypeAnswer.answer);
    },
  },
  {
    id: "environment",
    text: "Where should your product be shown?",
    options: [
      {
        label: "Indoor (home setting)",
        value: "indoor_home",
        icon: "🛋️",
        description:
          "Living room, bedroom, kitchen, or other residential spaces",
      },
      {
        label: "Indoor (commercial)",
        value: "indoor_commercial",
        icon: "🏪",
        description:
          "Office, retail store, restaurant, or professional setting",
      },
      {
        label: "Outdoor/Nature",
        value: "outdoor",
        icon: "🌿",
        description:
          "Garden, patio, beach, forest, or other outdoor environments",
      },
      {
        label: "Studio/Plain background",
        value: "studio",
        icon: "⬜",
        description:
          "Clean backdrop with no distractions, focus on the product",
      },
    ],
    allowCustom: true,
  },
  {
    id: "mood",
    text: "What mood or atmosphere do you want?",
    options: [
      {
        label: "Luxury/Premium",
        value: "luxury",
        icon: "💎",
        description:
          "Elegant, high-end feeling with rich textures and refined details",
      },
      {
        label: "Cozy/Warm",
        value: "cozy",
        icon: "🔥",
        description: "Inviting and comfortable, like a warm embrace",
      },
      {
        label: "Energetic/Dynamic",
        value: "energetic",
        icon: "⚡",
        description: "Active, lively feeling with movement and excitement",
      },
      {
        label: "Natural/Organic",
        value: "natural",
        icon: "🌱",
        description: "Earth tones, sustainable vibes, connection to nature",
      },
      {
        label: "Minimalist",
        value: "minimal",
        icon: "🤍",
        description: "Calm, serene, and uncluttered aesthetic",
      },
    ],
    allowCustom: true,
  },
  {
    id: "lighting",
    text: "What kind of lighting?",
    options: [
      {
        label: "Natural daylight",
        value: "natural",
        icon: "☀️",
        description: "Soft, even light like sun through a window",
      },
      {
        label: "Warm ambient",
        value: "warm",
        icon: "🕯️",
        description: "Golden, cozy tones from candles or lamps",
      },
      {
        label: "Bright studio",
        value: "bright",
        icon: "💡",
        description: "Crisp, even illumination that shows every detail",
      },
      {
        label: "Dramatic/Moody",
        value: "dramatic",
        icon: "🌙",
        description: "Strong shadows and contrast for artistic effect",
      },
    ],
    allowCustom: true,
  },
  {
    id: "usage",
    text: "Where will you use this image?",
    options: [
      {
        label: "Website product page",
        value: "website",
        icon: "🌐",
        description: "Main product photos for your online store",
      },
      {
        label: "Social media",
        value: "social",
        icon: "📱",
        description: "Instagram, Facebook, Pinterest, or TikTok posts",
      },
      {
        label: "Ads/Promotions",
        value: "ads",
        icon: "📢",
        description: "Paid advertising campaigns and promotional content",
      },
      {
        label: "Marketing materials",
        value: "marketing",
        icon: "📄",
        description: "Brochures, emails, presentations, or print materials",
      },
    ],
    allowCustom: true,
  },
];

/**
 * Get total number of questions
 */
export const TOTAL_QUESTIONS = QUESTIONNAIRE_QUESTIONS.length;

/**
 * Get a question by index
 */
export function getQuestion(index: number): Question | null {
  return QUESTIONNAIRE_QUESTIONS[index] ?? null;
}

/**
 * Get a question by ID
 */
export function getQuestionById(id: string): Question | null {
  return QUESTIONNAIRE_QUESTIONS.find((q) => q.id === id) ?? null;
}

/**
 * Get the next question to show based on current answers
 * Handles conditional questions by checking shouldShow function
 *
 * @param currentAnswers - Array of answers already collected
 * @returns The next question to show, or null if questionnaire is complete
 */
export function getNextQuestion(
  currentAnswers: QuestionnaireAnswer[],
): { question: Question; index: number } | null {
  const answeredIds = new Set(currentAnswers.map((a) => a.questionId));

  for (let i = 0; i < QUESTIONNAIRE_QUESTIONS.length; i++) {
    const question = QUESTIONNAIRE_QUESTIONS[i];

    // Skip if already answered
    if (answeredIds.has(question.id)) {
      continue;
    }

    // Check if this question should be shown (conditional logic)
    if (question.shouldShow && !question.shouldShow(currentAnswers)) {
      continue;
    }

    return { question, index: i };
  }

  return null; // All questions answered
}

/**
 * Get the list of questions that should be shown based on current answers
 * Useful for calculating progress
 *
 * @param currentAnswers - Array of answers already collected
 * @returns Array of questions that should be shown
 */
export function getVisibleQuestions(
  currentAnswers: QuestionnaireAnswer[],
): Question[] {
  return QUESTIONNAIRE_QUESTIONS.filter((question) => {
    if (question.shouldShow) {
      return question.shouldShow(currentAnswers);
    }
    return true;
  });
}

/**
 * Calculate questionnaire progress
 *
 * @param currentAnswers - Array of answers already collected
 * @returns Progress information
 */
export function getQuestionnaireProgress(
  currentAnswers: QuestionnaireAnswer[],
): {
  answered: number;
  total: number;
  percentage: number;
  isComplete: boolean;
} {
  const visibleQuestions = getVisibleQuestions(currentAnswers);
  const answered = currentAnswers.length;
  const total = visibleQuestions.length;
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;
  const isComplete = getNextQuestion(currentAnswers) === null;

  return { answered, total, percentage, isComplete };
}

/**
 * Build a summary message from questionnaire answers
 */
export function buildAnswerSummary(
  answers: Array<{ questionId: string; answerLabel: string }>,
): string {
  if (answers.length === 0) {
    return "Let's create an image! Describe the scene you'd like to see your product in.";
  }

  const parts: string[] = [];
  const answerMap = new Map(answers.map((a) => [a.questionId, a.answerLabel]));

  const productType = answerMap.get("productType");
  const style = answerMap.get("style");
  const productSize = answerMap.get("productSize");
  const environment = answerMap.get("environment");
  const mood = answerMap.get("mood");
  const lighting = answerMap.get("lighting");
  const usage = answerMap.get("usage");

  if (style) {
    parts.push(`a "${style.toLowerCase()}" style photo`);
  }

  if (productType) {
    parts.push(`of your "${productType.toLowerCase()}" product`);
  } else if (productSize) {
    // Fall back to size if no product type
    parts.push(`of your "${productSize.toLowerCase()}" product`);
  }

  if (environment) {
    parts.push(`in a "${environment.toLowerCase()}" setting`);
  }

  if (mood) {
    parts.push(`with a "${mood.toLowerCase()}" mood`);
  }

  if (lighting) {
    parts.push(`using "${lighting.toLowerCase()}" lighting`);
  }

  if (usage) {
    parts.push(`for "${usage.toLowerCase()}"`);
  }

  if (parts.length === 0) {
    return "Great! Now describe the scene you'd like to see your product in.";
  }

  return `Got it! You're looking for ${parts.join(", ")}.\n\nNow it's your turn! Type a description of your scene below. For example:\n• "On a cozy fireplace mantel with holiday decorations"\n• "In a bright kitchen on a marble countertop"\n• "On a wooden desk in a modern home office"`;
}

/**
 * Map questionnaire answers to prompt parser fields
 * Returns an object that can be merged with the prompt parser's parsed values
 */
export function mapAnswersToPromptFields(
  answers: Array<{ questionId: string; answer: string }>,
): {
  photographyStyle?: string;
  environmentSetting?: string;
  atmosphereIntent?: string;
  lightingPreference?: string;
  intendedUse?: string;
  productSize?: string;
  productType?: string;
} {
  const result: Record<string, string> = {};
  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));

  // Map productType - used for category-based logic
  const productType = answerMap.get("productType");
  if (productType) {
    result.productType = productType;
  }

  // Map style to photographyStyle
  const style = answerMap.get("style");
  if (style) {
    result.photographyStyle = style;
  }

  // Map productSize - CRITICAL for proper scale/proportion
  const productSize = answerMap.get("productSize");
  if (productSize) {
    result.productSize = productSize;
  }

  // Map environment to environmentSetting
  const environment = answerMap.get("environment");
  if (environment) {
    result.environmentSetting = environment;
  }

  // Map mood to atmosphereIntent
  const mood = answerMap.get("mood");
  if (mood) {
    result.atmosphereIntent = mood;
  }

  // Map lighting to lightingPreference
  const lighting = answerMap.get("lighting");
  if (lighting) {
    result.lightingPreference = lighting;
  }

  // Map usage to intendedUse
  const usage = answerMap.get("usage");
  if (usage) {
    result.intendedUse = usage;
  }

  return result;
}
