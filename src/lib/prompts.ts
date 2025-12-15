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
      console.log("📍 Converting shop domain to UUID...");
      actualStoreId = (await getStoreId(storeId)) || storeId;
    }

    console.log(
      "🔎 Querying system_prompts table with store_id:",
      actualStoreId,
    );
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

    console.log(
      "✅ System prompt found:",
      data ? `${data.name} (${data.content.length} chars)` : "null",
    );
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
      console.log("No global default template found, using general");
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
    womens_clothing:
      "Focus on style, comfort, and versatility. Highlight fabric quality, fit, and how the piece can be styled for different occasions.",
    jewelry_accessories:
      "Emphasize craftsmanship, materials, and the emotional connection. Describe how the piece enhances personal style and makes the wearer feel special.",
    home_living:
      "Focus on functionality, aesthetic appeal, and how the item improves daily life. Highlight quality, design, and the ambiance it creates.",
    beauty_personal_care:
      "Emphasize benefits, ingredients, and results. Focus on how the product makes the user look and feel better.",
    electronics:
      "Highlight key features, performance, and value. Focus on how the technology improves the user's life or work.",
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

Remember: Your goal is to create descriptions that not only inform but inspire action. Every word should earn its place by either providing value to the customer or moving them closer to a purchase decision.`;

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
      console.log(
        "Default prompts already initialized for store:",
        actualStoreId,
      );
      return;
    }

    // Initialize system prompt
    await resetSystemPrompt(actualStoreId);

    // Initialize all 6 default category templates
    const categories: ProductCategory[] = [
      "womens_clothing",
      "jewelry_accessories",
      "home_living",
      "beauty_personal_care",
      "electronics",
      "general",
    ];

    for (const category of categories) {
      await resetCategoryTemplate(actualStoreId, category);
    }

    console.log(
      "✅ Successfully initialized default prompts for store:",
      actualStoreId,
    );
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

Begin with a compelling opening that highlights the primary benefit or appeal of this product. Help the customer visualize how this item will enhance their life.

What Makes It Special
Describe the most important aspects of the product:
- Primary function and benefits
- Quality indicators and materials
- Size, dimensions, or capacity
- Special features or technology

How You'll Use It
Explain how the customer will use this product:
- Primary use cases
- Versatility and additional applications
- Setup or usage requirements
- Compatibility considerations

Details and Care
- Important specifications or technical details
- Care, maintenance, or warranty information
- Available options (colors, sizes, variants)

Why You'll Love It
Conclude with why this product is the right choice and the benefits of owning it.`,
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
