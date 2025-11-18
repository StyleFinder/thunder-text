-- Disable RLS on all AIE tables
-- These are internal system tables accessed only via service role, not by end users

ALTER TABLE aie_ad_examples DISABLE ROW LEVEL SECURITY;
ALTER TABLE aie_ad_performance DISABLE ROW LEVEL SECURITY;
ALTER TABLE aie_ad_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE aie_ad_variants DISABLE ROW LEVEL SECURITY;
ALTER TABLE aie_best_practices DISABLE ROW LEVEL SECURITY;
ALTER TABLE aie_embedding_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE aie_expert_contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE aie_image_analysis DISABLE ROW LEVEL SECURITY;
ALTER TABLE aie_learning_loop_insights DISABLE ROW LEVEL SECURITY;
ALTER TABLE aie_rag_retrieval_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE aie_scheduled_jobs_log DISABLE ROW LEVEL SECURITY;
