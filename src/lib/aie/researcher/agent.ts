import { supabaseAdmin } from '@/lib/supabase';
import { generateEmbedding } from '../clients';
import { logger } from '@/lib/logger'
import {
    AiePlatform,
    AieGoal,
    BestPractice,
    AdExample,
    ResearchContext,
    BrandVoiceContext
} from '../../../types/aie';

export class ResearcherAgent {
    private supabase = supabaseAdmin;

    /**
     * Search for relevant best practices using vector similarity
     */
    async searchBestPractices(
        query: string,
        platform?: AiePlatform,
        goal?: AieGoal,
        limit: number = 5
    ): Promise<BestPractice[]> {
        const embedding = await generateEmbedding(query);

        const { data, error } = await this.supabase.rpc('search_best_practices', {
            query_embedding: embedding,
            match_threshold: 0.5, // Lowered threshold slightly to ensure results
            match_count: limit,
            filter_platform: platform || null,
            filter_goal: goal || null
        });

        if (error) {
            logger.error('Error searching best practices:', error as Error, { component: 'agent' });
            throw new Error(`Failed to search best practices: ${error.message}`);
        }

        return data as BestPractice[];
    }

    /**
     * Search for relevant ad examples using vector similarity
     */
    async searchAdExamples(
        query: string,
        platform?: AiePlatform,
        limit: number = 5
    ): Promise<AdExample[]> {
        const embedding = await generateEmbedding(query);

        const { data, error } = await this.supabase.rpc('search_ad_examples', {
            query_embedding: embedding,
            match_threshold: 0.5,
            match_count: limit,
            filter_platform: platform || null
        });

        if (error) {
            logger.error('Error searching ad examples:', error as Error, { component: 'agent' });
            throw new Error(`Failed to search ad examples: ${error.message}`);
        }

        return data as AdExample[];
    }

    /**
     * Fetch brand voice context from the shop's BusinessProfile
     */
    async getBrandVoice(shopId: string): Promise<BrandVoiceContext | null> {
        try {
            // First get the shop record to find the business profile
            const { data: shop, error: shopError } = await this.supabase
                .from('shops')
                .select('id')
                .eq('id', shopId)
                .single();

            if (shopError || !shop) {
                return null;
            }

            // Query business_profiles table for this shop
            const { data: profile, error: profileError } = await this.supabase
                .from('business_profiles')
                .select(`
                    voice_tone,
                    voice_style,
                    voice_personality,
                    voice_vocabulary,
                    brand_identity,
                    ideal_customer_profile,
                    ai_engine_instructions,
                    profile_summary,
                    interview_status
                `)
                .eq('store_id', shopId)
                .eq('interview_status', 'completed')
                .single();

            if (profileError || !profile) {
                return null;
            }

            // Extract and transform the data
            const voiceVocabulary = profile.voice_vocabulary as {
                preferred_terms?: string[];
                avoided_terms?: string[];
                signature_phrases?: string[];
            } | null;

            const brandIdentity = profile.brand_identity as {
                core_values?: string[];
                desired_reputation?: string;
                communication_style?: { approach?: string };
            } | null;

            const idealCustomer = profile.ideal_customer_profile as {
                best_client_description?: string;
                deep_pain_points?: string[];
                desired_outcomes?: string[];
            } | null;

            return {
                tone: profile.voice_tone,
                style: profile.voice_style,
                personality: profile.voice_personality,
                preferredTerms: voiceVocabulary?.preferred_terms || [],
                avoidedTerms: voiceVocabulary?.avoided_terms || [],
                signaturePhrases: voiceVocabulary?.signature_phrases || [],
                coreValues: brandIdentity?.core_values || [],
                desiredReputation: brandIdentity?.desired_reputation || null,
                communicationApproach: brandIdentity?.communication_style?.approach || null,
                idealCustomerDescription: idealCustomer?.best_client_description || null,
                customerPainPoints: idealCustomer?.deep_pain_points || [],
                customerDesiredOutcomes: idealCustomer?.desired_outcomes || [],
                aiEngineInstructions: profile.ai_engine_instructions,
                profileSummary: profile.profile_summary
            };
        } catch (error) {
            logger.error('[ResearcherAgent] Error fetching brand voice:', error as Error, { component: 'agent' });
            return null;
        }
    }

    /**
     * Compile a full research context for the Creative Agent
     */
    async compileContext(
        productInfo: string,
        platform: AiePlatform,
        goal: AieGoal,
        shopId?: string
    ): Promise<ResearchContext> {
        try {
            // Parallelize searches for efficiency
            const promises: [
                Promise<BestPractice[]>,
                Promise<AdExample[]>,
                Promise<BrandVoiceContext | null>
            ] = [
                this.searchBestPractices(productInfo, platform, goal),
                this.searchAdExamples(productInfo, platform),
                shopId ? this.getBrandVoice(shopId) : Promise.resolve(null)
            ];

            const [bestPractices, adExamples, brandVoice] = await Promise.all(promises);


            return {
                bestPractices,
                adExamples,
                marketInsights: [],
                brandVoice: brandVoice || undefined
            };
        } catch (error) {
            logger.error('Error compiling research context:', error as Error, { component: 'agent' });
            throw error;
        }
    }
}
