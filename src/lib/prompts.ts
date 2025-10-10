import { supabaseAdmin } from '@/lib/supabase'

// Types for prompt system
export interface SystemPrompt {
  id: string
  name: string
  content: string
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  store_id: string
}

export interface CategoryTemplate {
  id: string
  name: string
  category: string
  content: string
  is_default: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  store_id: string
}

export interface CombinedPrompt {
  system_prompt: string
  category_template: string
  combined: string
}

// Product categories are now user-defined via template names
// The category field in the database is auto-generated from template names
// and is used internally only - not exposed to users

/**
 * Get store UUID from shop domain
 * Uses the same approach as other API routes
 */
export async function getStoreId(shopDomain: string): Promise<string | null> {
  try {
    // Query the shops table (not stores - that table is empty)
    const { data, error } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single()

    if (error || !data) {
      console.error('Error finding store:', error)
      return null
    }

    return data.id
  } catch (error) {
    console.error('Error in getStoreId:', error)
    return null
  }
}

/**
 * Get the active system prompt for a store
 */
export async function getSystemPrompt(storeId: string): Promise<SystemPrompt | null> {
  try {
    console.log('🔍 getSystemPrompt called with storeId:', storeId)

    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId
    if (storeId.includes('.myshopify.com') || !storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('📍 Converting shop domain to UUID...')
      actualStoreId = await getStoreId(storeId) || storeId
      console.log('✅ Converted storeId to:', actualStoreId)
    }

    console.log('🔎 Querying system_prompts table with store_id:', actualStoreId)
    const { data, error } = await supabaseAdmin
      .from('system_prompts')
      .select('*')
      .eq('store_id', actualStoreId)
      .eq('is_active', true)
      .eq('is_default', true)
      .single()

    if (error) {
      console.error('❌ Error fetching system prompt:', error)
      return null
    }

    console.log('✅ System prompt found:', data ? `${data.name} (${data.content.length} chars)` : 'null')
    return data
  } catch (error) {
    console.error('❌ Error in getSystemPrompt:', error)
    return null
  }
}

/**
 * Get all active category templates for a store
 */
export async function getCategoryTemplates(storeId: string): Promise<CategoryTemplate[]> {
  try {
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId
    if (storeId.includes('.myshopify.com') || !storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      actualStoreId = await getStoreId(storeId) || storeId
    }

    const { data, error } = await supabaseAdmin
      .from('category_templates')
      .select('*')
      .eq('store_id', actualStoreId)
      .eq('is_active', true)
      .order('category', { ascending: true })

    if (error) {
      console.error('Error fetching category templates:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getCategoryTemplates:', error)
    return []
  }
}

/**
 * Get a specific category template
 */
export async function getCategoryTemplate(
  storeId: string, 
  category: ProductCategory
): Promise<CategoryTemplate | null> {
  try {
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId
    if (storeId.includes('.myshopify.com') || !storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      actualStoreId = await getStoreId(storeId) || storeId
    }

    const { data, error } = await supabaseAdmin
      .from('category_templates')
      .select('*')
      .eq('store_id', actualStoreId)
      .eq('category', category)
      .eq('is_active', true)
      .eq('is_default', true)
      .single()

    if (error) {
      console.error('Error fetching category template:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getCategoryTemplate:', error)
    return null
  }
}

/**
 * Combine system prompt and category template for AI generation
 */
export function combinePrompts(
  systemPrompt: string, 
  categoryTemplate: string
): string {
  return `${systemPrompt}\n\n--- CATEGORY TEMPLATE ---\n\n${categoryTemplate}`
}

/**
 * Get the global default category template for a store
 */
export async function getGlobalDefaultTemplate(storeId: string): Promise<ProductCategory | null> {
  try {
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId
    if (storeId.includes('.myshopify.com') || !storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      actualStoreId = await getStoreId(storeId) || storeId
    }

    // Get the first default template (should be the global default)
    const { data, error } = await supabaseAdmin
      .from('category_templates')
      .select('category')
      .eq('store_id', actualStoreId)
      .eq('is_active', true)
      .eq('is_default', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .single()

    if (error || !data) {
      console.log('No global default template found, using general')
      return 'general'
    }

    return data.category as ProductCategory
  } catch (error) {
    console.error('Error in getGlobalDefaultTemplate:', error)
    return 'general'
  }
}

/**
 * Get default category template for Shopify extensions
 */
function getDefaultCategoryTemplate(category: ProductCategory): string {
  const templates: Record<ProductCategory, string> = {
    'womens_clothing': "Focus on style, comfort, and versatility. Highlight fabric quality, fit, and how the piece can be styled for different occasions.",
    'jewelry_accessories': "Emphasize craftsmanship, materials, and the emotional connection. Describe how the piece enhances personal style and makes the wearer feel special.",
    'home_living': "Focus on functionality, aesthetic appeal, and how the item improves daily life. Highlight quality, design, and the ambiance it creates.",
    'beauty_personal_care': "Emphasize benefits, ingredients, and results. Focus on how the product makes the user look and feel better.",
    'electronics': "Highlight key features, performance, and value. Focus on how the technology improves the user's life or work.",
    'general': "Focus on key benefits, quality, and value proposition. Highlight what makes this product special and worth purchasing."
  }
  
  return templates[category] || templates.general
}

/**
 * Get combined prompt for AI generation
 */
export async function getCombinedPrompt(
  storeId: string, 
  category: ProductCategory = 'general'
): Promise<CombinedPrompt | null> {
  try {
    // For Shopify extensions, use default fallback prompts
    if (storeId === 'shopify-extension-demo') {
      const defaultSystemPrompt = "You are a professional product description writer. Create compelling, accurate, and engaging product descriptions that convert browsers into buyers."
      const defaultCategoryTemplate = getDefaultCategoryTemplate(category)
      const combined = combinePrompts(defaultSystemPrompt, defaultCategoryTemplate)
      
      return {
        system_prompt: defaultSystemPrompt,
        category_template: defaultCategoryTemplate,
        combined
      }
    }

    const [systemPrompt, categoryTemplate] = await Promise.all([
      getSystemPrompt(storeId),
      getCategoryTemplate(storeId, category)
    ])

    if (!systemPrompt) {
      console.error('No system prompt found for store:', storeId)
      return null
    }

    if (!categoryTemplate) {
      console.error('No category template found for:', category)
      return null
    }

    const combined = combinePrompts(systemPrompt.content, categoryTemplate.content)

    return {
      system_prompt: systemPrompt.content,
      category_template: categoryTemplate.content,
      combined
    }
  } catch (error) {
    console.error('Error in getCombinedPrompt:', error)
    return null
  }
}

/**
 * Update system prompt
 */
export async function updateSystemPrompt(
  storeId: string, 
  content: string, 
  name?: string
): Promise<SystemPrompt | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('system_prompts')
      .update({ 
        content, 
        name: name || 'Custom System Prompt',
        updated_at: new Date().toISOString()
      })
      .eq('store_id', storeId)
      .eq('is_default', true)
      .select()
      .single()

    if (error) {
      console.error('Error updating system prompt:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateSystemPrompt:', error)
    return null
  }
}

/**
 * Update category template
 */
export async function updateCategoryTemplate(
  storeId: string,
  category: ProductCategory,
  content: string,
  name?: string
): Promise<CategoryTemplate | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('category_templates')
      .update({ 
        content, 
        name: name || `Custom ${category} Template`,
        updated_at: new Date().toISOString()
      })
      .eq('store_id', storeId)
      .eq('category', category)
      .eq('is_default', true)
      .select()
      .single()

    if (error) {
      console.error('Error updating category template:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in updateCategoryTemplate:', error)
    return null
  }
}

/**
 * Reset system prompt to original default
 */
export async function resetSystemPrompt(storeId: string): Promise<SystemPrompt | null> {
  const defaultPrompt = `You are an expert e-commerce copywriter specializing in creating compelling product descriptions that convert browsers into buyers. You adapt your writing style based on the product category while maintaining consistent quality and structure.

CORE PRINCIPLES:
- Write in second person ("you") to create connection with the customer
- Use sensory, descriptive language appropriate to the product type
- Balance emotional appeal with practical information
- Incorporate SEO keywords naturally throughout the text
- Target 150-250 words total for optimal readability
- Format with clear section headers (no special characters like *, #, or -)
- Include all relevant product specifications provided in the context

WRITING GUIDELINES:
- For clothing: Focus on fit, comfort, style versatility, and how it makes the wearer feel
- For jewelry: Emphasize craftsmanship, materials, occasions, and emotional significance
- For accessories: Balance functionality with style, highlighting practical benefits
- Use inclusive, body-positive language where applicable
- Avoid superlatives and exaggerated claims
- Be specific rather than generic (e.g., "soft organic cotton" vs "high-quality material")

FORMATTING RULES:
- Section headers should be in bold TypeCase
- No markdown formatting or special characters
- Keep paragraphs concise (3-5 sentences max)
- Use line breaks between sections for clarity

When provided with "Available Sizes" in the product context, always include those exact sizes in the appropriate section of the description.`

  return updateSystemPrompt(storeId, defaultPrompt, 'Thunder Text Default Master Prompt')
}

/**
 * Reset category template to original default
 */
export async function resetCategoryTemplate(
  storeId: string, 
  category: ProductCategory
): Promise<CategoryTemplate | null> {
  const defaultTemplates: Record<ProductCategory, string> = {
    womens_clothing: `Structure your description following this format:

Start with an opening hook (1-2 sentences) that helps the customer visualize wearing this item. Use aspirational language that connects to their desired lifestyle.

Product Details
Describe the item's design, highlighting what makes it special. Use sensory language (soft, flowing, structured, etc.) and fashion-forward terminology. Include:
- Style details (neckline, sleeves, hemline, silhouette)
- Fabric content and feel (exact percentages when visible/known)
- Fit description (relaxed, fitted, true to size, etc.)
- Special features (pockets, adjustable elements, etc.)

Styling Tips
Provide specific outfit ideas for different occasions. Mention complementary pieces and accessories. Include both casual and dressed-up options when applicable.

Care and Sizing
- Care instructions (if visible on labels)
- Available in: [INSERT THE EXACT SIZES FROM "Available Sizes" IN THE PRODUCT CONTEXT]
- Fit notes (runs large/small/true to size)

Why You'll Love It
End with 1-2 sentences about the key benefits and lifestyle appeal of this piece.`,

    jewelry_accessories: `Structure your description following this format:

Create an opening statement that captures the emotional significance or style impact of this piece.

Craftsmanship Details
Focus on materials, construction quality, and design elements. Include:
- Metal type, gemstones, or primary materials
- Size/dimensions when relevant
- Special techniques or finishes
- Quality indicators (plating, settings, etc.)

Styling Occasions
Describe when and how to wear this piece:
- Suitable occasions (everyday, special events, professional)
- Layering suggestions for jewelry
- Complementary pieces or outfits

Care and Specifications
- Care instructions for maintaining quality
- Size specifications or adjustability
- Packaging details if gift-worthy

Why It's Special
Highlight the unique value proposition and emotional appeal of owning this piece.`,

    home_living: `Structure your description following this format:

Begin with how this item transforms or enhances the living space.

Design and Quality
Describe the aesthetic and construction details:
- Style, color, and visual appeal
- Materials and craftsmanship quality
- Size, dimensions, and scale
- Finish quality and durability

Functionality and Use
Explain practical applications:
- Primary function and benefits
- Versatility in different spaces
- Setup or installation requirements
- Compatibility with existing decor

Care and Specifications
- Maintenance requirements
- Warranty or quality guarantees
- Available sizes, colors, or variants

Home Enhancement Value
Conclude with how this piece improves daily life and living spaces.`,

    beauty_personal_care: `Structure your description following this format:

Start with the primary benefit or transformation this product provides.

Key Ingredients and Benefits
Focus on what makes this product effective:
- Active ingredients and their benefits
- Skin/hair type suitability
- Expected results and timeline
- Unique formulation features

Application and Usage
Provide clear usage instructions:
- How to apply or use
- Frequency of use
- Best practices for optimal results
- Integration with existing routines

Product Details
- Size, packaging, and value
- Suitable for which skin/hair types
- Certifications (cruelty-free, organic, etc.)
- Shelf life and storage

Why Choose This
Highlight what sets this product apart and the lifestyle benefits.`,

    electronics: `Structure your description following this format:

Lead with the primary function and key innovation of this device.

Technical Specifications
Outline the important technical details:
- Core performance specifications
- Compatibility requirements
- Connectivity options
- Power requirements and battery life

Features and Capabilities
Explain what users can accomplish:
- Key features and their benefits
- Use cases and applications
- Software or app integration
- Ease of use and learning curve

Setup and Support
- Installation or setup requirements
- Warranty and support information
- Available accessories or add-ons
- System requirements if applicable

Value and Benefits
Conclude with how this device improves productivity, entertainment, or daily life.`,

    general: `Structure your description following this format:

Begin with a compelling opening that highlights the primary benefit or appeal of this product.

Key Features
Describe the most important aspects of the product:
- Primary function and benefits
- Quality indicators and materials
- Size, dimensions, or capacity
- Special features or technology

Usage and Applications
Explain how the customer will use this product:
- Primary use cases
- Versatility and additional applications
- Setup or usage requirements
- Compatibility considerations

Specifications and Care
- Important specifications or technical details
- Care, maintenance, or warranty information
- Available options (colors, sizes, variants)

Value Proposition
Conclude with why this product is the right choice and what makes it worth purchasing.`
  }

  const defaultContent = defaultTemplates[category]
  const templateName = PRODUCT_CATEGORIES.find(cat => cat.value === category)?.label || category

  return updateCategoryTemplate(
    storeId, 
    category, 
    defaultContent, 
    `${templateName} Default Template`
  )
}