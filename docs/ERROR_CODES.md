# Error Codes Reference

**Version**: 1.0.0
**Last Updated**: 2025-12-05

This document defines standardized error responses across the Thunder Text API.

---

## Table of Contents

1. [Error Format](#error-format)
2. [Error Naming Convention](#error-naming-convention)
3. [HTTP Status Mapping](#http-status-mapping)
4. [Common Errors](#common-errors)
5. [AI-Related Errors](#ai-related-errors)

---

## Error Format

All API errors follow this consistent JSON structure:

```typescript
interface APIErrorResponse {
  success: false;
  error: string; // Human-readable message
  code?: string; // Machine-readable error code
  details?: unknown; // Additional context (validation errors, etc.)
  requestId?: string; // For support/debugging
}
```

### Example Responses

**Validation Error**:

```json
{
  "success": false,
  "error": "Invalid input",
  "code": "VALIDATION_ERROR",
  "details": {
    "fieldErrors": {
      "email": ["Invalid email format"],
      "wordCount": ["Must be between 50 and 500"]
    }
  }
}
```

**Authentication Error**:

```json
{
  "success": false,
  "error": "Session expired",
  "code": "AUTH_SESSION_EXPIRED"
}
```

**Rate Limit Error**:

```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "retryAfter": 60,
    "limit": 100,
    "remaining": 0
  }
}
```

---

## Error Naming Convention

Error codes follow the pattern: `{CATEGORY}_{SPECIFIC_ERROR}`

### Categories

| Prefix         | Category                     | Example                     |
| -------------- | ---------------------------- | --------------------------- |
| `AUTH_`        | Authentication/Authorization | `AUTH_INVALID_CREDENTIALS`  |
| `VALIDATION_`  | Input validation             | `VALIDATION_MISSING_FIELD`  |
| `SHOP_`        | Shop/Store operations        | `SHOP_NOT_FOUND`            |
| `PRODUCT_`     | Product operations           | `PRODUCT_SYNC_FAILED`       |
| `CONTENT_`     | Content generation           | `CONTENT_GENERATION_FAILED` |
| `AI_`          | AI/OpenAI operations         | `AI_RATE_LIMIT`             |
| `RAG_`         | RAG retrieval                | `RAG_NO_RESULTS`            |
| `INTEGRATION_` | External integrations        | `INTEGRATION_SHOPIFY_ERROR` |
| `DB_`          | Database operations          | `DB_QUERY_FAILED`           |
| `SYSTEM_`      | System/Server errors         | `SYSTEM_INTERNAL_ERROR`     |

### Naming Rules

1. Use `SCREAMING_SNAKE_CASE`
2. Be specific but concise
3. Start with category prefix
4. Describe the problem, not the solution

```typescript
// Good
"AUTH_INVALID_PASSWORD";
"CONTENT_WORD_COUNT_EXCEEDED";
"AI_CONTEXT_TOO_LONG";

// Bad
"ERROR"; // Too vague
"auth-failed"; // Wrong format
"TRY_AGAIN_LATER"; // Solution, not problem
```

---

## HTTP Status Mapping

### Status Code Reference

| Status | Category            | When to Use                             |
| ------ | ------------------- | --------------------------------------- |
| 200    | Success             | Request completed successfully          |
| 201    | Created             | Resource created                        |
| 204    | No Content          | Success with no body (DELETE)           |
| 400    | Bad Request         | Invalid input, validation failure       |
| 401    | Unauthorized        | Missing or invalid authentication       |
| 403    | Forbidden           | Valid auth but insufficient permissions |
| 404    | Not Found           | Resource doesn't exist                  |
| 409    | Conflict            | Resource conflict (duplicate, etc.)     |
| 422    | Unprocessable       | Valid format but semantic error         |
| 429    | Too Many Requests   | Rate limit exceeded                     |
| 500    | Internal Error      | Unexpected server error                 |
| 502    | Bad Gateway         | External service failure                |
| 503    | Service Unavailable | Temporary outage                        |

### Code to Status Mapping

```typescript
const ERROR_STATUS_MAP: Record<string, number> = {
  // Authentication (401)
  AUTH_MISSING_TOKEN: 401,
  AUTH_INVALID_TOKEN: 401,
  AUTH_SESSION_EXPIRED: 401,
  AUTH_INVALID_CREDENTIALS: 401,

  // Authorization (403)
  AUTH_INSUFFICIENT_PERMISSIONS: 403,
  AUTH_SHOP_NOT_AUTHORIZED: 403,
  AUTH_FEATURE_NOT_ENABLED: 403,

  // Not Found (404)
  SHOP_NOT_FOUND: 404,
  PRODUCT_NOT_FOUND: 404,
  CONTENT_NOT_FOUND: 404,
  PROFILE_NOT_FOUND: 404,

  // Validation (400)
  VALIDATION_ERROR: 400,
  VALIDATION_MISSING_FIELD: 400,
  VALIDATION_INVALID_FORMAT: 400,

  // Conflict (409)
  AUTH_EMAIL_EXISTS: 409,
  SHOP_ALREADY_CONNECTED: 409,

  // Rate Limit (429)
  RATE_LIMIT_EXCEEDED: 429,
  AI_RATE_LIMIT: 429,

  // Server Error (500)
  SYSTEM_INTERNAL_ERROR: 500,
  DB_QUERY_FAILED: 500,
  AI_GENERATION_FAILED: 500,

  // External Service (502)
  INTEGRATION_SHOPIFY_ERROR: 502,
  INTEGRATION_FACEBOOK_ERROR: 502,
  AI_SERVICE_UNAVAILABLE: 502,
};
```

---

## Common Errors

### Authentication Errors

| Code                       | Status | Message                               | Resolution                   |
| -------------------------- | ------ | ------------------------------------- | ---------------------------- |
| `AUTH_MISSING_TOKEN`       | 401    | Authentication required               | Include Authorization header |
| `AUTH_INVALID_TOKEN`       | 401    | Invalid or malformed token            | Check token format           |
| `AUTH_SESSION_EXPIRED`     | 401    | Session has expired                   | Re-authenticate              |
| `AUTH_INVALID_CREDENTIALS` | 401    | Invalid email or password             | Verify credentials           |
| `AUTH_ACCOUNT_LOCKED`      | 401    | Account locked due to failed attempts | Wait or reset password       |
| `AUTH_2FA_REQUIRED`        | 401    | Two-factor authentication required    | Provide TOTP code            |
| `AUTH_2FA_INVALID`         | 401    | Invalid 2FA code                      | Check code and try again     |

### Authorization Errors

| Code                            | Status | Message                            | Resolution           |
| ------------------------------- | ------ | ---------------------------------- | -------------------- |
| `AUTH_INSUFFICIENT_PERMISSIONS` | 403    | You don't have permission          | Contact admin        |
| `AUTH_SHOP_NOT_AUTHORIZED`      | 403    | Not authorized for this shop       | Check shop access    |
| `AUTH_FEATURE_NOT_ENABLED`      | 403    | Feature not available on your plan | Upgrade subscription |
| `AUTH_COACH_REQUIRED`           | 403    | Coach role required                | Use coach account    |
| `AUTH_ADMIN_REQUIRED`           | 403    | Admin role required                | Use admin account    |

### Validation Errors

| Code                           | Status | Message                 | Resolution              |
| ------------------------------ | ------ | ----------------------- | ----------------------- |
| `VALIDATION_ERROR`             | 400    | Invalid input           | Check details field     |
| `VALIDATION_MISSING_FIELD`     | 400    | Required field missing  | Include required fields |
| `VALIDATION_INVALID_FORMAT`    | 400    | Invalid data format     | Check field format      |
| `VALIDATION_WORD_COUNT`        | 400    | Word count out of range | Adjust content length   |
| `VALIDATION_FILE_TOO_LARGE`    | 400    | File exceeds size limit | Reduce file size        |
| `VALIDATION_INVALID_FILE_TYPE` | 400    | Unsupported file type   | Use supported format    |

### Resource Errors

| Code                      | Status | Message                       | Resolution             |
| ------------------------- | ------ | ----------------------------- | ---------------------- |
| `SHOP_NOT_FOUND`          | 404    | Shop not found                | Check shop ID          |
| `PRODUCT_NOT_FOUND`       | 404    | Product not found             | Check product ID       |
| `CONTENT_NOT_FOUND`       | 404    | Content not found             | Check content ID       |
| `PROFILE_NOT_FOUND`       | 404    | Business profile not found    | Complete onboarding    |
| `VOICE_PROFILE_NOT_FOUND` | 404    | Brand voice profile not found | Generate voice profile |

### Conflict Errors

| Code                     | Status | Message                  | Resolution                   |
| ------------------------ | ------ | ------------------------ | ---------------------------- |
| `AUTH_EMAIL_EXISTS`      | 409    | Email already registered | Use different email or login |
| `SHOP_ALREADY_CONNECTED` | 409    | Shop already connected   | Disconnect first             |
| `PROFILE_ALREADY_EXISTS` | 409    | Profile already exists   | Edit existing profile        |

### Rate Limit Errors

| Code                        | Status | Message                   | Resolution     |
| --------------------------- | ------ | ------------------------- | -------------- |
| `RATE_LIMIT_EXCEEDED`       | 429    | Too many requests         | Wait and retry |
| `GENERATION_LIMIT_EXCEEDED` | 429    | Generation quota exceeded | Upgrade plan   |

### System Errors

| Code                    | Status | Message                    | Resolution        |
| ----------------------- | ------ | -------------------------- | ----------------- |
| `SYSTEM_INTERNAL_ERROR` | 500    | Internal server error      | Contact support   |
| `DB_QUERY_FAILED`       | 500    | Database operation failed  | Retry later       |
| `DB_CONNECTION_FAILED`  | 500    | Database connection failed | Check status page |

---

## AI-Related Errors

### Generation Errors

| Code                   | Status | Message                          | Resolution               |
| ---------------------- | ------ | -------------------------------- | ------------------------ |
| `AI_GENERATION_FAILED` | 500    | Content generation failed        | Retry or simplify prompt |
| `AI_CONTEXT_TOO_LONG`  | 400    | Input exceeds context limit      | Reduce input length      |
| `AI_INVALID_IMAGE`     | 400    | Unable to process image          | Use supported format     |
| `AI_CONTENT_FILTERED`  | 400    | Content flagged by safety filter | Modify request           |

### Rate Limit Errors

| Code                | Status | Message                   | Resolution      |
| ------------------- | ------ | ------------------------- | --------------- |
| `AI_RATE_LIMIT`     | 429    | AI rate limit exceeded    | Wait 60 seconds |
| `AI_QUOTA_EXCEEDED` | 429    | Monthly AI quota exceeded | Upgrade plan    |

### Service Errors

| Code                     | Status | Message                            | Resolution                 |
| ------------------------ | ------ | ---------------------------------- | -------------------------- |
| `AI_SERVICE_UNAVAILABLE` | 502    | AI service temporarily unavailable | Retry later                |
| `AI_TIMEOUT`             | 504    | AI request timed out               | Retry with simpler request |

### RAG Errors

| Code                   | Status | Message                          | Resolution                |
| ---------------------- | ------ | -------------------------------- | ------------------------- |
| `RAG_NO_RESULTS`       | 200\*  | No relevant best practices found | Adjust search criteria    |
| `RAG_EMBEDDING_FAILED` | 500    | Failed to generate embedding     | Retry request             |
| `RAG_RETRIEVAL_FAILED` | 500    | Failed to retrieve context       | Check database connection |

\*Note: `RAG_NO_RESULTS` returns 200 with empty results, not an error status.

### Voice Profile Errors

| Code                         | Status | Message                           | Resolution        |
| ---------------------------- | ------ | --------------------------------- | ----------------- |
| `VOICE_INSUFFICIENT_SAMPLES` | 400    | Need at least 3 writing samples   | Add more samples  |
| `VOICE_SAMPLE_TOO_SHORT`     | 400    | Sample must be at least 100 words | Use longer sample |
| `VOICE_GENERATION_FAILED`    | 500    | Failed to generate voice profile  | Retry             |

---

## Implementation Example

```typescript
// src/lib/errors.ts

export class APIError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = "APIError";
  }

  toResponse() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      details: this.details,
    };
  }
}

// Pre-defined errors
export const Errors = {
  AUTH_MISSING_TOKEN: new APIError(
    "AUTH_MISSING_TOKEN",
    "Authentication required",
    401,
  ),
  AUTH_SESSION_EXPIRED: new APIError(
    "AUTH_SESSION_EXPIRED",
    "Session has expired",
    401,
  ),
  VALIDATION_ERROR: (details: unknown) =>
    new APIError("VALIDATION_ERROR", "Invalid input", 400, details),
  SHOP_NOT_FOUND: new APIError("SHOP_NOT_FOUND", "Shop not found", 404),
  AI_RATE_LIMIT: new APIError(
    "AI_RATE_LIMIT",
    "AI rate limit exceeded. Please try again in 60 seconds.",
    429,
    { retryAfter: 60 },
  ),
};

// Usage in API route
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      throw Errors.AUTH_MISSING_TOKEN;
    }

    const body = await req.json();
    const validated = schema.safeParse(body);
    if (!validated.success) {
      throw Errors.VALIDATION_ERROR(validated.error.flatten());
    }

    // ... business logic
  } catch (error) {
    if (error instanceof APIError) {
      return NextResponse.json(error.toResponse(), { status: error.status });
    }

    logger.error("Unexpected error", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        code: "SYSTEM_INTERNAL_ERROR",
      },
      { status: 500 },
    );
  }
}
```

---

## Client-Side Handling

```typescript
// Example React error handling
async function generateContent(params: GenerationParams) {
  const response = await fetch("/api/content-center/generate", {
    method: "POST",
    body: JSON.stringify(params),
  });

  const data = await response.json();

  if (!data.success) {
    switch (data.code) {
      case "AUTH_SESSION_EXPIRED":
        // Redirect to login
        router.push("/auth/login");
        break;

      case "AI_RATE_LIMIT":
        // Show rate limit message with retry timer
        showRateLimitError(data.details?.retryAfter);
        break;

      case "VALIDATION_ERROR":
        // Show field-specific errors
        setFieldErrors(data.details?.fieldErrors);
        break;

      default:
        // Generic error toast
        showErrorToast(data.error);
    }
    return null;
  }

  return data.data;
}
```

---

_This error code reference is maintained alongside the Thunder Text codebase._
