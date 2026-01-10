// AI Coaches System TypeScript Types
// Generated: 2025-12-29

// ============================================================================
// Coach Keys & Enums
// ============================================================================

export const COACH_KEYS = [
  "owner_coach",
  "inventory_coach",
  "ops_coach",
  "cs_coach",
  "promo_coach",
] as const;

export type CoachKey = (typeof COACH_KEYS)[number];

export type MessageRole = "user" | "assistant" | "tool";

export type DiscountComfortLevel = "low" | "moderate" | "aggressive";
export type InventorySize = "small" | "medium" | "large";
export type OwnerTimeConstraint = "very_limited" | "moderate" | "flexible";
export type BoutiqueType = "online" | "brick" | "hybrid";
export type PricePositioning = "budget" | "mid" | "premium";

// ============================================================================
// Database Model Types
// ============================================================================

export interface AICoachTemplate {
  id: string;
  coach_key: CoachKey;
  name: string;
  system_prompt_template: string;
  conversation_starters_template: string[];
  instructions_md_template: string;
  version: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AICoachInstance {
  id: string;
  store_id: string; // References shops.id
  coach_key: CoachKey;
  template_version: number;
  profile_version: number;
  rendered_system_prompt: string;
  rendered_conversation_starters: string[];
  rendered_instructions_md: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AICoachConversation {
  id: string;
  store_id: string; // References shops.id
  coach_key: CoachKey;
  title: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

/**
 * Stored file metadata (without content) for message history
 */
export interface StoredFileAttachment {
  id: string;
  name: string;
  category: string;
  size: number;
  url?: string;
}

export interface AICoachMessage {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  tool_name: string | null;
  tool_payload: Record<string, unknown> | null;
  tokens_used: number | null;
  file_attachments: StoredFileAttachment[] | null; // File metadata (not content)
  created_at: string;
}

export interface AIBuilderPack {
  id: string;
  store_id: string; // References shops.id
  profile_version: number;
  template_version: number;
  pack_md: string;
  created_at: string;
}

// ============================================================================
// Coach Brand Profile (extends business_profiles)
// ============================================================================

export interface CoachBrandProfileFields {
  // Existing fields in business_profiles (read from voice_*, etc.)
  boutique_name: string; // Derived from shops or business_profiles
  boutique_type: BoutiqueType; // From shops.store_type
  target_customer: string; // From business_profiles.ideal_customer_profile
  price_positioning: PricePositioning;
  brand_tone: string; // From business_profiles.voice_tone
  words_to_use: string[]; // From business_profiles.voice_vocabulary
  words_to_avoid: string[]; // From business_profiles.voice_vocabulary

  // New coach-specific fields (added to business_profiles)
  discount_comfort_level: DiscountComfortLevel;
  return_policy_summary: string;
  shipping_policy_summary: string;
  inventory_size: InventorySize;
  owner_time_constraint: OwnerTimeConstraint;
  primary_goal_this_quarter: string;
}

// Template rendering context (all uppercase for Mustache)
export interface CoachRenderContext {
  BOUTIQUE_NAME: string;
  BOUTIQUE_TYPE: string;
  TARGET_CUSTOMER: string;
  PRICE_POSITIONING: string;
  BRAND_TONE: string;
  WORDS_TO_USE_CSV: string;
  WORDS_TO_AVOID_CSV: string;
  DISCOUNT_COMFORT_LEVEL: string;
  RETURN_POLICY_SUMMARY: string;
  SHIPPING_POLICY_SUMMARY: string;
  INVENTORY_SIZE: string;
  OWNER_TIME_CONSTRAINT: string;
  PRIMARY_GOAL_THIS_QUARTER: string;
}

// ============================================================================
// API Request Types
// ============================================================================

// GET /api/ai-coaches (no request body)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListCoachesRequest {}

// POST /api/ai-coaches/[coachKey]/chat
export interface ChatRequest {
  conversationId?: string;
  message: string;
  metadata?: {
    uiMode: "chat" | "quick_action";
    source: "web" | "mobile";
  };
}

// GET/PATCH /api/ai-coaches/brand-profile
export interface UpdateBrandProfileRequest {
  discount_comfort_level?: DiscountComfortLevel;
  return_policy_summary?: string;
  shipping_policy_summary?: string;
  inventory_size?: InventorySize;
  owner_time_constraint?: OwnerTimeConstraint;
  primary_goal_this_quarter?: string;
}

// POST /api/ai-coaches/render
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface RenderCoachesRequest {
  // No body - uses current profile data
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// GET /api/ai-coaches
export interface ListCoachesResponse {
  coaches: CoachListItem[];
  profile_complete: boolean;
  missing_fields?: string[];
}

export interface CoachListItem {
  coach_key: CoachKey;
  name: string;
  is_rendered: boolean;
  conversation_starters: string[];
  instructions_md?: string;
  last_conversation_at?: string | null;
}

// GET /api/ai-coaches/[coachKey]
export interface GetCoachResponse {
  coach: AICoachInstance;
  template: AICoachTemplate;
  recent_conversations: AICoachConversation[];
}

// POST /api/ai-coaches/[coachKey]/chat
export interface ChatResponse {
  conversationId: string;
  assistantMessage: string;
  toolEvents: ToolEvent[];
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export interface ToolEvent {
  tool_name: string;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
}

// GET /api/ai-coaches/brand-profile
export interface GetBrandProfileResponse {
  profile: CoachBrandProfileFields | null;
  is_complete: boolean;
  missing_fields: string[];
  coach_profile_version: number;
}

// POST /api/ai-coaches/render
export interface RenderCoachesResponse {
  rendered_count: number;
  coaches: Array<{
    coach_key: CoachKey;
    template_version: number;
    profile_version: number;
  }>;
}

// GET /api/ai-coaches/builder-pack
export interface BuilderPackResponse {
  pack_md: string;
  filename: string;
  profile_version: number;
  template_version: number;
}

// GET /api/ai-coaches/[coachKey]/conversations
export interface ListConversationsResponse {
  conversations: AICoachConversation[];
  total_count: number;
}

// GET /api/ai-coaches/[coachKey]/conversations/[conversationId]
export interface GetConversationResponse {
  conversation: AICoachConversation;
  messages: AICoachMessage[];
}

// ============================================================================
// UI State Types
// ============================================================================

export interface CoachChatState {
  coach_key: CoachKey;
  conversationId: string | null;
  messages: ChatDisplayMessage[];
  isLoading: boolean;
  error: string | null;
}

export interface ChatDisplayMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  toolEvents?: ToolEvent[];
}

export interface CoachDashboardState {
  coaches: CoachListItem[];
  profileComplete: boolean;
  missingFields: string[];
  isLoading: boolean;
  error: string | null;
}

// ============================================================================
// Error Types
// ============================================================================

export class AICoachError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "AICoachError";
  }
}

export class ProfileIncompleteError extends AICoachError {
  constructor(missingFields: string[]) {
    super(
      `Coach profile incomplete. Missing: ${missingFields.join(", ")}`,
      "PROFILE_INCOMPLETE",
      400,
    );
  }
}

export class CoachNotFoundError extends AICoachError {
  constructor(coachKey: string) {
    super(`Coach not found: ${coachKey}`, "COACH_NOT_FOUND", 404);
  }
}

export class CoachNotRenderedError extends AICoachError {
  constructor(coachKey: string) {
    super(
      `Coach not yet rendered for this store: ${coachKey}. Complete your brand profile first.`,
      "COACH_NOT_RENDERED",
      400,
    );
  }
}

export class ConversationNotFoundError extends AICoachError {
  constructor(conversationId: string) {
    super(
      `Conversation not found: ${conversationId}`,
      "CONVERSATION_NOT_FOUND",
      404,
    );
  }
}

export class PremiumRequiredError extends AICoachError {
  constructor() {
    super(
      "AI Coaches require a Pro plan. Please upgrade to access this feature.",
      "PREMIUM_REQUIRED",
      403,
    );
  }
}

// ============================================================================
// Utility Types
// ============================================================================

// Coach metadata for display
// icon field corresponds to Lucide icon component names
export const COACH_METADATA: Record<
  CoachKey,
  { name: string; icon: string; description: string }
> = {
  owner_coach: {
    name: "Boutique Owner Coach",
    icon: "Briefcase",
    description: "Daily reset, decision support, focus clarity",
  },
  promo_coach: {
    name: "Promotion Coach",
    icon: "Target",
    description: "Campaign planning, margin protection, promo strategy",
  },
  inventory_coach: {
    name: "Inventory Coach",
    icon: "Package",
    description: "Restock decisions, markdown plans, exit strategies",
  },
  cs_coach: {
    name: "Customer Service Coach",
    icon: "MessageCircle",
    description: "Draft replies, policy-safe responses, on-brand messaging",
  },
  ops_coach: {
    name: "Operations Coach",
    icon: "ClipboardList",
    description: "Weekly planning, daily focus, prioritization",
  },
};

// Required fields for coach rendering
export const REQUIRED_PROFILE_FIELDS: (keyof CoachBrandProfileFields)[] = [
  "boutique_name",
  "boutique_type",
  "brand_tone",
  "discount_comfort_level",
  "owner_time_constraint",
];

// Optional but recommended fields
export const RECOMMENDED_PROFILE_FIELDS: (keyof CoachBrandProfileFields)[] = [
  "target_customer",
  "price_positioning",
  "words_to_use",
  "words_to_avoid",
  "return_policy_summary",
  "shipping_policy_summary",
  "inventory_size",
  "primary_goal_this_quarter",
];

// Premium plans that have access to AI Coaches
// Note: Database constraint allows 'free', 'starter', 'pro'
export const COACH_ELIGIBLE_PLANS = ["pro"] as const;

export type CoachEligiblePlan = (typeof COACH_ELIGIBLE_PLANS)[number];

// ============================================================================
// File Upload Types
// ============================================================================

// Supported file types for coach chat uploads
export const SUPPORTED_FILE_TYPES = {
  // Documents
  "application/pdf": {
    extension: ".pdf",
    category: "document",
    maxSize: 10 * 1024 * 1024,
  }, // 10MB
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    extension: ".docx",
    category: "document",
    maxSize: 10 * 1024 * 1024,
  }, // Word
  "application/msword": {
    extension: ".doc",
    category: "document",
    maxSize: 10 * 1024 * 1024,
  }, // Word (legacy)
  "application/vnd.google-apps.document": {
    extension: ".gdoc",
    category: "document",
    maxSize: 10 * 1024 * 1024,
  }, // Google Docs
  // Spreadsheets
  "text/csv": {
    extension: ".csv",
    category: "spreadsheet",
    maxSize: 5 * 1024 * 1024,
  }, // 5MB
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    extension: ".xlsx",
    category: "spreadsheet",
    maxSize: 10 * 1024 * 1024,
  },
  "application/vnd.ms-excel": {
    extension: ".xls",
    category: "spreadsheet",
    maxSize: 10 * 1024 * 1024,
  },
  "application/vnd.google-apps.spreadsheet": {
    extension: ".gsheet",
    category: "spreadsheet",
    maxSize: 10 * 1024 * 1024,
  }, // Google Sheets
  // Images
  "image/png": {
    extension: ".png",
    category: "image",
    maxSize: 5 * 1024 * 1024,
  },
  "image/jpeg": {
    extension: ".jpeg",
    category: "image",
    maxSize: 5 * 1024 * 1024,
  },
  "image/webp": {
    extension: ".webp",
    category: "image",
    maxSize: 5 * 1024 * 1024,
  },
  // Text
  "text/plain": {
    extension: ".txt",
    category: "text",
    maxSize: 1 * 1024 * 1024,
  }, // 1MB
  "text/markdown": {
    extension: ".md",
    category: "text",
    maxSize: 1 * 1024 * 1024,
  },
} as const;

export type SupportedMimeType = keyof typeof SUPPORTED_FILE_TYPES;
export type FileCategory = "document" | "spreadsheet" | "image" | "text";

export const ACCEPTED_FILE_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".doc",
  ".gdoc", // Documents
  ".csv",
  ".xlsx",
  ".xls",
  ".gsheet", // Spreadsheets
  ".png",
  ".jpg",
  ".jpeg",
  ".webp", // Images
  ".txt",
  ".md", // Text
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB max
export const MAX_FILES_PER_MESSAGE = 5;

export interface FileAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: SupportedMimeType;
  category: FileCategory;
  url?: string; // Supabase storage URL
  extractedText?: string; // For documents/spreadsheets
  previewUrl?: string; // For images
}

export interface UploadedFile {
  file: File;
  id: string;
  name: string;
  size: number;
  mimeType: string;
  status: "pending" | "uploading" | "processing" | "ready" | "error";
  progress: number;
  error?: string;
  attachment?: FileAttachment;
}

// Updated ChatRequest with file attachments
export interface ChatRequestWithFiles extends ChatRequest {
  attachments?: FileAttachment[];
}

// Updated ChatDisplayMessage with attachments
export interface ChatDisplayMessageWithFiles extends ChatDisplayMessage {
  attachments?: FileAttachment[];
}
