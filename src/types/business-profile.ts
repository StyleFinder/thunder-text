// Business Profile Interview System TypeScript Types
// Generated: 2025-10-28

// ============================================================================
// Database Model Types
// ============================================================================

export interface InterviewPrompt {
  id: string;
  prompt_key: string;
  category: string;
  question_number: number;
  question_text: string;
  display_order: number;
  is_required: boolean;
  min_words: number;
  suggested_words: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type InterviewStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "regenerating";

export interface BusinessProfile {
  id: string;
  store_id: string;

  // Interview Progress
  interview_status: InterviewStatus;
  current_question_number: number;
  questions_completed: number;
  total_questions: number;

  // AI-Generated Master Profile (stored as JSON)
  master_profile_text: string | null;
  profile_summary: string | null;

  // Individual AI-Generated Documents (stored as separate columns)
  market_research: string | null;
  ideal_customer_avatar: string | null;
  pain_point_strategy: string | null;
  mission_vision_values: string | null;
  positioning_statement: string | null;
  ai_engine_instructions: string | null;

  // Structured Profile Components (optional parsed data)
  business_foundation: BusinessFoundation | null;
  market_positioning: MarketPositioning | null;
  ideal_customer_profile: IdealCustomerProfile | null;
  customer_challenges: CustomerChallenges | null;
  business_model: BusinessModel | null;
  brand_identity: BrandIdentity | null;
  strategic_vision: StrategicVision | null;

  // Voice Guidelines
  voice_tone: string | null;
  voice_style: string | null;
  voice_vocabulary: VoiceVocabulary | null;
  voice_personality: string | null;

  // Versioning
  profile_version: number;
  is_current: boolean;

  // Generation Metadata
  tokens_used: number | null;
  generation_time_ms: number | null;
  generation_tokens_used: number | null;

  // Timestamps
  interview_started_at: string | null;
  interview_completed_at: string | null;
  profile_generated_at: string | null;
  last_generated_at: string | null;
  last_edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessProfileResponse {
  id: string;
  business_profile_id: string;
  prompt_key: string;
  question_number: number;
  response_text: string;
  word_count: number;
  character_count: number;
  response_order: number;
  response_version: number;
  is_current: boolean;
  original_response: string | null;
  edited_count: number;
  first_answered_at: string;
  last_edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfileGenerationHistory {
  id: string;
  business_profile_id: string;
  profile_version: number;
  master_profile_text: string;
  generation_prompt: string | null;
  model_used: string | null;
  tokens_used: number | null;
  generation_time_ms: number | null;
  profile_word_count: number | null;
  validation_passed: boolean | null;
  validation_issues: string[] | null;
  generated_at: string;
}

// ============================================================================
// Structured Profile Component Types
// ============================================================================

export interface BusinessFoundation {
  story: string;
  description: string;
  client_results: string;
  founding_insight: string;
  pivotal_moments: string[];
  core_offering: string;
}

export interface MarketPositioning {
  direct_competitors: string[];
  indirect_competitors: string[];
  unique_differentiation: string;
  industry_trends: string[];
  customer_journey_before: string;
  failed_solutions: string[];
}

export interface IdealCustomerProfile {
  best_client_description: string;
  industry: string;
  company_size: string;
  role: string;
  personality_traits: string[];
  anti_customer_traits: string[];
  deep_pain_points: string[];
  desired_outcomes: string[];
  buying_behavior: BuyingBehavior;
}

export interface BuyingBehavior {
  research_channels: string[];
  decision_timeline: string;
  key_influencers: string[];
  purchase_triggers: string[];
}

export interface CustomerChallenges {
  hidden_problems: string[];
  common_objections: string[];
  misconceptions: string[];
  frequently_asked_questions: FAQ[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export interface BusinessModel {
  lead_generation_channels: LeadChannel[];
  pricing_structure: PricingModel[];
  most_profitable_offerings: string[];
  growth_bottlenecks: string[];
  growth_opportunities: string[];
}

export interface LeadChannel {
  channel: string;
  percentage: number;
  effectiveness: "high" | "medium" | "low";
}

export interface PricingModel {
  offering: string;
  pricing_type: "hourly" | "project" | "retainer" | "subscription" | "other";
  price_range: string;
  profit_margin: "high" | "medium" | "low";
  effort_level: "high" | "medium" | "low";
}

export interface BrandIdentity {
  desired_reputation: string;
  communication_style: CommunicationStyle;
  core_values: string[];
  core_beliefs: string[];
  industry_opinions: string[];
  non_negotiables: string[];
}

export interface CommunicationStyle {
  tone: string[];
  formality: "formal" | "business_casual" | "casual" | "conversational";
  humor_level: "none" | "light" | "moderate" | "heavy";
  approach: string;
}

export interface StrategicVision {
  three_to_five_year_vision: string;
  desired_impact: string[];
  legacy_goals: string[];
  success_metrics: string[];
}

export interface VoiceVocabulary {
  preferred_terms: string[];
  avoided_terms: string[];
  signature_phrases: string[];
  industry_jargon_usage: "heavy" | "moderate" | "minimal" | "none";
}

// ============================================================================
// API Request Types
// ============================================================================

// POST /api/business-profile/start
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface StartInterviewRequest {
  // No body - uses authenticated store
}

// POST /api/business-profile/answer
export interface SubmitAnswerRequest {
  prompt_key: string;
  question_number: number;
  response_text: string;
}

// PATCH /api/business-profile/response/:id
export interface UpdateResponseRequest {
  response_text: string;
}

// POST /api/business-profile/generate
export interface GenerateProfileRequest {
  // No body - uses current responses
  regenerate?: boolean; // Force regeneration even if profile exists
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

// GET /api/business-profile
export interface GetBusinessProfileResponse {
  profile: BusinessProfile | null;
  responses: BusinessProfileResponse[];
  progress: ProfileProgress;
}

export interface ProfileProgress {
  current_question: number;
  total_questions: number;
  percentage_complete: number;
  is_complete: boolean;
  next_prompt: InterviewPrompt | null;
}

// POST /api/business-profile/start
export interface StartInterviewResponse {
  profile: BusinessProfile;
  first_prompt: InterviewPrompt;
}

// POST /api/business-profile/answer
export interface SubmitAnswerResponse {
  response: BusinessProfileResponse;
  progress: ProfileProgress;
  next_prompt: InterviewPrompt | null;
  interview_complete: boolean;
}

// GET /api/business-profile/prompts
export interface GetPromptsResponse {
  prompts: InterviewPrompt[];
  total_count: number;
  categories: string[];
}

// POST /api/business-profile/generate
export interface GenerateProfileResponse {
  profile: BusinessProfile;
  generation_time_ms: number;
  tokens_used: number;
  validation_passed: boolean;
  validation_issues: string[];
}

// GET /api/business-profile/history
export interface GetProfileHistoryResponse {
  history: ProfileGenerationHistory[];
  current_version: number;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface ChatMessage {
  id: string;
  type: "ai" | "user" | "system";
  content: string;
  timestamp: Date;
  prompt_key?: string;
  question_number?: number;
}

export interface InterviewState {
  status: InterviewStatus;
  currentPrompt: InterviewPrompt | null;
  currentQuestion: number;
  totalQuestions: number;
  responses: Map<string, string>;
  chatHistory: ChatMessage[];
  isSubmitting: boolean;
  error: string | null;
}

// ============================================================================
// Error Types
// ============================================================================

export class BusinessProfileError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
  ) {
    super(message);
    this.name = "BusinessProfileError";
  }
}

export class InsufficientResponseError extends BusinessProfileError {
  constructor(wordCount: number, minWords: number) {
    super(
      `Response too short: ${wordCount} words (minimum ${minWords} required)`,
      "INSUFFICIENT_RESPONSE",
      400,
    );
  }
}

export class InterviewNotCompleteError extends BusinessProfileError {
  constructor(questionsCompleted: number, totalQuestions: number) {
    super(
      `Interview incomplete: ${questionsCompleted}/${totalQuestions} questions answered`,
      "INTERVIEW_INCOMPLETE",
      400,
    );
  }
}

export class ProfileAlreadyExistsError extends BusinessProfileError {
  constructor() {
    super(
      "Business profile already exists. Use regenerate=true to create new version.",
      "PROFILE_EXISTS",
      409,
    );
  }
}

// ============================================================================
// Utility Types
// ============================================================================

// Map of all prompt keys to their response types
export type ResponseMap = {
  [K in InterviewPromptKey]: string;
};

export type InterviewPromptKey =
  | "business_story"
  | "business_description"
  | "client_results"
  | "competitors_differentiation"
  | "industry_trends"
  | "customer_journey"
  | "ideal_customer"
  | "anti_customer"
  | "customer_pain_points"
  | "customer_desired_outcome"
  | "customer_buying_behavior"
  | "hidden_problems"
  | "objections_concerns"
  | "frequent_questions"
  | "lead_generation"
  | "pricing_profitability"
  | "growth_strategy"
  | "brand_reputation"
  | "communication_style"
  | "values_beliefs"
  | "future_vision";

export type InterviewCategory =
  | "Business Foundation & Identity"
  | "Market Understanding & Competition"
  | "Ideal Customer Deep Dive"
  | "Customer Challenges & Solutions"
  | "Business Model & Growth"
  | "Brand & Communication"
  | "Strategic Vision";
