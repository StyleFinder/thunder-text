/**
 * Prompt System - Server-side Database Functions
 *
 * This file contains server-side functions that require supabaseAdmin.
 * For client-side types and constants, import from @/lib/prompts-types instead.
 */
import { supabaseAdmin } from "@/lib/supabase";
import { logger } from "@/lib/logger";

// Re-export types and constants from prompts-types for backward compatibility
// Server-side API routes can continue importing from @/lib/prompts
export {
  PRODUCT_CATEGORIES,
  type ProductCategory,
  type SystemPrompt,
  type CategoryTemplate,
  type CombinedPrompt,
} from "@/lib/prompts-types";

import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
  type SystemPrompt,
  type CategoryTemplate,
  type CombinedPrompt,
} from "@/lib/prompts-types";

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
      .from("shops")
      .select("id")
      .eq("shop_domain", shopDomain)
      .single();

    if (error || !data) {
      logger.error("Error finding store", error as Error, {
        component: "prompts",
        operation: "getStoreId",
        shopDomain,
      });
      return null;
    }

    return data.id;
  } catch (error) {
    logger.error("Error in getStoreId", error as Error, {
      component: "prompts",
      operation: "getStoreId",
      shopDomain,
    });
    return null;
  }
}

/**
 * Get the active system prompt for a store
 */
export async function getSystemPrompt(
  storeId: string,
): Promise<SystemPrompt | null> {
  try {
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId;
    if (
      storeId.includes(".myshopify.com") ||
      !storeId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      actualStoreId = (await getStoreId(storeId)) || storeId;
    }
    const { data, error } = await supabaseAdmin
      .from("system_prompts")
      .select("*")
      .eq("store_id", actualStoreId)
      .eq("is_active", true)
      .eq("is_default", true)
      .single();

    if (error) {
      logger.error("Error fetching system prompt", error as Error, {
        component: "prompts",
        operation: "getSystemPrompt",
        storeId: actualStoreId,
      });
      return null;
    }

    return data;
  } catch (error) {
    logger.error("Error in getSystemPrompt", error as Error, {
      component: "prompts",
      operation: "getSystemPrompt",
      storeId,
    });
    return null;
  }
}

/**
 * Get all active category templates for a store
 */
export async function getCategoryTemplates(
  storeId: string,
): Promise<CategoryTemplate[]> {
  try {
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId;
    if (
      storeId.includes(".myshopify.com") ||
      !storeId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      actualStoreId = (await getStoreId(storeId)) || storeId;
    }

    const { data, error } = await supabaseAdmin
      .from("category_templates")
      .select("*")
      .eq("store_id", actualStoreId)
      .eq("is_active", true)
      .order("category", { ascending: true });

    if (error) {
      logger.error("Error fetching category templates", error as Error, {
        component: "prompts",
        operation: "getCategoryTemplates",
        storeId: actualStoreId,
      });
      return [];
    }

    return data || [];
  } catch (error) {
    logger.error("Error in getCategoryTemplates", error as Error, {
      component: "prompts",
      operation: "getCategoryTemplates",
      storeId,
    });
    return [];
  }
}

/**
 * Get a specific category template
 */
export async function getCategoryTemplate(
  storeId: string,
  category: ProductCategory,
): Promise<CategoryTemplate | null> {
  try {
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId;
    if (
      storeId.includes(".myshopify.com") ||
      !storeId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      actualStoreId = (await getStoreId(storeId)) || storeId;
    }

    const { data, error } = await supabaseAdmin
      .from("category_templates")
      .select("*")
      .eq("store_id", actualStoreId)
      .eq("category", category)
      .eq("is_active", true)
      .eq("is_default", true)
      .single();

    if (error) {
      logger.error("Error fetching category template", error as Error, {
        component: "prompts",
        operation: "getCategoryTemplate",
        storeId: actualStoreId,
        category,
      });
      return null;
    }

    return data;
  } catch (error) {
    logger.error("Error in getCategoryTemplate", error as Error, {
      component: "prompts",
      operation: "getCategoryTemplate",
      storeId,
      category,
    });
    return null;
  }
}

/**
 * Combine system prompt and category template for AI generation
 */
export function combinePrompts(
  systemPrompt: string,
  categoryTemplate: string,
): string {
  return `${systemPrompt}\n\n--- CATEGORY TEMPLATE ---\n\n${categoryTemplate}`;
}

/**
 * Get the global default category template for a store
 */
export async function getGlobalDefaultTemplate(
  storeId: string,
): Promise<ProductCategory | null> {
  try {
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId;
    if (
      storeId.includes(".myshopify.com") ||
      !storeId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      actualStoreId = (await getStoreId(storeId)) || storeId;
    }

    // Get the first default template (should be the global default)
    const { data, error } = await supabaseAdmin
      .from("category_templates")
      .select("category")
      .eq("store_id", actualStoreId)
      .eq("is_active", true)
      .eq("is_default", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (error || !data) {
      return "general";
    }

    return data.category as ProductCategory;
  } catch (error) {
    logger.error("Error in getGlobalDefaultTemplate", error as Error, {
      component: "prompts",
      operation: "getGlobalDefaultTemplate",
      storeId,
    });
    return "general";
  }
}

/**
 * Get default category template for Shopify extensions
 */
function getDefaultCategoryTemplate(category: ProductCategory): string {
  const templates: Record<ProductCategory, string> = {
    clothing:
      "Focus on style, comfort, and versatility. Highlight fabric quality, fit, and how the piece can be styled for different occasions.",
    jewelry_accessories:
      "Emphasize craftsmanship, materials, and the emotional connection. Describe how the piece enhances personal style and makes the wearer feel special.",
    home_living:
      "Focus on functionality, aesthetic appeal, and how the item improves daily life. Highlight quality, design, and the ambiance it creates.",
    beauty_personal_care:
      "Emphasize benefits, ingredients, and results. Focus on how the product makes the user look and feel better.",
    general:
      "Focus on key benefits, quality, and value proposition. Highlight what makes this product special and worth purchasing.",
  };

  // eslint-disable-next-line security/detect-object-injection
  return templates[category] || templates.general;
}

/**
 * Get combined prompt for AI generation
 */
export async function getCombinedPrompt(
  storeId: string,
  category: ProductCategory = "general",
): Promise<CombinedPrompt | null> {
  try {
    // For Shopify extensions, use default fallback prompts
    if (storeId === "shopify-extension-demo") {
      const defaultSystemPrompt =
        "You are a professional product description writer. Create compelling, accurate, and engaging product descriptions that convert browsers into buyers.";
      const defaultCategoryTemplate = getDefaultCategoryTemplate(category);
      const combined = combinePrompts(
        defaultSystemPrompt,
        defaultCategoryTemplate,
      );

      return {
        system_prompt: defaultSystemPrompt,
        category_template: defaultCategoryTemplate,
        combined,
      };
    }

    const [systemPrompt, categoryTemplate] = await Promise.all([
      getSystemPrompt(storeId),
      getCategoryTemplate(storeId, category),
    ]);

    if (!systemPrompt) {
      logger.error("No system prompt found for store", undefined, {
        component: "prompts",
        operation: "getCombinedPrompt",
        storeId,
      });
      return null;
    }

    if (!categoryTemplate) {
      logger.error("No category template found", undefined, {
        component: "prompts",
        operation: "getCombinedPrompt",
        category,
      });
      return null;
    }

    const combined = combinePrompts(
      systemPrompt.content,
      categoryTemplate.content,
    );

    return {
      system_prompt: systemPrompt.content,
      category_template: categoryTemplate.content,
      combined,
    };
  } catch (error) {
    logger.error("Error in getCombinedPrompt", error as Error, {
      component: "prompts",
      operation: "getCombinedPrompt",
      storeId,
      category,
    });
    return null;
  }
}

/**
 * Update system prompt (or create if doesn't exist)
 */
export async function updateSystemPrompt(
  storeId: string,
  content: string,
  name?: string,
): Promise<SystemPrompt | null> {
  try {
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId;
    if (
      storeId.includes(".myshopify.com") ||
      !storeId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      actualStoreId = (await getStoreId(storeId)) || storeId;
    }

    // Check if exists first
    const { data: existing } = await supabaseAdmin
      .from("system_prompts")
      .select("id")
      .eq("store_id", actualStoreId)
      .eq("is_default", true)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from("system_prompts")
        .update({
          content,
          name: name || "Custom System Prompt",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating system prompt", error as Error, {
          component: "prompts",
          operation: "updateSystemPrompt",
          storeId: actualStoreId,
        });
        return null;
      }
      return data;
    } else {
      // Insert new
      const { data, error } = await supabaseAdmin
        .from("system_prompts")
        .insert({
          store_id: actualStoreId,
          content,
          name: name || "Custom System Prompt",
          is_default: true,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        logger.error("Error inserting system prompt", error as Error, {
          component: "prompts",
          operation: "updateSystemPrompt",
          storeId: actualStoreId,
        });
        return null;
      }
      return data;
    }
  } catch (error) {
    logger.error("Error in updateSystemPrompt", error as Error, {
      component: "prompts",
      operation: "updateSystemPrompt",
      storeId,
    });
    return null;
  }
}

/**
 * Update category template (or create if doesn't exist)
 */
export async function updateCategoryTemplate(
  storeId: string,
  category: ProductCategory,
  content: string,
  name?: string,
): Promise<CategoryTemplate | null> {
  try {
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId;
    if (
      storeId.includes(".myshopify.com") ||
      !storeId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      actualStoreId = (await getStoreId(storeId)) || storeId;
    }

    // Check if exists first
    const { data: existing } = await supabaseAdmin
      .from("category_templates")
      .select("id")
      .eq("store_id", actualStoreId)
      .eq("category", category)
      .eq("is_default", true)
      .single();

    if (existing) {
      // Update existing
      const { data, error } = await supabaseAdmin
        .from("category_templates")
        .update({
          content,
          name: name || `Custom ${category} Template`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) {
        logger.error("Error updating category template", error as Error, {
          component: "prompts",
          operation: "updateCategoryTemplate",
          storeId: actualStoreId,
          category,
        });
        return null;
      }
      return data;
    } else {
      // Insert new
      const { data, error } = await supabaseAdmin
        .from("category_templates")
        .insert({
          store_id: actualStoreId,
          category,
          content,
          name: name || `Custom ${category} Template`,
          is_default: true,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        logger.error("Error inserting category template", error as Error, {
          component: "prompts",
          operation: "updateCategoryTemplate",
          storeId: actualStoreId,
          category,
        });
        return null;
      }
      return data;
    }
  } catch (error) {
    logger.error("Error in updateCategoryTemplate", error as Error, {
      component: "prompts",
      operation: "updateCategoryTemplate",
      storeId,
      category,
    });
    return null;
  }
}

/**
 * Reset system prompt to original default
 */
export async function resetSystemPrompt(
  storeId: string,
): Promise<SystemPrompt | null> {
  const defaultPrompt = `You are ThunderText, an expert AI copywriting assistant specialized in creating compelling, conversion-focused product descriptions for e-commerce stores. Your role is to transform basic product information into engaging, SEO-optimized descriptions that drive sales while maintaining the authentic voice of boutique retail.

YOUR ROLE AND RESPONSIBILITIES

1. Product Description Creation: Generate complete, publication-ready product descriptions based on information provided by the user or extracted from Shopify product data.

2. Information Synthesis: Analyze all available product information including product title, existing description, images, variant information (sizes, colors, materials), product type and category, tags, collections, vendor information, and price points.

3. Brand Voice Adaptation: Adapt your writing style to match the store's brand personality. Default to a friendly, professional, and problem-first tone that feels like answering a customer's question rather than reading from a catalog.

4. SEO and AI Discoverability: Naturally incorporate relevant keywords and write clearly so both search engines AND AI assistants (ChatGPT, Siri, etc.) can understand and recommend your products.

AI DISCOVERABILITY (CRITICAL FOR MODERN COMMERCE)

Modern customers discover products through AI assistants. Write descriptions that clearly answer:
- What problem does this product solve?
- Who is this product best for?
- When and where would someone use this?
- Why should they choose this over alternatives?

This helps AI recommend your products when customers ask questions like "what jeans are best for curvy women?" or "what's a good gift for a jewelry lover?"

CORE WRITING PRINCIPLES

Audience Connection
- Write in second person ("you") to create direct connection with potential buyers
- Lead with aspiration and style, not problems - position products as statement pieces or wardrobe essentials
- Create vivid mental images that help customers envision owning and using the product
- Write with an upscale-casual, aspirational yet accessible tone - like a trusted boutique stylist

Descriptive Excellence
- Use sensory language appropriate to the product category (touch, sight, feel, experience)
- Be specific and concrete rather than generic (e.g., "buttery-soft organic cotton" vs "high-quality material")
- Balance emotional appeal with practical, factual information

Quality Standards
- Target 150-250 words for optimal readability and engagement
- Avoid marketing hyperbole, superlatives, and exaggerated claims
- Use inclusive, body-positive language when describing fashion items
- Maintain a friendly, professional tone - warm and helpful, not stiff or catalog-like

Structural Clarity
- Organize content with clear section headers in bold text
- Keep paragraphs concise (3-5 sentences maximum)
- Use line breaks between sections for visual clarity
- Plain text formatting only - no markdown symbols (*, #, etc.)
- Never use icons, emojis, or special characters in product descriptions

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

OUTPUT FORMAT STRUCTURE - PREMIUM BOUTIQUE STYLE

Your descriptions should feel like high-end boutique copy - aspirational, scannable, and visually organized:

1. OPENING (Headline + Intro - NO section header)
   Start with an aspirational headline that captures the essence of the piece.
   Example: "Effortless Coastal Charm Meets Cozy Comfort"
   Follow with 1-2 sentences positioning this as a statement piece or wardrobe essential.
   DO NOT start with problems or pain points - lead with aspiration and style.

2. [Design Feature Name] (First Section Header)
   Use a simple descriptive header (e.g., "Nautical Motif Design" or "Classic A-Line Silhouette")
   Do NOT use pipes (|) in section headers.
   Describe the visual appeal, colors, patterns, and distinctive construction details.

3. Fit, Fabric & Feel
   Use bullet points (•) to describe:
   • Fit guidance (relaxed, fitted, runs large/small, body type notes)
   • Texture and hand feel (soft, chunky, structured, flowy)
   • Comfort and breathability qualities
   • Quality and durability indicators
   • Stretch or movement properties
   • Fabric content (e.g., "100% Acrylic" or "95% Cotton, 5% Spandex")
   • Care instructions (e.g., "Hand wash cold, lay flat to dry")
   End with: "Available in: [exact sizes]"

4. Why You'll Love It
   4-5 bullet points (•) highlighting key benefits:
   • Standout design feature
   • Comfort or fit benefit
   • Versatility benefit
   • Quality or value proposition
   • Lifestyle appeal

6. How to Style It
   4-5 bullet points (•) with specific outfit ideas:
   • Casual daytime look
   • Elevated everyday option
   • Seasonal styling tip
   • Occasion-specific outfit

7. Customer FAQs (5-7 questions)
   Generate common questions customers ask about this type of product.
   Answer each in 2-3 helpful, direct sentences.
   These help customers buy faster AND help AI assistants recommend products.

QUALITY CHECKLIST

Before finalizing any description, verify:
- Opens with an aspirational headline (NOT a problem statement)
- Design headers are simple names without pipes (e.g., "Classic A-Line Silhouette")
- Uses bullet points (•) for Fit, Fabric & Feel, Why You'll Love It, and How to Style It
- Fit, Fabric & Feel includes fit guidance, fabric content, care instructions, AND ends with available sizes
- Uses specific, sensory language (not generic adjectives)
- Includes all provided product specifications accurately
- Maintains scannable format with clear visual hierarchy
- Contains clear section headers in bold text
- Free of markdown formatting (no asterisks, hashtags, or dashes for bullets)
- Reads with an upscale-casual, aspirational yet accessible tone
- Includes 5-7 helpful FAQs with 2-3 sentence answers

TITLE OPTIMIZATION

Product titles should be descriptive and benefit-focused:
- Bad: "The Rachel Jean" (name only - doesn't help AI or customers)
- Good: "The Rachel High-Rise Flare Jean with Tummy Control" (name + style + key benefit)
Always include the product type and primary benefit in the title.

INTERACTION STYLE

- Be collaborative and responsive to user feedback
- Provide reasoning for writing choices when requested
- Adapt tone and style based on store's brand voice
- Offer alternative phrasings or approaches when helpful

Remember: Your goal is to create descriptions that not only inform but inspire action. Every word should earn its place by either providing value to the customer or moving them closer to a purchase decision. Write so that both humans AND AI assistants can understand and recommend your products.`;

  return updateSystemPrompt(
    storeId,
    defaultPrompt,
    "Thunder Text Master Prompt (HTML Formatting)",
  );
}

/**
 * Initialize default prompts and templates for a new shop
 */
export async function initializeDefaultPrompts(storeId: string): Promise<void> {
  try {
    // If storeId looks like a shop domain, convert it to UUID
    let actualStoreId = storeId;
    if (
      storeId.includes(".myshopify.com") ||
      !storeId.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      )
    ) {
      actualStoreId = (await getStoreId(storeId)) || storeId;
    }

    // Check if already initialized
    const { data: existingPrompt } = await supabaseAdmin
      .from("system_prompts")
      .select("id")
      .eq("store_id", actualStoreId)
      .eq("is_default", true)
      .single();

    if (existingPrompt) {
      return;
    }

    // Initialize system prompt
    await resetSystemPrompt(actualStoreId);

    // Initialize all 5 default category templates
    const categories: ProductCategory[] = [
      "clothing",
      "jewelry_accessories",
      "home_living",
      "beauty_personal_care",
      "general",
    ];

    for (const category of categories) {
      await resetCategoryTemplate(actualStoreId, category);
    }
  } catch (error) {
    logger.error("Error initializing default prompts", error as Error, {
      component: "prompts",
      operation: "initializeDefaultPrompts",
      storeId,
    });
    throw error;
  }
}

/**
 * Reset category template to original default
 */
export async function resetCategoryTemplate(
  storeId: string,
  category: ProductCategory,
): Promise<CategoryTemplate | null> {
  const defaultTemplates: Record<ProductCategory, string> = {
    clothing: `Structure your description following this EXACT format for a premium boutique feel:

OPENING (Centered headline + engaging intro - NO bold header label):
Write a compelling H2-style headline that captures the essence of the piece. Example: "Effortless Coastal Charm Meets Everyday Comfort"
Follow with 1-2 sentences introducing the piece as a statement or everyday essential. Lead with what makes it special, not the problem it solves.

<b>[Design Feature Name]</b>
Use a simple descriptive header (e.g., "Nautical Motif Design" or "Classic A-Line Silhouette"). Do NOT use pipes (|) in headers.
Describe the key design elements with sensory language. Include:
- Visual appeal (colors, patterns, textures)
- Key construction details (neckline, sleeves, hemline, closures)
- Special features that set it apart
- How it moves and feels when worn

<b>Fit, Fabric & Feel</b>
Use bullet points for all qualities:
• Fit guidance (relaxed, fitted, runs large/small, body type notes)
• Texture and hand feel (soft, lightweight, structured, etc.)
• Comfort and breathability
• Quality and durability notes
• Stretch or movement properties if applicable
• Fabric content (e.g., "100% Acrylic" or "95% Cotton, 5% Spandex")
• Care instructions (e.g., "Hand wash cold, lay flat to dry")
End with: "• Available in: [INSERT THE EXACT SIZES FROM 'Available Sizes' IN THE PRODUCT CONTEXT]"

<b>Why You'll Love It</b>
4-5 bullet points highlighting the KEY benefits:
• [Standout design feature]
• [Comfort or fit benefit]
• [Versatility benefit]
• [Quality or value benefit]
• [Lifestyle appeal]

<b>How to Style It</b>
4-5 bullet points with specific outfit pairing ideas:
• [Casual daytime look]
• [Elevated everyday option]
• [Seasonal styling tip]
• [Occasion-specific outfit]
• [Accessory pairing suggestion]

CUSTOMER FAQs TO GENERATE:
Generate 5-7 FAQs customers commonly ask. Examples for women's clothing:
- "Do these run true to size?"
- "Do they have stretch?"
- "Are they see-through?"
- "Will these work for a longer/shorter torso?"
- "What shoes look best with these?"
- "Can I dress these up for work?"
- "Do they have real pockets?"
Answer each in 2-3 helpful sentences.`,

    jewelry_accessories: `Structure your description following this format:

Start with a problem-first opening that acknowledges a styling challenge or desire. Example: "Finding jewelry that's statement-making enough for special occasions but subtle enough for everyday? This piece does both effortlessly."

Craftsmanship Details
Focus on materials, construction quality, and design elements. Include:
- Metal type, gemstones, or primary materials
- Size/dimensions when relevant
- Special techniques or finishes
- Quality indicators (plating, settings, etc.)
- WHO this is best for: "Perfect for the minimalist who still wants to make a statement"

Styling Occasions
Describe when and how to wear this piece:
- WHERE they'll wear it: "From office to happy hour to weekend brunch"
- Layering suggestions for jewelry
- Complementary pieces or outfits

Care and Specifications
- Care instructions for maintaining quality
- Size specifications or adjustability
- Packaging details if gift-worthy

Why It's Special
Highlight the unique value proposition and emotional appeal of owning this piece.

CUSTOMER FAQs TO GENERATE:
Generate 5-7 FAQs customers commonly ask. Examples for jewelry:
- "Is this real gold/sterling silver?"
- "Will it tarnish or turn my skin green?"
- "Is the chain adjustable?"
- "Is this good for sensitive ears/skin?"
- "Does it come gift-wrapped?"
- "How do I care for this piece?"
- "What's the exact size/length?"
Answer each in 2-3 helpful sentences.`,

    home_living: `Structure your description following this format:

Start with a problem-first opening that acknowledges a home challenge. Example: "If your living room feels like it's missing something but you can't figure out what, this piece might be exactly what you need."

Design and Quality
Describe the aesthetic and construction details:
- Style, color, and visual appeal
- Materials and craftsmanship quality
- Size, dimensions, and scale
- Finish quality and durability
- WHO this is best for: "Perfect for renters who want impact without commitment"

Functionality and Use
Explain practical applications:
- WHERE it works best: "Living rooms, bedrooms, entryways, or home offices"
- Versatility in different spaces
- Setup or installation requirements
- Compatibility with existing decor

Care and Specifications
- Maintenance requirements
- Warranty or quality guarantees
- Available sizes, colors, or variants

Home Enhancement Value
Conclude with how this piece improves daily life and living spaces.

CUSTOMER FAQs TO GENERATE:
Generate 5-7 FAQs customers commonly ask. Examples for home & living:
- "What are the exact dimensions?"
- "Is assembly required?"
- "Is this easy to clean/maintain?"
- "Will this work with my existing decor style?"
- "Is this sturdy enough for daily use?"
- "Does it come with a warranty?"
- "What's the weight capacity?"
Answer each in 2-3 helpful sentences.`,

    beauty_personal_care: `Structure your description following this format:

Start with a problem-first opening that acknowledges a beauty challenge. Example: "If you've tried every moisturizer and still wake up with dry, tight skin, this game-changing formula was made for you."

Key Ingredients and Benefits
Focus on what makes this product effective:
- Active ingredients and their benefits
- WHO this is best for: "Perfect for sensitive skin that reacts to everything"
- Expected results and timeline
- Unique formulation features

Application and Usage
Provide clear usage instructions:
- How to apply or use
- WHERE it fits in a routine: "Use after cleansing, before moisturizer"
- Best practices for optimal results
- Integration with existing routines

Product Details
- Size, packaging, and value
- Suitable for which skin/hair types
- Certifications (cruelty-free, organic, etc.)
- Shelf life and storage

Why Choose This
Highlight what sets this product apart and the lifestyle benefits.

CUSTOMER FAQs TO GENERATE:
Generate 5-7 FAQs customers commonly ask. Examples for beauty products:
- "Is this good for sensitive skin?"
- "Will this break me out?"
- "How long does one bottle/jar last?"
- "Can I use this with retinol/vitamin C?"
- "Is this cruelty-free/vegan?"
- "When will I see results?"
- "Does it have a strong scent?"
Answer each in 2-3 helpful sentences.`,

    general: `Structure your description following this format:

Start with a problem-first opening that acknowledges what the customer is looking for. Example: "If you've been searching for something that actually works as well as it looks, your search ends here."

What Makes It Special
Describe the most important aspects of the product:
- Primary function and benefits
- Quality indicators and materials
- Size, dimensions, or capacity
- Special features or technology
- WHO this is best for: "Perfect for busy people who need quality without fuss"

How You'll Use It
Explain how the customer will use this product:
- WHERE they'll use it: "At home, at work, or on the go"
- Versatility and additional applications
- Setup or usage requirements
- Compatibility considerations

Details and Care
- Important specifications or technical details
- Care, maintenance, or warranty information
- Available options (colors, sizes, variants)

Why You'll Love It
Conclude with why this product is the right choice and the benefits of owning it.

CUSTOMER FAQs TO GENERATE:
Generate 5-7 FAQs customers commonly ask. Examples for general products:
- "What are the exact dimensions/size?"
- "Is this durable for everyday use?"
- "What's it made of?"
- "How do I clean/maintain it?"
- "Does this come with a warranty or guarantee?"
- "What's included with purchase?"
- "Is this a good gift option?"
Answer each in 2-3 helpful sentences.`,
  };

  // eslint-disable-next-line security/detect-object-injection
  const defaultContent = defaultTemplates[category];
  const templateName =
    PRODUCT_CATEGORIES.find((cat) => cat.value === category)?.label || category;

  return updateCategoryTemplate(
    storeId,
    category,
    defaultContent,
    `${templateName} Default Template`,
  );
}
