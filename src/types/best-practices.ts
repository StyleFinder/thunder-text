import { AiePlatform, AieGoal, AieSourceType } from './aie';

// ============================================================================
// AGENT WORKFLOW TYPES
// ============================================================================

export type ContentSourceType = 'file' | 'url' | 'text';

export type FileFormat =
  | 'pdf'
  | 'audio'
  | 'video'
  | 'image'
  | 'text'
  | 'markdown'
  | 'json';

export type AgentStatus = 'pending' | 'running' | 'completed' | 'failed';

export type DiscoverySource =
  | 'meta-blueprint'
  | 'google-ads-help'
  | 'tiktok-business'
  | 'pinterest-ads'
  | 'youtube-channel'
  | 'industry-blog'
  | 'manual-upload';

// ============================================================================
// AGENT INPUT/OUTPUT INTERFACES
// ============================================================================

export interface ProcessBestPracticeRequest {
  source_type: ContentSourceType;
  platform?: AiePlatform | 'multi';
  category?: string;
  goal?: AieGoal;

  // Source-specific fields
  file?: File;
  url?: string;
  text?: string;
  title?: string;
  description?: string;

  // Metadata
  source_name?: string;
  source_url?: string;
  tags?: string[];
  priority_override?: number;

  // Processing options
  skip_quality_check?: boolean;
  skip_duplicate_check?: boolean;
}

export interface ProcessBestPracticeResponse {
  success: boolean;
  best_practice_id?: string;
  metadata: BestPracticeMetadata;
  warnings?: string[];
  errors?: string[];
}

export interface BestPracticeMetadata {
  title: string;
  platform: AiePlatform | 'multi';
  category: string;
  goal: AieGoal;
  description: string;
  quality_score: number;
  priority_score: number;
  extracted_insights: string[];
  tags: string[];
  example_quotes?: string[];
  source_author?: string;
  source_date?: string;
}

export interface DiscoverBestPracticesRequest {
  sources: DiscoverySource[] | ['all'];
  since?: string; // ISO date
  limit?: number;
  platforms?: AiePlatform[];
  categories?: string[];
}

export interface DiscoverBestPracticesResponse {
  discovered: number;
  processed: number;
  inserted: number;
  failed: number;
  skipped_duplicates: number;
  results: Array<{
    url: string;
    title: string;
    status: 'success' | 'failed' | 'duplicate' | 'low-quality';
    best_practice_id?: string;
    error?: string;
  }>;
}

// ============================================================================
// AGENT PIPELINE INTERFACES
// ============================================================================

export interface AgentContext {
  request_id: string;
  source_type: ContentSourceType;
  original_input: ProcessBestPracticeRequest;
  stage: 'extraction' | 'analysis' | 'quality' | 'storage';
  metadata: Record<string, any>;
  warnings: string[];
  errors: string[];
}

export interface ContentExtractionResult {
  extracted_text: string;
  file_format?: FileFormat;
  word_count: number;
  has_images: boolean;
  has_tables: boolean;
  raw_metadata?: Record<string, any>;
  extraction_method: 'whisper' | 'pdf-parse' | 'html-parse' | 'direct';
  confidence_score: number;
}

export interface AnalysisResult {
  title: string;
  platform: AiePlatform | 'multi';
  category: string;
  goal: AieGoal;
  description: string;
  key_insights: string[];
  tags: string[];
  example_quotes: string[];
  actionable_takeaways: string[];
  target_audience?: string;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
}

export interface QualityAssessment {
  overall_score: number; // 0-10
  is_approved: boolean;
  scores: {
    relevance: number; // 0-10
    actionability: number; // 0-10
    accuracy: number; // 0-10
    completeness: number; // 0-10
    uniqueness: number; // 0-10
  };
  issues: Array<{
    severity: 'critical' | 'warning' | 'info';
    type: 'outdated' | 'bias' | 'duplicate' | 'incomplete' | 'promotional';
    message: string;
  }>;
  recommendations: string[];
  duplicate_of?: string; // best_practice_id if duplicate found
  duplicate_similarity?: number; // 0-1
}

export interface StorageResult {
  best_practice_id: string;
  embedding_generated: boolean;
  inserted: boolean;
  updated_existing: boolean;
  vector_indexed: boolean;
}

// ============================================================================
// AGENT CONFIGURATION
// ============================================================================

export interface AgentConfig {
  // OpenAI Models
  analysis_model: string;
  quality_model: string;
  embedding_model: string;

  // Content Extraction
  max_file_size_mb: number;
  supported_audio_formats: string[];
  supported_document_formats: string[];

  // Quality Thresholds
  min_quality_score: number;
  min_content_length: number;
  max_duplicate_similarity: number;

  // Processing Options
  enable_duplicate_check: boolean;
  enable_quality_validation: boolean;
  auto_approve_high_quality: boolean;
  high_quality_threshold: number;

  // Rate Limiting
  max_concurrent_requests: number;
  rate_limit_per_minute: number;
}

// ============================================================================
// BEST PRACTICE DATABASE MODEL
// ============================================================================

export interface BestPractice {
  id: string;
  title: string;
  platform: AiePlatform | 'multi';
  category: string;
  goal: AieGoal;
  description: string;
  example_text?: string;
  source_type: AieSourceType;
  source_url?: string;
  embedding?: number[];
  metadata?: BestPracticeMetadataDB;
  quality_score?: number;
  priority_score?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BestPracticeMetadataDB {
  tags: string[];
  key_insights: string[];
  original_filename?: string;
  transcription?: string;
  extracted_by: 'manual' | 'automated';
  source_author?: string;
  source_date?: string;
  last_validated?: string;
  duplicate_check_hash?: string;
  extraction_metadata?: {
    method: string;
    confidence: number;
    word_count: number;
  };
  analysis_metadata?: {
    model: string;
    temperature: number;
    timestamp: string;
  };
  quality_metadata?: {
    reviewer: 'ai' | 'human';
    scores: QualityAssessment['scores'];
    issues: QualityAssessment['issues'];
    last_review_date: string;
  };
}

// ============================================================================
// DISCOVERY AGENT TYPES
// ============================================================================

export interface DiscoverySourceConfig {
  name: DiscoverySource;
  enabled: boolean;
  url?: string;
  type: 'rss' | 'api' | 'scrape';
  refresh_interval_hours: number;
  last_checked?: string;
  credentials?: Record<string, string>;
}

export interface DiscoveredContent {
  source: DiscoverySource;
  url: string;
  title: string;
  published_date?: string;
  author?: string;
  summary?: string;
  raw_content?: string;
  platform?: AiePlatform;
  category?: string;
  discovered_at: string;
}

// ============================================================================
// WORKFLOW ORCHESTRATOR TYPES
// ============================================================================

export interface WorkflowState {
  request_id: string;
  status: AgentStatus;
  current_stage: 'extraction' | 'analysis' | 'quality' | 'storage' | 'completed';
  progress_percentage: number;
  started_at: string;
  completed_at?: string;
  result?: ProcessBestPracticeResponse;
  context: AgentContext;
}

export interface WorkflowStep {
  name: string;
  agent: 'extraction' | 'analysis' | 'quality' | 'storage';
  status: AgentStatus;
  started_at?: string;
  completed_at?: string;
  duration_ms?: number;
  error?: string;
}
