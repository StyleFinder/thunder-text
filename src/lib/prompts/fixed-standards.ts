/**
 * Fixed Standards for Product Descriptions
 *
 * These are NON-NEGOTIABLE quality requirements that apply to ALL stores.
 * They define the output format, HTML rules, and quality standards.
 *
 * DO NOT make these per-store customizable - they ensure consistent quality.
 */

/**
 * JSON output structure requirements
 */
export const OUTPUT_FORMAT_STANDARDS = `
## OUTPUT FORMAT (NON-NEGOTIABLE)

Return a JSON object with these EXACT fields:
{
  "title": "Product title (max 70 characters) - Include product type and key benefit",
  "description": "Detailed product description following the structure guidelines (200-400 words)",
  "bulletPoints": ["Array of 5-7 key benefit bullet points"],
  "metaDescription": "SEO meta description (max 160 characters)",
  "keywords": ["Array of 8-12 relevant SEO keywords"],
  "suggestedPrice": "Suggested price range based on category and features",
  "tags": ["Array of product tags for organization"],
  "faqs": [
    {"question": "Common customer question about this product", "answer": "Helpful 2-3 sentence answer"}
  ]
}

TITLE REQUIREMENTS:
- Max 70 characters
- Include product type (e.g., "Dress", "Necklace", "Candle")
- Include primary benefit or key feature
- Bad: "The Rachel Jean" (name only)
- Good: "High-Rise Flare Jean with Tummy Control" (type + benefit)
`;

/**
 * HTML formatting rules for descriptions
 */
export const HTML_FORMATTING_RULES = `
## HTML FORMATTING RULES (NON-NEGOTIABLE)

- Use HTML formatting for the description, NOT Markdown
- Section headers use <b>Header Name</b> tags
- Bullet points use the bullet character: •
- Do NOT use - or * for bullets
- Body text is plain (no bold on paragraph text)
- Use <br><br> for line breaks between sections
- Do NOT use <p> tags or wrapper elements
- Never use markdown asterisks or hashtags
- The <b>, <br>, and • characters must appear in the JSON string

EXAMPLE STRUCTURE:
Aspirational Headline Here<br><br>Opening paragraph that captures essence.<br><br><b>Design Feature Name</b><br>Description of design elements...<br><br><b>Fit, Fabric & Feel</b><br>• First quality point<br>• Second quality point<br>• Available in: S, M, L, XL
`;

/**
 * AI discoverability requirements (for ChatGPT, Siri, etc.)
 */
export const AI_DISCOVERABILITY_REQUIREMENTS = `
## AI DISCOVERABILITY (CRITICAL FOR MODERN COMMERCE)

Modern customers discover products through AI assistants (ChatGPT, Siri, Google).
Write descriptions that clearly answer:

1. WHAT PROBLEM does this product solve?
   - Be specific: "tired of jeans that gap at the waist" not just "comfortable"

2. WHO is this product best for?
   - Target audience: body types, lifestyles, occasions
   - Example: "perfect for petite women who want a lengthening silhouette"

3. WHEN/WHERE would someone use this?
   - Occasions: "from office to happy hour"
   - Settings: "beach vacation, casual weekends, date night"

4. WHY should they choose THIS over alternatives?
   - Unique selling points, not generic claims
   - "hidden elastic waistband" not just "comfortable fit"

This helps AI recommend your products when customers ask:
- "What jeans are best for curvy women?"
- "What's a good gift for someone who loves minimalist jewelry?"
- "What candles smell like a cozy cabin?"
`;

/**
 * SEO requirements
 */
export const SEO_REQUIREMENTS = `
## SEO REQUIREMENTS

KEYWORDS:
- Naturally incorporate 3-5 relevant keywords
- Include semantic variations (synonyms, related terms)
- Don't keyword stuff - readability first

META DESCRIPTION:
- 150-160 characters maximum
- Include primary keyword
- Compelling call to action or benefit
- Example: "Discover the perfect high-waisted jean that hugs your curves. Our tummy control design flatters every figure. Free shipping over $50."

WORD COUNT:
- Target 200-400 words for optimal SEO
- Front-load important information
- Use natural paragraph breaks
`;

/**
 * FAQ generation requirements
 */
export const FAQ_REQUIREMENTS = `
## FAQ REQUIREMENTS

Generate 5-7 FAQs that customers commonly ask about this type of product:

QUESTION TYPES TO INCLUDE:
- Sizing/fit questions ("Do these run true to size?", "Will this fit a size 14?")
- Material/care questions ("Does it have stretch?", "Is it machine washable?")
- Styling questions ("What shoes work with this?", "Can I wear this to work?")
- Quality/durability questions ("Will this fade?", "Is it see-through?")
- Comparison questions ("How is this different from regular jeans?")

ANSWER GUIDELINES:
- 2-3 sentences per answer
- Be direct and helpful
- Include specific details when possible
- Address the underlying concern, not just the literal question

FAQs serve two purposes:
1. Help customers buy faster by answering their questions
2. Help AI assistants understand and recommend your products
`;

/**
 * Quality checklist for validation
 */
export const QUALITY_CHECKLIST = `
## QUALITY CHECKLIST (VERIFY BEFORE FINALIZING)

STRUCTURE:
[ ] Opens with aspirational headline (not generic opener)
[ ] Has clear section headers in <b> tags
[ ] Uses bullet points (•) for lists
[ ] Includes all product specifications provided

CONTENT:
[ ] Addresses WHO this is for
[ ] Explains WHAT problem it solves
[ ] Describes WHEN/WHERE to use it
[ ] Includes specific, sensory language (not generic adjectives)
[ ] Has fabric/material content with percentages when available
[ ] Includes care instructions
[ ] Lists available sizes from product data

FORMATTING:
[ ] No markdown formatting (no *, #, **)
[ ] Uses HTML tags correctly (<b>, <br>)
[ ] Bullet points use • character
[ ] 200-400 word count

TONE:
[ ] Reads as upscale-casual, aspirational yet accessible
[ ] Avoids marketing hyperbole ("amazing", "incredible", "must-have")
[ ] Sounds like a trusted boutique stylist, not a catalog
`;

/**
 * Combine all fixed standards into a single string
 */
export function getFixedStandards(): string {
  return `
=== FIXED QUALITY STANDARDS ===
These requirements apply to ALL product descriptions and cannot be customized.

${OUTPUT_FORMAT_STANDARDS}

${HTML_FORMATTING_RULES}

${AI_DISCOVERABILITY_REQUIREMENTS}

${SEO_REQUIREMENTS}

${FAQ_REQUIREMENTS}

${QUALITY_CHECKLIST}
`;
}
