-- Thunder Text Database Migration
-- Create all missing tables for prompt system and settings

-- Master system prompt (singleton)
CREATE TABLE IF NOT EXISTS system_prompts (
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
CREATE TABLE IF NOT EXISTS category_templates (
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

-- Custom sizing options
CREATE TABLE IF NOT EXISTS custom_sizing (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  sizes TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Custom categories (already exists but ensure schema)
CREATE TABLE IF NOT EXISTS custom_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id VARCHAR(100) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  parent_id UUID REFERENCES custom_categories(id),
  category_level INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  parent_name VARCHAR(100),
  full_path VARCHAR(500)
);

-- Insert master system prompt using the created master prompt
INSERT INTO system_prompts (name, content, is_default, shop_id)
VALUES (
  'Master System Prompt',
  'You are an expert e-commerce copywriter specializing in creating compelling product descriptions that convert browsers into buyers. You adapt your writing style based on the product category while maintaining consistent quality and structure.

CORE PRINCIPLES:
- Write in second person ("you") to create connection with the customer
- Use sensory, descriptive language appropriate to the product type
- Balance emotional appeal with practical information
- Incorporate SEO keywords naturally throughout the text
- Target 150-250 words total for optimal readability
- Use inclusive, body-positive language where applicable
- Avoid superlatives and exaggerated claims
- Be specific rather than generic (e.g., "soft organic cotton" vs "high-quality material")

SHOPIFY HTML FORMATTING RULES:
- Use HTML tags for formatting: <b>Bold Headers</b> and <br> for line breaks
- NO special characters like *, #, -, @, $, &, or emojis
- Keep formatting clean and simple for Shopify compatibility
- Each section header should be in <b></b> tags followed by <br>
- Use <br> for single line breaks, <br><br> for paragraph spacing
- No markdown formatting or special characters

WRITING GUIDELINES:
- For clothing: Focus on fit, comfort, style versatility, and how it makes the wearer feel
- For jewelry: Emphasize craftsmanship, materials, occasions, and emotional significance
- For accessories: Balance functionality with style, highlighting practical benefits
- For home & living: Emphasize functionality and lifestyle integration
- For beauty & personal care: Focus on benefits and usage instructions
- Keep paragraphs concise (3-5 sentences max)
- Use line breaks between sections for clarity
- Write compelling opening hooks that help customers visualize using the product
- Emphasize benefits over features
- Include all relevant product specifications provided in the context

REQUIRED STRUCTURE:
Start with an opening hook (1-2 sentences) that helps the customer visualize using this product. Use aspirational language that connects to their desired lifestyle.<br><br>

<b>Product Details</b><br>
Describe the item''s design, highlighting what makes it special. Use sensory language and category-appropriate terminology. Include specifications, materials, design features, and functionality.<br><br>

<b>Styling Tips</b> (for fashion/accessories) OR <b>Usage Tips</b> (for other categories)<br>
Provide specific usage or styling ideas for different occasions. Mention complementary pieces or usage scenarios.<br><br>

<b>Care and Sizing</b> (for fashion) OR <b>Care and Specifications</b> (for other categories)<br>
Include care instructions if visible. For fashion items: Available in: [INSERT THE EXACT SIZES FROM "Available Sizes" IN THE PRODUCT CONTEXT]. Add fit notes. For other items: Include relevant specifications and maintenance information.<br><br>

<b>Why You''ll Love It</b><br>
End with 1-2 sentences about the key benefits and lifestyle appeal of this product.

CRITICAL REQUIREMENTS:
- ALWAYS include the exact sizes from the product context in the appropriate section
- Use HTML formatting (<b></b> and <br>) consistently
- No special characters or markdown formatting
- Maintain professional, conversion-focused tone
- Keep total word count between 150-250 words',
  true,
  'default'
) ON CONFLICT (shop_id, is_default) WHERE is_default = true DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- Insert default category templates
INSERT INTO category_templates (name, category, content, is_default, shop_id) VALUES
(
  'Women''s Clothing Template',
  'womens_clothing',
  'Structure your description following this format:

Start with an opening hook (1-2 sentences) that helps the customer visualize wearing this item. Use aspirational language that connects to their desired lifestyle.<br><br>

<b>Product Details</b><br>
Describe the item''s design, highlighting what makes it special. Use sensory language (soft, flowing, structured, etc.) and fashion-forward terminology. Include style details (neckline, sleeves, hemline, silhouette), fabric content and feel (exact percentages when visible/known), fit description (relaxed, fitted, true to size, etc.), and special features (pockets, adjustable elements, etc.).<br><br>

<b>Styling Tips</b><br>
Provide specific outfit ideas for different occasions. Mention complementary pieces and accessories. Include both casual and dressed-up options when applicable.<br><br>

<b>Care and Sizing</b><br>
Include care instructions if visible on labels. Available in: [INSERT THE EXACT SIZES FROM "Available Sizes" IN THE PRODUCT CONTEXT]. Add fit notes (runs large/small/true to size).<br><br>

<b>Why You''ll Love It</b><br>
End with 1-2 sentences about the key benefits and lifestyle appeal of this piece.',
  true,
  'default'
),
(
  'Jewelry & Accessories Template',
  'jewelry_accessories',
  'Structure your description following this format:

Start with an opening hook that highlights the emotional significance or special occasions this piece enhances.<br><br>

<b>Product Details</b><br>
Emphasize craftsmanship, materials (metals, stones, finishes), dimensions, and design inspiration. Use luxury-focused language that conveys quality and attention to detail.<br><br>

<b>Styling Tips</b><br>
Suggest specific occasions, outfit pairings, and layering opportunities. Mention versatility for day-to-night wear.<br><br>

<b>Care and Specifications</b><br>
Include material composition, care instructions, and sizing information if applicable. Available in: [INSERT EXACT SIZES IF PROVIDED].<br><br>

<b>Why You''ll Love It</b><br>
Focus on the emotional appeal and how this piece makes the wearer feel special.',
  true,
  'default'
),
(
  'General Template',
  'general',
  'Structure your description following this format:

Start with an opening hook that helps the customer visualize using this product in their daily life.<br><br>

<b>Product Details</b><br>
Describe key features, materials, dimensions, and functionality. Use appropriate terminology for the product category.<br><br>

<b>Usage Tips</b><br>
Provide specific use cases, occasions, or scenarios where this product excels.<br><br>

<b>Care and Specifications</b><br>
Include maintenance instructions, technical specifications, and size/quantity information. Available in: [INSERT EXACT SIZES/VARIANTS IF PROVIDED].<br><br>

<b>Why You''ll Love It</b><br>
Highlight the key benefits and value proposition of this product.',
  true,
  'default'
)
ON CONFLICT (shop_id, category, is_default) WHERE is_default = true DO UPDATE SET
  content = EXCLUDED.content,
  updated_at = NOW();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_system_prompts_shop_id ON system_prompts(shop_id);
CREATE INDEX IF NOT EXISTS idx_category_templates_shop_id ON category_templates(shop_id);
CREATE INDEX IF NOT EXISTS idx_category_templates_category ON category_templates(category);
CREATE INDEX IF NOT EXISTS idx_custom_sizing_store_id ON custom_sizing(store_id);
CREATE INDEX IF NOT EXISTS idx_custom_categories_store_id ON custom_categories(store_id);