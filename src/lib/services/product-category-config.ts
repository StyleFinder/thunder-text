/**
 * Product Category Configuration
 *
 * Defines category-based logic for conditional questionnaire behavior.
 * Determines which product categories need the size question vs. those
 * where size is implicit or irrelevant.
 *
 * Used to:
 * 1. Conditionally show/hide the productSize question
 * 2. Auto-apply default sizes for known categories (e.g., jewelry → tiny)
 * 3. Skip size question for categories where it's irrelevant (e.g., clothing)
 */

import type { ProductSize } from '@/types/image-generation';

/**
 * Categories where size matters for AI image generation
 * These will show the productSize question
 */
export const SIZE_RELEVANT_CATEGORIES: string[] = [
  // Home & Decor (size varies significantly)
  'Home Decor',
  'Home & Garden',
  'Furniture',
  'Decor',
  'Decorations',
  'Holiday Decorations',
  'Seasonal Decor',
  // Lighting (can be table lamp or floor lamp)
  'Lighting',
  'Lamps',
  'Light Fixtures',
  // Plants & Trees (can be tabletop or floor-standing)
  'Plants',
  'Trees',
  'Artificial Trees',
  'Artificial Plants',
  'Planters',
  // Home textiles with variable sizes
  'Rugs',
  'Curtains',
  'Bedding',
  'Blankets',
  // Kitchen & Appliances
  'Kitchen',
  'Appliances',
  'Small Appliances',
  'Cookware',
  'Kitchen Accessories',
  // Outdoor
  'Outdoor',
  'Patio',
  'Garden',
  'Outdoor Furniture',
  // Electronics (varies in size)
  'Electronics',
  'Tech',
  'Gadgets',
  'Audio',
  'Speakers',
  // Art & Frames
  'Art',
  'Wall Art',
  'Frames',
  'Mirrors',
  // Storage
  'Storage',
  'Organizers',
  'Baskets',
  'Containers',
];

/**
 * Categories where size is implicit/known - auto-apply default size
 * These will NOT show the productSize question but will apply a default
 */
export const AUTO_SIZE_CATEGORIES: Record<string, ProductSize> = {
  // Tiny items (fits in palm)
  Jewelry: 'tiny',
  Rings: 'tiny',
  Earrings: 'tiny',
  Necklaces: 'tiny',
  Bracelets: 'tiny',
  Watches: 'tiny',
  Pins: 'tiny',
  Brooches: 'tiny',
  Charms: 'tiny',
  Pendants: 'tiny',
  Cufflinks: 'tiny',

  // Small items (handheld)
  Accessories: 'small',
  Bags: 'small',
  Handbags: 'small',
  Purses: 'small',
  Wallets: 'small',
  Cosmetics: 'small',
  Beauty: 'small',
  Skincare: 'small',
  Makeup: 'small',
  Sunglasses: 'small',
  'Phone Cases': 'small',
  Eyewear: 'small',
  Perfume: 'small',
  Fragrance: 'small',
};

/**
 * Categories where size question is irrelevant (worn items)
 * These will NOT show the productSize question and have no default
 * Size in these categories refers to S/M/L/XL, not physical dimensions
 */
export const SIZE_IRRELEVANT_CATEGORIES: string[] = [
  // Clothing (size = S/M/L, not physical dimensions)
  'Clothing',
  'Apparel',
  'Tops',
  'Bottoms',
  'Dresses',
  'Outerwear',
  'Shirts',
  'T-Shirts',
  'Blouses',
  'Pants',
  'Jeans',
  'Shorts',
  'Skirts',
  'Jackets',
  'Coats',
  'Sweaters',
  'Hoodies',
  'Activewear',
  'Swimwear',
  'Underwear',
  'Lingerie',
  'Sleepwear',
  'Loungewear',
  'Suits',
  'Blazers',
  'Vests',
  // Shoes
  'Shoes',
  'Sneakers',
  'Boots',
  'Sandals',
  'Heels',
  'Flats',
  'Loafers',
  'Slippers',
  'Athletic Shoes',
  'Running Shoes',
  // Head items
  'Hats',
  'Caps',
  'Beanies',
  'Headwear',
  // Neckwear & Accessories worn on body
  'Scarves',
  'Ties',
  'Bow Ties',
  'Belts',
  'Gloves',
  'Socks',
];

/**
 * Normalize a product type string for comparison
 */
function normalizeCategory(category: string): string {
  return category.toLowerCase().trim();
}

/**
 * Check if a category matches any item in a list (case-insensitive, partial match)
 */
function matchesCategory(productType: string, categories: string[]): boolean {
  const normalized = normalizeCategory(productType);

  for (const category of categories) {
    const normalizedCategory = normalizeCategory(category);
    // Check for exact match or if productType contains the category
    if (normalized === normalizedCategory || normalized.includes(normalizedCategory)) {
      return true;
    }
    // Also check if category contains productType (for compound types like "Women's Tops")
    if (normalizedCategory.includes(normalized)) {
      return true;
    }
  }

  return false;
}

/**
 * Determine if the size question should be shown for a product type
 *
 * @param productType - The Shopify product type string
 * @returns true if size question should be shown, false to skip
 */
export function shouldShowSizeQuestion(productType: string): boolean {
  if (!productType || productType.trim() === '') {
    // Default: show size question for unknown/empty categories
    return true;
  }

  // Check if it's in auto-size categories (no question needed, has default)
  for (const category of Object.keys(AUTO_SIZE_CATEGORIES)) {
    if (matchesCategory(productType, [category])) {
      return false;
    }
  }

  // Check if it's size-irrelevant (no question needed, no default)
  if (matchesCategory(productType, SIZE_IRRELEVANT_CATEGORIES)) {
    return false;
  }

  // Check if it's explicitly size-relevant (show question)
  if (matchesCategory(productType, SIZE_RELEVANT_CATEGORIES)) {
    return true;
  }

  // Default: show size question for unknown categories
  // Better to ask than to assume incorrectly
  return true;
}

/**
 * Get the auto-applied size for a product type (if applicable)
 *
 * @param productType - The Shopify product type string
 * @returns ProductSize if auto-size should be applied, null otherwise
 */
export function getAutoSize(productType: string): ProductSize | null {
  if (!productType || productType.trim() === '') {
    return null;
  }

  for (const [category, size] of Object.entries(AUTO_SIZE_CATEGORIES)) {
    if (matchesCategory(productType, [category])) {
      return size;
    }
  }

  return null;
}

/**
 * Determine the questionnaire behavior for a product type
 *
 * @param productType - The Shopify product type string
 * @returns Object with behavior flags and optional auto-size
 */
export function getProductTypeQuestionnaireConfig(productType: string): {
  showSizeQuestion: boolean;
  autoSize: ProductSize | null;
  category: 'size_relevant' | 'auto_size' | 'size_irrelevant' | 'unknown';
} {
  if (!productType || productType.trim() === '') {
    return {
      showSizeQuestion: true,
      autoSize: null,
      category: 'unknown',
    };
  }

  // Check auto-size first (has default size, skip question)
  const autoSize = getAutoSize(productType);
  if (autoSize) {
    return {
      showSizeQuestion: false,
      autoSize,
      category: 'auto_size',
    };
  }

  // Check size-irrelevant (no question, no default)
  if (matchesCategory(productType, SIZE_IRRELEVANT_CATEGORIES)) {
    return {
      showSizeQuestion: false,
      autoSize: null,
      category: 'size_irrelevant',
    };
  }

  // Check size-relevant (show question)
  if (matchesCategory(productType, SIZE_RELEVANT_CATEGORIES)) {
    return {
      showSizeQuestion: true,
      autoSize: null,
      category: 'size_relevant',
    };
  }

  // Unknown category - show size question to be safe
  return {
    showSizeQuestion: true,
    autoSize: null,
    category: 'unknown',
  };
}
