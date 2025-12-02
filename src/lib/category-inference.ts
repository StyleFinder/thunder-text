// AI-powered product category inference
// Analyzes product content to suggest appropriate Shopify categories

export interface CategoryInference {
  category: string
  confidence: number
  reasoning: string[]
}

// Shopify category mapping with keywords for inference
export const SHOPIFY_CATEGORIES = {
  'Clothing > Tops': {
    keywords: ['shirt', 'blouse', 'top', 'tank', 'camisole', 'sweater', 'cardigan', 'hoodie', 'sweatshirt', 'tunic', 'jersey', 'polo', 'tee', 't-shirt'],
    subcategories: ['sweater', 'cardigan', 'hoodie', 'sweatshirt', 'pullover'],
    patterns: ['worn on upper body', 'over the torso', 'casual wear', 'formal wear']
  },
  'Clothing > Bottoms': {
    keywords: ['pants', 'jeans', 'shorts', 'skirt', 'leggings', 'trousers', 'chinos', 'joggers', 'sweatpants', 'capris'],
    subcategories: ['jeans', 'dress pants', 'casual pants', 'athletic wear'],
    patterns: ['worn on lower body', 'legs', 'waist']
  },
  'Clothing > Dresses': {
    keywords: ['dress', 'gown', 'sundress', 'maxi', 'midi', 'mini', 'cocktail dress', 'evening dress'],
    subcategories: ['casual dress', 'formal dress', 'party dress'],
    patterns: ['one-piece', 'full outfit', 'occasion wear']
  },
  'Clothing > Outerwear': {
    keywords: ['jacket', 'coat', 'blazer', 'windbreaker', 'parka', 'bomber', 'denim jacket', 'leather jacket', 'raincoat'],
    subcategories: ['winter coat', 'rain jacket', 'casual jacket'],
    patterns: ['outer layer', 'weather protection', 'layering']
  },
  'Shoes': {
    keywords: ['shoes', 'sneakers', 'boots', 'sandals', 'heels', 'flats', 'loafers', 'oxfords', 'athletic shoes', 'running shoes'],
    subcategories: ['athletic', 'dress shoes', 'casual shoes'],
    patterns: ['footwear', 'worn on feet', 'walking', 'running']
  },
  'Accessories': {
    keywords: ['bag', 'handbag', 'purse', 'backpack', 'wallet', 'belt', 'hat', 'cap', 'scarf', 'gloves', 'sunglasses'],
    subcategories: ['bags', 'jewelry', 'headwear'],
    patterns: ['complement outfit', 'functional accessory', 'fashion statement']
  },
  'Jewelry': {
    keywords: ['necklace', 'earrings', 'bracelet', 'ring', 'watch', 'pendant', 'chain', 'jewelry', 'gold', 'silver'],
    subcategories: ['fine jewelry', 'fashion jewelry'],
    patterns: ['worn as decoration', 'precious metal', 'gemstone']
  },
  'Home & Garden': {
    keywords: ['pillow', 'throw', 'blanket', 'candle', 'vase', 'plant', 'home decor', 'furniture', 'lighting'],
    subcategories: ['home decor', 'furniture', 'garden'],
    patterns: ['home improvement', 'interior design', 'household item']
  }
}

// Analyze product content to infer category
export function inferProductCategory(
  title: string,
  description: string,
  keywords?: string[],
  existingCategory?: string
): CategoryInference {
  // If category already exists, return it with high confidence
  if (existingCategory && existingCategory !== 'General') {
    return {
      category: existingCategory,
      confidence: 1.0,
      reasoning: ['Category manually specified or previously assigned']
    }
  }

  // Separate title, description, and keywords for weighted analysis
  const titleText = (title || '').toLowerCase()
  const keywordsText = (keywords || []).join(' ').toLowerCase()  
  const descriptionText = (description || '').toLowerCase()
  const allText = [titleText, keywordsText, descriptionText].join(' ')


  let bestMatch: CategoryInference = {
    category: 'Fashion & Apparel',
    confidence: 0.3,
    reasoning: ['Default category - no specific indicators found']
  }

  // Score each category based on keyword matches and patterns
  for (const [category, categoryData] of Object.entries(SHOPIFY_CATEGORIES)) {
    let score = 0
    const reasons: string[] = []

    // PRIORITY 1: Title matches (highest weight) - what the product IS
    const titleKeywordMatches = categoryData.keywords.filter(keyword => 
      titleText.includes(keyword.toLowerCase())
    )
    if (titleKeywordMatches.length > 0) {
      score += titleKeywordMatches.length * 1.0  // Highest weight for title matches
      reasons.push(`Primary keywords in title: ${titleKeywordMatches.join(', ')}`)
    }

    // PRIORITY 2: Keywords/tags matches (high weight) - explicit categorization
    const keywordTagMatches = categoryData.keywords.filter(keyword => 
      keywordsText.includes(keyword.toLowerCase())
    )
    if (keywordTagMatches.length > 0) {
      score += keywordTagMatches.length * 0.8
      reasons.push(`Keywords/tags match: ${keywordTagMatches.join(', ')}`)
    }

    // PRIORITY 3: Subcategory matches in title/keywords (high weight) - but ONLY if not already counted as keywords
    const titleSubcategoryMatches = categoryData.subcategories.filter(sub => 
      (titleText.includes(sub.toLowerCase()) || keywordsText.includes(sub.toLowerCase())) &&
      !titleKeywordMatches.includes(sub) && !keywordTagMatches.includes(sub)  // Avoid double-counting
    )
    if (titleSubcategoryMatches.length > 0) {
      score += titleSubcategoryMatches.length * 0.9
      reasons.push(`Subcategory indicators: ${titleSubcategoryMatches.join(', ')}`)
    }

    // PRIORITY 4: Description matches (LOWER weight) - contextual mentions
    // Only give small weight to description matches to avoid false positives from styling suggestions
    const descriptionKeywordMatches = categoryData.keywords.filter(keyword => 
      descriptionText.includes(keyword.toLowerCase()) && 
      !titleText.includes(keyword.toLowerCase()) && 
      !keywordsText.includes(keyword.toLowerCase())
    )
    if (descriptionKeywordMatches.length > 0) {
      score += descriptionKeywordMatches.length * 0.1  // Much lower weight for description-only matches
      reasons.push(`Description context: ${descriptionKeywordMatches.join(', ')}`)
    }

    // Check pattern matches (title and keywords only - avoid description false positives)
    const patternMatches = categoryData.patterns.filter(pattern => 
      titleText.includes(pattern.toLowerCase()) || keywordsText.includes(pattern.toLowerCase())
    )
    
    if (patternMatches.length > 0) {
      score += patternMatches.length * 0.3
      reasons.push(`Usage patterns: ${patternMatches.join(', ')}`)
    }

    // Special scoring for gender-specific categories
    if (allText.includes('women') || allText.includes("women's") || allText.includes('ladies')) {
      if (category.includes('Clothing')) {
        score += 0.2
        reasons.push('Women\'s clothing indicator')
      }
    }

    if (allText.includes('men') || allText.includes("men's") || allText.includes('gentleman')) {
      if (category.includes('Clothing')) {
        score += 0.2
        reasons.push('Men\'s clothing indicator')
      }
    }

    // Update best match if this category scores higher
    if (score > bestMatch.confidence) {
      bestMatch = {
        category,
        confidence: Math.min(score, 1.0), // Cap at 1.0
        reasoning: reasons
      }
    }
  }

  // Additional inference for specific product types
  if (allText.includes('sweater') || allText.includes('cardigan') || allText.includes('pullover')) {
    if (bestMatch.category === 'Clothing > Tops' || bestMatch.confidence < 0.8) {
      bestMatch = {
        category: 'Clothing > Tops',
        confidence: 0.9,
        reasoning: ['Strong sweater/cardigan indicators found']
      }
    }
  }


  return bestMatch
}

// Get Shopify product type from category
export function getShopifyProductType(category: string): string {
  // Extract sub-category from the full category path for Shopify
  if (category.includes(' > ')) {
    // Example: "Clothing > Tops" becomes "Tops"
    return category.split(' > ')[1]
  }
  
  // If no parent separator, use the category as-is
  return category === 'Fashion & Apparel' ? 'General' : category
}

// Validate category confidence and provide user feedback
export function validateCategoryInference(inference: CategoryInference): {
  shouldAutoAssign: boolean
  userMessage?: string
  suggestedAction?: string
} {
  if (inference.confidence >= 0.8) {
    return {
      shouldAutoAssign: true,
      userMessage: `High confidence category assignment: ${inference.category}`
    }
  }
  
  if (inference.confidence >= 0.6) {
    return {
      shouldAutoAssign: true,
      userMessage: `Suggested category: ${inference.category} (${Math.round(inference.confidence * 100)}% confidence)`,
      suggestedAction: 'Review and adjust if needed'
    }
  }
  
  if (inference.confidence >= 0.4) {
    return {
      shouldAutoAssign: false,
      userMessage: `Low confidence suggestion: ${inference.category}`,
      suggestedAction: 'Manual category selection recommended'
    }
  }
  
  return {
    shouldAutoAssign: false,
    userMessage: 'Unable to determine appropriate category',
    suggestedAction: 'Please select category manually'
  }
}