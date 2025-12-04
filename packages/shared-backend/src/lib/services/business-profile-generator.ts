/**
 * Business Profile Generator Service
 *
 * Takes 21 interview responses and generates comprehensive business documents
 * through 6 specialized AI prompts:
 * 1. Market Research Analysis
 * 2. Ideal Customer Avatar (ICA)
 * 3. Pain Point & Content Strategy
 * 4. Brand Mission, Vision & Values
 * 5. Brand Positioning Statement
 * 6. AI Engine (Custom Instructions)
 */

import { callChatCompletion } from "../openai-client";

// ============================================================================
// TYPES
// ============================================================================

export interface BusinessProfileResponse {
  question_id: string;
  response_text: string;
  prompt_key?: string;
}

export interface ProfileGenerationResult {
  masterProfile: MasterBusinessProfile;
  generationMetadata: GenerationMetadata;
}

export interface MasterBusinessProfile {
  // Executive Summary
  profileSummary: string;

  // Six core documents
  marketResearch: string;
  idealCustomerAvatar: string;
  painPointStrategy: string;
  missionVisionValues: string;
  positioningStatement: string;
  aiEngineInstructions: string;

  // Synthesized components
  businessFoundation: {
    story: string;
    coreOffering: string;
    resultsDelivered: string;
  };
  voiceGuidelines: {
    tone: string;
    style: string;
    personality: string;
  };
}

export interface GenerationMetadata {
  totalTokensUsed: number;
  generationTimeMs: number;
  stagesCompleted: string[];
  validationPassed: boolean;
  validationIssues: string[];
}

// Map interview responses to structured data
interface InterviewResponseMap {
  [key: string]: string;
}

// ============================================================================
// MAIN GENERATION ORCHESTRATOR
// ============================================================================

export async function generateMasterBusinessProfile(
  responses: BusinessProfileResponse[],
): Promise<ProfileGenerationResult> {
  const startTime = Date.now();
  let totalTokens = 0;
  const stagesCompleted: string[] = [];

  // Convert responses to easy-to-access map
  const responsesMap = responses.reduce((acc, r) => {
    acc[r.prompt_key] = r.response_text;
    return acc;
  }, {} as InterviewResponseMap);

  console.log(
    "Starting master profile generation with",
    responses.length,
    "responses",
  );

  try {
    // Stage 1: Market Research Analysis
    console.log("Stage 1: Generating Market Research Analysis...");
    const marketResearch = await generateMarketResearch(responsesMap);
    totalTokens += estimateTokens(marketResearch);
    stagesCompleted.push("market_research");

    // Stage 2: Ideal Customer Avatar
    console.log("Stage 2: Generating Ideal Customer Avatar...");
    const idealCustomerAvatar = await generateIdealCustomerAvatar(
      responsesMap,
      marketResearch,
    );
    totalTokens += estimateTokens(idealCustomerAvatar);
    stagesCompleted.push("ideal_customer_avatar");

    // Stage 3: Pain Point & Content Strategy
    console.log("Stage 3: Generating Pain Point & Content Strategy...");
    const painPointStrategy = await generatePainPointStrategy(
      responsesMap,
      idealCustomerAvatar,
      marketResearch,
    );
    totalTokens += estimateTokens(painPointStrategy);
    stagesCompleted.push("pain_point_strategy");

    // Stage 4: Brand Mission, Vision & Values
    console.log("Stage 4: Generating Brand Mission, Vision & Values...");
    const missionVisionValues = await generateMissionVisionValues(responsesMap);
    totalTokens += estimateTokens(missionVisionValues);
    stagesCompleted.push("mission_vision_values");

    // Stage 5: Brand Positioning Statement
    console.log("Stage 5: Generating Brand Positioning Statement...");
    const positioningStatement = await generatePositioningStatement(
      responsesMap,
      marketResearch,
    );
    totalTokens += estimateTokens(positioningStatement);
    stagesCompleted.push("positioning_statement");

    // Stage 6: AI Engine Custom Instructions
    console.log("Stage 6: Generating AI Engine Instructions...");
    const aiEngineInstructions = await generateAIEngineInstructions(
      responsesMap,
      missionVisionValues,
      positioningStatement,
      idealCustomerAvatar,
    );
    totalTokens += estimateTokens(aiEngineInstructions);
    stagesCompleted.push("ai_engine_instructions");

    // Stage 7: Create Executive Summary
    console.log("Stage 7: Creating Executive Summary...");
    const profileSummary = await generateExecutiveSummary(responsesMap, {
      marketResearch,
      idealCustomerAvatar,
      missionVisionValues,
      positioningStatement,
    });
    totalTokens += estimateTokens(profileSummary);

    // Synthesize structured components
    const businessFoundation = {
      story: responsesMap.business_story || "",
      coreOffering: responsesMap.business_description || "",
      resultsDelivered: responsesMap.client_results || "",
    };

    const voiceGuidelines = {
      tone: extractToneFromCommunicationStyle(
        responsesMap.communication_style || "",
      ),
      style: responsesMap.communication_style || "",
      personality: responsesMap.values_beliefs || "",
    };

    const masterProfile: MasterBusinessProfile = {
      profileSummary,
      marketResearch,
      idealCustomerAvatar,
      painPointStrategy,
      missionVisionValues,
      positioningStatement,
      aiEngineInstructions,
      businessFoundation,
      voiceGuidelines,
    };

    const metadata: GenerationMetadata = {
      totalTokensUsed: totalTokens,
      generationTimeMs: Date.now() - startTime,
      stagesCompleted,
      validationPassed: true,
      validationIssues: [],
    };

    console.log("Master profile generation complete:", {
      stages: stagesCompleted.length,
      tokens: totalTokens,
      timeMs: metadata.generationTimeMs,
    });

    return {
      masterProfile,
      generationMetadata: metadata,
    };
  } catch (error) {
    console.error("Error generating master business profile:", error);
    throw new Error(
      `Profile generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// ============================================================================
// STAGE 1: MARKET RESEARCH ANALYSIS
// ============================================================================

async function generateMarketResearch(
  responses: InterviewResponseMap,
): Promise<string> {
  const prompt = `
Conduct a comprehensive market research analysis to create a detailed profile that showcases unique strengths, offerings, and market positioning. The analysis should include:

**BUSINESS CONTEXT:**
- Business Story: ${responses.business_story}
- What They Do: ${responses.business_description}
- Client Results: ${responses.client_results}
- Competitors & Differentiation: ${responses.competitors_differentiation}
- Industry Trends: ${responses.industry_trends}
- Customer Journey: ${responses.customer_journey}

**REQUIRED ANALYSIS SECTIONS:**

1. **Unique Selling Proposition (USP) and Differentiators**
   - Clear, concise USP that sets this business apart
   - Key differentiators from competitors

2. **Products and Services Breakdown**
   - Features, benefits, and competitive advantages
   - Value proposition for each offering

3. **Comprehensive Market Analysis**
   - Target Audience: Primary customer profile
   - Competitor Landscape: Main competitors and comparison
   - Market Trends: Current and future industry trends

4. **Customer Experience Analysis**
   - Customer journey mapping: Key touchpoints and pain points
   - Customer feedback: Common complaints or improvement areas

5. **Innovation and Future Plans**
   - R&D investments and ongoing initiatives
   - Partnerships and collaborations
   - Future expansion plans

6. **Metrics for Success**
   - Key performance indicators
   - Market positioning and industry rankings

The tone should be formal and academic, providing actionable insights and recommendations.

Generate a comprehensive market research analysis document.
`;

  const result = await callChatCompletion(
    [
      {
        role: "system",
        content:
          "You are a professional market research analyst creating comprehensive business analysis documents.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      model: "gpt-4o",
      temperature: 0.4,
      maxTokens: 4000,
    },
  );

  return result;
}

// ============================================================================
// STAGE 2: IDEAL CUSTOMER AVATAR (ICA)
// ============================================================================

async function generateIdealCustomerAvatar(
  responses: InterviewResponseMap,
  marketResearch: string,
): Promise<string> {
  const prompt = `
Create a highly detailed Ideal Customer Avatar (ICA) document designed to comprehensively profile the target audience.

**BUSINESS CONTEXT:**
- Ideal Customer Description: ${responses.ideal_customer}
- Anti-Customer (Who We Don't Serve): ${responses.anti_customer}
- Customer Pain Points: ${responses.customer_pain_points}
- Customer Desired Outcomes: ${responses.customer_desired_outcome}
- Customer Buying Behavior: ${responses.customer_buying_behavior}

**MARKET RESEARCH CONTEXT:**
${marketResearch.substring(0, 1000)}...

**REQUIRED SECTIONS:**

1. **Introduction**
   - Purpose of this ICA document
   - Brief description of target audience

2. **ICA Demographics and Psychographics**
   - Demographics: Age, gender, occupation, industry, education, income, geography
   - Psychographics: Personality traits, values, attitudes, motivations, interests, lifestyle

3. **Behavioral Insights**
   - Technology usage: Platforms, content preferences
   - Shopping habits: Decision-making process, purchasing style

4. **Goals and Desires**
   - Professional goals: Career growth, business optimization, skill enhancement
   - Personal desires: Work-life balance, stress reduction, income increase

5. **Top 25 Fears and Pain Points**
   - Identify the top 25 challenges or hesitations preventing them from embracing solutions

6. **Buying Triggers and Barriers**
   - Triggers: Factors that positively influence purchase decisions
   - Barriers: Factors that inhibit purchases

7. **Communication Preferences**
   - Preferred style: Tone, approach
   - Channels: Email, social media, content types

8. **Audience Segmentation**
   - Divide ICA into relevant sub-segments

9. **Customer Journey and Lifecycle**
   - Stages: Awareness to advocacy
   - Lifecycle: How needs evolve over time

The document should be clear, concise, and accessible with a professional yet conversational tone.

Generate a comprehensive Ideal Customer Avatar document.
`;

  const result = await callChatCompletion(
    [
      {
        role: "system",
        content:
          "You are a customer insights expert creating detailed customer avatar documents.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      model: "gpt-4o",
      temperature: 0.4,
      maxTokens: 4000,
    },
  );

  return result;
}

// ============================================================================
// STAGE 3: PAIN POINT & CONTENT STRATEGY
// ============================================================================

async function generatePainPointStrategy(
  responses: InterviewResponseMap,
  idealCustomerAvatar: string,
  marketResearch: string,
): Promise<string> {
  const prompt = `
Conduct a comprehensive pain point analysis using the provided research data.

**BUSINESS CONTEXT:**
- Hidden Problems Clients Don't Realize: ${responses.hidden_problems}
- Common Objections: ${responses.objections_concerns}
- Frequent Questions: ${responses.frequent_questions}
- Customer Pain Points: ${responses.customer_pain_points}

**REFERENCE CONTEXT:**
Ideal Customer Avatar:
${idealCustomerAvatar.substring(0, 800)}...

Market Research:
${marketResearch.substring(0, 800)}...

**TASK:**
Create a strategic analysis table with 5-8 pain points maximum. For each pain point include:

1. **Pain Point** – Specific, validated challenge
2. **Pain Depth Analysis**
   - Functional impact (what breaks down)
   - Emotional impact (how it feels)
   - Financial/time impact (quantifiable costs)
3. **Evidence & Validation** – Supporting data
4. **How-To Solution Framework**
   - Immediate actionable steps
   - Long-term strategic approach
   - Success metrics
5. **Brand-Aligned Content Strategy**
   - Primary content format + channel
   - Supporting content sequence
   - Call-to-action
6. **Priority Score** (U/I/O format)
   - Urgency (1-5)
   - Impact (1-5)
   - Opportunity (1-5)

Format as a detailed analysis with clear sections for each pain point.

Generate comprehensive pain point and content strategy analysis.
`;

  const result = await callChatCompletion(
    [
      {
        role: "system",
        content:
          "You are a content strategist creating pain point analyses and content strategies.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      model: "gpt-4o",
      temperature: 0.4,
      maxTokens: 4000,
    },
  );

  return result;
}

// ============================================================================
// STAGE 4: BRAND MISSION, VISION & VALUES
// ============================================================================

async function generateMissionVisionValues(
  responses: InterviewResponseMap,
): Promise<string> {
  const prompt = `
Create a comprehensive Brand Mission, Vision, and Values document.

**BUSINESS CONTEXT:**
- Brand Story: ${responses.business_story}
- Brand Mission: ${responses.brand_mission || responses.business_description}
- Core Values & Beliefs: ${responses.values_beliefs}
- Desired Reputation: ${responses.brand_reputation}
- Future Vision (3-5 years): ${responses.future_vision}
- Communication Style: ${responses.communication_style}

**REQUIRED SECTIONS:**

1. **Introduction**
   - Purpose of this document
   - Brand history and overview

2. **Brand Mission**
   - Purpose: What drives existence, problems solved, benefits provided
   - Unique value proposition and differentiation

3. **Brand Vision**
   - Long-term goals and aspirations
   - Ideal future state and steps to achieve it

4. **Brand Values**
   - Core values guiding behavior and decisions
   - How values are reflected in products/services

5. **Core Principles**
   - Fundamental principles underpinning mission, vision, values
   - Application in various contexts

6. **Brand Personality**
   - Personality traits: tone, language, attitude
   - Expression through channels and touchpoints

7. **Brand Positioning**
   - Unique market position
   - Differentiation and competitive advantages

8. **Employee Engagement**
   - Role of employees in embodying brand
   - Empowerment and engagement strategies

9. **Communication and Consistency**
   - Communication channels and touchpoints
   - Ensuring consistency

10. **Review and Revision**
    - Review process and timeline

The document should be clear, accessible, professional yet conversational.

Generate comprehensive Brand Mission, Vision & Values document.
`;

  const result = await callChatCompletion(
    [
      {
        role: "system",
        content:
          "You are a brand strategist creating mission, vision, and values documentation.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      model: "gpt-4o",
      temperature: 0.4,
      maxTokens: 3500,
    },
  );

  return result;
}

// ============================================================================
// STAGE 5: BRAND POSITIONING STATEMENT
// ============================================================================

async function generatePositioningStatement(
  responses: InterviewResponseMap,
  marketResearch: string,
): Promise<string> {
  const prompt = `
Create a comprehensive brand positioning statement.

**BUSINESS CONTEXT:**
- Competitors & Differentiation: ${responses.competitors_differentiation}
- Desired Reputation: ${responses.brand_reputation}
- Unique Strengths: ${responses.competitors_differentiation}

**MARKET RESEARCH CONTEXT:**
${marketResearch.substring(0, 1000)}...

**REQUIRED SECTIONS:**

1. **Brand Strengths and Weaknesses**
   - Unique Strengths
   - Common Weaknesses to address

2. **Competitive Advantage**
   - Unique Selling Proposition (USP)
   - Competitive Advantage over market

3. **Brand Positioning Statement**
   - Clear, concise positioning statement
   - Key messages for communication

4. **Leveraging the Unique Selling Proposition**
   - Marketing strategies
   - Content creation process
   - Distribution channels

5. **Review and Revision**
   - Review process
   - Revision timeline

The document should be clear, concise, professional yet conversational.

Generate comprehensive Brand Positioning Statement document.
`;

  const result = await callChatCompletion(
    [
      {
        role: "system",
        content:
          "You are a brand positioning expert creating positioning statements and strategy documents.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      model: "gpt-4o",
      temperature: 0.4,
      maxTokens: 3000,
    },
  );

  return result;
}

// ============================================================================
// STAGE 6: AI ENGINE CUSTOM INSTRUCTIONS
// ============================================================================

async function generateAIEngineInstructions(
  responses: InterviewResponseMap,
  missionVisionValues: string,
  positioningStatement: string,
  idealCustomerAvatar: string,
): Promise<string> {
  const prompt = `
Create custom AI instructions for content generation that embodies this business's unique identity.

**BUSINESS CONTEXT:**
- Communication Style: ${responses.communication_style}
- Brand Values: ${responses.values_beliefs}
- Desired Reputation: ${responses.brand_reputation}

**REFERENCE DOCUMENTS:**
Mission, Vision & Values:
${missionVisionValues.substring(0, 600)}...

Positioning Statement:
${positioningStatement.substring(0, 600)}...

Ideal Customer Avatar:
${idealCustomerAvatar.substring(0, 600)}...

**REQUIRED STRUCTURE:**

**Execution Protocol**
- Instructions for multi-artifact delivery
- Prohibition on citations

**Core Purpose Analysis**
- Fundamental purpose and outcomes
- Required knowledge domain
- Key stakeholders and goals
- Success factors and challenges

**Instruction Structure:**

1. **Core Behavioral Directives**
   - Role, perspective, behavioral patterns
   - Tone, approach, mindset

2. **Task-Specific Protocols**
   - Standard workflows
   - Response procedures for key request types

3. **Quality Standards**
   - Accuracy, completeness, formatting expectations
   - Quality benchmarks

4. **Interaction Guidelines**
   - Communication tone and style
   - Feedback handling, clarification protocols

5. **Limitations and Boundaries**
   - Scope, ethical guidelines
   - When to pause or request clarification

**Essential Components:**
- Context Understanding
- Response Calibration
- Edge Case Management
- Success Criteria
- Self-Improvement Mechanisms
- Verification Protocols
- Variable Handling

**Evaluation Criteria:**
- Clarity, Completeness, Consistency
- Actionability, Safety

Format in plain text with appropriate spacing. Use direct, clear language.

Generate comprehensive AI Engine Custom Instructions.
`;

  const result = await callChatCompletion(
    [
      {
        role: "system",
        content:
          "You are an AI instruction architect creating custom AI behavioral guidelines.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      model: "gpt-4o",
      temperature: 0.3,
      maxTokens: 3500,
    },
  );

  return result;
}

// ============================================================================
// STAGE 7: EXECUTIVE SUMMARY
// ============================================================================

async function generateExecutiveSummary(
  responses: InterviewResponseMap,
  documents: {
    marketResearch: string;
    idealCustomerAvatar: string;
    missionVisionValues: string;
    positioningStatement: string;
  },
): Promise<string> {
  const prompt = `
Create a concise executive summary (300-500 words) of this business profile.

**BUSINESS FOUNDATION:**
${responses.business_description}

**KEY DOCUMENTS GENERATED:**
Market Research: ${documents.marketResearch.substring(0, 400)}...
Ideal Customer: ${documents.idealCustomerAvatar.substring(0, 400)}...
Mission & Vision: ${documents.missionVisionValues.substring(0, 400)}...
Positioning: ${documents.positioningStatement.substring(0, 400)}...

Create a compelling executive summary that captures:
- What this business does and who they serve
- Their unique value proposition
- Key differentiators
- Target customer profile
- Strategic positioning

Write in a professional, compelling tone that would be suitable for investors or partners.
`;

  const result = await callChatCompletion(
    [
      {
        role: "system",
        content: "You are a business writer creating executive summaries.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    {
      model: "gpt-4o",
      temperature: 0.4,
      maxTokens: 800,
    },
  );

  return result;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function estimateTokens(text: string): number {
  // Rough estimate: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

function extractToneFromCommunicationStyle(style: string): string {
  // Extract tone adjectives from communication style
  const toneKeywords = [
    "formal",
    "casual",
    "friendly",
    "professional",
    "conversational",
    "authoritative",
    "empathetic",
    "humorous",
    "direct",
    "warm",
  ];

  const lowerStyle = style.toLowerCase();
  const foundTones = toneKeywords.filter((tone) => lowerStyle.includes(tone));

  return foundTones.length > 0
    ? foundTones.join(", ")
    : "professional and approachable";
}
