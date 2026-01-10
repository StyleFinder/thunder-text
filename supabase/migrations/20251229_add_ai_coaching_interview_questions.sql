-- Migration: Add AI Coaching Questions to Quick Interview
-- Date: 2025-12-29
-- Description: Adds 5 coach-specific questions to the Quick Start interview
--   These questions capture data needed for AI coach personalization
--   Expands Quick Interview from 7 to 12 questions

-- ============================================================================
-- ADD 5 AI COACHING QUESTIONS
-- ============================================================================

-- Question 8: Discount Comfort Level
INSERT INTO interview_prompts (
  prompt_key,
  category,
  question_number,
  question_text,
  display_order,
  is_quick_start,
  quick_start_order,
  min_words,
  suggested_words,
  is_active
) VALUES (
  'discount_comfort',
  'Business Operations',
  20,
  'How comfortable are you with discounting your products? Do you prefer to rarely discount to protect your brand, offer occasional promotions, or run frequent sales and deals? Share your philosophy on discounting and what influences your approach.',
  20,
  true,
  8,
  10,
  50,
  true
);

-- Question 9: Inventory Size
INSERT INTO interview_prompts (
  prompt_key,
  category,
  question_number,
  question_text,
  display_order,
  is_quick_start,
  quick_start_order,
  min_words,
  suggested_words,
  is_active
) VALUES (
  'inventory_size',
  'Business Operations',
  21,
  'How would you describe your inventory size? Do you carry a small curated selection (under 100 SKUs), a medium range (100-500 SKUs), or a large catalog (500+ SKUs)? Tell me about how you manage your inventory.',
  21,
  true,
  9,
  10,
  50,
  true
);

-- Question 10: Time Availability
INSERT INTO interview_prompts (
  prompt_key,
  category,
  question_number,
  question_text,
  display_order,
  is_quick_start,
  quick_start_order,
  min_words,
  suggested_words,
  is_active
) VALUES (
  'time_availability',
  'Business Operations',
  22,
  'How much time do you typically have available for your boutique each day? Are you very limited with just a few hours, do you have moderate availability with a part-time schedule, or are you flexible with full-time dedication? Describe your typical work week.',
  22,
  true,
  10,
  15,
  75,
  true
);

-- Question 11: Quarterly Goal
INSERT INTO interview_prompts (
  prompt_key,
  category,
  question_number,
  question_text,
  display_order,
  is_quick_start,
  quick_start_order,
  min_words,
  suggested_words,
  is_active
) VALUES (
  'quarterly_goal',
  'Strategic Vision',
  23,
  'What is your main goal for this quarter? What one thing would make the biggest impact on your business in the next 90 days? Be specific - whether it''s launching a collection, increasing repeat customers, clearing inventory, or growing your social presence.',
  23,
  true,
  11,
  20,
  100,
  true
);

-- Question 12: Return and Shipping Policies
INSERT INTO interview_prompts (
  prompt_key,
  category,
  question_number,
  question_text,
  display_order,
  is_quick_start,
  quick_start_order,
  min_words,
  suggested_words,
  is_active
) VALUES (
  'policies_summary',
  'Business Operations',
  24,
  'Briefly describe your return and shipping policies. How long do customers have to return items? Do you offer free shipping, flat rate, or calculated shipping? What should customers know about your policies when they ask questions?',
  24,
  true,
  12,
  20,
  100,
  true
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify we now have 12 Quick Start questions
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM interview_prompts
  WHERE is_active = true AND is_quick_start = true;

  IF v_count != 12 THEN
    RAISE EXCEPTION 'Expected 12 Quick Start questions, found %', v_count;
  END IF;

  RAISE NOTICE '✓ Successfully added 5 AI coaching questions. Total Quick Start: 12';
END $$;
