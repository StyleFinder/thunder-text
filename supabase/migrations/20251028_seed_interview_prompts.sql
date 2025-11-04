-- Migration: Seed Interview Prompts
-- Date: 2025-10-28
-- Description: Insert all 21 business profile interview questions

-- Clear existing prompts (for re-running migration)
TRUNCATE interview_prompts CASCADE;

-- ============================================================================
-- CATEGORY: BUSINESS FOUNDATION & IDENTITY (Questions 1-3)
-- ============================================================================

INSERT INTO interview_prompts (prompt_key, category, question_number, question_text, context_text, help_text, display_order, min_words, suggested_words) VALUES
(
  'business_story',
  'Business Foundation & Identity',
  1,
  'Tell me your complete business story, from the moment you first had the idea to where you are today.',
  'Walk me through the journey: What problems were you trying to solve initially? What pivotal moments shaped your business? What unexpected challenges or successes have you encountered along the way?',
  'Think back to your very first spark of the idea – where were you, who were you talking to, or what problem were you facing? Just start telling your story, even if it''s out of order. If you get stuck, mention a specific memory or challenge that stands out.',
  1,
  50,
  200
),
(
  'business_description',
  'Business Foundation & Identity',
  2,
  'What exactly do you do, and how do you explain it to someone who has never heard of your business?',
  'Imagine you''re at a networking event talking to a potential customer. How do you describe your services, products, or solutions in a way that immediately makes sense to them?',
  'Picture a stranger at a coffee shop asking, "So, what do you do?" How would you answer in just two or three sentences—no fancy titles, just plain language. Feel free to ramble before you edit yourself.',
  2,
  30,
  100
),
(
  'client_results',
  'Business Foundation & Identity',
  3,
  'What measurable results or transformations do your clients achieve when they work with you?',
  'Be specific: Do they save time, make money, reduce stress, improve efficiency? Can you quantify these results? Share actual examples or case studies if you have them.',
  'Is there a moment when a client said, "Wow, this changed everything for me"? Try to recall specific feedback or a story about a client win—even if it seems small.',
  3,
  30,
  150
);

-- ============================================================================
-- CATEGORY: MARKET UNDERSTANDING & COMPETITION (Questions 4-6)
-- ============================================================================

INSERT INTO interview_prompts (prompt_key, category, question_number, question_text, context_text, help_text, display_order, min_words, suggested_words) VALUES
(
  'competitors_differentiation',
  'Market Understanding & Competition',
  4,
  'Who are your direct and indirect competitors, and what makes you fundamentally different from them?',
  'Think beyond just businesses that do exactly what you do. Who else is competing for your ideal customer''s attention, time, or budget? What''s your unique advantage?',
  'Who do your clients compare you to, even if they''re not a direct competitor? Is there something you do, say, or believe that is distinctly yours? If someone asked, "Why you over them?" what would you say?',
  4,
  30,
  150
),
(
  'industry_trends',
  'Market Understanding & Competition',
  5,
  'What industry trends, changes, or challenges are affecting your target market right now?',
  'Are there technological shifts, economic factors, regulatory changes, or cultural movements impacting how your customers do business or make decisions?',
  'Is there a recent news story, tech change, or something clients keep mentioning that feels different from last year? Speak freely, even if you''re just guessing trends.',
  5,
  20,
  100
),
(
  'customer_journey',
  'Market Understanding & Competition',
  6,
  'What do your best customers typically try before they find you, and why do those solutions fail them?',
  'What''s the journey your ideal clients go through before they realize they need what you offer? What frustrations drive them to seek better solutions?',
  'Think of one client before they hired you—what did they try first, and where did it break down? Describe the exact moment they realized, "This isn''t working—I need help."',
  6,
  30,
  150
);

-- ============================================================================
-- CATEGORY: IDEAL CUSTOMER DEEP DIVE (Questions 7-11)
-- ============================================================================

INSERT INTO interview_prompts (prompt_key, category, question_number, question_text, context_text, help_text, display_order, min_words, suggested_words) VALUES
(
  'ideal_customer',
  'Ideal Customer Deep Dive',
  7,
  'Describe your absolute best, most profitable, most enjoyable client in vivid detail.',
  'What industry are they in? How big is their company? What''s their role? What personality traits do they have? What does their typical day look like?',
  'Picture your favorite client. What made working with them easy and profitable? List 3 traits and one concrete behavior that shows each trait.',
  7,
  40,
  200
),
(
  'anti_customer',
  'Ideal Customer Deep Dive',
  8,
  'Describe the client you don''t want.',
  'What are the red flags? What traits or behaviors make a client a poor fit, unprofitable, or difficult to work with?',
  'This is your "anti-avatar." Think of a past difficult client. What made it a struggle? Knowing who you won''t serve makes your message to your ideal client even clearer.',
  8,
  20,
  100
),
(
  'customer_pain_points',
  'Ideal Customer Deep Dive',
  9,
  'What keeps your ideal client awake at 3 AM worrying about their business?',
  'What are their deepest fears, anxieties, and stress points? What problems cause them the most pain, frustration, or embarrassment?',
  'If your ideal client texted you at 3 AM, what would they vent about first? Say it the way they''d actually say it—messy, specific, and honest.',
  9,
  30,
  150
),
(
  'customer_desired_outcome',
  'Ideal Customer Deep Dive',
  10,
  'What does your ideal client''s perfect world look like if all their problems were solved?',
  'Paint a picture of their desired future state. How would their business operate? How would they feel? What new opportunities would open up for them?',
  'Describe their "after" scene like a movie: what''s on their dashboard, what''s off their plate, and what they finally have time for.',
  10,
  30,
  150
),
(
  'customer_buying_behavior',
  'Ideal Customer Deep Dive',
  11,
  'How does your ideal client prefer to learn about, research, and purchase solutions like yours?',
  'Do they read industry publications, attend conferences, ask peers for referrals, search Google, scroll social media? What''s their typical buying process and timeline?',
  'Walk me through how they actually buy... Where do they look? If they scroll social media, which specific platforms? Are there LinkedIn/Facebook groups, Subreddits, or influencers they trust? Who do they ask, and what moment flips them from "curious" to "committed"?',
  11,
  30,
  150
);

-- ============================================================================
-- CATEGORY: CUSTOMER CHALLENGES & SOLUTIONS (Questions 12-14)
-- ============================================================================

INSERT INTO interview_prompts (prompt_key, category, question_number, question_text, context_text, help_text, display_order, min_words, suggested_words) VALUES
(
  'hidden_problems',
  'Customer Challenges & Solutions',
  12,
  'What specific problems or challenges do your clients face that they don''t even realize they have?',
  'What blind spots, inefficiencies, or missed opportunities do you commonly discover when working with new clients? What do you see that they can''t see?',
  'What''s the "hidden leak" you spot in week one that they never mention? Share a before/after example where a small tweak made a big difference.',
  12,
  30,
  150
),
(
  'objections_concerns',
  'Customer Challenges & Solutions',
  13,
  'What objections, concerns, or hesitations do prospects typically have about working with you or your industry?',
  'What makes them skeptical? What past experiences make them cautious? What misconceptions do they have about solutions like yours?',
  'Finish this sentence: "People worry we''ll…" Then counter it with how you handle that exact concern—process, proof, or policy.',
  13,
  20,
  100
),
(
  'frequent_questions',
  'Customer Challenges & Solutions',
  14,
  'What questions do your prospects ask most frequently during sales conversations?',
  'What do they need to understand before they feel confident moving forward? What information gaps cause them to hesitate or delay decisions?',
  'List the top 3 questions you answer on every call. For each, give the short version you wish everyone heard before the meeting.',
  14,
  20,
  100
);

-- ============================================================================
-- CATEGORY: BUSINESS MODEL & GROWTH (Questions 15-17)
-- ============================================================================

INSERT INTO interview_prompts (prompt_key, category, question_number, question_text, context_text, help_text, display_order, min_words, suggested_words) VALUES
(
  'lead_generation',
  'Business Model & Growth',
  15,
  'How do you currently generate leads and acquire new customers?',
  'What marketing channels work best for you? What percentage of your business comes from referrals, online marketing, networking, partnerships, etc.?',
  'Where did your last five good leads actually come from? Say the channel, the trigger event, and what you did next that moved them forward.',
  15,
  30,
  150
),
(
  'pricing_profitability',
  'Business Model & Growth',
  16,
  'What''s your current business model, pricing structure, and how profitable is each type of engagement?',
  'Do you charge hourly, project-based, monthly retainers, or other models? Which services or products generate the highest profit margins?',
  'Break it down simply: offer → price → margin → effort. Which combos feel like a win-win, and which ones you''re phasing out (and why)?',
  16,
  30,
  150
),
(
  'growth_strategy',
  'Business Model & Growth',
  17,
  'What would need to change or improve for you to double your revenue in the next 18 months?',
  'What are the biggest bottlenecks, gaps, or opportunities that could drive significant growth? What''s holding you back from scaling?',
  'Name one bottleneck to remove, one lever to pull harder, and one experiment to run. Keep it practical—something you could start next week.',
  17,
  20,
  100
);

-- ============================================================================
-- CATEGORY: BRAND & COMMUNICATION (Questions 18-20)
-- ============================================================================

INSERT INTO interview_prompts (prompt_key, category, question_number, question_text, context_text, help_text, display_order, min_words, suggested_words) VALUES
(
  'brand_reputation',
  'Brand & Communication',
  18,
  'What do you want to be known for in your industry or market?',
  'How do you want people to think of you and describe you to others? What reputation or position do you want to establish or strengthen?',
  'If a happy client introduced you on stage in one sentence, what would you want them to say? Write the exact line.',
  18,
  15,
  75
),
(
  'communication_style',
  'Brand & Communication',
  19,
  'What''s your personality and communication style, and how should that be reflected in your marketing?',
  'Are you formal or casual, direct or diplomatic, humorous or serious? What tone and approach feels most authentic to you?',
  'Think of a post or email that felt most "you." What made it work—voice, pacing, humor, structure? Use that as your baseline.',
  19,
  20,
  100
),
(
  'values_beliefs',
  'Brand & Communication',
  20,
  'What beliefs, values, or philosophies drive your business approach?',
  'What do you stand for? What principles guide your decisions? What controversial or strong opinions do you have about your industry?',
  'What''s a rule you refuse to break—even if it costs you short-term wins? Share the story behind it.',
  20,
  30,
  150
);

-- ============================================================================
-- CATEGORY: STRATEGIC VISION (Question 21)
-- ============================================================================

INSERT INTO interview_prompts (prompt_key, category, question_number, question_text, context_text, help_text, display_order, min_words, suggested_words) VALUES
(
  'future_vision',
  'Strategic Vision',
  21,
  'Where do you see your business in 3-5 years, and what legacy do you want to create?',
  'What''s your bigger vision beyond just financial success? How do you want to impact your clients, industry, or community? What would make you feel most proud of what you''ve built?',
  'Fast-forward to a celebratory dinner 5 years from now—what are people toasting you for? Name the outcomes, not the activities.',
  21,
  30,
  150
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all 21 questions were inserted
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM interview_prompts WHERE is_active = true;

  IF v_count != 21 THEN
    RAISE EXCEPTION 'Expected 21 prompts, found %', v_count;
  END IF;

  RAISE NOTICE '✓ Successfully inserted all 21 interview prompts';
END $$;

-- Show summary by category
SELECT
  category,
  COUNT(*) as question_count,
  MIN(question_number) as first_question,
  MAX(question_number) as last_question
FROM interview_prompts
WHERE is_active = true
GROUP BY category
ORDER BY MIN(question_number);
