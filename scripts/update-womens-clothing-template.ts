/**
 * Script to update the women's clothing category template with enhanced FAQ format
 * Run with: npx tsx scripts/update-womens-clothing-template.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const ENHANCED_WOMENS_CLOTHING_TEMPLATE = `# Product Description Template - Women's Clothing

Use this structure to create compelling, informative product descriptions:

## Opening Hook (1-2 sentences)
Create an engaging introduction that immediately captures attention and highlights the key benefit or transformation the product offers. Connect emotionally with the customer.

## Product Details
Describe the key features and construction:
- Primary material and fabric properties (e.g., "Ity Knit - wrinkle-resistant, travel-friendly")
- Silhouette and fit characteristics
- Design elements and styling details
- Color and finish

## Perfect For
Use a bulleted list with specific use cases:
- **Office wear**: [Styling suggestion]
- **Date night**: [Styling suggestion]
- **Travel**: [Practical benefit]
- **[Season/Occasion]**: [How it works for this context]

## Styling Tips
Provide 2-3 concrete styling suggestions showing versatility:
- How to dress it up
- How to dress it down
- Seasonal adaptation ideas
- Accessory pairing recommendations

## Materials &amp; Details
Present technical specifications in a clean list:
- **Fabric**: [Material name and properties]
- **Silhouette**: [Fit description]
- **Fit**: True to size / Runs small / Runs large
- **Features**: [Special properties like wrinkle-resistant, stretch, etc.]
- **Sizes**: XS, S, M, L, XL, XXL
- **Care**: [Basic care instructions]

## FAQ
Include 3-4 common questions and answers:

**Q: How does the [item] fit?**
A: [Detailed fit information]

**Q: Is it suitable for all seasons?**
A: [Seasonality and versatility information]

**Q: Can it be styled for [occasion type]?**
A: [Styling flexibility answer]

**Q: [Product-specific question]?**
A: [Helpful, specific answer]

## Care &amp; Sizing
Provide practical care information:
- Washing instructions
- Drying recommendations
- Reference to sizing chart if applicable

## Why You'll Love It
Close with a compelling summary (1-2 sentences) that reinforces the key benefits and emotional appeal. Focus on how it makes the customer feel confident, elegant, or empowered.

---

## Formatting Requirements:
- Use HTML <b> tags for bold text (NOT markdown **)
- Use &amp; for ampersands
- Section headers should be clear and consistent
- Keep paragraphs concise and scannable
- Use bulleted lists for easy reading`

async function updateTemplate() {
  try {
    console.log('🔍 Finding coach-ellie-test-store...')

    // Get store UUID
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('shop_domain', 'coach-ellie-test-store.myshopify.com')
      .single()

    if (shopError || !shop) {
      console.error('❌ Could not find shop:', shopError)
      return
    }

    console.log('✅ Found shop UUID:', shop.id)
    console.log('📝 Updating womens_clothing template...')

    // Update the template
    const { data, error } = await supabase
      .from('category_templates')
      .update({
        content: ENHANCED_WOMENS_CLOTHING_TEMPLATE,
        updated_at: new Date().toISOString()
      })
      .eq('store_id', shop.id)
      .eq('category', 'womens_clothing')
      .eq('is_default', true)
      .select()

    if (error) {
      console.error('❌ Update failed:', error)
      return
    }

    console.log('✅ Template updated successfully!')
    console.log('📊 Updated record:', data)
    console.log('\n✨ The womens_clothing template now includes:')
    console.log('   - Enhanced FAQ section (3-4 Q&As)')
    console.log('   - Detailed "Perfect For" section')
    console.log('   - Enhanced "Materials & Details" format')
    console.log('   - Improved formatting guidelines')

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

updateTemplate()
