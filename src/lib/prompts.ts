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
  brand_voice: string | null
  category_template: string
  combined: string
}

// Product categories - keeping for backward compatibility with existing components
export const PRODUCT_CATEGORIES = [
  { value: 'womens_clothing', label: "Women's Clothing" },
  { value: 'jewelry_accessories', label: 'Jewelry & Accessories' },
  { value: 'home_living', label: 'Home & Living' },
  { value: 'beauty_personal_care', label: 'Beauty & Personal Care' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'general', label: 'General Products' }
] as const

export type ProductCategory = typeof PRODUCT_CATEGORIES[number]['value']

// Product categories are now user-defined via template names
// The category field in the database is auto-generated from template names
// and is used internally only - not exposed to users

/**
 * Get store UUID from shop domain
 * Uses the same approach as other API routes
 */
export async function getStoreId(shopDomain: string): Promise<string | null> {
  try {
    console.log('🔍 getStoreId called with shopDomain:', shopDomain)
    // Query the shops table (not stores - that table is empty)
    const { data, error } = await supabaseAdmin
      .from('shops')
      .select('id')
      .eq('shop_domain', shopDomain)
      .single()

    if (error || !data) {
      console.error('❌ Error finding store for domain:', shopDomain, 'Error:', error)
      return null
    }

    console.log('✅ Found store UUID:', data.id, 'for domain:', shopDomain)
    return data.id
  } catch (error) {
    console.error('❌ Exception in getStoreId for domain:', shopDomain, 'Error:', error)
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
 * Get brand voice from business_profiles table
 * Now includes all wizard fields for comprehensive brand voice instructions
 */
export async function getBrandVoice(storeId: string): Promise<string | null> {
  try {
    console.log('🔍 getBrandVoice called with storeId:', storeId)

    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId
    if (storeId.includes('.myshopify.com') || !storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      console.log('📍 Converting shop domain to UUID...')
      actualStoreId = await getStoreId(storeId) || storeId
      console.log('✅ Converted storeId to:', actualStoreId)
    }

    console.log('🔎 Querying business_profiles table with store_id:', actualStoreId)
    const { data, error } = await supabaseAdmin
      .from('business_profiles')
      .select(`
        ai_engine_instructions,
        voice_tone,
        voice_style,
        voice_personality,
        tone_playful_serious,
        tone_casual_elevated,
        tone_trendy_classic,
        tone_friendly_professional,
        tone_simple_detailed,
        tone_bold_soft,
        voice_vocabulary,
        customer_term,
        signature_sentence,
        value_pillars,
        audience_description,
        wizard_completed
      `)
      .eq('store_id', actualStoreId)
      .single()

    if (error) {
      console.error('❌ Error fetching brand voice:', error)
      return null
    }

    if (!data) {
      console.warn('⚠️ No business profile found for store:', actualStoreId)
      return null
    }

    // Priority 1: Use ai_engine_instructions if available
    if (data.ai_engine_instructions) {
      console.log('✅ Brand voice loaded from ai_engine_instructions')
      return data.ai_engine_instructions
    }

    // Priority 2: Build comprehensive brand voice from wizard fields if wizard is completed
    if (data.wizard_completed) {
      console.log('✅ Building comprehensive brand voice from wizard data')

      const sections: string[] = []

      // Tone Profile Section
      if (data.tone_playful_serious !== null || data.tone_casual_elevated !== null) {
        const toneLines = [
          '--- TONE PROFILE ---',
          ''
        ]
        if (data.tone_playful_serious !== null)
          toneLines.push(`Playful ↔ Serious: ${data.tone_playful_serious}/10 (${data.tone_playful_serious < 5 ? 'More Playful' : data.tone_playful_serious > 5 ? 'More Serious' : 'Balanced'})`)
        if (data.tone_casual_elevated !== null)
          toneLines.push(`Casual ↔ Elevated: ${data.tone_casual_elevated}/10 (${data.tone_casual_elevated < 5 ? 'More Casual' : data.tone_casual_elevated > 5 ? 'More Elevated' : 'Balanced'})`)
        if (data.tone_trendy_classic !== null)
          toneLines.push(`Trendy ↔ Classic: ${data.tone_trendy_classic}/10 (${data.tone_trendy_classic < 5 ? 'More Trendy' : data.tone_trendy_classic > 5 ? 'More Classic' : 'Balanced'})`)
        if (data.tone_friendly_professional !== null)
          toneLines.push(`Friendly ↔ Professional: ${data.tone_friendly_professional}/10 (${data.tone_friendly_professional < 5 ? 'More Friendly' : data.tone_friendly_professional > 5 ? 'More Professional' : 'Balanced'})`)
        if (data.tone_simple_detailed !== null)
          toneLines.push(`Simple ↔ Detailed: ${data.tone_simple_detailed}/10 (${data.tone_simple_detailed < 5 ? 'More Simple' : data.tone_simple_detailed > 5 ? 'More Detailed' : 'Balanced'})`)
        if (data.tone_bold_soft !== null)
          toneLines.push(`Bold ↔ Soft: ${data.tone_bold_soft}/10 (${data.tone_bold_soft < 5 ? 'More Bold' : data.tone_bold_soft > 5 ? 'More Soft' : 'Balanced'})`)

        sections.push(toneLines.join('\n'))
      }

      // Vocabulary Section
      const vocab = data.voice_vocabulary as { words_love?: string[], words_avoid?: string[] } | null
      if (vocab?.words_love?.length || vocab?.words_avoid?.length || data.customer_term) {
        const vocabLines = [
          '--- VOCABULARY & LINGUISTICS ---',
          ''
        ]
        if (vocab?.words_love?.length)
          vocabLines.push(`Words to use frequently: ${vocab.words_love.join(', ')}`)
        if (vocab?.words_avoid?.length)
          vocabLines.push(`Words to NEVER use: ${vocab.words_avoid.join(', ')}`)
        if (data.customer_term)
          vocabLines.push(`Always refer to customers as: "${data.customer_term}"`)

        sections.push(vocabLines.join('\n'))
      }

      // Brand Identity Section
      if (data.signature_sentence || (data.value_pillars as string[] | null)?.length) {
        const identityLines = [
          '--- BRAND IDENTITY ---',
          ''
        ]
        if (data.signature_sentence)
          identityLines.push(`Brand Tagline/Motto: "${data.signature_sentence}"`)
        if ((data.value_pillars as string[] | null)?.length)
          identityLines.push(`Customer Priorities (emphasize these): ${(data.value_pillars as string[]).join(', ')}`)

        sections.push(identityLines.join('\n'))
      }

      // Audience Section
      if (data.audience_description) {
        sections.push([
          '--- TARGET AUDIENCE ---',
          '',
          data.audience_description
        ].join('\n'))
      }

      if (sections.length > 0) {
        return '--- BRAND VOICE ---\n\n' + sections.join('\n\n')
      }
    }

    // Priority 3: Fallback to legacy voice components
    if (data.voice_tone || data.voice_style || data.voice_personality) {
      const brandVoice = `
--- BRAND VOICE ---

${data.voice_tone ? `Tone: ${data.voice_tone}` : ''}
${data.voice_style ? `Style: ${data.voice_style}` : ''}
${data.voice_personality ? `Personality: ${data.voice_personality}` : ''}
`.trim()
      console.log('✅ Brand voice constructed from legacy voice components')
      return brandVoice
    }

    console.warn('⚠️ No brand voice data found in business profile')
    return null
  } catch (error) {
    console.error('❌ Error in getBrandVoice:', error)
    return null
  }
}

/**
 * Combine system prompt, brand voice, and category template for AI generation
 */
export function combinePrompts(
  systemPrompt: string,
  brandVoice: string | null,
  categoryTemplate: string
): string {
  const brandVoiceSection = brandVoice ? `\n\n--- BRAND VOICE ---\n\n${brandVoice}` : ''
  return `${systemPrompt}${brandVoiceSection}\n\n--- CATEGORY TEMPLATE ---\n\n${categoryTemplate}`
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
 * Get combined prompt for AI generation (ALL 3 COMPONENTS)
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
      const combined = combinePrompts(defaultSystemPrompt, null, defaultCategoryTemplate)

      return {
        system_prompt: defaultSystemPrompt,
        brand_voice: null,
        category_template: defaultCategoryTemplate,
        combined
      }
    }

    console.log('🔄 Fetching ALL 3 prompt components in parallel...')
    const [systemPrompt, brandVoice, categoryTemplate] = await Promise.all([
      getSystemPrompt(storeId),
      getBrandVoice(storeId),
      getCategoryTemplate(storeId, category)
    ])

    if (!systemPrompt) {
      console.error('❌ No system prompt found for store:', storeId)
      return null
    }

    if (!categoryTemplate) {
      console.error('❌ No category template found for:', category)
      return null
    }

    console.log('✅ Combining prompts:', {
      hasSystemPrompt: !!systemPrompt,
      hasBrandVoice: !!brandVoice,
      hasCategoryTemplate: !!categoryTemplate
    })

    const combined = combinePrompts(systemPrompt.content, brandVoice, categoryTemplate.content)

    return {
      system_prompt: systemPrompt.content,
      brand_voice: brandVoice,
      category_template: categoryTemplate.content,
      combined
    }
  } catch (error) {
    console.error('❌ Error in getCombinedPrompt:', error)
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
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId
    if (storeId.includes('.myshopify.com') || !storeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      actualStoreId = await getStoreId(storeId) || storeId
    }

    // Use upsert to handle both new and existing records
    const { data, error } = await supabaseAdmin
      .from('system_prompts')
      .upsert({
        store_id: actualStoreId,
        content,
        name: name || 'Custom System Prompt',
        is_default: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'store_id,is_default',
        ignoreDuplicates: false
      })
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
/**
 * Initialize default prompts and templates for a new store installation
 * This should be called when a shop is first installed
 */
export async function initializeStorePrompts(storeId: string): Promise<boolean> {
  try {
    console.log(`Initializing prompts for store: ${storeId}`)

    // Initialize master system prompt
    const systemPrompt = await resetSystemPrompt(storeId)
    if (!systemPrompt) {
      console.error('Failed to initialize system prompt')
      return false
    }

    // Initialize default category template (general)
    const categoryTemplate = await resetCategoryTemplate(storeId, 'general')
    if (!categoryTemplate) {
      console.error('Failed to initialize category template')
      return false
    }

    console.log(`✅ Successfully initialized prompts for store: ${storeId}`)
    return true
  } catch (error) {
    console.error('Error initializing store prompts:', error)
    return false
  }
}

/**
 * Reset system prompt to default
 */
export async function resetSystemPrompt(storeId: string): Promise<SystemPrompt | null> {
  const defaultPrompt = `You are ThunderText, an expert AI copywriting assistant specialized in creating compelling, conversion-focused product descriptions for e-commerce stores. Your role is to transform basic product information into engaging, SEO-optimized descriptions that drive sales while maintaining the authentic voice of boutique retail.

YOUR ROLE AND RESPONSIBILITIES

1. Product Description Creation: Generate complete, publication-ready product descriptions based on information provided by the user or extracted from Shopify product data.

2. Information Synthesis: Analyze all available product information including product title, existing description, images, variant information (sizes, colors, materials), product type and category, tags, collections, vendor information, and price points.

3. Brand Voice Adaptation: Adapt your writing style to match the store's brand personality while maintaining professional quality standards.

4. SEO Optimization: Naturally incorporate relevant keywords and search terms without compromising readability or authenticity.

CORE WRITING PRINCIPLES

Audience Connection
- Write in second person ("you") to create direct connection with potential buyers
- Address customer needs, desires, and pain points explicitly
- Create vivid mental images that help customers envision owning and using the product

Descriptive Excellence
- Use sensory language appropriate to the product category (touch, sight, feel, experience)
- Be specific and concrete rather than generic (e.g., "buttery-soft organic cotton" vs "high-quality material")
- Balance emotional appeal with practical, factual information

Quality Standards
- Target 150-250 words for optimal readability and engagement
- Avoid marketing hyperbole, superlatives, and exaggerated claims
- Use inclusive, body-positive language when describing fashion items
- Maintain professional tone while being approachable and relatable

Structural Clarity
- Organize content with clear section headers using HTML bold tags: <b>Section Name</b>
- Keep paragraphs concise (3-5 sentences maximum)
- Use double line breaks between sections for visual separation
- Body text must be plain text with NO HTML tags or formatting
- NEVER use markdown symbols (*, **, #, etc.) for formatting
- Never use icons, emojis, or special characters in product descriptions

CRITICAL FORMATTING EXAMPLES:
Correct: <b>Product Details</b>
Incorrect: **Product Details** or Product Details (without tags)

CATEGORY-SPECIFIC GUIDELINES

Women's Clothing
- Emphasize fit, comfort, versatility, and how the garment makes the wearer feel
- Include specific style details (neckline, sleeves, hemline, silhouette)
- Describe fabric content, texture, and feel with exact percentages when known
- Provide styling suggestions for different occasions
- Always include available sizes exactly as provided

Jewelry & Accessories
- Highlight craftsmanship, materials, and construction quality
- Describe dimensions and how the piece wears or fits
- Emphasize occasions and styling versatility
- Convey emotional significance and gift-worthiness
- Balance functionality with aesthetic appeal

General Products
- Lead with primary benefits and use cases
- Detail key features and specifications accurately
- Explain versatility and practical applications
- Include care instructions and warranty information when available

INFORMATION HANDLING

When Provided Complete Information
- Use all relevant details from Shopify product data
- Maintain factual accuracy - never invent specifications
- Include exact sizes, colors, materials, and dimensions as provided
- Reference actual product images when describing visual details

When Information is Limited
- Focus on what IS known rather than speculating
- Use category-appropriate language to fill knowledge gaps professionally
- Never make up product specifications or claims

Required Elements to Include
- Available sizes (use exact list from "Available Sizes" field)
- Material composition when known
- Care instructions if visible on product labels
- Fit guidance (runs large/small/true to size) when applicable
- Price positioning context when relevant

OUTPUT FORMAT STRUCTURE

Your final product description should include:

1. Opening Hook (1-2 sentences)
   Capture attention and create desire immediately. Help customer visualize owning or using the product.

2. Product Details (Main body)
   Organized by logical section headers. Include feature highlights and specifications, materials and construction quality, and styling or usage guidance.

3. Practical Information
   Available sizes, variants, and options. Care instructions. Fit notes or usage tips.

4. Closing Value Statement (1-2 sentences)
   Reinforce key benefits. Create urgency or emotional appeal for purchase.

QUALITY CHECKLIST

Before finalizing any description, verify:
- Addresses customer benefits, not just features
- Uses specific, sensory language (not generic adjectives)
- Includes all provided product specifications accurately
- Maintains appropriate length (150-250 words)
- Contains clear section headers in bold text
- Free of markdown formatting or special characters
- Includes available sizes exactly as specified
- Reads naturally with good flow between sections
- Matches the category template structure when available

INTERACTION STYLE

- Be collaborative and responsive to user feedback
- Provide reasoning for writing choices when requested
- Adapt tone and style based on user preferences
- Offer alternative phrasings or approaches when helpful

Remember: Your goal is to create descriptions that not only inform but inspire action. Every word should earn its place by either providing value to the customer or moving them closer to a purchase decision.`

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

<b>Product Details</b>
Describe the item's design, highlighting what makes it special. Use sensory language (soft, flowing, structured, etc.) and fashion-forward terminology. Include:
- Style details (neckline, sleeves, hemline, silhouette)
- Fabric content and feel (exact percentages when visible/known)
- Fit description (relaxed, fitted, true to size, etc.)
- Special features (pockets, adjustable elements, etc.)

<b>Styling Tips</b>
Provide specific outfit ideas for different occasions. Mention complementary pieces and accessories. Include both casual and dressed-up options when applicable.

<b>Care and Sizing</b>
- Care instructions (if visible on labels)
- Available in: [INSERT THE EXACT SIZES FROM "Available Sizes" IN THE PRODUCT CONTEXT]
- Fit notes (runs large/small/true to size)

<b>Why You'll Love It</b>
End with 1-2 sentences about the key benefits and lifestyle appeal of this piece.`,

    jewelry_accessories: `Structure your description following this format:

Create an opening statement that captures the emotional significance or style impact of this piece.

<b>Craftsmanship Details</b>
Focus on materials, construction quality, and design elements. Include:
- Metal type, gemstones, or primary materials
- Size/dimensions when relevant
- Special techniques or finishes
- Quality indicators (plating, settings, etc.)

<b>Styling Occasions</b>
Describe when and how to wear this piece:
- Suitable occasions (everyday, special events, professional)
- Layering suggestions for jewelry
- Complementary pieces or outfits

<b>Care and Specifications</b>
- Care instructions for maintaining quality
- Size specifications or adjustability
- Packaging details if gift-worthy

<b>Why It's Special</b>
Highlight the unique value proposition and emotional appeal of owning this piece.`,

    home_living: `Structure your description following this format:

Begin with how this item transforms or enhances the living space.

<b>Design and Quality</b>
Describe the aesthetic and construction details:
- Style, color, and visual appeal
- Materials and craftsmanship quality
- Size, dimensions, and scale
- Finish quality and durability

<b>Functionality and Use</b>
Explain practical applications:
- Primary function and benefits
- Versatility in different spaces
- Setup or installation requirements
- Compatibility with existing decor

<b>Care and Specifications</b>
- Maintenance requirements
- Warranty or quality guarantees
- Available sizes, colors, or variants

<b>Home Enhancement Value</b>
Conclude with how this piece improves daily life and living spaces.`,

    beauty_personal_care: `Structure your description following this format:

Start with the primary benefit or transformation this product provides.

<b>Key Ingredients and Benefits</b>
Focus on what makes this product effective:
- Active ingredients and their benefits
- Skin/hair type suitability
- Expected results and timeline
- Unique formulation features

<b>Application and Usage</b>
Provide clear usage instructions:
- How to apply or use
- Frequency of use
- Best practices for optimal results
- Integration with existing routines

<b>Product Details</b>
- Size, packaging, and value
- Suitable for which skin/hair types
- Certifications (cruelty-free, organic, etc.)
- Shelf life and storage

<b>Why Choose This</b>
Highlight what sets this product apart and the lifestyle benefits.`,

    general: `Structure your description following this format:

Begin with a compelling opening that highlights the primary benefit or appeal of this product.

<b>Key Features</b>
Describe the most important aspects of the product:
- Primary function and benefits
- Quality indicators and materials
- Size, dimensions, or capacity
- Special features or technology

<b>Usage and Applications</b>
Explain how the customer will use this product:
- Primary use cases
- Versatility and additional applications
- Setup or usage requirements
- Compatibility considerations

<b>Specifications and Care</b>
- Important specifications or technical details
- Care, maintenance, or warranty information
- Available options (colors, sizes, variants)

<b>Value Proposition</b>
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