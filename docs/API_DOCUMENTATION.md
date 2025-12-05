# Thunder Text API Documentation

**Version**: 1.0.0
**Base URL**: `https://your-domain.com/api`
**Last Updated**: 2025-12-05

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Response Formats](#common-response-formats)
4. [API Endpoints](#api-endpoints)
   - [Authentication](#authentication-endpoints)
   - [Product Description Generation](#product-description-generation)
   - [AI Ad Engine (AIE)](#ai-ad-engine-aie)
   - [Business Profile](#business-profile)
   - [Brand Voice](#brand-voice)
   - [Best Practices](#best-practices)
   - [Content Center](#content-center)
   - [Ads Library](#ads-library)
   - [Facebook Integration](#facebook-integration)
   - [Shopify Integration](#shopify-integration)
   - [Webhooks](#webhooks)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Data Types](#data-types)

---

## Overview

Thunder Text is an AI-powered multi-platform SaaS platform that combines product description generation with sophisticated ad creation capabilities. This API documentation covers all available endpoints for:

- **Product Description Generation**: AI-powered product descriptions using GPT-4 Vision
- **Ad Creation Engine (ACE)**: Multi-platform ad copy generation
- **Business Profile Management**: Brand identity and voice configuration
- **Content Center**: Centralized content management and generation
- **Platform Integrations**: Shopify, Facebook, Google, TikTok

---

## Authentication

Thunder Text is a **standalone SaaS platform** that integrates with multiple e-commerce platforms. Authentication methods:

### 1. Email/Password Authentication

Primary authentication for all users:

```http
POST /api/auth/signup
POST /api/auth/login
POST /api/auth/logout
```

### 2. Platform OAuth Connections

After authentication, users can connect their e-commerce platforms:

- **Shopify**: OAuth 2.0 connection to access store data
- **Facebook**: OAuth for ad account management
- **Google**: OAuth for Google Ads integration
- **TikTok**: OAuth for TikTok Ads

### 3. Bearer Token Authentication

For API requests, use the JWT token returned from login:

```http
Authorization: Bearer <jwt_token>
```

### 4. Cookie-Based Sessions

After login, a secure session cookie is set for browser-based requests.

---

## Common Response Formats

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details (optional)"
}
```

### Paginated Response

```json
{
  "success": true,
  "data": [...],
  "pageInfo": {
    "hasNextPage": true,
    "endCursor": "cursor_string",
    "total": 100
  }
}
```

---

## API Endpoints

---

## Authentication Endpoints

### Sign Up

Create a new standalone user account.

```http
POST /api/auth/signup
```

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "shopName": "My Store"
}
```

**Password Requirements**:

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Response** `200 OK`:

```json
{
  "success": true,
  "shop": {
    "id": "uuid",
    "email": "user@example.com"
  }
}
```

**Errors**:
| Status | Error | Description |
|--------|-------|-------------|
| 400 | Email and password required | Missing required fields |
| 400 | Password does not meet requirements | Weak password |
| 409 | Email already registered | Duplicate email |

---

### Login

Authenticate an existing user.

```http
POST /api/auth/login
```

**Request Body**:

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response** `200 OK`:

```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "user@example.com"
  },
  "token": "jwt_token"
}
```

---

### Logout

End the current session.

```http
POST /api/auth/logout
```

**Response** `200 OK`:

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### Forgot Password

Request a password reset email.

```http
POST /api/auth/forgot-password
```

**Request Body**:

```json
{
  "email": "user@example.com"
}
```

---

### Reset Password

Reset password using a token.

```http
POST /api/auth/reset-password
```

**Request Body**:

```json
{
  "token": "reset_token",
  "password": "NewSecurePassword123!"
}
```

---

## Product Description Generation

### Generate Product Description

Generate AI-powered product descriptions from images, brand voice, and current product details.

```http
POST /api/generate
```

**Headers**:

```http
Authorization: Bearer <session_token>
Content-Type: application/json
```

**Request Body**:

```json
{
  "images": [
    "https://example.com/product-image-1.jpg",
    "https://example.com/product-image-2.jpg"
  ],
  "productTitle": "Vintage Leather Jacket",
  "category": "Apparel > Outerwear",
  "brandVoice": "Professional yet approachable",
  "targetLength": "standard",
  "keywords": ["leather", "vintage", "jacket", "fashion"]
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| images | string[] | Yes\* | Array of image URLs (up to 10) |
| productTitle | string | No | Product name/title |
| category | string | No | Product category path |
| brandVoice | string | No | Desired brand voice/tone |
| targetLength | string | No | `concise` (50-100 words), `standard` (100-200 words), `detailed` (200-400 words) |
| keywords | string[] | No | SEO keywords to include |

\*Images are optional for Shopify embedded requests

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "title": "Premium Vintage Leather Jacket",
    "description": "Crafted from genuine leather with a timeless vintage aesthetic...",
    "bulletPoints": [
      "100% genuine leather construction",
      "Classic vintage design",
      "Durable YKK zippers"
    ],
    "seoKeywords": ["vintage leather jacket", "mens outerwear"],
    "googleShoppingAttributes": {
      "material": "Leather",
      "ageGroup": "Adult",
      "gender": "Unisex",
      "condition": "New"
    }
  }
}
```

**Errors**:
| Status | Error | Description |
|--------|-------|-------------|
| 400 | Images are required | No images provided |
| 401 | Authentication required | Missing auth token |
| 503 | Application not properly configured | Server configuration error |

---

### Enhanced Generation with Templates

Generate descriptions using category-specific templates.

```http
POST /api/generate/enhance
```

**Request Body**:

```json
{
  "productId": "shopify_product_id",
  "templateId": "template_uuid",
  "images": ["https://example.com/image.jpg"],
  "additionalContext": "Premium quality, handcrafted in Italy"
}
```

---

## AI Ad Engine (AIE)

The Ad Creation Engine generates multi-platform advertising copy.

### Generate Ads

Generate multiple ad variants for a product.

```http
POST /api/aie/generate
```

**Request Body**:

```json
{
  "productInfo": {
    "title": "Organic Face Cream",
    "description": "Natural skincare solution...",
    "price": 49.99,
    "images": ["https://example.com/product.jpg"]
  },
  "platform": "meta",
  "goal": "conversion",
  "adLengthMode": "AUTO",
  "shopId": "shop_uuid"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| productInfo | object | Yes | Product details |
| platform | string | Yes | Target platform |
| goal | string | Yes | Campaign goal |
| adLengthMode | string | No | Ad length selection |
| shopId | string | No | Shop identifier |

**Platform Values**:

- `meta` - Facebook/Meta
- `instagram` - Instagram
- `google` - Google Ads
- `tiktok` - TikTok
- `pinterest` - Pinterest

**Goal Values**:

- `awareness` - Brand awareness
- `engagement` - Engagement/interaction
- `conversion` - Sales/conversions
- `traffic` - Website traffic
- `app_installs` - App installations

**Ad Length Modes**:

- `AUTO` - AI determines optimal length
- `SHORT` - Concise copy
- `MEDIUM` - Standard length
- `LONG` - Detailed copy

**Response** `200 OK`:

```json
{
  "variants": [
    {
      "id": "variant_uuid",
      "variant_type": "emotional",
      "headline": "Transform Your Skin Naturally",
      "primary_text": "Discover the power of organic skincare...",
      "description": "Free shipping • 30-day guarantee",
      "selected_length": "MEDIUM",
      "predicted_score": 0.85
    },
    {
      "id": "variant_uuid_2",
      "variant_type": "benefit",
      "headline": "Organic. Effective. Beautiful.",
      "primary_text": "See visible results in just 7 days...",
      "description": "$49.99 • Natural ingredients",
      "selected_length": "SHORT",
      "predicted_score": 0.82
    }
  ],
  "research_context": {
    "best_practices_used": 5,
    "brand_voice_applied": true
  }
}
```

---

### Save Ad to Library

Save a generated ad variant to your library.

```http
POST /api/aie/save
```

**Request Body**:

```json
{
  "variantId": "variant_uuid",
  "productId": "product_uuid",
  "platform": "meta",
  "campaignGoal": "conversion"
}
```

---

### Get Ad Library

Retrieve saved ads.

```http
GET /api/aie/library
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| platform | string | Filter by platform |
| goal | string | Filter by campaign goal |
| limit | number | Results per page (default: 20) |
| offset | number | Pagination offset |

---

## Business Profile

The business profile system captures brand identity through an interactive interview.

### Get Business Profile

Retrieve current business profile, responses, and progress.

```http
GET /api/business-profile
```

**Response** `200 OK`:

```json
{
  "success": true,
  "data": {
    "profile": {
      "id": "profile_uuid",
      "store_id": "store_uuid",
      "interview_status": "in_progress",
      "interview_mode": "quick_start",
      "is_current": true,
      "created_at": "2025-12-05T10:00:00Z"
    },
    "responses": [
      {
        "id": "response_uuid",
        "prompt_key": "business_name",
        "response": "Thunder Text",
        "prompt": {
          "question_text": "What is your business name?",
          "question_number": 1
        }
      }
    ],
    "progress": {
      "current_question": 5,
      "total_questions": 7,
      "percentage_complete": 71,
      "is_complete": false,
      "next_prompt": {
        "prompt_key": "target_audience",
        "question_text": "Who is your ideal customer?"
      }
    }
  }
}
```

---

### Submit Interview Answer

Submit an answer to an interview prompt.

```http
POST /api/business-profile/answer
```

**Request Body**:

```json
{
  "promptKey": "business_name",
  "response": "Thunder Text - AI Content Platform"
}
```

---

### Generate Profile Documents

Generate business documents from interview responses.

```http
POST /api/business-profile/generate
```

Generates 6 core documents:

1. Market Research
2. Ideal Customer Avatar (ICA)
3. Pain Points Analysis
4. Mission/Vision Statement
5. Brand Positioning
6. AI Instructions

---

### Reset Profile

Start a new profile interview.

```http
POST /api/business-profile/reset
```

---

### Writing Samples

Upload brand writing samples for voice training.

```http
POST /api/business-profile/writing-samples
```

**Request**: `multipart/form-data`
| Field | Type | Description |
|-------|------|-------------|
| file | File | Writing sample file |
| title | string | Sample title |

**Supported Formats**: TXT, MD, CSV, PDF, DOC, DOCX, RTF
**Max Size**: 10MB per file
**Max Files**: 3 per store

---

### Delete Writing Sample

```http
DELETE /api/business-profile/writing-samples/{id}
```

---

## Brand Voice

Manage brand voice profiles for content generation.

### Get Voice Profiles

```http
GET /api/content-center/voice
```

---

### Create Voice Profile

```http
POST /api/content-center/voice
```

**Request Body**:

```json
{
  "name": "Professional Voice",
  "tone": "professional",
  "style": "informative",
  "personality": "approachable",
  "is_default": true
}
```

---

### Generate Voice from Samples

Automatically generate a voice profile from writing samples.

```http
POST /api/content-center/voice/generate
```

---

## Best Practices

Manage advertising best practices knowledge base.

### List Best Practices

```http
GET /api/best-practices
```

**Response** `200 OK`:

```json
{
  "practices": [
    {
      "id": "practice_uuid",
      "title": "Facebook Ad Copywriting Guide",
      "description": "Best practices for Meta ads",
      "platform": "meta",
      "category": "copywriting",
      "file_type": "pdf",
      "priority_score": 8,
      "is_active": true
    }
  ],
  "total": 15
}
```

---

### Upload Best Practice

Upload a new best practice resource.

```http
POST /api/best-practices
```

**Request**: `multipart/form-data`
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| file | File | Yes | Resource file |
| title | string | Yes | Resource title |
| description | string | No | Description |
| platform | string | Yes | Target platform |
| category | string | Yes | Category name |
| priority_score | number | No | Priority (1-10, default: 5) |
| extracted_text | string | No | Pre-extracted text |

**Supported Formats**: PDF, Audio (MP3, WAV, M4A), Images (JPEG, PNG, WebP), Text, Markdown
**Max Size**: 50MB

---

### Get Best Practice

```http
GET /api/best-practices/{id}
```

---

### Update Best Practice

```http
PATCH /api/best-practices/{id}
```

---

### Delete Best Practice

```http
DELETE /api/best-practices/{id}
```

---

### Process Best Practice (Generate Embeddings)

```http
POST /api/best-practices/process
```

Processes uploaded files to generate vector embeddings for semantic search.

---

## Content Center

Centralized content management and generation.

### Generate Content

Generate content using brand voice profile.

```http
POST /api/content-center/generate
```

**Request Body**:

```json
{
  "content_type": "social_post",
  "topic": "New product launch",
  "word_count": 150,
  "tone_intensity": 3,
  "cta_type": "shop_now",
  "custom_cta": null,
  "platform": "instagram",
  "additional_context": "Focus on sustainability features",
  "product_images": ["https://example.com/product.jpg"],
  "save": true
}
```

**Content Types**:

- `social_post` - Social media post
- `email` - Email copy
- `blog_intro` - Blog introduction
- `product_description` - Product description
- `ad_copy` - Advertisement copy

**CTA Types**:

- `shop_now`
- `learn_more`
- `sign_up`
- `contact_us`
- `custom`

**Response** `201 Created`:

```json
{
  "success": true,
  "data": {
    "content": {
      "id": "content_uuid",
      "content_type": "social_post",
      "generated_text": "Introducing our latest sustainable product...",
      "word_count": 148,
      "platform": "instagram"
    },
    "generation_time_ms": 2500,
    "cost_estimate": 0.0045
  }
}
```

---

### Get Content Library

```http
GET /api/content-center/content
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| content_type | string | Filter by type |
| platform | string | Filter by platform |
| is_saved | boolean | Filter saved items |
| limit | number | Results per page |
| offset | number | Pagination offset |

---

### Get Content by ID

```http
GET /api/content-center/content/{id}
```

---

### Export Content

```http
GET /api/content-center/export/{id}
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| format | string | Export format: `txt`, `md`, `json` |

---

## Ads Library

Manage saved advertisement content.

### Get Saved Ads

```http
GET /api/ads-library
```

**Response** `200 OK`:

```json
{
  "ads": [
    {
      "id": "ad_uuid",
      "shop_id": "shop_uuid",
      "product_id": "product_uuid",
      "platform": "meta",
      "campaign_goal": "conversion",
      "headline": "Transform Your Skin",
      "primary_text": "Discover organic skincare...",
      "description": "$49.99 • Free shipping",
      "created_at": "2025-12-05T10:00:00Z"
    }
  ]
}
```

---

### Save Ad

```http
POST /api/ads-library/save
```

**Request Body**:

```json
{
  "productId": "product_uuid",
  "platform": "meta",
  "campaignGoal": "conversion",
  "headline": "Your Ad Headline",
  "primaryText": "Your ad copy...",
  "description": "Price and offer details"
}
```

---

## Facebook Integration

Connect and manage Facebook Ads integration.

### Initiate OAuth

Redirect user to Facebook consent screen.

```http
GET /api/facebook/oauth/authorize?shop={shop_domain}
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| shop | string | Yes | Shop domain |
| return_to | string | No | Redirect after auth: `welcome`, `facebook-ads` |

**OAuth Scopes Requested**:

- `ads_management` - Create and manage ads
- `ads_read` - Read ad data
- `business_management` - Access Business Manager
- `pages_read_engagement` - Read page engagement

---

### OAuth Callback

Handle Facebook OAuth callback (internal use).

```http
GET /api/facebook/oauth/callback
```

---

### Disconnect Facebook

Revoke Facebook integration.

```http
POST /api/facebook/oauth/disconnect
```

---

### List Ad Accounts

```http
GET /api/facebook/ad-accounts
```

**Response** `200 OK`:

```json
{
  "accounts": [
    {
      "id": "act_123456789",
      "name": "My Business Account",
      "currency": "USD",
      "account_status": 1
    }
  ]
}
```

---

### List Campaigns

```http
GET /api/facebook/campaigns
```

---

### Create Ad Draft

```http
POST /api/facebook/ad-drafts
```

---

### Submit Ad Draft to Facebook

```http
POST /api/facebook/ad-drafts/submit
```

---

### Get Campaign Insights

```http
GET /api/facebook/insights
```

---

### Generate Ad Content

AI-powered Facebook ad generation.

```http
POST /api/facebook/generate-ad-content
```

---

## Shopify Integration

### Token Exchange

Exchange session token for access token.

```http
POST /api/shopify/auth/token-exchange
```

---

### Validate Token

```http
GET /api/shopify/validate?shop={shop_domain}
```

---

### Get Products

```http
GET /api/shopify/products?shop={shop_domain}
```

**Query Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| shop | string | Shop domain |
| query | string | Search query |

**Response** `200 OK`:

```json
{
  "success": true,
  "products": [
    {
      "id": "gid://shopify/Product/123",
      "title": "Product Name",
      "status": "ACTIVE",
      "images": [...]
    }
  ],
  "pageInfo": {
    "hasNextPage": true,
    "endCursor": "cursor_string",
    "total": 50
  }
}
```

---

### Get Product by ID

```http
GET /api/shopify/products/{productId}?shop={shop_domain}
```

---

### Create Product

```http
POST /api/shopify/products/create
```

---

### Update Product

```http
POST /api/products/update
```

---

### Enhance Product Description

```http
POST /api/shopify/products/{productId}/enhance
```

---

## Webhooks

### App Uninstalled

Webhook for Shopify app uninstall events.

```http
POST /api/webhooks/app-uninstalled
```

**Headers**:

```http
X-Shopify-Topic: app/uninstalled
X-Shopify-Hmac-Sha256: {hmac}
X-Shopify-Shop-Domain: {shop}
```

---

### Shop Update

Webhook for shop data updates.

```http
POST /api/webhooks/shop-update
```

---

## Error Handling

### HTTP Status Codes

| Status | Description                             |
| ------ | --------------------------------------- |
| 200    | Success                                 |
| 201    | Created                                 |
| 400    | Bad Request - Invalid parameters        |
| 401    | Unauthorized - Authentication required  |
| 403    | Forbidden - Insufficient permissions    |
| 404    | Not Found - Resource doesn't exist      |
| 409    | Conflict - Resource already exists      |
| 429    | Too Many Requests - Rate limit exceeded |
| 500    | Internal Server Error                   |
| 503    | Service Unavailable                     |

### Error Response Format

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Technical details (optional)",
  "code": "ERROR_CODE (optional)",
  "hint": "Suggestion for resolution (optional)"
}
```

---

## Rate Limiting

Thunder Text implements rate limiting to ensure fair usage:

| Endpoint Category  | Limit        | Window   |
| ------------------ | ------------ | -------- |
| Content Generation | 60 requests  | 1 minute |
| AI Ad Generation   | 30 requests  | 1 minute |
| General API        | 100 requests | 1 minute |
| Authentication     | 10 requests  | 1 minute |

**Rate Limit Headers**:

```http
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1701777600
```

---

## Data Types

### Platform Types

```typescript
type AiePlatform = "meta" | "instagram" | "google" | "tiktok" | "pinterest";
```

### Campaign Goals

```typescript
type AieGoal =
  | "awareness"
  | "engagement"
  | "conversion"
  | "traffic"
  | "app_installs";
```

### Ad Length Modes

```typescript
type AdLengthMode = "AUTO" | "SHORT" | "MEDIUM" | "LONG";
```

### Ad Variant Types

```typescript
type AieVariantType = "emotional" | "benefit" | "ugc";
```

### Content Types

```typescript
type ContentType =
  | "social_post"
  | "email"
  | "blog_intro"
  | "product_description"
  | "ad_copy";
```

### Interview Status

```typescript
type InterviewStatus = "not_started" | "in_progress" | "completed";
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
// Generate product description
const response = await fetch("/api/generate", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${sessionToken}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    images: ["https://example.com/product.jpg"],
    productTitle: "Organic Face Cream",
    category: "Beauty > Skincare",
    targetLength: "standard",
  }),
});

const data = await response.json();
console.log(data.data.description);
```

### Generate Ad Variants

```typescript
// Generate Facebook ads
const adResponse = await fetch("/api/aie/generate", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    productInfo: {
      title: "Organic Face Cream",
      description: "Natural skincare solution",
      price: 49.99,
    },
    platform: "meta",
    goal: "conversion",
    adLengthMode: "AUTO",
  }),
});

const ads = await adResponse.json();
ads.variants.forEach((variant) => {
  console.log(`${variant.variant_type}: ${variant.headline}`);
});
```

---

## Changelog

### v1.0.0 (2025-12-05)

- Initial API documentation release
- Core endpoints for product description generation
- AI Ad Engine (AIE) integration
- Business profile and brand voice management
- Facebook Ads integration
- Content Center endpoints
- Shopify integration

---

## Support

For API support and questions:

- **Documentation Issues**: Open an issue in the repository
- **Technical Support**: Contact the development team
- **Feature Requests**: Submit via product feedback channels

---

_This documentation is auto-generated and maintained alongside the Thunder Text codebase._
