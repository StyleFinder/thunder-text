# Product Requirements Document: Content Creation Center

**Product**: Thunder Text Content Creation Center
**Version**: 1.0
**Date**: 2025-10-16
**Status**: Draft
**Owner**: Product Team

---

## Executive Summary

The Content Creation Center is a new feature for Thunder Text that extends the platform's AI capabilities beyond product descriptions to comprehensive content marketing. By learning each user's unique writing style, tone, and voice through sample analysis, the system will generate blogs, ads, store copy, and social media content that authentically represents the store owner's brand voice.

### Key Differentiator
Unlike generic AI content generators, the Content Creation Center creates a personalized "Brand Voice Profile" from user samples, ensuring all generated content maintains consistency with the owner's authentic communication style across all marketing channels.

### Business Value
- **Retention**: Increases platform stickiness by becoming central content hub
- **Revenue**: Premium feature tier opportunity
- **Differentiation**: Unique voice-matching capability vs competitors
- **Efficiency**: Reduces content creation time from hours to minutes

---

## 1. Business Goals

### Primary Objectives
1. **Extend Platform Value**: Transform Thunder Text from product-only to full content marketing platform
2. **Increase User Engagement**: Drive daily active usage through diverse content needs
3. **Reduce Churn**: Become indispensable tool for store owners' content workflow
4. **Enable Upsell**: Create foundation for premium tier pricing

### Success Metrics (6 months post-launch)
| Metric | Target | Measurement |
|--------|--------|-------------|
| Adoption Rate | 60% of active users | Users who upload voice samples |
| Content Generations | 20 per user/month | Average content pieces created |
| Voice Profile Accuracy | 80% satisfaction | User survey: "Content matches my voice" |
| Feature Retention | 70% at 90 days | Users generating content monthly |
| Thunder Text Integration | 40% adoption | Users creating voice-infused templates |

---

## 2. User Personas

### Primary Persona: Sarah - Boutique Owner
- **Background**: Owns small fashion boutique, 1-2 employees, limited marketing budget
- **Pain Points**:
  - Spends 5+ hours/week writing social posts, blogs, product descriptions
  - Struggles maintaining consistent brand voice across channels
  - Can't afford professional copywriter or marketing agency
- **Goals**:
  - Create engaging content quickly without sacrificing authenticity
  - Maintain personal connection with customers through writing
  - Scale marketing efforts without hiring

### Secondary Persona: Marcus - Multi-Channel Retailer
- **Background**: Sells on Shopify + Amazon + social commerce, 5-10 employees
- **Pain Points**:
  - Managing content across multiple platforms is overwhelming
  - Team creates inconsistent messaging
  - Needs content in bulk for seasonal campaigns
- **Goals**:
  - Standardize brand voice across team and platforms
  - Generate campaign content efficiently
  - Train team on consistent messaging

---

## 3. Functional Requirements

### 3.1 Core Features

#### Feature 1: Brand Voice Learning System

**FR-1.1: Training Sample Upload**
- **Description**: Users upload 3-5 high-quality content samples representing their writing style
- **Acceptance Criteria**:
  - Support paste text or file upload (.txt, .doc, .pdf)
  - Minimum 500 words, maximum 5000 words per sample
  - Accept sample types: blog posts, emails, product descriptions, about pages
  - Show character/word count in real-time
  - Display onboarding guidance with do's and don'ts
- **Priority**: P0 (MVP blocker)

**Onboarding Guidance**:
```
✅ DO:
- Include your best writing that represents your brand
- Choose content that resonates with your target customers
- Use multiple content types (blogs, emails, descriptions)
- Ensure samples are well-written and edited

❌ DON'T:
- Upload technical documentation or legal text
- Include content written by others
- Use AI-generated content as samples
- Submit incomplete or rough draft content
```

**FR-1.2: Brand Voice Profile Generation**
- **Description**: AI processes samples to create comprehensive voice profile
- **Acceptance Criteria**:
  - Profile generated within 30 seconds of sample submission
  - Profile includes: tone, style, vocabulary patterns, sentence structure, personality traits
  - Profile length: 500-1000 words (optimized for prompt injection)
  - Auto-generates upon sample upload/update
  - Stores in database with timestamp and version tracking
- **Priority**: P0 (MVP blocker)

**Sample Voice Profile Format**:
```
Brand Voice Profile for [Store Name]:

TONE CHARACTERISTICS:
- Primary: Warm, conversational, approachable
- Secondary: Professional with casual confidence
- Emotional Quality: Friendly expert, enthusiastic without hyperbole

WRITING STYLE:
- Sentence Length: Mix of short (8-12 words) and medium (15-20 words)
- Paragraph Structure: 2-3 sentences per paragraph, uses white space
- Punctuation: Frequent em dashes, occasional ellipses for emphasis
- Contractions: Frequently used (you'll, we're, here's)

VOCABULARY PATTERNS:
- Preferred Terms: "discover" over "find", "curated" over "selected"
- Avoided Terms: Jargon, corporate speak, overly formal language
- Signature Phrases: "here's the thing", "let's be real", "we've got you"
- Descriptive Style: Sensory details, storytelling approach

BRAND PERSONALITY:
- Voice Type: Knowledgeable friend, trusted advisor
- Perspective: First-person plural (we/us) to build community
- Humor Level: Light, warm humor; not sarcastic or edgy
- Authority: Confident but humble, educational without condescending

FORMATTING PREFERENCES:
- Lists: Frequent use of bullet points for clarity
- Headers: Conversational, question-based headers
- Emphasis: Bold for key points, italics for emphasis
```

**FR-1.3: Voice Profile Management**
- **Description**: Users can view, edit, and regenerate their brand voice profile
- **Acceptance Criteria**:
  - Full profile text visible to users (transparent AI analysis)
  - Inline editing with autosave
  - "Regenerate Profile" button (uses current samples)
  - Version history (keep last 3 versions)
  - Rollback to previous version capability
- **Priority**: P0 (MVP blocker)

**FR-1.4: Sample Management**
- **Description**: Users can add, remove, or swap training samples
- **Acceptance Criteria**:
  - View all uploaded samples in list view
  - Mark samples as active/inactive (max 5 active at once)
  - Delete samples with confirmation
  - Auto-regenerate profile when samples change
  - Show last profile update timestamp
- **Priority**: P1 (launch requirement)

---

#### Feature 2: Content Generation Engine

**FR-2.1: Content Type Selection**
- **Description**: Users select what type of content to generate
- **Content Types**:
  - **Blog Posts**: Long-form content (800-2000 words)
  - **Ad Copy**: Short persuasive content (50-300 words)
  - **Store Copy**: Website pages, about us, policies (300-1000 words)
  - **Social Media**: Platform-specific posts (see FR-2.6)
- **Acceptance Criteria**:
  - Visual card-based selection UI
  - Show description and example for each type
  - Disable unavailable types (social media in Phase 1)
  - Track most-used content types for analytics
- **Priority**: P0 (MVP blocker)

**FR-2.2: Advanced Generation Controls**
- **Description**: Users customize generation parameters with intuitive controls
- **Controls**:
  1. **Word Count Slider**: 500-2000 words (50-word increments)
  2. **Tone Intensity Slider**: More Casual ↔ More Professional (5 levels)
  3. **Call-to-Action Selector**: Shop Now | Learn More | Visit Website | Contact Us | Custom
  4. **Topic/Brief**: Text area for content description (required)
- **Acceptance Criteria**:
  - Real-time preview of settings
  - Show estimated generation time
  - Save user's last settings as defaults
  - Validate topic/brief is not empty (min 10 characters)
- **Priority**: P0 (MVP blocker)

**FR-2.3: Content Generation Process**
- **Description**: AI generates content matching user's brand voice and parameters
- **Technical Flow**:
  1. Load user's brand voice profile from database
  2. Load platform-specific requirements (if social media)
  3. Construct generation prompt with voice profile + user parameters
  4. Call OpenAI API with prompt
  5. Post-process output (formatting, validation)
  6. Display generated content
- **Acceptance Criteria**:
  - Generation completes in <15 seconds (95th percentile)
  - Show loading state with progress indication
  - Handle API errors gracefully with retry
  - Generated content matches requested word count (±10%)
  - Content matches brand voice profile characteristics
- **Priority**: P0 (MVP blocker)

**FR-2.4: Content Editing & Refinement**
- **Description**: Users can edit generated content inline and regenerate
- **Acceptance Criteria**:
  - Rich text editor with formatting tools (bold, italic, lists, headers)
  - Character/word count display
  - "Regenerate" button with option to adjust parameters
  - Overwrite mode (no version history for individual content)
  - "Copy to Clipboard" button
  - "Save Content" button (stores in content library)
- **Priority**: P0 (MVP blocker)

**FR-2.5: Content Library**
- **Description**: Users can save and organize generated content
- **Acceptance Criteria**:
  - List view of all saved content
  - Filter by content type and date
  - Search by topic/keywords
  - Delete with confirmation
  - Export individual content as .txt or .pdf
  - Show creation date and content type tag
- **Priority**: P1 (launch requirement)

**FR-2.6: Social Media Platform Support (Phase 2)**
- **Description**: Generate platform-specific social media content with visual mockups
- **Platforms**: Facebook, Instagram, TikTok (one at a time in MVP)
- **Acceptance Criteria**:
  - Select target platform
  - Load platform-specific Markdown requirements
  - Enforce character limits automatically
  - Generate hashtag recommendations
  - Product image selector (see FR-2.7)
  - Show platform mockup preview (see FR-2.8)
  - Validate content against platform rules
- **Priority**: P2 (Phase 2)

**FR-2.7: Product Image Selector**
- **Description**: Users can select product images to include in social posts
- **Acceptance Criteria**:
  - Search bar to find products from store
  - Display product images in grid view
  - Multi-select images (up to platform limit)
  - Show selected images in order
  - Drag-and-drop to reorder images
  - Auto-format image count per platform (Instagram: 10, Facebook: 10, TikTok: 35 slides)
- **Priority**: P2 (Phase 2)

**FR-2.8: Platform Mockup Preview**
- **Description**: Show realistic preview of how post will appear on each platform
- **Acceptance Criteria**:
  - Accurate platform UI mockup (profile picture, username, layout)
  - Display images inline with generated text
  - Show character count and remaining characters
  - Show hashtags in platform-specific style
  - Responsive preview (desktop and mobile views)
  - Update preview in real-time as content changes
- **Priority**: P2 (Phase 2)

---

#### Feature 3: Thunder Text Integration

**FR-3.1: Voice-Infused Template Creation**
- **Description**: Create product description templates that incorporate brand voice profile
- **Location**: Settings → Prompt Templates page
- **Acceptance Criteria**:
  - "Create Template from Voice" button on templates page
  - User enters template name and product category
  - AI generates template using:
    - Thunder Text master prompt structure
    - User's brand voice profile
    - Product category best practices
  - Save as new template in existing template system
  - Users can have multiple voice-infused templates per category
- **Priority**: P1 (launch requirement)

**Template Generation Example**:
```
Template Name: "Jewelry - Elegant Voice"
Category: Jewelry

System Prompt:
You are creating a product description for a jewelry item.
Use the following brand voice characteristics:
[INSERT BRAND VOICE PROFILE]

Product details will be provided. Create a description that:
- Highlights craftsmanship and materials
- Evokes emotion and occasion
- Includes care instructions
- Maintains the brand voice above
- Length: 150-250 words
```

**FR-3.2: Template Management**
- **Description**: Users manage voice-infused templates alongside regular templates
- **Acceptance Criteria**:
  - Voice templates marked with badge/icon
  - Edit template (regenerate with updated voice)
  - Duplicate template for variations
  - Set default template per product category
  - Show last updated date
- **Priority**: P1 (launch requirement)

---

### 3.2 Platform-Specific Requirements

#### Platform Markdown Files
Each social media platform has a Markdown reference file that AI reads during generation.

**File Structure**:
```
/docs/platform-requirements/
  ├── facebook.md
  ├── instagram.md
  └── tiktok.md
```

**Content Requirements** (each file):
1. **Character Limits**
   - Post text max characters
   - Caption max characters
   - Comment max characters
2. **Media Specifications**
   - Image dimensions and aspect ratios
   - Video length and size limits
   - Carousel/multi-image limits
3. **Best Practices**
   - Optimal hashtag count
   - Emoji usage guidelines
   - Mention/tagging rules
   - Link behavior
4. **Content Restrictions**
   - Prohibited content types
   - Sensitive content rules
   - Copyright considerations
5. **Formatting Rules**
   - Line break handling
   - Text formatting (bold, italic support)
   - Special characters

**Example: facebook.md**
```markdown
# Facebook Content Requirements

## Character Limits
- Post text: 63,206 characters (recommend 40-80 for optimal engagement)
- Link description: 300 characters
- Image caption: 2,200 characters

## Image Specifications
- Recommended size: 1200 x 630 pixels
- Aspect ratio: 1.91:1 (landscape), 1:1 (square), 4:5 (portrait)
- Max file size: 4 MB
- Formats: JPG, PNG
- Multi-photo posts: Up to 10 images

## Best Practices
- Optimal post length: 40-80 characters (higher engagement)
- Hashtags: 1-3 hashtags (avoid overuse)
- Emojis: Use sparingly for emphasis
- Questions: Posts with questions get 100% more comments
- Timing: Post when your audience is most active

## Call-to-Action
- Supported CTAs: Shop Now, Learn More, Sign Up, Book Now, Contact Us
- Place CTA at end of post or in comments
- Use link shorteners for clean appearance

## Content Restrictions
- Avoid clickbait or sensational language
- No misleading claims
- Respect copyright for images and text
- Follow community standards
```

---

## 4. Technical Requirements

### 4.1 Architecture Overview

```
User → Frontend (Next.js) → API Routes → OpenAI API
                             ↓
                         Supabase DB
                             ↓
                    [content_samples]
                    [brand_voice_profiles]
                    [generated_content]
```

### 4.2 Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| Frontend | Next.js 15 (App Router) | Existing Thunder Text framework |
| Backend | Next.js API Routes | Server-side rendering, same codebase |
| Database | Supabase (PostgreSQL) | Existing infrastructure |
| AI/ML | OpenAI GPT-4 Turbo | Best-in-class language model |
| Storage | Supabase Storage | User uploads, generated content |
| Authentication | Supabase Auth | Existing user system |
| Styling | Tailwind CSS | Existing design system |

### 4.3 Database Schema

```sql
-- Content samples uploaded by users
CREATE TABLE content_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sample_text TEXT NOT NULL,
  sample_type VARCHAR(50) NOT NULL, -- 'blog', 'email', 'description', 'other'
  word_count INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_content_samples_user_id ON content_samples(user_id);
CREATE INDEX idx_content_samples_active ON content_samples(user_id, is_active);

-- AI-generated brand voice profiles
CREATE TABLE brand_voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_text TEXT NOT NULL,
  profile_version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  user_edited BOOLEAN DEFAULT false,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sample_ids UUID[] NOT NULL -- Track which samples generated this profile
);

CREATE INDEX idx_voice_profiles_user_id ON brand_voice_profiles(user_id);
CREATE INDEX idx_voice_profiles_current ON brand_voice_profiles(user_id, is_current);

-- Generated content pieces
CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL, -- 'blog', 'ad', 'store_copy', 'social_facebook', etc.
  platform VARCHAR(50), -- NULL for non-social, 'facebook', 'instagram', 'tiktok' for social
  topic TEXT NOT NULL,
  generated_text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  generation_params JSONB, -- Store slider values, CTA choice, etc.
  product_images JSONB, -- Array of product image URLs for social posts
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX idx_generated_content_type ON generated_content(user_id, content_type);
CREATE INDEX idx_generated_content_saved ON generated_content(user_id, is_saved);

-- Extend existing prompt_templates table
ALTER TABLE prompt_templates
ADD COLUMN is_voice_infused BOOLEAN DEFAULT false,
ADD COLUMN voice_profile_id UUID REFERENCES brand_voice_profiles(id);
```

### 4.4 API Endpoints

```typescript
// Content samples management
POST   /api/content-center/samples              // Upload new sample
GET    /api/content-center/samples              // List user's samples
PATCH  /api/content-center/samples/:id          // Update sample (toggle active)
DELETE /api/content-center/samples/:id          // Delete sample

// Brand voice profile
POST   /api/content-center/voice/generate       // Generate profile from samples
GET    /api/content-center/voice                // Get current voice profile
PATCH  /api/content-center/voice/:id            // Edit voice profile
GET    /api/content-center/voice/history        // Get profile version history

// Content generation
POST   /api/content-center/generate             // Generate new content
GET    /api/content-center/content              // List saved content
GET    /api/content-center/content/:id          // Get specific content
DELETE /api/content-center/content/:id          // Delete saved content

// Template integration
POST   /api/content-center/templates/from-voice // Create voice-infused template
GET    /api/templates                           // List templates (existing endpoint)

// Platform requirements
GET    /api/content-center/platforms/:platform  // Get platform markdown requirements
```

### 4.5 OpenAI Integration

**Voice Profile Generation Prompt**:
```typescript
const VOICE_PROFILE_PROMPT = `
You are a writing style analyst. Analyze the following content samples and create a comprehensive brand voice profile.

CONTENT SAMPLES:
${samples.map((s, i) => `Sample ${i + 1} (${s.type}):\n${s.text}`).join('\n\n')}

Create a detailed brand voice profile that captures:
1. Tone Characteristics (primary, secondary, emotional quality)
2. Writing Style (sentence length, paragraph structure, punctuation, contractions)
3. Vocabulary Patterns (preferred terms, avoided terms, signature phrases)
4. Brand Personality (voice type, perspective, humor level, authority)
5. Formatting Preferences (lists, headers, emphasis)

Format the profile in clear sections as shown in the example. Be specific and actionable.
The profile will be used to generate future content matching this voice.
`;
```

**Content Generation Prompt**:
```typescript
const CONTENT_GENERATION_PROMPT = `
You are a content creator writing for ${storeName}.

BRAND VOICE PROFILE:
${voiceProfile}

${platformRequirements ? `PLATFORM REQUIREMENTS:\n${platformRequirements}\n` : ''}

TASK: Create ${contentType} content about: ${topic}

PARAMETERS:
- Word count: ${wordCount} words (±10%)
- Tone adjustment: ${toneIntensity} (1=very casual, 5=very professional)
- Call-to-action: ${ctaType}
${productImages ? `- Include references to product images provided` : ''}

Generate content that:
1. Matches the brand voice profile exactly
2. Meets the word count target
3. Adjusts tone per the intensity parameter while maintaining brand voice
4. Includes the specified call-to-action naturally
${platformRequirements ? '5. Follows all platform-specific requirements' : ''}

Output only the content, no explanations or meta-commentary.
`;
```

### 4.6 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Voice Profile Generation | < 30 seconds | 95th percentile |
| Content Generation | < 15 seconds | 95th percentile |
| Sample Upload | < 5 seconds | 95th percentile |
| Page Load Time | < 2 seconds | Lighthouse score |
| API Availability | 99.5% uptime | Monthly average |

### 4.7 Security Requirements

**Data Protection**:
- All user content encrypted at rest (Supabase default encryption)
- Content samples and profiles accessible only by owning user
- Row Level Security (RLS) policies on all tables
- No sharing of voice profiles between users

**API Security**:
- All endpoints require authentication
- Rate limiting: 100 requests/hour per user for generation
- Input validation and sanitization for all user content
- OpenAI API key stored in environment variables (never client-side)

**Privacy Compliance**:
- Users can delete all samples and profiles (GDPR right to erasure)
- Export all user data in portable format (GDPR data portability)
- Clear disclosure that content is processed by OpenAI
- No training OpenAI models on user data (opt-out in API calls)

---

## 5. User Experience Flows

### 5.1 Onboarding Flow: Brand Voice Setup

```
Step 1: Welcome Screen
├─ Headline: "Teach Thunder Text Your Unique Voice"
├─ Subheadline: "Upload 3-5 samples of your writing so we can match your style"
├─ Visual: Illustration of content transformation
└─ CTA: "Get Started"

Step 2: Upload Samples
├─ Instructions: [Show do's and don'ts guidance]
├─ Upload Options:
│  ├─ Paste Text (textarea with word count)
│  └─ Upload File (.txt, .doc, .pdf)
├─ Sample List: Show uploaded samples with word count
├─ Validation: Minimum 3 samples, 500-5000 words each
└─ CTA: "Analyze My Voice" (enabled when 3+ samples uploaded)

Step 3: Voice Analysis (Loading State)
├─ Progress Indicator: "Analyzing your writing style..."
├─ Estimated Time: "This takes about 20-30 seconds"
├─ Educational Content: Show tips about voice consistency
└─ Animation: Engaging visual feedback

Step 4: Voice Profile Review
├─ Success Message: "We've learned your voice! ✓"
├─ Profile Display: Show full AI-generated profile in collapsible sections
├─ Edit Option: "Make any adjustments if needed"
├─ Preview: "Here's a sample blog intro in your voice..." (show example)
└─ CTAs:
   ├─ "Looks Good - Continue" (primary)
   └─ "Regenerate Profile" (secondary)

Step 5: Completion
├─ Success Screen: "You're all set!"
├─ Next Steps: "Now you can create blogs, ads, and more in your voice"
└─ CTA: "Create Your First Content"
```

### 5.2 Content Generation Flow

```
Navigation: Top Nav → Content Center → Create Content

Step 1: Content Type Selection
├─ Visual Cards:
│  ├─ Blog Post (icon, description, "Most Popular" badge)
│  ├─ Ad Copy (icon, description)
│  ├─ Store Copy (icon, description)
│  └─ Social Media (icon, "Coming Soon" badge in Phase 1)
└─ User clicks card to proceed

Step 2: Configure Generation
├─ Form Layout:
│  ├─ Topic/Brief (textarea, required)
│  │  └─ Placeholder: "Describe what you want to write about..."
│  ├─ Word Count Slider (500-2000, default 1000)
│  │  └─ Real-time display: "~1000 words (~4 min read)"
│  ├─ Tone Intensity Slider (1-5, default 3)
│  │  └─ Labels: "Very Casual" ↔ "Very Professional"
│  │  └─ Helper: "Adjust tone while keeping your brand voice"
│  └─ Call-to-Action Dropdown
│     └─ Options: Shop Now | Learn More | Visit Website | Contact Us | Custom
└─ CTAs:
   ├─ "Generate Content" (primary, disabled until topic filled)
   └─ "Load Saved Settings" (secondary)

Step 3: Generation (Loading State)
├─ Progress: "Creating your content..."
├─ Estimated Time: "~10-15 seconds"
├─ Background: Show platform/writing tips
└─ Cancel Option: "Cancel Generation"

Step 4: Review & Edit
├─ Generated Content Display (rich text editor)
├─ Sidebar:
│  ├─ Word Count: "1,047 words"
│  ├─ Regenerate Button: "Try Again" (reuses settings)
│  ├─ Adjust Settings: Link back to Step 2 with current values
│  └─ Actions:
│     ├─ Copy to Clipboard
│     ├─ Save to Library
│     └─ Download (.txt, .pdf)
└─ Inline Editing: User can modify text directly

Step 5: Save (Optional)
├─ Save Modal:
│  ├─ Name This Content (input, default from topic)
│  └─ Add Tags (optional, for filtering)
└─ Confirmation: "Saved to Content Library ✓"
```

### 5.3 Social Media Generation Flow (Phase 2)

```
Step 1: Platform Selection
└─ Cards: Facebook | Instagram | TikTok (one at a time in MVP)

Step 2: Configure Post
├─ Topic/Brief
├─ Product Image Selector:
│  ├─ Search Products (search bar)
│  ├─ Product Grid (with images)
│  ├─ Multi-Select Images (up to platform limit)
│  └─ Selected Images Preview (reorderable)
├─ Hashtag Strategy Selector:
│  └─ Options: Auto-Generate | Custom | None
└─ CTA: "Generate Post"

Step 3: Platform Mockup Preview
├─ Split View:
│  ├─ Left: Platform Mockup (realistic UI)
│  │  ├─ Profile Picture & Name
│  │  ├─ Product Images (carousel if multiple)
│  │  ├─ Post Text
│  │  └─ Hashtags (platform-styled)
│  └─ Right: Edit Panel
│     ├─ Character Count: "127/2200 characters"
│     ├─ Edit Text (textarea)
│     ├─ Edit Hashtags (tag input)
│     └─ Reorder Images (drag-drop)
└─ View Toggle: Desktop | Mobile

Step 4: Finalize
├─ Actions:
│  ├─ Copy Post Text
│  ├─ Download Images
│  ├─ Save to Library
│  └─ "Create for Another Platform" (Facebook → Instagram)
└─ Tip: "Post directly to [Platform] from their business tools"
```

### 5.4 Template Creation Flow

```
Navigation: Settings → Prompt Templates → "Create Template from Voice"

Step 1: Template Configuration
├─ Form:
│  ├─ Template Name (input, required)
│  │  └─ Example: "Jewelry - Elegant Voice"
│  ├─ Product Category (dropdown)
│  │  └─ Options: Jewelry, Clothing, Home Goods, Beauty, etc.
│  └─ Voice Profile (auto-populated, display current profile name)
└─ CTA: "Generate Template"

Step 2: Template Generation (Loading)
├─ Progress: "Creating voice-infused template..."
└─ Time: "~15 seconds"

Step 3: Template Review
├─ Display:
│  ├─ Template Name
│  ├─ System Prompt (editable textarea)
│  ├─ Voice Badge: "✓ Voice-Infused Template"
│  └─ Preview: "Test this template with sample product"
└─ Actions:
   ├─ Save Template (primary)
   ├─ Edit & Save (modify prompt)
   └─ Regenerate (create new version)

Step 4: Confirmation
├─ Success: "Template saved! ✓"
├─ Next Steps:
│  └─ "Use this template when creating product descriptions"
└─ CTA: "View All Templates"
```

---

## 6. Navigation & Information Architecture

### 6.1 App-Wide Navigation

```
Thunder Text App
├─ Dashboard (existing)
├─ Products (existing)
├─ Templates (existing - Settings → Prompt Templates)
├─ **Content Center** [NEW TOP-LEVEL NAV]
│  ├─ Create Content [SUBNAV]
│  │  ├─ Select Content Type
│  │  ├─ Generate Content Interface
│  │  └─ Content Library (list view)
│  └─ Content Center Settings [SUBNAV]
│     ├─ Voice Profile Management
│     │  ├─ View Current Profile
│     │  ├─ Edit Profile
│     │  └─ Profile Version History
│     └─ Training Samples
│        ├─ Manage Samples (list view)
│        ├─ Upload New Sample
│        └─ Sample Guidelines
└─ Settings (existing)
   └─ Prompt Templates (existing - add "Create from Voice" button here)
```

### 6.2 URL Structure

```
/content-center                          # Redirect to /content-center/create
/content-center/create                   # Main content generation interface
/content-center/create/blog              # Blog post generation
/content-center/create/ad                # Ad copy generation
/content-center/create/store-copy        # Store copy generation
/content-center/create/social/:platform  # Social media (Phase 2)
/content-center/library                  # Saved content list view
/content-center/library/:id              # View/edit specific content
/content-center/settings                 # Content Center settings hub
/content-center/settings/voice           # Voice profile management
/content-center/settings/samples         # Training samples management
```

---

## 7. Implementation Phases

### Phase 1: Core Content Generation (MVP) - 6 weeks

**Week 1-2: Foundation**
- Database schema setup and migrations
- API endpoint scaffolding
- Authentication and RLS policies
- Sample upload infrastructure

**Week 3-4: Voice Learning**
- Brand voice profile generation (OpenAI integration)
- Voice profile management UI
- Sample management interface
- Onboarding flow

**Week 5-6: Content Generation**
- Blog post generation
- Ad copy generation
- Store copy generation
- Advanced controls (sliders, CTA selector)
- Content library (save/list/delete)
- Rich text editor integration

**Launch Criteria**:
- ✅ Users can upload 3-5 training samples
- ✅ AI generates editable brand voice profile
- ✅ Generate blogs, ads, store copy with advanced controls
- ✅ Content library with save/search/delete
- ✅ 80% user satisfaction with voice match (user testing)

---

### Phase 2: Social Media Integration - 4 weeks

**Week 7-8: Platform Infrastructure**
- Create platform-specific Markdown files (Facebook, Instagram, TikTok)
- Platform requirements parser
- Product image selector component
- Image upload and storage infrastructure

**Week 9: Facebook Integration**
- Facebook post generation
- Character limit enforcement
- Hashtag generation
- Platform mockup UI (desktop + mobile)
- Image display inline with post

**Week 10: Instagram & TikTok**
- Instagram post generation (carousel support)
- TikTok caption generation
- Platform-specific best practices integration
- Multi-platform preview comparison

**Launch Criteria**:
- ✅ Generate platform-specific social posts (Facebook, Instagram, TikTok)
- ✅ Product image selector with multi-select
- ✅ Realistic platform mockup previews
- ✅ Auto-enforce character limits and best practices
- ✅ Users can generate for multiple platforms efficiently

---

### Phase 3: Thunder Text Deep Integration - 2 weeks

**Week 11-12: Template System**
- "Create Template from Voice" button on templates page
- Voice-infused template generation
- Template management (edit, duplicate, set default)
- Integration with existing product description flow
- Testing with real user workflows

**Launch Criteria**:
- ✅ One-click creation of voice-infused templates
- ✅ Templates work seamlessly with product description generation
- ✅ Users can manage multiple category-specific templates
- ✅ Voice profile updates propagate to templates (regenerate option)

---

### Phase 4: Enhancement & Optimization - Ongoing

**Post-Launch Improvements**:
- Multi-platform generation (all 3 platforms at once)
- Content calendar integration
- A/B testing for generated content
- Performance analytics (which content types perform best)
- Advanced voice profile options (multiple voice profiles per user)
- Team collaboration features (shared voice profiles)
- Export to social scheduling tools (Buffer, Hootsuite)

---

## 8. Success Metrics & KPIs

### 8.1 Adoption Metrics

| Metric | Target (3 months) | Target (6 months) | Measurement |
|--------|------------------|-------------------|-------------|
| Onboarding Completion | 70% | 80% | Users who complete voice profile setup |
| First Content Generated | 60% | 75% | Users who generate at least one piece |
| Weekly Active Creators | 40% | 55% | Users generating content weekly |
| Template Creation Rate | 30% | 50% | Users creating voice-infused templates |

### 8.2 Engagement Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Content Per User Per Month | 20 pieces | Average generations per active user |
| Content Types Diversity | 2.5 types | Average number of content types used |
| Edit Rate | <30% | % of content requiring substantial edits |
| Regeneration Rate | <20% | % of generations requiring retry |
| Save Rate | 60% | % of generated content saved to library |

### 8.3 Quality Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Voice Match Satisfaction | 80% satisfied | Post-generation survey: "Content matches my voice" |
| Content Usability | 75% used as-is | Survey: "Used content without major edits" |
| Time Savings | 70% faster | Survey: "Time saved vs. writing manually" |
| Feature NPS | 50+ | Net Promoter Score for Content Center feature |

### 8.4 Business Metrics

| Metric | Target (6 months) | Impact |
|--------|------------------|--------|
| User Retention | +15% vs baseline | Users with Content Center have higher retention |
| Platform Stickiness | +25% DAU | Daily active usage increase |
| Premium Conversion | 20% | Users willing to pay for premium tier |
| Churn Reduction | -10% | Content Center users churn less |

### 8.5 Technical Metrics

| Metric | Target | Monitoring |
|--------|--------|-----------|
| API Success Rate | 99%+ | Error tracking for OpenAI API |
| Generation Latency | <15s (p95) | Response time tracking |
| Cost Per Generation | <$0.05 | OpenAI API cost per request |
| Database Query Performance | <100ms | Query execution time |

---

## 9. Risk Assessment & Mitigation

### 9.1 Technical Risks

**Risk: OpenAI API Costs Exceed Budget**
- **Probability**: Medium
- **Impact**: High (profitability concern)
- **Mitigation**:
  - Implement rate limiting (100 generations/user/month for free tier)
  - Optimize prompt size (voice profile <1000 words)
  - Monitor costs per user in real-time
  - Create premium pricing tier for heavy users
  - Cache common generations where possible

**Risk: OpenAI API Downtime**
- **Probability**: Low
- **Impact**: High (feature unusable)
- **Mitigation**:
  - Implement retry logic with exponential backoff
  - Queue failed requests for later processing
  - Display clear error messages with retry option
  - Consider Azure OpenAI as backup provider
  - Monitor OpenAI status page proactively

**Risk: Voice Profile Quality Insufficient**
- **Probability**: Medium
- **Impact**: High (core value proposition fails)
- **Mitigation**:
  - User testing with real samples before launch
  - Provide clear sample guidelines to improve input quality
  - Allow manual profile editing for refinement
  - A/B test different profile generation prompts
  - Collect feedback on every generation for tuning

**Risk: Database Performance Issues**
- **Probability**: Low
- **Impact**: Medium (slow experience)
- **Mitigation**:
  - Proper indexing on user_id, content_type, is_active
  - Pagination for large content libraries
  - Archive old content (>1 year) to separate table
  - Monitor query performance with Supabase analytics

### 9.2 Product Risks

**Risk: Users Don't Provide Quality Training Samples**
- **Probability**: High
- **Impact**: High (poor output quality)
- **Mitigation**:
  - Strong onboarding guidance with examples
  - Validation: reject samples <500 words
  - Show examples of good vs bad samples
  - Provide feedback on sample quality before processing
  - Educational content about voice consistency

**Risk: Generated Content Requires Too Much Editing**
- **Probability**: Medium
- **Impact**: High (value proposition weakens)
- **Mitigation**:
  - Continuous prompt engineering optimization
  - Collect feedback on each generation
  - Provide "regenerate with adjustments" option
  - Show estimated edit time vs manual writing time
  - Offer "improvement suggestions" based on edits

**Risk: Feature Too Complex for Target Users**
- **Probability**: Low
- **Impact**: Medium (low adoption)
- **Mitigation**:
  - Simplify onboarding with step-by-step wizard
  - Provide video tutorials and tooltips
  - Smart defaults (most users won't adjust sliders)
  - Progressive disclosure (hide advanced options initially)
  - In-app help and examples

**Risk: Users Don't See Value Beyond Product Descriptions**
- **Probability**: Medium
- **Impact**: High (low engagement)
- **Mitigation**:
  - Educational content on content marketing benefits
  - Show use case examples (blog → SEO, social → engagement)
  - Prompt users with content ideas based on store data
  - Gamification (badges for using different content types)
  - Success stories from beta users

### 9.3 Business Risks

**Risk: Cannibalization of Core Product**
- **Probability**: Low
- **Impact**: Medium (reduced product description usage)
- **Mitigation**:
  - Position as complementary, not replacement
  - Show integration benefits (voice-infused templates)
  - Track product description usage for correlation
  - Bundle features in premium tier (both get better together)

**Risk: Competitor Copies Feature Quickly**
- **Probability**: High
- **Impact**: Medium (differentiation loss)
- **Mitigation**:
  - Speed to market (ship fast, iterate faster)
  - Build network effects (stored voice profiles = lock-in)
  - Focus on integration quality (seamless experience)
  - Continuous improvement based on user feedback
  - Build brand around voice authenticity

**Risk: Premium Pricing Resistance**
- **Probability**: Medium
- **Impact**: High (revenue model fails)
- **Mitigation**:
  - Test pricing with beta users before launch
  - Offer generous free tier to prove value
  - Clear ROI messaging (time saved, quality)
  - Flexible pricing tiers (generations/month)
  - Annual discounts for committed users

---

## 10. Open Questions & Future Considerations

### 10.1 Open Questions for User Research

1. **Voice Profile Transparency**: Do users want to see/edit the AI-generated profile, or prefer it hidden?
   - **Hypothesis**: Advanced users want visibility, beginners prefer simplicity
   - **Test**: A/B test with beta users

2. **Multi-Platform Generation**: Should we build "generate for all platforms" or focus on one-at-a-time?
   - **Hypothesis**: One-at-a-time is simpler for MVP, multi-platform for power users
   - **Test**: User interviews about social media workflow

3. **Content Library Organization**: Do users need folders, tags, or is search + filter enough?
   - **Hypothesis**: Search + basic filters sufficient for most users
   - **Test**: Observe how users organize content in beta

4. **Pricing Model**: Usage-based ($/generation) vs. tier-based (generations/month)?
   - **Hypothesis**: Tier-based is more predictable and preferred
   - **Test**: Pricing survey with target users

### 10.2 Future Feature Considerations

**Content Calendar Integration**
- Schedule generated content for future posting
- Reminders to create seasonal content
- Analytics on posting frequency

**Performance Analytics**
- Track which content types perform best (clicks, engagement)
- A/B testing for different versions
- Recommendations based on performance data

**Team Collaboration**
- Shared voice profiles for brands with multiple creators
- Approval workflows for content
- Commenting and revision history

**Advanced Voice Profiles**
- Multiple voice profiles per user (formal vs casual, different audiences)
- Voice profile for specific content types (blog voice vs social voice)
- AI-suggested voice adjustments based on content performance

**Content Repurposing**
- Turn blog posts into social posts automatically
- Create email campaigns from product descriptions
- Summarize long-form content for different channels

**API Access**
- Allow developers to integrate Content Center via API
- Webhooks for automated content generation
- Bulk generation for agencies/power users

**SEO Optimization**
- Keyword suggestions based on store products
- Meta description and title generation
- Internal linking recommendations

---

## Appendix A: Technical Implementation Details

### A.1 Sample OpenAI API Call

```typescript
async function generateBrandVoiceProfile(samples: ContentSample[]): Promise<string> {
  const samplesText = samples.map((s, i) =>
    `Sample ${i + 1} (${s.sample_type}):\n${s.sample_text}`
  ).join('\n\n---\n\n');

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: 'You are a writing style analyst specializing in brand voice identification.'
      },
      {
        role: 'user',
        content: `${VOICE_PROFILE_PROMPT}\n\nCONTENT SAMPLES:\n${samplesText}`
      }
    ],
    temperature: 0.3, // Lower temperature for consistency
    max_tokens: 2000,
  });

  return response.choices[0].message.content;
}
```

### A.2 Sample Content Generation Call

```typescript
async function generateContent(params: GenerationParams): Promise<string> {
  const { userId, contentType, topic, wordCount, toneIntensity, ctaType } = params;

  // Load user's voice profile
  const voiceProfile = await getVoiceProfile(userId);

  // Load platform requirements if social media
  const platformRequirements = contentType.startsWith('social_')
    ? await getPlatformRequirements(contentType.split('_')[1])
    : null;

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      {
        role: 'system',
        content: buildSystemPrompt(voiceProfile, platformRequirements)
      },
      {
        role: 'user',
        content: buildUserPrompt(contentType, topic, wordCount, toneIntensity, ctaType)
      }
    ],
    temperature: 0.7, // Higher temperature for creativity
    max_tokens: Math.ceil(wordCount * 1.5), // Buffer for word count
  });

  return response.choices[0].message.content;
}
```

### A.3 Database Migration Example

```sql
-- Migration: 001_create_content_center_tables.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Content samples table
CREATE TABLE content_samples (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sample_text TEXT NOT NULL,
  sample_type VARCHAR(50) NOT NULL CHECK (sample_type IN ('blog', 'email', 'description', 'other')),
  word_count INTEGER NOT NULL CHECK (word_count >= 500 AND word_count <= 5000),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_content_samples_user_id ON content_samples(user_id);
CREATE INDEX idx_content_samples_active ON content_samples(user_id, is_active) WHERE is_active = true;

-- Limit to 10 samples per user (5 active + 5 inactive buffer)
CREATE OR REPLACE FUNCTION check_sample_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM content_samples WHERE user_id = NEW.user_id) >= 10 THEN
    RAISE EXCEPTION 'Maximum 10 samples per user allowed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_sample_limit
  BEFORE INSERT ON content_samples
  FOR EACH ROW
  EXECUTE FUNCTION check_sample_limit();

-- RLS Policies
ALTER TABLE content_samples ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own samples"
  ON content_samples FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own samples"
  ON content_samples FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own samples"
  ON content_samples FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own samples"
  ON content_samples FOR DELETE
  USING (auth.uid() = user_id);

-- Brand voice profiles table
CREATE TABLE brand_voice_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_text TEXT NOT NULL,
  profile_version INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN DEFAULT true,
  user_edited BOOLEAN DEFAULT false,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sample_ids UUID[] NOT NULL
);

CREATE INDEX idx_voice_profiles_user_id ON brand_voice_profiles(user_id);
CREATE INDEX idx_voice_profiles_current ON brand_voice_profiles(user_id, is_current) WHERE is_current = true;

-- Only one current profile per user
CREATE UNIQUE INDEX idx_voice_profiles_one_current
  ON brand_voice_profiles(user_id)
  WHERE is_current = true;

-- RLS Policies
ALTER TABLE brand_voice_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profiles"
  ON brand_voice_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profiles"
  ON brand_voice_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profiles"
  ON brand_voice_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Generated content table
CREATE TABLE generated_content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type VARCHAR(50) NOT NULL CHECK (
    content_type IN ('blog', 'ad', 'store_copy', 'social_facebook', 'social_instagram', 'social_tiktok')
  ),
  platform VARCHAR(50) CHECK (platform IN ('facebook', 'instagram', 'tiktok')),
  topic TEXT NOT NULL,
  generated_text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  generation_params JSONB,
  product_images JSONB,
  is_saved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_generated_content_user_id ON generated_content(user_id);
CREATE INDEX idx_generated_content_type ON generated_content(user_id, content_type);
CREATE INDEX idx_generated_content_saved ON generated_content(user_id, is_saved) WHERE is_saved = true;
CREATE INDEX idx_generated_content_created ON generated_content(user_id, created_at DESC);

-- RLS Policies
ALTER TABLE generated_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own content"
  ON generated_content FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own content"
  ON generated_content FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own content"
  ON generated_content FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own content"
  ON generated_content FOR DELETE
  USING (auth.uid() = user_id);
```

### A.4 Cost Analysis Spreadsheet

```
OpenAI API Pricing (GPT-4 Turbo as of Oct 2024):
- Input: $0.01 per 1K tokens
- Output: $0.03 per 1K tokens

Voice Profile Generation (one-time per user):
- Input: ~5 samples × 1000 words × 1.3 tokens/word = ~6,500 tokens = $0.065
- Output: ~1000 words × 1.3 tokens/word = ~1,300 tokens = $0.039
- Total: ~$0.10 per user

Content Generation (per request):
- Input: Voice profile (1000 words) + prompt (200 words) = 1,560 tokens = $0.016
- Output: 1000 words average = 1,300 tokens = $0.039
- Total: ~$0.055 per generation

Monthly Cost Per Active User (20 generations/month):
- Voice profile: $0.10 (one-time, amortized over 12 months = $0.008/month)
- Generations: 20 × $0.055 = $1.10/month
- Total: ~$1.11/month per active user

Pricing Strategy Recommendation:
- Free Tier: 10 generations/month (cost: $0.55/user/month)
- Pro Tier: 100 generations/month at $19/month (cost: $5.50/user/month, margin: 71%)
- Enterprise: Unlimited at $99/month (breakeven at ~1800 generations, unlikely)
```

---

## Appendix B: Glossary

**Brand Voice Profile**: AI-generated summary of a user's writing style, tone, vocabulary, and personality, used to generate content matching their voice.

**Content Sample**: User-uploaded text (blog post, email, product description) used to train the brand voice profile.

**Content Type**: Category of content to generate (blog, ad, store copy, social media).

**Generation Parameters**: User-configurable settings (word count, tone intensity, CTA) that customize content output.

**Platform Requirements**: Rules and best practices specific to each social media platform (character limits, hashtags, etc.).

**Prompt Engineering**: Technique of crafting AI prompts to produce desired outputs without fine-tuning models.

**Thunder Text Integration**: Connection between Content Center and existing product description features.

**Voice-Infused Template**: Product description template that incorporates the user's brand voice profile.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-16 | Product Team | Initial PRD creation |

---

**Next Steps**:
1. Stakeholder review and approval
2. Technical feasibility assessment
3. Design mockups for key interfaces
4. User research validation (5-8 interviews)
5. Sprint planning and resource allocation
6. Beta user recruitment

**Questions or Feedback**: Contact product team for clarification or to propose changes to this PRD.
