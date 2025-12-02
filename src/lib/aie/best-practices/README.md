# Best Practices Research & Compilation System

## Overview

Multi-agent system for discovering, analyzing, validating, and compiling advertising best practices into the AIE knowledge base.

## Agent Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  BestPracticesOrchestrator                  │
│                   (Workflow Coordinator)                    │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
                ▼                           ▼
    ┌───────────────────────┐   ┌───────────────────────┐
    │   SourceDiscovery     │   │   ContentExtraction   │
    │       Agent           │   │        Agent          │
    └───────────────────────┘   └───────────────────────┘
                │                           │
                │                           ▼
                │               ┌───────────────────────┐
                │               │    AnalysisAgent      │
                │               │   (Categorization)    │
                │               └───────────────────────┘
                │                           │
                │                           ▼
                │               ┌───────────────────────┐
                │               │    QualityAgent       │
                │               │   (Validation)        │
                │               └───────────────────────┘
                │                           │
                └───────────────────────────┼───────────┐
                                            ▼           ▼
                                ┌───────────────────────┐
                                │    StorageAgent       │
                                │  (Embedding + DB)     │
                                └───────────────────────┘
```

## Agents

### 1. **BestPracticesOrchestrator**

- **Role**: Workflow coordinator and decision maker
- **Responsibilities**:
  - Accept input sources (URLs, files, text)
  - Coordinate agent execution
  - Handle errors and retries
  - Provide progress updates
  - Compile final results

### 2. **SourceDiscoveryAgent**

- **Role**: Find new best practice sources
- **Responsibilities**:
  - Web scraping from known sources (Meta Blueprint, Google Ads Help, etc.)
  - API integration with platform documentation
  - Monitor RSS feeds and industry blogs
  - Discover new high-authority sources
  - Prioritize sources by relevance and credibility

### 3. **ContentExtractionAgent**

- **Role**: Extract content from various formats
- **Responsibilities**:
  - Process PDFs (extract text, images, tables)
  - Transcribe audio/video (Whisper API)
  - Parse HTML/markdown
  - Extract structured data from images (OCR)
  - Handle multi-page documents
  - Clean and normalize text

### 4. **AnalysisAgent**

- **Role**: Understand and categorize content
- **Responsibilities**:
  - Identify platform (meta, google, tiktok, pinterest)
  - Categorize by topic (ad-copy, targeting, creative-strategy, etc.)
  - Determine goal (awareness, engagement, conversion)
  - Extract key insights and actionable takeaways
  - Generate descriptive title and summary
  - Identify relevant tags/keywords
  - Extract example quotes or snippets

### 5. **QualityAgent**

- **Role**: Validate accuracy and relevance
- **Responsibilities**:
  - Score content quality (1-10)
  - Verify factual accuracy
  - Check for outdated information
  - Detect bias or promotional content
  - Ensure actionable insights exist
  - Flag duplicate or similar content
  - Recommend priority score

### 6. **StorageAgent**

- **Role**: Prepare and store validated content
- **Responsibilities**:
  - Generate embeddings (OpenAI text-embedding-3-small)
  - Insert into `aie_best_practices` table
  - Update existing records if duplicates found
  - Generate metadata JSONB
  - Create relationships with ad examples
  - Trigger vector index updates

## Workflow

### Input Sources

1. **Manual Upload** (via admin UI)
   - PDFs (whitepapers, guides)
   - Audio files (training sessions, podcasts)
   - Videos (webinars, tutorials)
   - Text/Markdown files
   - URLs (blog posts, documentation)

2. **Automated Discovery** (scheduled jobs)
   - Platform documentation crawlers
   - Industry blog RSS feeds
   - YouTube channel monitors
   - Social media trend analysis

3. **Expert Contributions** (API submission)
   - BHB training sessions
   - Agency playbooks
   - Client case studies

### Processing Pipeline

```
INPUT
  │
  ├─ File/URL → ContentExtractionAgent
  │              │
  │              ├─ Extract text/transcription
  │              └─ Clean and normalize
  │
  ├─ Raw Text → AnalysisAgent
  │              │
  │              ├─ Categorize (platform, goal, topic)
  │              ├─ Extract metadata (title, description, tags)
  │              └─ Identify key insights
  │
  ├─ Analyzed Content → QualityAgent
  │              │
  │              ├─ Score quality (1-10)
  │              ├─ Validate accuracy
  │              ├─ Check for duplicates
  │              └─ Assign priority
  │
  └─ Validated Content → StorageAgent
                 │
                 ├─ Generate embedding
                 ├─ Insert into database
                 └─ Return success/failure
```

## API Endpoints

### `/api/best-practices/process` (POST)

Process a new best practice source.

**Request:**

```typescript
{
  source_type: 'file' | 'url' | 'text',
  platform?: 'meta' | 'google' | 'tiktok' | 'pinterest' | 'multi',
  category?: string,
  goal?: 'awareness' | 'engagement' | 'conversion',

  // For file uploads
  file?: File,

  // For URLs
  url?: string,

  // For raw text
  text?: string,
  title?: string,
  description?: string,

  // Optional metadata
  source_name?: string,
  source_url?: string,
  tags?: string[],
  priority_override?: number
}
```

**Response:**

```typescript
{
  success: boolean,
  best_practice_id?: string,
  metadata: {
    title: string,
    platform: string,
    category: string,
    goal: string,
    quality_score: number,
    priority_score: number,
    extracted_insights: string[]
  },
  warnings?: string[],
  errors?: string[]
}
```

### `/api/best-practices/discover` (POST)

Trigger automated discovery from configured sources.

**Request:**

```typescript
{
  sources: ('meta-blueprint' | 'google-ads-help' | 'tiktok-business' | 'pinterest-ads' | 'all')[],
  since?: string, // ISO date - only get content published after this date
  limit?: number
}
```

**Response:**

```typescript
{
  discovered: number,
  processed: number,
  inserted: number,
  failed: number,
  results: Array<{
    url: string,
    title: string,
    status: 'success' | 'failed' | 'duplicate',
    best_practice_id?: string
  }>
}
```

## Database Schema

### `aie_best_practices` table

```sql
id                uuid PRIMARY KEY
title             text NOT NULL
platform          aie_platform NOT NULL
category          text NOT NULL
goal              aie_goal NOT NULL
description       text NOT NULL
example_text      text
source_type       aie_source_type
source_url        text
embedding         vector(1536)
metadata          jsonb -- Additional flexible data
quality_score     numeric
priority_score    numeric
is_active         boolean DEFAULT true
created_at        timestamptz
updated_at        timestamptz
```

### Metadata JSONB Structure

```typescript
{
  tags: string[],
  key_insights: string[],
  original_filename?: string,
  transcription?: string, // For audio/video sources
  extracted_by: 'manual' | 'automated',
  source_author?: string,
  source_date?: string,
  last_validated?: string,
  duplicate_check_hash?: string
}
```

## Configuration

### Agent Settings (`.env.local`)

```bash
# OpenAI API
OPENAI_API_KEY=sk-...
OPENAI_MODEL_ANALYSIS=gpt-4o
OPENAI_MODEL_QUALITY=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Content Extraction
MAX_FILE_SIZE_MB=50
SUPPORTED_AUDIO_FORMATS=mp3,wav,m4a,aac
SUPPORTED_DOCUMENT_FORMATS=pdf,txt,md,docx

# Quality Thresholds
MIN_QUALITY_SCORE=6.0
MIN_CONTENT_LENGTH=100
MAX_DUPLICATE_SIMILARITY=0.95

# Discovery Sources
META_BLUEPRINT_RSS=https://...
GOOGLE_ADS_BLOG_RSS=https://...
TIKTOK_BUSINESS_BLOG_RSS=https://...
```

## Usage Examples

### 1. Process BHB Audio Training

```typescript
const formData = new FormData();
formData.append("source_type", "file");
formData.append("file", audioFile);
formData.append("platform", "multi");
formData.append("category", "creative-strategy");
formData.append("source_name", "Boutique Hub");

const response = await fetch("/api/best-practices/process", {
  method: "POST",
  body: formData,
});

const result = await response.json();
console.log(`Created best practice: ${result.best_practice_id}`);
```

### 2. Process URL

```typescript
const response = await fetch("/api/best-practices/process", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    source_type: "url",
    url: "https://www.facebook.com/business/ads-guide",
    platform: "meta",
  }),
});
```

### 3. Trigger Automated Discovery

```typescript
const response = await fetch("/api/best-practices/discover", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sources: ["meta-blueprint", "google-ads-help"],
    since: "2024-01-01",
    limit: 50,
  }),
});

const result = await response.json();
console.log(`Discovered ${result.discovered}, inserted ${result.inserted}`);
```

## Future Enhancements

1. **Continuous Learning**
   - Track which best practices lead to highest-performing ads
   - Auto-adjust priority scores based on real performance data
   - Identify gaps in knowledge base

2. **Human-in-the-Loop**
   - Review queue for borderline quality scores
   - Expert annotation interface
   - Feedback mechanism for AI-generated categorizations

3. **Advanced Discovery**
   - Competitor ad monitoring
   - Social listening for trending tactics
   - Community submissions from merchants

4. **Multi-Language Support**
   - Translate best practices
   - Regional platform variations
   - Cultural adaptation guidelines
