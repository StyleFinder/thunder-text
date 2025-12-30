-- Migration: Reorder Quick Start Questions - AI Coaching First
-- Date: 2025-12-29
-- Description: Move AI coaching questions to positions 1-5, original questions to 6-12
--   This ensures users answer operational/coach-related questions before brand voice questions

-- ============================================================================
-- REORDER QUICK START QUESTIONS
-- ============================================================================

-- Step 1: Move original 7 questions to positions 6-12
UPDATE interview_prompts SET quick_start_order = 6 WHERE prompt_key = 'business_description' AND is_quick_start = true;
UPDATE interview_prompts SET quick_start_order = 7 WHERE prompt_key = 'ideal_customer' AND is_quick_start = true;
UPDATE interview_prompts SET quick_start_order = 8 WHERE prompt_key = 'customer_pain_points' AND is_quick_start = true;
UPDATE interview_prompts SET quick_start_order = 9 WHERE prompt_key = 'brand_reputation' AND is_quick_start = true;
UPDATE interview_prompts SET quick_start_order = 10 WHERE prompt_key = 'competitors_differentiation' AND is_quick_start = true;
UPDATE interview_prompts SET quick_start_order = 11 WHERE prompt_key = 'client_results' AND is_quick_start = true;
UPDATE interview_prompts SET quick_start_order = 12 WHERE prompt_key = 'communication_style' AND is_quick_start = true;

-- Step 2: Move AI Coaching questions to positions 1-5
UPDATE interview_prompts SET quick_start_order = 1 WHERE prompt_key = 'discount_comfort';
UPDATE interview_prompts SET quick_start_order = 2 WHERE prompt_key = 'inventory_size';
UPDATE interview_prompts SET quick_start_order = 3 WHERE prompt_key = 'time_availability';
UPDATE interview_prompts SET quick_start_order = 4 WHERE prompt_key = 'quarterly_goal';
UPDATE interview_prompts SET quick_start_order = 5 WHERE prompt_key = 'policies_summary';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the new order
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM interview_prompts
  WHERE is_quick_start = true;

  IF v_count != 12 THEN
    RAISE WARNING 'Expected 12 quick start questions, found %', v_count;
  ELSE
    RAISE NOTICE '✓ Quick Start questions reordered: AI Coaching (1-5), Original (6-12)';
  END IF;
END $$;

-- Show the new order
SELECT prompt_key, quick_start_order, category
FROM interview_prompts
WHERE is_quick_start = true
ORDER BY quick_start_order;
