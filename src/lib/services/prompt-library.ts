/**
 * Prompt Library for Image Generation
 *
 * Curated collection of ecommerce product photography prompts
 * organized by category for easy browsing and selection.
 *
 * Source: https://aitechtonic.com/chatgpt-image-generator-prompts-for-ecommerce/
 *
 * Uses Lucide icon names following design system guidelines.
 */

export interface PromptTemplate {
  id: string;
  label: string;
  prompt: string;
}

export interface PromptCategory {
  id: string;
  label: string;
  /** Lucide icon name */
  icon: string;
  prompts: PromptTemplate[];
}

/**
 * Prompt categories with curated templates from aitechtonic.com
 */
export const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    id: 'fashion-apparel',
    label: 'Fashion & Apparel',
    icon: 'Shirt',
    prompts: [
      {
        id: 'fashion-flatlay',
        label: 'Outfit Flat-Lay',
        prompt: 'Create a stylish outfit flat-lay display with the product as the centerpiece, arranged on a clean surface with complementary accessories',
      },
      {
        id: 'fashion-model-mockup',
        label: 'T-Shirt Mockup',
        prompt: 'Generate a realistic t-shirt model mockup showing the product worn naturally in a lifestyle setting',
      },
      {
        id: 'fashion-streetwear',
        label: 'Streetwear Scene',
        prompt: 'Create an urban streetwear scene featuring the product in a trendy city environment with authentic street style vibes',
      },
      {
        id: 'fashion-westernwear',
        label: 'Westernwear',
        prompt: 'Create an country western wear scene featuring the product in a trendy country environment with authentic western style vibes',
      },
      {
        id: 'fashion-gamedaywear',
        label: 'Game Day',
        prompt: 'Create an sports game day scene featuring the product in a trendy collegiate sporting environment with authentic college style vibes',
      },      
      {
        id: 'fashion-seasonal',
        label: 'Seasonal Campaign Banner',
        prompt: 'Design a seasonal campaign banner showcasing the product with appropriate seasonal styling and atmosphere',
      },
      {
        id: 'fashion-fabric-macro',
        label: 'Fabric Detail Macro Shot',
        prompt: 'Capture a detailed macro shot highlighting the fabric texture, quality, and craftsmanship of the product',
      },
      {
        id: 'fashion-studio',
        label: 'Studio Model Shot',
        prompt: 'Create a professional studio model shot with clean lighting showcasing the product on a model against a simple backdrop',
      },
      {
        id: 'fashion-bts',
        label: 'Behind-the-Scenes Fashion Shoot',
        prompt: 'Generate an authentic behind-the-scenes fashion shoot scene showing the product in a creative studio environment',
      },
      {
        id: 'fashion-ecommerce',
        label: 'Ecommerce Product Display',
        prompt: 'Create a clean, professional ecommerce product display with the product shown at multiple angles on a white background',
      },
      {
        id: 'fashion-accessory-flatlay',
        label: 'Accessory Flat-Lay Display',
        prompt: 'Arrange an accessory flat-lay display featuring the product alongside complementary fashion items and props',
      },
      {
        id: 'fashion-promo',
        label: 'Discount Promo Graphic',
        prompt: 'Design an eye-catching discount promo graphic featuring the product with bold sale messaging and vibrant styling',
      },
      {
        id: 'fashion-styling-reel',
        label: 'Outfit Styling Reel',
        prompt: 'Series showing how the product can be styled 3 ways: casual, semi-formal, and layered—great for content or lookbooks',
      },
      {
        id: 'fashion-wardrobe-rack',
        label: 'Wardrobe Rack Scene',
        prompt: 'Styled rack or dressing area showing multiple pieces from your collection hanging with accessories nearby',
      },
      {
        id: 'fashion-unboxing',
        label: 'Unboxing Fashion Moment',
        prompt: 'Photo of clothing brand packaging with garments neatly folded, tissue-wrapped, and laid in a custom box',
      },
      {
        id: 'fashion-seasonal-outfit',
        label: 'Seasonal Outfit Concept',
        prompt: 'Image of apparel styled for a specific season—layered looks for fall, light and airy for spring, cozy for winter',
      },
      {
        id: 'fashion-mirror-tryon',
        label: 'Mirror Try-On Image',
        prompt: 'POV-style shot of someone trying on the product in a stylish mirror selfie setup—great for Instagram and product features',
      },
    ],
  },
  {
    id: 'beauty-skincare',
    label: 'Beauty & Skincare',
    icon: 'Sparkles',
    prompts: [
      {
        id: 'beauty-minimalist',
        label: 'Minimalist Product Display',
        prompt: 'Create a minimalist beauty product display with clean lines, soft lighting, and a luxurious spa-like atmosphere',
      },
      {
        id: 'beauty-application',
        label: 'Product Application Close-Up',
        prompt: 'Generate a close-up shot of the product being applied, showing texture and application in natural, flattering light',
      },
      {
        id: 'beauty-comparison',
        label: 'Results Comparison Slide',
        prompt: 'Create a before/after results comparison layout showcasing the product effectiveness with clean, professional styling',
      },
      {
        id: 'beauty-shelf',
        label: 'Skincare Shelf Styling',
        prompt: 'Design an elegant bathroom shelf display featuring the product alongside complementary skincare items and decor',
      },
      {
        id: 'beauty-dropper',
        label: 'Dropper Macro Moment',
        prompt: 'Capture a macro shot of a dropper with the product, showing texture and consistency in beautiful detail',
      },
      {
        id: 'beauty-giftset',
        label: 'Holiday Gift Set Visual',
        prompt: 'Create a luxurious holiday gift set visual with the product beautifully packaged and styled with festive elements',
      },
      {
        id: 'beauty-launch',
        label: 'Launch Campaign Banner',
        prompt: 'Design an impactful product launch campaign banner with the product as hero, featuring premium styling and lighting',
      },
      {
        id: 'beauty-ingredient',
        label: 'Raw Ingredient Feature',
        prompt: 'Showcase the product alongside its raw natural ingredients in an organic, clean beauty style arrangement',
      },
      {
        id: 'beauty-clean',
        label: 'Clean Beauty Campaign Image',
        prompt: 'Create a clean beauty campaign image emphasizing natural, sustainable aesthetics with soft, natural lighting',
      },
      {
        id: 'beauty-tutorial',
        label: 'Stepwise Tutorial Layout',
        prompt: 'Design a step-by-step tutorial layout showing how to use the product, with clear visuals for each application step',
      },
    ],
  },
  {
    id: 'home-living',
    label: 'Home & Living',
    icon: 'Home',
    prompts: [
      {
        id: 'home-living-room',
        label: 'Living Room in Action',
        prompt: 'Place the product in a beautifully styled living room with warm lighting, comfortable furniture, and inviting atmosphere',
      },
      {
        id: 'home-kitchen',
        label: 'Kitchen in Action',
        prompt: 'Show the product in use in a bright, modern kitchen during meal preparation or serving',
      },
      {
        id: 'home-decor-flatlay',
        label: 'Decor Flat-Lay',
        prompt: 'Create a styled flat-lay featuring the product with complementary home decor items and textures',
      },
      {
        id: 'home-festive',
        label: 'Festive Interior Scene',
        prompt: 'Display the product in a festively decorated interior with holiday styling and warm, cozy atmosphere',
      },
      {
        id: 'home-in-use',
        label: 'Product in Use Scene',
        prompt: 'Show the product being used naturally in a home setting, demonstrating its functionality and appeal',
      },
      {
        id: 'home-shelf',
        label: 'Shelf Display',
        prompt: 'Style the product on a decorative shelf alongside complementary items in a curated home vignette',
      },
      {
        id: 'home-wall-art',
        label: 'Wall Art',
        prompt: 'Display the product in a realistic wall art frame mockup within a stylish interior setting',
      },
      {
        id: 'home-bundle',
        label: 'Cozy Product Bundle',
        prompt: 'Arrange a cozy product bundle featuring the item with complementary products in a warm, inviting setting',
      },
    ],
  },
  {
    id: 'pet-products',
    label: 'Pet Products',
    icon: 'PawPrint',
    prompts: [
      {
        id: 'pet-action',
        label: 'Pet in Action',
        prompt: 'Show a happy pet actively using or interacting with the product in an engaging, dynamic scene',
      },
      {
        id: 'pet-flatlay',
        label: 'Flat-Lay',
        prompt: 'Create a styled flat-lay featuring the product alongside other pet essentials and accessories',
      },
      {
        id: 'pet-lifestyle',
        label: 'Lifestyle with Pet',
        prompt: 'Display the product in a lifestyle scene showing a pet and owner enjoying time together',
      },
      {
        id: 'pet-festive',
        label: 'Festive Pet Portrait',
        prompt: 'Create a festive portrait featuring a pet with the product in holiday-themed styling',
      },
      {
        id: 'pet-furniture',
        label: 'Pet Furniture Styling',
        prompt: 'Show the product as pet furniture styled beautifully in a modern home interior',
      },
      {
        id: 'pet-sale',
        label: 'Pet Sale',
        prompt: 'Create an engaging pet product sale graphic featuring the product with playful, eye-catching styling',
      },
      {
        id: 'pet-grooming',
        label: 'Grooming Scene',
        prompt: 'Display the product in a grooming scene showing a well-cared-for pet with the product in use',
      },
      {
        id: 'pet-travel',
        label: 'Pet Travel Product',
        prompt: 'Show the product in a travel context with a pet, suggesting adventure and convenience',
      },
    ],
  },
  {
    id: 'tech-accessories',
    label: 'Tech Accessories',
    icon: 'Smartphone',
    prompts: [
      {
        id: 'tech-phone-lifestyle',
        label: 'Phone Case',
        prompt: 'Show the product on a phone in a lifestyle scene with modern, tech-forward styling',
      },
      {
        id: 'tech-desk-flatlay',
        label: 'Desk Flat-Lay',
        prompt: 'Create a desk essentials flat-lay featuring the product alongside other tech accessories and workspace items',
      },
      {
        id: 'tech-minimalist',
        label: 'Minimalist Desk Hero Shot',
        prompt: 'Design a minimalist hero shot of the product on a clean, modern desk with premium lighting',
      },
      {
        id: 'tech-charging',
        label: 'Charging Device in Action',
        prompt: 'Show the product in use as a charging device with sleek tech styling and ambient lighting',
      },
      {
        id: 'tech-mobile',
        label: 'On-the-Move Tech Usage',
        prompt: 'Display the product being used on-the-go in an urban, active lifestyle context',
      },
      {
        id: 'tech-unboxing',
        label: 'Unboxing Experience Mockup',
        prompt: 'Create an unboxing experience mockup showing premium packaging reveal with tech excitement',
      },
      {
        id: 'tech-sale',
        label: 'Tech Sale Banner Design',
        prompt: 'Create a tech sale banner featuring the product with dynamic, attention-grabbing styling',
      },
    ],
  },
  {
    id: 'baby-kids',
    label: 'Baby & Kids Products',
    icon: 'Baby',
    prompts: [
      {
        id: 'baby-everyday',
        label: 'Baby Everyday Use',
        prompt: 'Show the product in everyday use with a baby in a warm, nurturing family setting',
      },
      {
        id: 'baby-room',
        label: "Child's Room Scene",
        prompt: "Display the product in a beautifully styled child's room with playful, age-appropriate decor",
      },
      {
        id: 'baby-outdoor',
        label: 'Bonding Moment',
        prompt: 'Create an outdoor bonding scene featuring the product in a family moment with natural lighting',
      },
      {
        id: 'baby-flatlay',
        label: 'Baby Flat Lay',
        prompt: 'Arrange a baby essentials flat-lay featuring the product alongside other newborn must-haves',
      },
      {
        id: 'baby-playtime',
        label: 'Playtime Joy',
        prompt: 'Capture a joyful playtime moment with the product, showing happy engagement and play',
      },
      {
        id: 'baby-giftbox',
        label: 'Gift Box Reveal Mockup',
        prompt: 'Design a gift box reveal mockup showing the product beautifully packaged for gifting',
      },
      {
        id: 'baby-nursery',
        label: 'Modern Nursery',
        prompt: 'Style the product in a modern nursery with contemporary decor and soft, calming colors',
      },
      {
        id: 'baby-festive',
        label: 'Festive Baby Outfit',
        prompt: 'Create a festive baby outfit setup featuring the product with holiday-themed props and styling',
      },
    ],
  },
  {
    id: 'fitness-wellness',
    label: 'Fitness & Wellness',
    icon: 'Dumbbell',
    prompts: [
      {
        id: 'fitness-motion',
        label: 'In-Motion Workout Shot',
        prompt: 'Capture the product in an active workout scene with dynamic movement and energy',
      },
      {
        id: 'fitness-detail',
        label: 'Material Detail Highlight',
        prompt: 'Create a detail shot highlighting the quality materials and construction of the product',
      },
      {
        id: 'fitness-flatlay',
        label: 'Flat-Lay Fitness Essentials',
        prompt: 'Arrange a fitness essentials flat-lay featuring the product alongside workout gear and accessories',
      },
      {
        id: 'fitness-wellness',
        label: 'Wellness Kit Scene',
        prompt: 'Display the product in a wellness kit scene promoting self-care and healthy living',
      },
      {
        id: 'fitness-progress',
        label: 'Visual Progress Story',
        prompt: 'Create a visual progress story showing the product as part of a fitness transformation journey',
      },
      {
        id: 'fitness-athleisure',
        label: 'Athleisure in Motion',
        prompt: 'Show the product in an athleisure lifestyle context, blending fitness with everyday style',
      },
      {
        id: 'fitness-mindful',
        label: 'Mindful Routine Showcase',
        prompt: 'Display the product in a mindful routine scene with yoga, meditation, or wellness practice',
      },
      {
        id: 'fitness-gear',
        label: 'Gear and Apparel Layout',
        prompt: 'Create a gear and apparel layout featuring the product with complementary fitness equipment',
      },
      {
        id: 'fitness-app',
        label: 'App + Gear Pairing Visual',
        prompt: 'Show the product paired with a fitness app or tracker in a connected workout scene',
      },
      {
        id: 'fitness-outdoor',
        label: 'Outdoor Seasonal Activity',
        prompt: 'Display the product in an outdoor seasonal activity setting with athletic, adventurous styling',
      },
    ],
  },
  {
    id: 'jewelry-accessories',
    label: 'Jewelry & Accessories',
    icon: 'Gem',
    prompts: [
      {
        id: 'jewelry-detail',
        label: 'Elegant Detail Close-Up',
        prompt: 'Create an elegant macro close-up highlighting the intricate details and craftsmanship of the product',
      },
      {
        id: 'jewelry-everyday',
        label: 'Everyday Style Look',
        prompt: 'Show the product being worn in an everyday style context with natural, effortless elegance',
      },
      {
        id: 'jewelry-flatlay',
        label: 'Chic Flat-Lay',
        prompt: 'Arrange a chic flat-lay featuring the product with complementary accessories and elegant props',
      },
      {
        id: 'jewelry-unboxing',
        label: 'Gift Unboxing Reveal',
        prompt: 'Create a luxurious gift unboxing moment showing the product in premium packaging',
      },
      {
        id: 'jewelry-gifting',
        label: 'Gifting Moment Photo',
        prompt: 'Capture a heartwarming gifting moment with the product being given as a meaningful present',
      },
      {
        id: 'jewelry-holiday',
        label: 'Holiday-Inspired Theme',
        prompt: 'Style the product with holiday-inspired theming and festive, elegant atmosphere',
      },
      {
        id: 'jewelry-finishes',
        label: 'Multiple Finish Showcase',
        prompt: 'Display multiple finish options of the product in an organized, comparative layout',
      },
      {
        id: 'jewelry-editorial',
        label: 'Editorial Fashion Shot',
        prompt: 'Create an editorial fashion shot featuring the product as the hero accessory with high-fashion styling',
      },
      {
        id: 'jewelry-social',
        label: 'Social Promo',
        prompt: 'Design a clean, social media ready promo image featuring the product with minimalist elegance',
      },
      {
        id: 'jewelry-set',
        label: 'Matching Jewelry Set Photo',
        prompt: 'Display a matching jewelry set featuring the product with coordinating pieces',
      },
    ],
  },
  {
    id: 'food-beverage',
    label: 'Food & Beverage',
    icon: 'UtensilsCrossed',
    prompts: [
      {
        id: 'food-hero',
        label: 'Kitchen Counter Hero Shot',
        prompt: 'Create a hero shot of the product on a kitchen counter with fresh ingredients and warm lighting',
      },
      {
        id: 'food-serving',
        label: 'Serving Inspiration Scene',
        prompt: 'Show the product in a beautiful serving scene inspiring culinary creativity',
      },
      {
        id: 'food-flatlay',
        label: 'Flat-Lay Meal Setup',
        prompt: 'Arrange a styled meal flat-lay featuring the product as the centerpiece',
      },
      {
        id: 'food-seasonal',
        label: 'Seasonal Food Scene',
        prompt: 'Display the product in a seasonal food scene with appropriate seasonal ingredients and styling',
      },
      {
        id: 'food-unboxing',
        label: 'Unboxing Reveal Moment',
        prompt: 'Create an unboxing reveal showing the product arriving fresh with appetizing presentation',
      },
      {
        id: 'food-enjoyment',
        label: 'Candid Enjoyment Image',
        prompt: 'Capture a candid moment of someone enjoying the product with authentic pleasure',
      },
      {
        id: 'food-howto',
        label: 'How-To or Prep Steps',
        prompt: 'Create a step-by-step visual showing how to prepare or serve the product',
      },
      {
        id: 'food-bundle',
        label: 'Curated Food Bundle Display',
        prompt: 'Arrange a curated bundle display featuring the product with complementary food items',
      },
      {
        id: 'food-ad',
        label: 'Ad-Ready Minimalist Photo',
        prompt: 'Design an ad-ready minimalist food photo featuring the product with clean, appetizing styling',
      },
      {
        id: 'food-shelf',
        label: 'Shelf-Ready Branding Layout',
        prompt: 'Create a shelf-ready product layout showing the product packaging in retail context',
      },
    ],
  },
];

/**
 * Get all categories
 */
export function getCategories(): Array<{ id: string; label: string; icon: string }> {
  return PROMPT_CATEGORIES.map(({ id, label, icon }) => ({ id, label, icon }));
}

/**
 * Get prompts for a specific category
 */
export function getPromptsForCategory(categoryId: string): PromptTemplate[] {
  const category = PROMPT_CATEGORIES.find((c) => c.id === categoryId);
  return category?.prompts ?? [];
}

/**
 * Get a specific prompt by ID
 */
export function getPromptById(promptId: string): PromptTemplate | null {
  for (const category of PROMPT_CATEGORIES) {
    const prompt = category.prompts.find((p) => p.id === promptId);
    if (prompt) return prompt;
  }
  return null;
}

/**
 * Search prompts across all categories
 */
export function searchPrompts(query: string): Array<PromptTemplate & { categoryId: string }> {
  const lowerQuery = query.toLowerCase();
  const results: Array<PromptTemplate & { categoryId: string }> = [];

  for (const category of PROMPT_CATEGORIES) {
    for (const prompt of category.prompts) {
      if (
        prompt.label.toLowerCase().includes(lowerQuery) ||
        prompt.prompt.toLowerCase().includes(lowerQuery)
      ) {
        results.push({ ...prompt, categoryId: category.id });
      }
    }
  }

  return results;
}

/**
 * Get total prompt count
 */
export function getTotalPromptCount(): number {
  return PROMPT_CATEGORIES.reduce((total, cat) => total + cat.prompts.length, 0);
}
