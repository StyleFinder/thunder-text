/**
 * AI Coach Service
 *
 * Core CRUD operations and business logic for the AI Coaches feature.
 * All database operations use service_role to bypass RLS.
 *
 * Key Patterns:
 * - store_id = shops.id (from getUserId())
 * - All queries filter by store_id for multi-tenancy
 * - Premium gating via shops.plan
 */

import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import {
  AICoachTemplate,
  AICoachInstance,
  AICoachConversation,
  AICoachMessage,
  CoachBrandProfileFields,
  CoachKey,
  COACH_KEYS,
  COACH_ELIGIBLE_PLANS,
  REQUIRED_PROFILE_FIELDS,
  CoachNotFoundError,
  CoachNotRenderedError,
  PremiumRequiredError,
  ConversationNotFoundError,
  StoredFileAttachment,
} from "@/types/ai-coaches";

// Re-export StoredFileAttachment as StoredFileMetadata for backwards compatibility
export type StoredFileMetadata = StoredFileAttachment;

// ============================================================================
// Premium Access
// ============================================================================

/**
 * Check if a store has access to AI Coaches (premium feature)
 * Uses existing shops.plan column
 */
export async function hasPremiumAccess(storeId: string): Promise<boolean> {
  const { data: shop, error } = await supabaseAdmin
    .from("shops")
    .select("plan, subscription_status")
    .eq("id", storeId)
    .single();

  if (error || !shop) {
    logger.warn("Failed to check premium access", {
      component: "ai-coach-service",
      storeId,
      error: error?.message,
    });
    return false;
  }

  const hasEligiblePlan = COACH_ELIGIBLE_PLANS.includes(
    shop.plan as (typeof COACH_ELIGIBLE_PLANS)[number],
  );
  const isActive = shop.subscription_status === "active";

  return hasEligiblePlan && isActive;
}

/**
 * Require premium access or throw PremiumRequiredError
 */
export async function requirePremiumAccess(storeId: string): Promise<void> {
  const hasPremium = await hasPremiumAccess(storeId);
  if (!hasPremium) {
    throw new PremiumRequiredError();
  }
}

// ============================================================================
// Coach Templates
// ============================================================================

/**
 * Get all active coach templates
 * Returns coaches in the order defined by COACH_KEYS
 */
export async function getCoachTemplates(): Promise<AICoachTemplate[]> {
  const { data, error } = await supabaseAdmin
    .from("ai_coach_templates")
    .select("*")
    .eq("is_active", true);

  if (error) {
    logger.error("Failed to fetch coach templates", error, {
      component: "ai-coach-service",
    });
    throw error;
  }

  // Sort by COACH_KEYS order (not alphabetically)
  const templates = data || [];
  return templates.sort((a, b) => {
    const aIndex = COACH_KEYS.indexOf(a.coach_key as CoachKey);
    const bIndex = COACH_KEYS.indexOf(b.coach_key as CoachKey);
    return aIndex - bIndex;
  });
}

/**
 * Get a specific coach template by key
 */
export async function getCoachTemplate(
  coachKey: CoachKey,
): Promise<AICoachTemplate | null> {
  if (!COACH_KEYS.includes(coachKey)) {
    throw new CoachNotFoundError(coachKey);
  }

  const { data, error } = await supabaseAdmin
    .from("ai_coach_templates")
    .select("*")
    .eq("coach_key", coachKey)
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") {
    // PGRST116 = no rows
    logger.error("Failed to fetch coach template", error, {
      component: "ai-coach-service",
      coachKey,
    });
    throw error;
  }

  return data;
}

// ============================================================================
// Coach Instances
// ============================================================================

/**
 * Get all active coach instances for a store
 * Alias for getCoachInstancesForStore
 */
export async function getActiveCoachInstances(
  storeId: string,
): Promise<AICoachInstance[]> {
  return getCoachInstancesForStore(storeId);
}

/**
 * Get all coach instances for a store
 */
export async function getCoachInstancesForStore(
  storeId: string,
): Promise<AICoachInstance[]> {
  const { data, error } = await supabaseAdmin
    .from("ai_coach_instances")
    .select("*")
    .eq("store_id", storeId)
    .eq("is_active", true)
    .order("coach_key");

  if (error) {
    logger.error("Failed to fetch coach instances", error, {
      component: "ai-coach-service",
      storeId,
    });
    throw error;
  }

  return data || [];
}

/**
 * Get a specific coach instance for a store
 */
export async function getCoachInstance(
  storeId: string,
  coachKey: CoachKey,
): Promise<AICoachInstance | null> {
  if (!COACH_KEYS.includes(coachKey)) {
    throw new CoachNotFoundError(coachKey);
  }

  const { data, error } = await supabaseAdmin
    .from("ai_coach_instances")
    .select("*")
    .eq("store_id", storeId)
    .eq("coach_key", coachKey)
    .eq("is_active", true)
    .single();

  if (error && error.code !== "PGRST116") {
    logger.error("Failed to fetch coach instance", error, {
      component: "ai-coach-service",
      storeId,
      coachKey,
    });
    throw error;
  }

  return data;
}

/**
 * Get coach instance or throw if not rendered
 */
export async function requireCoachInstance(
  storeId: string,
  coachKey: CoachKey,
): Promise<AICoachInstance> {
  const instance = await getCoachInstance(storeId, coachKey);
  if (!instance) {
    throw new CoachNotRenderedError(coachKey);
  }
  return instance;
}

/**
 * Save or update a coach instance
 */
export async function saveCoachInstance(
  storeId: string,
  coachKey: CoachKey,
  templateVersion: number,
  profileVersion: number,
  renderedSystemPrompt: string,
  renderedConversationStarters: string[],
  renderedInstructionsMd: string,
): Promise<AICoachInstance> {
  // Deactivate old instances for this coach
  await supabaseAdmin
    .from("ai_coach_instances")
    .update({ is_active: false })
    .eq("store_id", storeId)
    .eq("coach_key", coachKey);

  // Insert new instance
  const { data, error } = await supabaseAdmin
    .from("ai_coach_instances")
    .insert({
      store_id: storeId,
      coach_key: coachKey,
      template_version: templateVersion,
      profile_version: profileVersion,
      rendered_system_prompt: renderedSystemPrompt,
      rendered_conversation_starters: renderedConversationStarters,
      rendered_instructions_md: renderedInstructionsMd,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to save coach instance", error, {
      component: "ai-coach-service",
      storeId,
      coachKey,
    });
    throw error;
  }

  return data;
}

// ============================================================================
// Brand Profile Fields
// ============================================================================

/**
 * Get brand profile fields for coach rendering
 * Combines data from shops and business_profiles tables
 */
export async function getBrandProfileFields(
  storeId: string,
): Promise<{
  profile: Partial<CoachBrandProfileFields>;
  isComplete: boolean;
  missingFields: string[];
}> {
  // Get shop data
  const { data: shop, error: shopError } = await supabaseAdmin
    .from("shops")
    .select("shop_domain, store_name, store_type")
    .eq("id", storeId)
    .single();

  if (shopError) {
    logger.error("Failed to fetch shop for brand profile", shopError, {
      component: "ai-coach-service",
      storeId,
    });
    throw shopError;
  }

  // Get business profile data
  const { data: businessProfile, error: profileError } = await supabaseAdmin
    .from("business_profiles")
    .select(
      `
      voice_tone,
      voice_vocabulary,
      ideal_customer_profile,
      discount_comfort_level,
      return_policy_summary,
      shipping_policy_summary,
      inventory_size,
      owner_time_constraint,
      primary_goal_this_quarter,
      coach_profile_version
    `,
    )
    .eq("store_id", storeId)
    .eq("is_current", true)
    .single();

  if (profileError && profileError.code !== "PGRST116") {
    logger.error("Failed to fetch business profile", profileError, {
      component: "ai-coach-service",
      storeId,
    });
    throw profileError;
  }

  // Build profile from available data
  const profile: Partial<CoachBrandProfileFields> = {
    boutique_name: shop?.store_name || shop?.shop_domain?.split(".")[0] || "",
    boutique_type:
      (shop?.store_type as CoachBrandProfileFields["boutique_type"]) ||
      "online",
  };

  if (businessProfile) {
    // Extract voice vocabulary arrays
    const vocabulary = businessProfile.voice_vocabulary as {
      preferred_terms?: string[];
      avoided_terms?: string[];
    } | null;

    // Extract target customer from ideal_customer_profile
    const idealCustomer = businessProfile.ideal_customer_profile as {
      best_client_description?: string;
    } | null;

    profile.brand_tone = businessProfile.voice_tone || undefined;
    profile.words_to_use = vocabulary?.preferred_terms || [];
    profile.words_to_avoid = vocabulary?.avoided_terms || [];
    profile.target_customer = idealCustomer?.best_client_description || "";
    profile.discount_comfort_level =
      businessProfile.discount_comfort_level as CoachBrandProfileFields["discount_comfort_level"];
    profile.return_policy_summary =
      businessProfile.return_policy_summary || undefined;
    profile.shipping_policy_summary =
      businessProfile.shipping_policy_summary || undefined;
    profile.inventory_size =
      businessProfile.inventory_size as CoachBrandProfileFields["inventory_size"];
    profile.owner_time_constraint =
      businessProfile.owner_time_constraint as CoachBrandProfileFields["owner_time_constraint"];
    profile.primary_goal_this_quarter =
      businessProfile.primary_goal_this_quarter || undefined;
  }

  // Check for missing required fields
  const missingFields: string[] = [];
  for (const field of REQUIRED_PROFILE_FIELDS) {
    // eslint-disable-next-line security/detect-object-injection
    const value = profile[field];
    if (value === undefined || value === null || value === "") {
      missingFields.push(field);
    }
  }

  return {
    profile,
    isComplete: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Update coach-specific brand profile fields
 */
export async function updateBrandProfileFields(
  storeId: string,
  fields: Partial<
    Pick<
      CoachBrandProfileFields,
      | "discount_comfort_level"
      | "return_policy_summary"
      | "shipping_policy_summary"
      | "inventory_size"
      | "owner_time_constraint"
      | "primary_goal_this_quarter"
    >
  >,
): Promise<{ version: number }> {
  // Get or create business profile
  const { data: existing } = await supabaseAdmin
    .from("business_profiles")
    .select("id, coach_profile_version")
    .eq("store_id", storeId)
    .eq("is_current", true)
    .single();

  const newVersion = (existing?.coach_profile_version || 0) + 1;
  const updateData = {
    ...fields,
    coach_profile_version: newVersion,
  };

  if (existing) {
    // Update existing profile
    const { error } = await supabaseAdmin
      .from("business_profiles")
      .update(updateData)
      .eq("id", existing.id);

    if (error) {
      logger.error("Failed to update brand profile fields", error, {
        component: "ai-coach-service",
        storeId,
      });
      throw error;
    }
  } else {
    // Create new profile with coach fields
    const { error } = await supabaseAdmin.from("business_profiles").insert({
      store_id: storeId,
      interview_status: "not_started",
      is_current: true,
      ...updateData,
    });

    if (error) {
      logger.error("Failed to create brand profile with coach fields", error, {
        component: "ai-coach-service",
        storeId,
      });
      throw error;
    }
  }

  logger.info("Updated brand profile fields", {
    component: "ai-coach-service",
    storeId,
    fields: Object.keys(fields),
  });

  return { version: newVersion };
}

/**
 * Get current coach profile version
 */
export async function getCoachProfileVersion(storeId: string): Promise<number> {
  const { data } = await supabaseAdmin
    .from("business_profiles")
    .select("coach_profile_version")
    .eq("store_id", storeId)
    .eq("is_current", true)
    .single();

  return data?.coach_profile_version || 1;
}

// ============================================================================
// Conversations
// ============================================================================

/**
 * Create a new conversation
 */
export async function createConversation(
  storeId: string,
  coachKey: CoachKey,
  title?: string,
): Promise<AICoachConversation> {
  const { data, error } = await supabaseAdmin
    .from("ai_coach_conversations")
    .insert({
      store_id: storeId,
      coach_key: coachKey,
      title: title || null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to create conversation", error, {
      component: "ai-coach-service",
      storeId,
      coachKey,
    });
    throw error;
  }

  return data;
}

/**
 * Get recent conversations for a coach
 * Alias for getConversationsForCoach
 */
export async function getConversationsForCoach(
  storeId: string,
  coachKey: CoachKey,
  limit: number = 10,
): Promise<AICoachConversation[]> {
  return getRecentConversations(storeId, coachKey, limit);
}

/**
 * Get recent conversations for a coach
 */
export async function getRecentConversations(
  storeId: string,
  coachKey: CoachKey,
  limit: number = 10,
): Promise<AICoachConversation[]> {
  const { data, error } = await supabaseAdmin
    .from("ai_coach_conversations")
    .select("*")
    .eq("store_id", storeId)
    .eq("coach_key", coachKey)
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    logger.error("Failed to fetch recent conversations", error, {
      component: "ai-coach-service",
      storeId,
      coachKey,
    });
    throw error;
  }

  return data || [];
}

/**
 * Get a specific conversation
 */
export async function getConversation(
  storeId: string,
  conversationId: string,
): Promise<AICoachConversation | null> {
  const { data, error } = await supabaseAdmin
    .from("ai_coach_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("store_id", storeId) // Ensure ownership
    .single();

  if (error && error.code !== "PGRST116") {
    logger.error("Failed to fetch conversation", error, {
      component: "ai-coach-service",
      storeId,
      conversationId,
    });
    throw error;
  }

  return data;
}

/**
 * Require a conversation exists and belongs to the store
 */
export async function requireConversation(
  storeId: string,
  conversationId: string,
): Promise<AICoachConversation> {
  const conversation = await getConversation(storeId, conversationId);
  if (!conversation) {
    throw new ConversationNotFoundError(conversationId);
  }
  return conversation;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  storeId: string,
  conversationId: string,
  title: string,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("ai_coach_conversations")
    .update({ title })
    .eq("id", conversationId)
    .eq("store_id", storeId);

  if (error) {
    logger.error("Failed to update conversation title", error, {
      component: "ai-coach-service",
      storeId,
      conversationId,
    });
    throw error;
  }
}

/**
 * Get cached conversation summary
 */
export async function getConversationSummary(
  conversationId: string,
): Promise<{ summary: string | null; messageCount: number }> {
  const { data, error } = await supabaseAdmin
    .from("ai_coach_conversations")
    .select("context_summary, summary_message_count")
    .eq("id", conversationId)
    .single();

  if (error) {
    logger.warn("Failed to fetch conversation summary", {
      component: "ai-coach-service",
      conversationId,
      error: error.message,
    });
    return { summary: null, messageCount: 0 };
  }

  return {
    summary: data?.context_summary || null,
    messageCount: data?.summary_message_count || 0,
  };
}

/**
 * Update cached conversation summary
 */
export async function updateConversationSummary(
  conversationId: string,
  summary: string,
  messageCount: number,
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("ai_coach_conversations")
    .update({
      context_summary: summary,
      summary_message_count: messageCount,
      summary_updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (error) {
    logger.error("Failed to update conversation summary", error, {
      component: "ai-coach-service",
      conversationId,
    });
    // Don't throw - summary caching is an optimization, not critical
  }
}

// ============================================================================
// Messages
// ============================================================================

/**
 * Add a message to a conversation
 *
 * For user messages with file attachments:
 * - Store the user's text message in content
 * - Store file metadata (not full content) in file_attachments JSONB
 * - The full file content is sent to OpenAI but NOT stored in history
 */
export async function addMessage(
  conversationId: string,
  role: AICoachMessage["role"],
  content: string,
  options?: {
    toolName?: string;
    toolPayload?: Record<string, unknown>;
    tokensUsed?: number;
    fileAttachments?: StoredFileMetadata[];
  },
): Promise<AICoachMessage> {
  const { data, error } = await supabaseAdmin
    .from("ai_coach_messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      tool_name: options?.toolName || null,
      tool_payload: options?.toolPayload || null,
      tokens_used: options?.tokensUsed || null,
      file_attachments: options?.fileAttachments || null,
    })
    .select()
    .single();

  if (error) {
    logger.error("Failed to add message", error, {
      component: "ai-coach-service",
      conversationId,
      role,
    });
    throw error;
  }

  return data;
}

/**
 * Get all messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
): Promise<AICoachMessage[]> {
  const { data, error } = await supabaseAdmin
    .from("ai_coach_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    logger.error("Failed to fetch messages", error, {
      component: "ai-coach-service",
      conversationId,
    });
    throw error;
  }

  return data || [];
}

// ============================================================================
// Builder Pack
// ============================================================================

/**
 * Get or create builder pack for a store
 */
export async function getBuilderPack(
  storeId: string,
  profileVersion: number,
  templateVersion: number,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("ai_builder_packs")
    .select("pack_md")
    .eq("store_id", storeId)
    .eq("profile_version", profileVersion)
    .eq("template_version", templateVersion)
    .single();

  return data?.pack_md || null;
}

/**
 * Save builder pack
 */
export async function saveBuilderPack(
  storeId: string,
  profileVersion: number,
  templateVersion: number,
  packMd: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from("ai_builder_packs").upsert(
    {
      store_id: storeId,
      profile_version: profileVersion,
      template_version: templateVersion,
      pack_md: packMd,
    },
    {
      onConflict: "store_id,profile_version,template_version",
    },
  );

  if (error) {
    logger.error("Failed to save builder pack", error, {
      component: "ai-coach-service",
      storeId,
    });
    throw error;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get coaches list with render status for a store
 */
export async function getCoachesForStore(storeId: string): Promise<{
  coaches: Array<{
    coach_key: CoachKey;
    name: string;
    is_rendered: boolean;
    conversation_starters: string[];
    instructions_md: string;
    last_conversation_at: string | null;
  }>;
  profileComplete: boolean;
  missingFields: string[];
}> {
  // Get templates, instances, and recent conversations in parallel
  const [
    templates,
    instances,
    { profile: _profile, isComplete, missingFields },
  ] = await Promise.all([
    getCoachTemplates(),
    getCoachInstancesForStore(storeId),
    getBrandProfileFields(storeId),
  ]);

  // Get last conversation for each coach
  const { data: lastConversations } = await supabaseAdmin
    .from("ai_coach_conversations")
    .select("coach_key, updated_at")
    .eq("store_id", storeId)
    .order("updated_at", { ascending: false });

  const lastConversationMap = new Map<string, string>();
  for (const conv of lastConversations || []) {
    if (!lastConversationMap.has(conv.coach_key)) {
      lastConversationMap.set(conv.coach_key, conv.updated_at);
    }
  }

  // Build instances map
  const instanceMap = new Map<string, AICoachInstance>();
  for (const instance of instances) {
    instanceMap.set(instance.coach_key, instance);
  }

  // Build response
  const coaches = templates.map((template) => {
    const instance = instanceMap.get(template.coach_key);
    return {
      coach_key: template.coach_key as CoachKey,
      name: template.name,
      is_rendered: !!instance,
      conversation_starters: instance
        ? instance.rendered_conversation_starters
        : template.conversation_starters_template,
      instructions_md: instance
        ? instance.rendered_instructions_md
        : template.instructions_md_template,
      last_conversation_at: lastConversationMap.get(template.coach_key) || null,
    };
  });

  return {
    coaches,
    profileComplete: isComplete,
    missingFields,
  };
}
