# Thunder Text V2 Prompt System Design

## System Architecture

### Core Components

1. **Master System Prompt** - Universal copywriting principles stored in database
2. **Category Templates** - Structured templates for different product categories
3. **Prompt Combination Engine** - Merges master prompt + category template for AI requests
4. **Template Management UI** - Settings page for editing prompts and templates
5. **Category Selection** - Dropdown on product creation page

### Database Schema

```sql
-- Master system prompt (singleton)
CREATE TABLE system_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  shop_id VARCHAR(100) NOT NULL,

  -- RLS
  CONSTRAINT unique_default_per_shop UNIQUE (shop_id, is_default) WHERE is_default = true
);

-- Category-specific templates
CREATE TABLE category_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  category VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  shop_id VARCHAR(100) NOT NULL,

  -- RLS
  CONSTRAINT unique_default_per_category_shop UNIQUE (shop_id, category, is_default) WHERE is_default = true
);
```

### Default Categories & Templates

1. **Women's Clothing** - Fashion-focused with styling tips
2. **Jewelry & Accessories** - Craftsmanship and occasion-based
3. **Home & Living** - Functionality and lifestyle integration
4. **Beauty & Personal Care** - Benefits and usage instructions
5. **General** - Fallback template for any product type

## Prompt Combination Logic

```typescript
function combinePrompts(
  masterPrompt: string,
  categoryTemplate: string
): string {
  return `${masterPrompt}\n\n--- CATEGORY TEMPLATE ---\n\n${categoryTemplate}`;
}
```

## User Interface Components

### Settings Page

- Master Prompt Editor (rich text)
- Category Template Manager (CRUD operations)
- Reset to Defaults button
- Import/Export functionality

### Product Creation Page

- Category dropdown with template preview
- Custom prompt override option
- Real-time preview of combined prompt

## Migration Plan

1. Create database tables with default prompts
2. Seed with V1 prompts as defaults
3. Add prompt management API routes
4. Update product creation to use prompt system
5. Add settings UI for prompt management
