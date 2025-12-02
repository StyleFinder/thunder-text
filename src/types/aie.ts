export type AiePlatform = 'meta' | 'instagram' | 'google' | 'tiktok' | 'pinterest';
export type AieGoal = 'awareness' | 'engagement' | 'conversion' | 'traffic' | 'app_installs';
export type AieSourceType = 'public' | 'expert' | 'internal';
export type AieFormat = 'static' | 'carousel' | 'video';
export type AiePerformanceTag = 'high' | 'avg' | 'low';
export type AieExampleSource = 'public' | 'anonymized_internal';
export type AieRequestStatus = 'pending' | 'generated' | 'approved' | 'published';
export type AieVariantType = 'emotional' | 'benefit' | 'ugc';

// Ad Length Selection Types
export type AdLengthMode = 'AUTO' | 'SHORT' | 'MEDIUM' | 'LONG';
export type AdLengthOption = 'SHORT' | 'MEDIUM' | 'LONG';
export type CampaignType = 'AWARENESS' | 'REACH' | 'TRAFFIC' | 'SALES' | 'CONVERSIONS' | 'RETARGETING' | 'LEADS';
export type AudienceTemperature = 'COLD' | 'WARM' | 'HOT';
export type ProductComplexity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AdLengthInput {
    campaign_type: CampaignType;
    audience_temperature: AudienceTemperature;
    price?: number;
    product_complexity: ProductComplexity;
    has_strong_story: boolean;
    is_premium_brand: boolean;
}

export interface AdLengthRules {
    version: number;
    defaults: {
        ad_length_mode: AdLengthMode;
        campaign_type: CampaignType;
        audience_temperature: AudienceTemperature;
        product_complexity: ProductComplexity;
        has_strong_story: boolean;
        is_premium_brand: boolean;
    };
    length_options: AdLengthOption[];
    scoring: {
        campaign_type: Array<{
            match: CampaignType[];
            weights: Record<AdLengthOption, number>;
        }>;
        audience_temperature: Array<{
            match: AudienceTemperature[];
            weights: Record<AdLengthOption, number>;
        }>;
        price: {
            rules: Array<{
                min: number;
                max: number | null;
                weights: Record<AdLengthOption, number>;
            }>;
        };
        product_complexity: Array<{
            match: ProductComplexity[];
            weights: Record<AdLengthOption, number>;
        }>;
        has_strong_story: {
            true: Record<AdLengthOption, number>;
            false: Record<AdLengthOption, number>;
        };
        is_premium_brand: {
            true: Record<AdLengthOption, number>;
            false: Record<AdLengthOption, number>;
        };
    };
    tie_breaker: {
        primary_preference: AdLengthOption;
        cold_audience_preference_order: AdLengthOption[];
        hot_audience_preference_order: AdLengthOption[];
    };
}

export interface BestPractice {
    id: string;
    title: string;
    platform: AiePlatform;
    category: string;
    goal: AieGoal;
    description: string;
    example_text?: string;
    source_type: AieSourceType;
    source_url?: string;
    embedding?: number[];
    created_at: string;
    updated_at: string;
}

export interface AdExample {
    id: string;
    platform: AiePlatform;
    format: AieFormat;
    category: string;
    primary_text?: string;
    headline?: string;
    cta?: string;
    performance_metrics: {
        ctr?: number;
        roas?: number;
        conversions?: number;
        spend?: number;
        impressions?: number;
    };
    performance_tag?: AiePerformanceTag;
    source: AieExampleSource;
    embedding?: number[];
    image_url?: string;
    created_at: string;
    updated_at: string;
}

export interface AdRequest {
    id: string;
    shop_id?: string;
    product_id?: string;
    platform: AiePlatform;
    goal: AieGoal;
    description?: string;
    image_url?: string;
    status: AieRequestStatus;
    created_at: string;
    updated_at: string;
}

export interface AdVariant {
    id: string;
    ad_request_id: string;
    variant_type: AieVariantType;
    headline?: string;
    primary_text?: string;
    description?: string; // 20-30 chars: price, shipping, guarantee
    selected_length?: AdLengthOption; // AUTO-selected or manually chosen ad length
    predicted_score?: number;
    is_selected: boolean;
    created_at: string;
}

export interface AdPerformance {
    id: string;
    ad_variant_id: string;
    impressions: number;
    clicks: number;
    conversions: number;
    spend: number;
    roas: number;
    cpc: number;
    cpa: number;
    updated_at: string;
}

export interface ResearchContext {
    bestPractices: BestPractice[];
    adExamples: AdExample[];
    marketInsights?: string[];
    brandVoice?: BrandVoiceContext;
}

// Brand voice context extracted from BusinessProfile
export interface BrandVoiceContext {
    // Voice characteristics
    tone: string | null;
    style: string | null;
    personality: string | null;

    // Vocabulary guidelines
    preferredTerms: string[];
    avoidedTerms: string[];
    signaturePhrases: string[];

    // Brand identity
    coreValues: string[];
    desiredReputation: string | null;
    communicationApproach: string | null;

    // Target audience insights
    idealCustomerDescription: string | null;
    customerPainPoints: string[];
    customerDesiredOutcomes: string[];

    // AI instructions (pre-generated guidance)
    aiEngineInstructions: string | null;

    // Master profile summary
    profileSummary: string | null;
}
