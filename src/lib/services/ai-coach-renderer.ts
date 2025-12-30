/**
 * AI Coach Renderer Service
 *
 * Handles Mustache-style template rendering for AI coaches.
 * Converts template placeholders ({{PLACEHOLDER}}) to store-specific values.
 *
 * Uses simple string replacement instead of mustache library to avoid
 * dependency overhead for basic placeholder substitution.
 */

import { logger } from "@/lib/logger";
import {
  CoachRenderContext,
  CoachKey,
  COACH_KEYS,
  AICoachTemplate,
  AICoachInstance,
} from "@/types/ai-coaches";
import {
  getCoachTemplates,
  getBrandProfileFields,
  saveCoachInstance,
  getCoachProfileVersion,
  saveBuilderPack,
  getCoachInstancesForStore,
} from "./ai-coach-service";

// ============================================================================
// Render Context Builder
// ============================================================================

/**
 * Build the render context from store's brand profile
 */
export async function buildRenderContext(
  storeId: string,
): Promise<CoachRenderContext> {
  const { profile } = await getBrandProfileFields(storeId);

  return {
    BOUTIQUE_NAME: profile.boutique_name || "Your Boutique",
    BOUTIQUE_TYPE: profile.boutique_type || "online",
    TARGET_CUSTOMER: profile.target_customer || "your ideal customers",
    PRICE_POSITIONING: profile.price_positioning || "mid",
    BRAND_TONE: profile.brand_tone || "friendly and professional",
    WORDS_TO_USE_CSV: profile.words_to_use?.join(", ") || "",
    WORDS_TO_AVOID_CSV: profile.words_to_avoid?.join(", ") || "",
    DISCOUNT_COMFORT_LEVEL: profile.discount_comfort_level || "moderate",
    RETURN_POLICY_SUMMARY:
      profile.return_policy_summary || "Standard return policy applies.",
    SHIPPING_POLICY_SUMMARY:
      profile.shipping_policy_summary || "Standard shipping policy applies.",
    INVENTORY_SIZE: profile.inventory_size || "medium",
    OWNER_TIME_CONSTRAINT: profile.owner_time_constraint || "moderate",
    PRIMARY_GOAL_THIS_QUARTER:
      profile.primary_goal_this_quarter || "grow the business",
  };
}

// ============================================================================
// Template Rendering
// ============================================================================

/**
 * Render a template string with Mustache-style placeholders
 * Replaces {{PLACEHOLDER}} with context values
 */
export function renderTemplate(
  template: string,
  context: CoachRenderContext,
): string {
  let rendered = template;

  // Replace each placeholder with its value
  for (const [key, value] of Object.entries(context)) {
    const placeholder = `{{${key}}}`;
    rendered = rendered.split(placeholder).join(value);
  }

  return rendered;
}

/**
 * Render conversation starters array
 */
export function renderConversationStarters(
  starters: string[],
  context: CoachRenderContext,
): string[] {
  return starters.map((starter) => renderTemplate(starter, context));
}

/**
 * Render a complete coach template
 */
export function renderCoachTemplate(
  template: AICoachTemplate,
  context: CoachRenderContext,
): {
  renderedSystemPrompt: string;
  renderedConversationStarters: string[];
  renderedInstructionsMd: string;
} {
  return {
    renderedSystemPrompt: renderTemplate(
      template.system_prompt_template,
      context,
    ),
    renderedConversationStarters: renderConversationStarters(
      template.conversation_starters_template,
      context,
    ),
    renderedInstructionsMd: renderTemplate(
      template.instructions_md_template,
      context,
    ),
  };
}

// ============================================================================
// Coach Instance Rendering
// ============================================================================

/**
 * Render and save all coach instances for a store
 * Called when brand profile is updated
 */
export async function renderCoachInstances(storeId: string): Promise<{
  renderedCount: number;
  coaches: Array<{
    coach_key: CoachKey;
    template_version: number;
    profile_version: number;
  }>;
}> {
  logger.info("Rendering coach instances", {
    component: "ai-coach-renderer",
    storeId,
  });

  // Get templates and context in parallel
  const [templates, context, profileVersion] = await Promise.all([
    getCoachTemplates(),
    buildRenderContext(storeId),
    getCoachProfileVersion(storeId),
  ]);

  const rendered: Array<{
    coach_key: CoachKey;
    template_version: number;
    profile_version: number;
  }> = [];

  // Render each coach template
  for (const template of templates) {
    try {
      const {
        renderedSystemPrompt,
        renderedConversationStarters,
        renderedInstructionsMd,
      } = renderCoachTemplate(template, context);

      await saveCoachInstance(
        storeId,
        template.coach_key as CoachKey,
        template.version,
        profileVersion,
        renderedSystemPrompt,
        renderedConversationStarters,
        renderedInstructionsMd,
      );

      rendered.push({
        coach_key: template.coach_key as CoachKey,
        template_version: template.version,
        profile_version: profileVersion,
      });

      logger.debug("Rendered coach instance", {
        component: "ai-coach-renderer",
        storeId,
        coachKey: template.coach_key,
      });
    } catch (error) {
      logger.error("Failed to render coach instance", error as Error, {
        component: "ai-coach-renderer",
        storeId,
        coachKey: template.coach_key,
      });
      // Continue with other coaches even if one fails
    }
  }

  logger.info("Completed rendering coach instances", {
    component: "ai-coach-renderer",
    storeId,
    renderedCount: rendered.length,
  });

  return {
    renderedCount: rendered.length,
    coaches: rendered,
  };
}

/**
 * Render a single coach instance
 */
export async function renderSingleCoachInstance(
  storeId: string,
  coachKey: CoachKey,
): Promise<AICoachInstance> {
  if (!COACH_KEYS.includes(coachKey)) {
    throw new Error(`Invalid coach key: ${coachKey}`);
  }

  const [templates, context, profileVersion] = await Promise.all([
    getCoachTemplates(),
    buildRenderContext(storeId),
    getCoachProfileVersion(storeId),
  ]);

  const template = templates.find((t) => t.coach_key === coachKey);
  if (!template) {
    throw new Error(`Template not found for coach: ${coachKey}`);
  }

  const {
    renderedSystemPrompt,
    renderedConversationStarters,
    renderedInstructionsMd,
  } = renderCoachTemplate(template, context);

  return saveCoachInstance(
    storeId,
    coachKey,
    template.version,
    profileVersion,
    renderedSystemPrompt,
    renderedConversationStarters,
    renderedInstructionsMd,
  );
}

// ============================================================================
// Builder Pack Generation
// ============================================================================

/**
 * Generate AI Builder Pack markdown file
 * Contains all coach prompts for external AI tools
 */
export async function generateBuilderPack(storeId: string): Promise<{
  packMd: string;
  filename: string;
  profileVersion: number;
  templateVersion: number;
}> {
  logger.info("Generating builder pack", {
    component: "ai-coach-renderer",
    storeId,
  });

  // Get rendered instances
  const instances = await getCoachInstancesForStore(storeId);

  if (instances.length === 0) {
    throw new Error(
      "No coach instances found. Please complete your brand profile first.",
    );
  }

  // Get profile version from first instance
  const profileVersion = instances[0].profile_version;
  const templateVersion = instances[0].template_version;

  // Build markdown content
  const lines: string[] = [
    "# AI Builder Pack",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Profile Version: ${profileVersion}`,
    `Template Version: ${templateVersion}`,
    "",
    "---",
    "",
    "## How to Use This File",
    "",
    "Copy the system prompt for any coach into your preferred AI tool (ChatGPT, Claude, etc.).",
    "The prompts are personalized to your boutique's brand, tone, and policies.",
    "",
    "---",
    "",
  ];

  // Add each coach
  for (const instance of instances) {
    lines.push(`## ${getCoachDisplayName(instance.coach_key as CoachKey)}`);
    lines.push("");
    lines.push("### System Prompt");
    lines.push("");
    lines.push("```");
    lines.push(instance.rendered_system_prompt);
    lines.push("```");
    lines.push("");
    lines.push("### Conversation Starters");
    lines.push("");
    for (const starter of instance.rendered_conversation_starters) {
      lines.push(`- ${starter}`);
    }
    lines.push("");
    lines.push("### Instructions");
    lines.push("");
    lines.push(instance.rendered_instructions_md);
    lines.push("");
    lines.push("---");
    lines.push("");
  }

  const packMd = lines.join("\n");

  // Save to database
  await saveBuilderPack(storeId, profileVersion, templateVersion, packMd);

  // Generate filename
  const date = new Date().toISOString().split("T")[0];
  const filename = `ai-builder-pack-${date}.md`;

  logger.info("Generated builder pack", {
    component: "ai-coach-renderer",
    storeId,
    coachCount: instances.length,
  });

  return {
    packMd,
    filename,
    profileVersion,
    templateVersion,
  };
}

/**
 * Get display name for a coach key
 */
function getCoachDisplayName(coachKey: CoachKey): string {
  const names: Record<CoachKey, string> = {
    owner_coach: "Boutique Owner Coach",
    promo_coach: "Promotion & Campaign Coach",
    inventory_coach: "Inventory Decision Coach",
    cs_coach: "Customer Service Coach",
    ops_coach: "Boutique Operations Coach",
  };
  // eslint-disable-next-line security/detect-object-injection
  return names[coachKey] || coachKey;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Check if coach instances need re-rendering
 * Returns true if profile or template version has changed
 */
export async function needsRerender(storeId: string): Promise<boolean> {
  const [instances, templates, profileVersion] = await Promise.all([
    getCoachInstancesForStore(storeId),
    getCoachTemplates(),
    getCoachProfileVersion(storeId),
  ]);

  // If no instances exist, needs render
  if (instances.length === 0) {
    return true;
  }

  // Check if all coaches are rendered
  if (instances.length < templates.length) {
    return true;
  }

  // Check if any instance is stale
  for (const instance of instances) {
    const template = templates.find((t) => t.coach_key === instance.coach_key);
    if (!template) continue;

    // Check profile version
    if (instance.profile_version !== profileVersion) {
      return true;
    }

    // Check template version
    if (instance.template_version !== template.version) {
      return true;
    }
  }

  return false;
}

/**
 * Get render status for diagnostics
 */
export async function getRenderStatus(storeId: string): Promise<{
  needsRerender: boolean;
  currentProfileVersion: number;
  renderedCoaches: Array<{
    coach_key: string;
    template_version: number;
    profile_version: number;
    is_stale: boolean;
  }>;
  missingCoaches: string[];
}> {
  const [instances, templates, profileVersion] = await Promise.all([
    getCoachInstancesForStore(storeId),
    getCoachTemplates(),
    getCoachProfileVersion(storeId),
  ]);

  const instanceMap = new Map(instances.map((i) => [i.coach_key, i]));

  const renderedCoaches = instances.map((instance) => {
    const template = templates.find((t) => t.coach_key === instance.coach_key);
    const isStale =
      instance.profile_version !== profileVersion ||
      (template && instance.template_version !== template.version);

    return {
      coach_key: instance.coach_key,
      template_version: instance.template_version,
      profile_version: instance.profile_version,
      is_stale: !!isStale,
    };
  });

  const missingCoaches = templates
    .filter((t) => !instanceMap.has(t.coach_key))
    .map((t) => t.coach_key);

  return {
    needsRerender:
      renderedCoaches.some((c) => c.is_stale) || missingCoaches.length > 0,
    currentProfileVersion: profileVersion,
    renderedCoaches,
    missingCoaches,
  };
}
