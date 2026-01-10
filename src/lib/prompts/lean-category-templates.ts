/**
 * LEAN Category Templates
 *
 * These templates provide CONTENT GUIDANCE ONLY - no formatting rules.
 * Formatting rules live in fixed-standards.ts and apply to ALL categories.
 *
 * Each template defines:
 * - Section structure specific to the category
 * - Focus areas and emphasis points
 * - Tone guidance for the category
 */

import type { ProductCategory } from "@/lib/prompts-types";

/**
 * LEAN category templates - content guidance only
 */
const LEAN_CATEGORY_TEMPLATES: Record<ProductCategory, string> = {
  clothing: `
## CLOTHING-SPECIFIC GUIDANCE

DESCRIPTION STRUCTURE:
1. Opening: Aspirational headline that captures the piece's essence
   - Example: "Effortless Coastal Charm Meets Cozy Comfort"
   - Follow with 1-2 sentences positioning as statement piece or wardrobe essential

2. Design Features Section: <b>[Design Feature Name]</b>
   - Use descriptive header (e.g., "Nautical Motif Design", "Classic A-Line Silhouette")
   - Do NOT use pipes (|) in headers
   - Describe: colors, patterns, closures, neckline, structure
   - What makes this piece visually distinctive

3. Fit, Fabric & Feel Section: <b>Fit, Fabric & Feel</b>
   - Bullet points for: texture, weight, comfort, fit guidance
   - Include: relaxed/fitted, runs large/small, body type notes
   - Fabric content with percentages (e.g., "100% Acrylic")
   - Care instructions (e.g., "Hand wash cold, lay flat to dry")
   - End with: "Available in: [EXACT SIZES FROM PRODUCT DATA]"

4. Benefits Section: <b>Why You'll Love It</b>
   - 4-5 bullet points highlighting key benefits
   - Focus on: design standout, comfort, versatility, quality, lifestyle appeal

5. Styling Section: <b>How to Style It</b>
   - 4-5 bullet points with specific outfit ideas
   - Include: casual, elevated, seasonal, occasion-specific looks
   - Be specific: "Layer over a crisp white tee with high-rise denim"

FOCUS AREAS:
- Fit, comfort, and how the garment feels when worn
- Versatility - how many ways can this be styled?
- Specific style details (neckline, sleeves, hemline, silhouette)
- Fabric quality and care requirements

TONE: Upscale-casual, like a trusted boutique stylist giving personalized advice

FAQ FOCUS FOR CLOTHING:
- Sizing/fit ("Does this run true to size?", "Is it fitted or relaxed?")
- Fabric ("Does it have stretch?", "Is it see-through?", "Is it warm enough?")
- Care ("Can I machine wash it?", "Will it shrink?")
- Styling ("What can I wear this with?", "Is it office-appropriate?")
- Quality ("Will this hold up after washing?", "Does it wrinkle easily?")
`,

  jewelry_accessories: `
## JEWELRY & ACCESSORIES GUIDANCE

DESCRIPTION STRUCTURE:
1. Opening: Emotional impact statement or style significance
   - Example: "A Modern Heirloom for Every Chapter"
   - Connect to meaning, gifting, or personal expression

2. Craftsmanship Section: <b>Artisan Details</b>
   - Materials: metals, stones, finishes (be specific)
   - Construction: handcrafted, plated, solid, etc.
   - Unique design elements and inspiration

3. Styling Section: <b>How to Wear It</b>
   - Layering suggestions for necklaces/bracelets
   - Occasions: everyday, special events, work
   - Complementary pieces and outfit pairings

4. Specifications Section: <b>Details & Care</b>
   - Dimensions (chain length, pendant size, ring width)
   - Materials and finish
   - Care instructions for longevity
   - Packaging (gift-ready, box, pouch)

5. Benefits Section: <b>Why You'll Love It</b>
   - Emotional value (gift-worthy, meaningful)
   - Versatility (day-to-night, layer-able)
   - Quality and craftsmanship
   - Timeless vs trendy appeal

FOCUS AREAS:
- Craftsmanship and material quality
- Emotional connection and meaning
- Gifting appeal and presentation
- Styling versatility and occasion appropriateness

TONE: Elegant and aspirational, emotionally resonant without being flowery

FAQ FOCUS FOR JEWELRY:
- Materials ("Is this real gold?", "Will it tarnish?", "Is it hypoallergenic?")
- Sizing ("How do I measure my ring size?", "How long is the chain?")
- Care ("Can I shower with it?", "How do I clean it?")
- Gifting ("Does it come in a gift box?", "Can I return it if it doesn't fit?")
- Quality ("Will the plating wear off?", "Is it lightweight or heavy?")
`,

  home_living: `
## HOME & LIVING GUIDANCE

DESCRIPTION STRUCTURE:
1. Opening: How this transforms the space
   - Example: "Bring Warmth and Character to Any Room"
   - Connect to lifestyle, ambiance, or design aesthetic

2. Design Section: <b>Design & Aesthetic</b>
   - Visual description: colors, patterns, textures
   - Style category: modern, bohemian, minimalist, rustic, etc.
   - How it complements different decor styles

3. Quality Section: <b>Quality & Construction</b>
   - Materials and their benefits
   - Durability and longevity
   - Construction details (hand-woven, machine-made, etc.)

4. Functionality Section: <b>Practical Details</b>
   - Dimensions and sizing
   - Care and maintenance
   - Indoor/outdoor suitability
   - Assembly requirements if applicable

5. Benefits Section: <b>Why You'll Love It</b>
   - How it enhances the home
   - Versatility across rooms/uses
   - Quality and value
   - Gift-worthy appeal

FOCUS AREAS:
- How the item transforms or enhances a space
- Material quality and durability
- Functionality and practical use
- Style versatility across different aesthetics

TONE: Warm and inviting, helping customers envision the item in their home

FAQ FOCUS FOR HOME:
- Dimensions ("What are the exact measurements?", "Will this fit my space?")
- Materials ("Is this real wood?", "Is it pet-friendly?")
- Care ("How do I clean this?", "Is it machine washable?")
- Durability ("Is this suitable for outdoor use?", "Will it fade in sunlight?")
- Assembly ("Does this require assembly?", "What tools do I need?")
`,

  beauty_personal_care: `
## BEAUTY & PERSONAL CARE GUIDANCE

DESCRIPTION STRUCTURE:
1. Opening: The transformation or benefit promise
   - Example: "Achieve That Lit-From-Within Glow"
   - Lead with the result, not the ingredients

2. Benefits Section: <b>Key Benefits</b>
   - Primary result (hydration, glow, smoothness)
   - Secondary benefits
   - Who it's best for (skin type, concerns)

3. Ingredients Section: <b>What's Inside</b>
   - Hero ingredients and their benefits
   - Notable inclusions (natural, vegan, etc.)
   - What's NOT included (free from...)

4. Usage Section: <b>How to Use</b>
   - Application method and frequency
   - Tips for best results
   - Where it fits in a routine (AM/PM, order of application)

5. Details Section: <b>Product Details</b>
   - Size/volume
   - Scent description if applicable
   - Shelf life or special storage

FOCUS AREAS:
- Results and transformation
- Key ingredients and their benefits
- Application and routine integration
- Skin type suitability and concerns addressed

TONE: Knowledgeable and reassuring, like a trusted esthetician or beauty expert

FAQ FOCUS FOR BEAUTY:
- Suitability ("Is this good for sensitive skin?", "Will this work on oily skin?")
- Usage ("How often should I use this?", "When in my routine does this go?")
- Ingredients ("Is this cruelty-free?", "Does it contain fragrance?")
- Results ("How long until I see results?", "Will this break me out?")
- Safety ("Is this pregnancy-safe?", "Can I use this with retinol?")
`,

  general: `
## GENERAL PRODUCT GUIDANCE

DESCRIPTION STRUCTURE:
1. Opening: What makes this product valuable
   - Lead with the primary benefit or problem it solves
   - Position as solution to a specific need

2. Features Section: <b>Key Features</b>
   - Primary features and their benefits
   - What sets this apart from alternatives
   - Quality indicators

3. Usage Section: <b>How to Use</b>
   - Primary use case
   - Additional applications or versatility
   - Tips for getting the most from the product

4. Details Section: <b>Details & Specifications</b>
   - Dimensions, weight, capacity as relevant
   - Materials and construction
   - Care or maintenance requirements
   - What's included (packaging, accessories)

5. Benefits Section: <b>Why You'll Love It</b>
   - Key benefits summarized
   - Quality and value proposition
   - Versatility and everyday usefulness

FOCUS AREAS:
- Problem solved or need fulfilled
- Key features and their benefits
- Quality and durability
- Versatility and value

TONE: Clear, helpful, and straightforward - like a knowledgeable friend recommending something they use

FAQ FOCUS FOR GENERAL PRODUCTS:
- Specifications ("What are the dimensions?", "How much does it weigh?")
- Usage ("How do I use this?", "What is this best for?")
- Quality ("How durable is this?", "What is it made of?")
- Compatibility ("Does this work with...?", "Is this compatible with...?")
- Value ("What's included?", "Is there a warranty?")
`,
};

/**
 * Get LEAN category template for a product category
 *
 * @param category - Product category
 * @returns Category-specific guidance (no formatting rules)
 */
export function getLeanCategoryTemplate(category: ProductCategory): string {
  return LEAN_CATEGORY_TEMPLATES[category] || LEAN_CATEGORY_TEMPLATES.general;
}

/**
 * Get all available categories
 */
export function getAvailableCategories(): ProductCategory[] {
  return Object.keys(LEAN_CATEGORY_TEMPLATES) as ProductCategory[];
}
