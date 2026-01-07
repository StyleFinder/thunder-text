/* eslint-disable security/detect-object-injection -- Dynamic object access with validated keys is safe here */
/**
 * Image Prompt Parser
 *
 * Parses user prompts to extract structured scene information for AI image generation.
 * Works with both Google Gemini and OpenAI DALL-E/GPT Image models.
 *
 * Based on industry best practices from:
 * - Photoroom, MyAIForce, SellerPic prompt frameworks
 * - Midjourney/DALL-E scene taxonomy
 */

import type { ProductSize } from "@/types/image-generation";

// Product type classification for adaptive framing
export type ProductType = "tall" | "small" | "tabletop" | "standard";

// Product category for scene selection (from OpenAI prompt research)
export type ProductCategory =
  | "apparel"
  | "jewelry"
  | "shoes"
  | "home_decor"
  | "food_beverage"
  | "tech"
  | "beauty"
  | "general";

// Photography style (UGC vs professional)
export type PhotographyStyle = "professional" | "ugc" | "editorial";

// Intent/mood for atmosphere guidance
export type AtmosphereIntent =
  | "luxury"
  | "everyday"
  | "bold"
  | "minimal"
  | "cozy"
  | "energetic"
  | "natural";

/**
 * Questionnaire answer for prompt enhancement
 */
export interface QuestionnaireAnswerInput {
  questionId: string;
  answer: string;
}

export interface ParsedPrompt {
  // Environment classification
  environmentType: "indoor" | "outdoor" | "studio" | "ambiguous";

  // Specific location/room
  location: {
    type: string | null; // e.g., "living room", "patio", "kitchen"
    category: "home" | "commercial" | "natural" | "urban" | "studio" | null;
  };

  // Where the product sits
  placement: {
    surface: string | null; // e.g., "table", "mantel", "shelf", "floor"
    position: string | null; // e.g., "centered", "corner", "foreground"
  };

  // Lighting details
  lighting: {
    type: string | null; // e.g., "natural", "studio", "ambient"
    quality: string | null; // e.g., "soft", "dramatic", "warm"
    timeOfDay: string | null; // e.g., "morning", "golden hour", "night"
  };

  // Mood and atmosphere
  mood: {
    primary: string | null; // e.g., "cozy", "elegant", "modern"
    seasonal: string | null; // e.g., "holiday", "summer", "winter"
    style: string | null; // e.g., "minimalist", "luxurious", "rustic"
  };

  // Photography style
  photography: {
    shotType: string | null; // e.g., "close-up", "wide", "medium"
    angle: string | null; // e.g., "eye-level", "overhead", "low angle"
    depth: string | null; // e.g., "shallow DOF", "deep focus"
  };

  // Product type detection for adaptive framing
  productType: ProductType;

  // Product category for scene selection
  productCategory: ProductCategory;

  // Photography style (professional vs UGC)
  photographyStyle: PhotographyStyle;

  // Atmosphere intent for mood guidance
  atmosphereIntent: AtmosphereIntent | null;

  // Negative prompts (exclusions)
  negativePrompts: string[];

  // Props and accessories mentioned in the prompt (NOT the product itself)
  // e.g., "fairy lights", "gift boxes", "snowflakes", "flowers", "candles"
  props: string[];

  // Original prompt preserved
  originalPrompt: string;

  // Confidence score for environment detection (0-1)
  confidence: number;
}

// Environment keyword mappings
const ENVIRONMENT_KEYWORDS = {
  indoor: {
    explicit: ["inside", "interior", "indoors", "indoor"],
    rooms: {
      home: [
        "living room",
        "bedroom",
        "kitchen",
        "bathroom",
        "dining room",
        "foyer",
        "entryway",
        "hallway",
        "office",
        "study",
        "den",
        "nursery",
        "playroom",
        "basement",
        "attic",
        "laundry room",
        "mudroom",
        "sunroom",
        "conservatory",
        "home office",
      ],
      commercial: [
        "studio",
        "retail",
        "store",
        "shop",
        "cafe",
        "restaurant",
        "hotel",
        "lobby",
        "spa",
        "salon",
        "gym",
        "office building",
        "showroom",
        "gallery",
        "museum",
        "library",
      ],
    },
    features: [
      "fireplace",
      "mantel",
      "shelf",
      "bookshelf",
      "cabinet",
      "counter",
      "countertop",
      "windowsill",
      "dresser",
      "nightstand",
      "coffee table",
      "dining table",
      "desk",
      "credenza",
      "console",
      "sideboard",
      "entertainment center",
      "wall unit",
      "staircase",
      "landing",
    ],
  },
  outdoor: {
    explicit: ["outside", "outdoor", "outdoors", "exterior"],
    locations: {
      residential: [
        "porch",
        "front porch",
        "back porch",
        "patio",
        "deck",
        "balcony",
        "terrace",
        "veranda",
        "yard",
        "front yard",
        "backyard",
        "garden",
        "lawn",
        "driveway",
        "walkway",
        "poolside",
        "pool deck",
        "gazebo",
        "pergola",
      ],
      natural: [
        "beach",
        "forest",
        "woods",
        "park",
        "mountain",
        "lake",
        "lakeside",
        "riverside",
        "meadow",
        "field",
        "trail",
        "campsite",
        "wilderness",
        "desert",
        "snow",
        "snowy",
      ],
      urban: [
        "street",
        "sidewalk",
        "plaza",
        "rooftop",
        "courtyard",
        "market",
        "outdoor cafe",
        "promenade",
        "boardwalk",
      ],
    },
    features: [
      "tree",
      "trees",
      "plants",
      "flowers",
      "grass",
      "sky",
      "sunshine",
      "sunlight",
      "fresh air",
      "breeze",
      "nature",
    ],
  },
};

// Placement surface keywords
const PLACEMENT_KEYWORDS = {
  surfaces: {
    elevated: [
      "table",
      "desk",
      "counter",
      "countertop",
      "shelf",
      "shelving",
      "mantel",
      "mantelpiece",
      "fireplace mantel",
      "windowsill",
      "nightstand",
      "end table",
      "side table",
      "coffee table",
      "dining table",
      "console table",
      "entry table",
      "credenza",
      "dresser",
      "vanity",
      "buffet",
      "sideboard",
      "pedestal",
      "stand",
      "rack",
      "ledge",
      "bench",
      "ottoman",
    ],
    floor: [
      "floor",
      "ground",
      "rug",
      "carpet",
      "hardwood",
      "tile",
      "concrete",
      "grass",
      "lawn",
      "sand",
      "stone",
      "deck",
    ],
    wall: ["wall", "mounted", "hanging", "hook", "bracket"],
  },
};

// Lighting keywords
const LIGHTING_KEYWORDS = {
  timeOfDay: {
    morning: ["morning", "sunrise", "dawn", "early morning", "soft morning"],
    midday: ["midday", "noon", "bright", "direct sunlight"],
    afternoon: ["afternoon", "late afternoon"],
    goldenHour: ["golden hour", "sunset", "dusk", "golden light", "warm glow"],
    evening: ["evening", "twilight", "blue hour"],
    night: ["night", "nighttime", "moonlight", "after dark"],
  },
  quality: {
    soft: ["soft", "diffused", "gentle", "subtle", "even"],
    warm: ["warm", "cozy", "amber", "orange", "candlelight", "firelight"],
    cool: ["cool", "blue", "crisp", "clean"],
    dramatic: ["dramatic", "moody", "contrast", "shadows", "chiaroscuro"],
    natural: ["natural", "daylight", "window light", "ambient"],
    studio: ["studio", "professional", "softbox", "strobe"],
  },
  type: {
    natural: ["natural light", "sunlight", "daylight", "window light"],
    artificial: ["lamp", "chandelier", "string lights", "fairy lights", "neon"],
    mixed: ["mixed lighting", "ambient"],
  },
};

// Mood and style keywords
const MOOD_KEYWORDS = {
  atmosphere: {
    cozy: ["cozy", "warm", "inviting", "comfortable", "homey", "snug"],
    elegant: [
      "elegant",
      "sophisticated",
      "refined",
      "classy",
      "luxurious",
      "upscale",
    ],
    modern: ["modern", "contemporary", "sleek", "minimalist", "clean lines"],
    rustic: [
      "rustic",
      "farmhouse",
      "country",
      "vintage",
      "antique",
      "weathered",
    ],
    industrial: ["industrial", "urban", "loft", "raw", "exposed brick"],
    bohemian: ["bohemian", "boho", "eclectic", "artistic", "free-spirited"],
    scandinavian: ["scandinavian", "nordic", "hygge", "simple", "functional"],
    coastal: ["coastal", "beach", "nautical", "seaside", "ocean"],
    festive: ["festive", "celebratory", "party", "joyful", "cheerful"],
    serene: ["serene", "peaceful", "calm", "tranquil", "zen"],
    dramatic: ["dramatic", "bold", "striking", "intense"],
    playful: ["playful", "fun", "whimsical", "colorful", "vibrant"],
  },
  seasonal: {
    spring: ["spring", "springtime", "easter", "fresh", "blooming"],
    summer: ["summer", "summertime", "tropical", "sunny", "vacation"],
    fall: ["fall", "autumn", "harvest", "thanksgiving", "leaves"],
    winter: ["winter", "wintertime", "snowy", "frosty", "icy"],
    holiday: [
      "holiday",
      "christmas",
      "xmas",
      "hanukkah",
      "new year",
      "valentine",
    ],
  },
};

// Photography style keywords
const PHOTOGRAPHY_KEYWORDS = {
  shotType: {
    closeUp: ["close-up", "closeup", "macro", "detail", "tight shot"],
    medium: ["medium shot", "mid-shot", "waist shot"],
    wide: ["wide shot", "wide angle", "full shot", "establishing"],
    overhead: ["overhead", "bird's eye", "top-down", "flat lay"],
  },
  angle: {
    eyeLevel: ["eye level", "straight on", "head-on"],
    lowAngle: ["low angle", "looking up", "worm's eye"],
    highAngle: ["high angle", "looking down", "elevated"],
    dutch: ["dutch angle", "tilted", "canted"],
  },
  depth: {
    shallow: [
      "shallow depth",
      "bokeh",
      "blurred background",
      "soft background",
    ],
    deep: ["deep focus", "everything sharp", "infinite focus"],
  },
};

// Product type detection keywords for adaptive framing
const PRODUCT_TYPE_KEYWORDS = {
  tall: [
    "tree",
    "christmas tree",
    "lamp",
    "floor lamp",
    "standing lamp",
    "standing",
    "tall",
    "full-length",
    "floor standing",
    "tower",
    "coat rack",
    "hat stand",
    "mirror",
    "full length mirror",
    "bookshelf",
    "shelving unit",
    "plant",
    "tall plant",
    "fern",
    "statue",
    "sculpture",
    "mannequin",
    "dress form",
  ],
  small: [
    "jewelry",
    "ring",
    "earring",
    "earrings",
    "necklace",
    "bracelet",
    "watch",
    "watches",
    "cosmetic",
    "lipstick",
    "perfume",
    "cologne",
    "nail polish",
    "makeup",
    "eyeshadow",
    "skincare",
    "serum",
    "pen",
    "pencil",
    "keychain",
    "coin",
    "pin",
    "badge",
    "usb",
    "charger",
    "earbuds",
    "airpods",
  ],
  tabletop: [
    "mug",
    "cup",
    "coffee cup",
    "teacup",
    "plate",
    "bowl",
    "vase",
    "candle",
    "candles",
    "book",
    "books",
    "frame",
    "photo frame",
    "clock",
    "alarm clock",
    "box",
    "jar",
    "bottle",
    "wine bottle",
    "speaker",
    "phone",
    "tablet",
    "laptop",
    "keyboard",
    "mouse",
    "plant pot",
    "succulent",
    "small plant",
    "figurine",
    "ornament",
  ],
};

// Product category keywords for scene selection (from OpenAI prompt research)
const PRODUCT_CATEGORY_KEYWORDS: Record<ProductCategory, string[]> = {
  apparel: [
    "shirt",
    "dress",
    "jacket",
    "coat",
    "sweater",
    "hoodie",
    "pants",
    "jeans",
    "skirt",
    "blouse",
    "top",
    "t-shirt",
    "tee",
    "vest",
    "cardigan",
    "blazer",
    "suit",
    "shorts",
    "leggings",
    "romper",
    "jumpsuit",
    "clothing",
    "outfit",
    "fashion",
    "wear",
    "garment",
    "apparel",
  ],
  jewelry: [
    "jewelry",
    "ring",
    "earring",
    "earrings",
    "necklace",
    "bracelet",
    "pendant",
    "chain",
    "bangle",
    "brooch",
    "cufflinks",
    "anklet",
    "charm",
    "gemstone",
    "diamond",
    "gold",
    "silver",
    "pearl",
  ],
  shoes: [
    "shoe",
    "shoes",
    "sneaker",
    "sneakers",
    "boot",
    "boots",
    "sandal",
    "sandals",
    "heel",
    "heels",
    "loafer",
    "loafers",
    "slipper",
    "slippers",
    "footwear",
    "trainer",
    "trainers",
    "oxford",
    "pump",
    "flat",
    "flats",
    "mule",
    "mules",
  ],
  home_decor: [
    "decor",
    "decoration",
    "vase",
    "candle",
    "lamp",
    "frame",
    "mirror",
    "clock",
    "pillow",
    "cushion",
    "throw",
    "blanket",
    "rug",
    "curtain",
    "plant",
    "pot",
    "figurine",
    "sculpture",
    "art",
    "wall art",
    "ornament",
    "centerpiece",
    "christmas tree",
    "tree",
    "holiday decor",
  ],
  food_beverage: [
    "food",
    "drink",
    "beverage",
    "coffee",
    "tea",
    "wine",
    "beer",
    "cocktail",
    "snack",
    "chocolate",
    "candy",
    "cookie",
    "cake",
    "pastry",
    "fruit",
    "vegetable",
    "meal",
    "dish",
    "bottle",
    "jar",
    "sauce",
    "spice",
  ],
  tech: [
    "phone",
    "laptop",
    "tablet",
    "computer",
    "headphone",
    "headphones",
    "earbuds",
    "speaker",
    "camera",
    "watch",
    "smartwatch",
    "gadget",
    "device",
    "charger",
    "cable",
    "keyboard",
    "mouse",
    "monitor",
    "tech",
    "electronic",
  ],
  beauty: [
    "makeup",
    "cosmetic",
    "cosmetics",
    "lipstick",
    "mascara",
    "foundation",
    "eyeshadow",
    "blush",
    "concealer",
    "skincare",
    "serum",
    "cream",
    "lotion",
    "perfume",
    "cologne",
    "fragrance",
    "nail polish",
    "beauty",
    "haircare",
    "shampoo",
    "conditioner",
  ],
  general: [], // Default fallback
};

// Default scene suggestions per product category (from OpenAI prompt research)
const CATEGORY_SCENE_DEFAULTS: Record<ProductCategory, string> = {
  apparel:
    "styled on a model or elegant flat lay with complementary accessories",
  jewelry: "soft velvet or marble surface with elegant lighting",
  shoes: "urban sidewalk, nature floor, or clean studio setting",
  home_decor: "realistic room interior that matches the product style",
  food_beverage: "styled tabletop with complementary props and ingredients",
  tech: "clean modern desk setup or minimalist studio background",
  beauty: "luxurious vanity setting or clean marble surface",
  general: "appropriate lifestyle setting that complements the product",
};

// UGC (User Generated Content) style keywords
const UGC_STYLE_KEYWORDS = [
  "ugc",
  "user generated",
  "authentic",
  "real",
  "candid",
  "casual",
  "phone photo",
  "social media",
  "instagram",
  "tiktok",
  "influencer",
  "lifestyle shot",
  "in use",
  "being used",
  "worn by",
  "held by",
  "natural",
  "unposed",
  "everyday",
  "relatable",
];

// Editorial style keywords
const EDITORIAL_STYLE_KEYWORDS = [
  "editorial",
  "magazine",
  "vogue",
  "high fashion",
  "avant-garde",
  "artistic",
  "conceptual",
  "campaign",
  "lookbook",
  "fashion shoot",
];

// Atmosphere intent keywords for mood guidance
const ATMOSPHERE_INTENT_KEYWORDS: Record<AtmosphereIntent, string[]> = {
  luxury: [
    "luxury",
    "luxurious",
    "premium",
    "high-end",
    "upscale",
    "exclusive",
    "elegant",
    "sophisticated",
  ],
  everyday: [
    "everyday",
    "casual",
    "daily",
    "routine",
    "practical",
    "functional",
    "normal",
    "regular",
  ],
  bold: [
    "bold",
    "dramatic",
    "striking",
    "intense",
    "powerful",
    "strong",
    "vibrant",
    "dynamic",
  ],
  minimal: [
    "minimal",
    "minimalist",
    "simple",
    "clean",
    "understated",
    "subtle",
    "restrained",
  ],
  cozy: [
    "cozy",
    "warm",
    "comfortable",
    "inviting",
    "homey",
    "snug",
    "welcoming",
    "intimate",
  ],
  energetic: [
    "energetic",
    "lively",
    "active",
    "dynamic",
    "fun",
    "playful",
    "exciting",
    "upbeat",
  ],
  natural: [
    "natural",
    "organic",
    "earthy",
    "eco",
    "sustainable",
    "green",
    "fresh",
    "pure",
  ],
};

/**
 * SIZE_FRAMING_INSTRUCTIONS - Explicit scale guidance for each product size
 * CRITICAL: These instructions help the AI maintain proper product scale relative to the scene
 * Used when user explicitly specifies product size via questionnaire
 */
const SIZE_FRAMING_INSTRUCTIONS: Record<ProductSize, string> = {
  tiny: `SCALE & PROPORTION - CRITICAL: This is a TINY product (like jewelry, coins, or small accessories that fit in a palm).
- Show it at realistic SMALL scale relative to the scene
- Include contextual reference elements (surfaces, textures) that convey its small size
- Product should occupy approximately 20-30% of the frame
- Use close-up or macro-style framing to show detail while maintaining correct scale
- Surrounding objects should appear proportionally LARGER than the product`,

  small: `SCALE & PROPORTION - CRITICAL: This is a SMALL handheld product (like a phone, wallet, or cosmetics).
- Show it at realistic scale relative to surrounding objects
- Product should occupy approximately 30-40% of the frame
- Include objects or surfaces that demonstrate its handheld size
- DO NOT enlarge or make it appear bigger than it actually is`,

  tabletop: `SCALE & PROPORTION - CRITICAL: This is a TABLETOP/DECORATIVE product (like a small decorative tree, vase, figurine, or ornament - typically 6-24 inches tall).
- This is a SMALL decorative item, NOT a floor-standing item
- Show it sitting ON a table, shelf, mantel, or other elevated surface
- The product should appear appropriately sized for tabletop display
- Include the surface/furniture it sits on to establish correct scale
- Product should occupy approximately 40-50% of the frame
- Scene elements (furniture, room) should appear proportionally LARGER to convey the product's small decorative size
- DO NOT make it appear as a full-size floor-standing item`,

  medium: `SCALE & PROPORTION - CRITICAL: This is a MEDIUM-sized product (like a laptop, small appliance, or desk accessory).
- Show it at realistic desk or counter scale
- Product should occupy approximately 50-60% of the frame
- Include desk/counter surfaces or other objects for scale reference`,

  large: `SCALE & PROPORTION - CRITICAL: This is a LARGE floor-standing product (like a floor lamp, full-size tree, or standing furniture - typically 3-6 feet tall).
- Show FULL HEIGHT from floor level - do not crop
- Include floor and room context at realistic scale
- Product should occupy approximately 60-70% of the frame height
- Use wide shot framing to capture entire product with headroom above`,

  xlarge: `SCALE & PROPORTION - CRITICAL: This is an EXTRA LARGE furniture-sized product.
- Show in room context with proper human-scale reference points
- Product should be the dominant element in the scene
- Include architectural elements (walls, doorways) for scale context
- Use wide angle framing to capture the full product`,
};

/**
 * Scale-specific negative prompts to prevent size distortion
 */
const SCALE_NEGATIVE_PROMPTS: Record<ProductSize, string[]> = {
  tiny: [
    "do not enlarge the product",
    "do not make the product appear larger than palm-sized",
    "no giant or oversized product",
  ],
  small: [
    "do not enlarge the product",
    "do not make the product appear larger than handheld size",
    "no giant or oversized product",
  ],
  tabletop: [
    "do not make the product floor-standing or full-size",
    "do not enlarge to room-scale proportions",
    "this is a small decorative item that sits ON furniture, not a large floor item",
    "show the product at its actual tabletop/decorative scale",
  ],
  medium: [
    "do not enlarge beyond desk/counter scale",
    "maintain realistic medium-sized proportions",
  ],
  large: [
    "do not shrink the product",
    "do not crop the full height",
    "show the entire floor-standing product",
  ],
  xlarge: ["do not shrink the product", "show full furniture-scale size"],
};

// Props and accessories keywords to detect in prompts
// These are scene elements that should be added to the background (NOT the product)
const PROPS_KEYWORDS: string[] = [
  // Lighting props
  "fairy lights",
  "string lights",
  "twinkle lights",
  "christmas lights",
  "candles",
  "lanterns",
  "lamps",
  "ambient lights",
  // Holiday/seasonal props
  "gifts",
  "gift boxes",
  "gift set",
  "presents",
  "wrapped presents",
  "snowflakes",
  "snow",
  "ornaments",
  "baubles",
  "tinsel",
  "garland",
  "stockings",
  "wreath",
  "holly",
  "mistletoe",
  "pinecones",
  "pumpkins",
  "fall leaves",
  "autumn leaves",
  "easter eggs",
  "hearts",
  "valentines",
  "flowers",
  "bouquet",
  "roses",
  // Home props
  "books",
  "magazines",
  "vases",
  "plants",
  "succulents",
  "greenery",
  "blankets",
  "throws",
  "pillows",
  "cushions",
  "rugs",
  "coffee cup",
  "tea cup",
  "mug",
  "wine glass",
  "champagne",
  "candle holders",
  "picture frames",
  "mirrors",
  // Decorative elements
  "ribbons",
  "bows",
  "confetti",
  "streamers",
  "balloons",
  "sparkles",
  "glitter",
  "sequins",
  "crystals",
  // Nature props
  "branches",
  "twigs",
  "leaves",
  "petals",
  "moss",
  "stones",
  "pebbles",
  "shells",
  "driftwood",
  // Fabric/textiles
  "velvet",
  "silk",
  "linen",
  "burlap",
  "lace",
];

// Default negative prompts for quality assurance
// CRITICAL: Include product preservation rules to prevent AI from substituting the product
const DEFAULT_NEGATIVE_PROMPTS = [
  "do NOT replace or substitute the product with a different one",
  "do NOT generate a similar product - use the EXACT product from the reference",
  "do NOT change the product design, colors, or decorations",
  "no watermarks",
  "no text overlays",
  "no logos",
  "no cropping of the product",
  "no distortion of product shape",
  "no blurry product",
  "no artificial or fake looking product",
  "no floating product",
  "no cut-off edges",
];

/**
 * Apply questionnaire answers to enhance the parsed prompt
 * Questionnaire answers take precedence over detected values
 */
export function applyQuestionnaireAnswers(
  parsed: ParsedPrompt,
  answers: QuestionnaireAnswerInput[],
): ParsedPrompt {
  if (!answers || answers.length === 0) {
    return parsed;
  }

  const answerMap = new Map(answers.map((a) => [a.questionId, a.answer]));
  const result = { ...parsed };

  // Map style to photographyStyle
  const style = answerMap.get("style");
  if (style) {
    // Map questionnaire values to PhotographyStyle type
    const styleMap: Record<string, PhotographyStyle> = {
      professional: "professional",
      lifestyle: "professional", // Lifestyle is still professional quality
      bold: "editorial",
      minimal: "professional",
    };
    result.photographyStyle = styleMap[style] || "professional";

    // Also update atmosphere intent based on style
    const atmosphereFromStyle: Record<string, AtmosphereIntent | null> = {
      professional: null, // Let other detection handle it
      lifestyle: "everyday",
      bold: "bold",
      minimal: "minimal",
    };
    if (atmosphereFromStyle[style] && !result.atmosphereIntent) {
      result.atmosphereIntent = atmosphereFromStyle[style];
    }
  }

  // Map environment to environmentType and location
  const environment = answerMap.get("environment");
  if (environment) {
    const envMap: Record<string, "indoor" | "outdoor" | "studio"> = {
      indoor_home: "indoor",
      indoor_commercial: "indoor",
      outdoor: "outdoor",
      studio: "studio",
    };
    const categoryMap: Record<
      string,
      "home" | "commercial" | "natural" | null
    > = {
      indoor_home: "home",
      indoor_commercial: "commercial",
      outdoor: "natural",
      studio: null,
    };
    result.environmentType = envMap[environment] || result.environmentType;
    if (categoryMap[environment]) {
      result.location = {
        ...result.location,
        category: categoryMap[environment],
      };
    }
    // Boost confidence since user explicitly selected
    result.confidence = Math.max(result.confidence, 0.9);
  }

  // Map mood to atmosphereIntent
  const mood = answerMap.get("mood");
  if (mood) {
    const moodMap: Record<string, AtmosphereIntent> = {
      luxury: "luxury",
      cozy: "cozy",
      energetic: "energetic",
      natural: "natural",
      minimal: "minimal",
    };
    result.atmosphereIntent = moodMap[mood] || result.atmosphereIntent;

    // Also update mood.primary
    result.mood = {
      ...result.mood,
      primary: mood,
    };
  }

  // Map lighting to lighting preferences
  const lighting = answerMap.get("lighting");
  if (lighting) {
    const lightingTypeMap: Record<string, string> = {
      natural: "natural",
      warm: "artificial",
      bright: "studio",
      dramatic: "artificial",
    };
    const lightingQualityMap: Record<string, string> = {
      natural: "natural",
      warm: "warm",
      bright: "studio",
      dramatic: "dramatic",
    };
    result.lighting = {
      ...result.lighting,
      type: lightingTypeMap[lighting] || result.lighting.type,
      quality: lightingQualityMap[lighting] || result.lighting.quality,
    };
  }

  // Map usage - this is informational, doesn't directly affect prompt but could be logged
  // const usage = answerMap.get('usage'); // Currently unused but available for future

  return result;
}

/**
 * Parse a user prompt to extract structured scene information
 * Optionally accepts questionnaire answers to enhance detection
 */
export function parsePrompt(
  prompt: string,
  questionnaireAnswers?: QuestionnaireAnswerInput[],
): ParsedPrompt {
  const lowerPrompt = prompt.toLowerCase();

  // Initialize result
  const result: ParsedPrompt = {
    environmentType: "ambiguous",
    location: { type: null, category: null },
    placement: { surface: null, position: null },
    lighting: { type: null, quality: null, timeOfDay: null },
    mood: { primary: null, seasonal: null, style: null },
    photography: { shotType: null, angle: null, depth: null },
    productType: "standard",
    productCategory: "general",
    photographyStyle: "professional",
    atmosphereIntent: null,
    negativePrompts: [...DEFAULT_NEGATIVE_PROMPTS],
    props: [],
    originalPrompt: prompt,
    confidence: 0,
  };

  let indoorScore = 0;
  let outdoorScore = 0;

  // Check for explicit indoor/outdoor keywords (highest weight)
  for (const keyword of ENVIRONMENT_KEYWORDS.indoor.explicit) {
    if (lowerPrompt.includes(keyword)) {
      indoorScore += 10;
    }
  }
  for (const keyword of ENVIRONMENT_KEYWORDS.outdoor.explicit) {
    if (lowerPrompt.includes(keyword)) {
      outdoorScore += 10;
    }
  }

  // Check for room types (indoor)
  for (const [category, rooms] of Object.entries(
    ENVIRONMENT_KEYWORDS.indoor.rooms,
  )) {
    for (const room of rooms) {
      if (lowerPrompt.includes(room)) {
        indoorScore += 5;
        result.location.type = room;
        result.location.category = category as "home" | "commercial";
      }
    }
  }

  // Check for indoor features
  for (const feature of ENVIRONMENT_KEYWORDS.indoor.features) {
    if (lowerPrompt.includes(feature)) {
      indoorScore += 3;
      if (!result.placement.surface) {
        result.placement.surface = feature;
      }
    }
  }

  // Check for outdoor locations
  for (const [category, locations] of Object.entries(
    ENVIRONMENT_KEYWORDS.outdoor.locations,
  )) {
    for (const location of locations) {
      if (lowerPrompt.includes(location)) {
        outdoorScore += 5;
        result.location.type = location;
        result.location.category = category as "natural" | "urban";
      }
    }
  }

  // Check for outdoor features
  for (const feature of ENVIRONMENT_KEYWORDS.outdoor.features) {
    if (lowerPrompt.includes(feature)) {
      outdoorScore += 2;
    }
  }

  // Determine environment type
  const _totalScore = indoorScore + outdoorScore;
  if (indoorScore > outdoorScore && indoorScore >= 3) {
    result.environmentType = "indoor";
    result.confidence = Math.min(indoorScore / 15, 1);
  } else if (outdoorScore > indoorScore && outdoorScore >= 3) {
    result.environmentType = "outdoor";
    result.confidence = Math.min(outdoorScore / 15, 1);
  } else {
    result.environmentType = "ambiguous";
    result.confidence = 0.3;
  }

  // Parse placement surfaces
  for (const [_type, surfaces] of Object.entries(PLACEMENT_KEYWORDS.surfaces)) {
    for (const surface of surfaces) {
      if (lowerPrompt.includes(surface)) {
        result.placement.surface = surface;
        break;
      }
    }
  }

  // Parse lighting
  for (const [time, keywords] of Object.entries(LIGHTING_KEYWORDS.timeOfDay)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.lighting.timeOfDay = time;
        break;
      }
    }
  }

  for (const [quality, keywords] of Object.entries(LIGHTING_KEYWORDS.quality)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.lighting.quality = quality;
        break;
      }
    }
  }

  for (const [type, keywords] of Object.entries(LIGHTING_KEYWORDS.type)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.lighting.type = type;
        break;
      }
    }
  }

  // Parse mood
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS.atmosphere)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.mood.primary = mood;
        result.mood.style = mood;
        break;
      }
    }
  }

  for (const [season, keywords] of Object.entries(MOOD_KEYWORDS.seasonal)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.mood.seasonal = season;
        break;
      }
    }
  }

  // Parse photography style
  for (const [shotType, keywords] of Object.entries(
    PHOTOGRAPHY_KEYWORDS.shotType,
  )) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.photography.shotType = shotType;
        break;
      }
    }
  }

  for (const [angle, keywords] of Object.entries(PHOTOGRAPHY_KEYWORDS.angle)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.photography.angle = angle;
        break;
      }
    }
  }

  for (const [depth, keywords] of Object.entries(PHOTOGRAPHY_KEYWORDS.depth)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.photography.depth = depth;
        break;
      }
    }
  }

  // Parse product type for adaptive framing
  for (const keyword of PRODUCT_TYPE_KEYWORDS.tall) {
    if (lowerPrompt.includes(keyword)) {
      result.productType = "tall";
      // Add tall-specific negative prompt
      result.negativePrompts.push("no cropping of full height");
      break;
    }
  }

  if (result.productType === "standard") {
    for (const keyword of PRODUCT_TYPE_KEYWORDS.small) {
      if (lowerPrompt.includes(keyword)) {
        result.productType = "small";
        break;
      }
    }
  }

  if (result.productType === "standard") {
    for (const keyword of PRODUCT_TYPE_KEYWORDS.tabletop) {
      if (lowerPrompt.includes(keyword)) {
        result.productType = "tabletop";
        break;
      }
    }
  }

  // Parse product category for scene selection
  categoryLoop: for (const [category, keywords] of Object.entries(
    PRODUCT_CATEGORY_KEYWORDS,
  )) {
    if (category === "general") continue; // Skip fallback
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.productCategory = category as ProductCategory;
        break categoryLoop;
      }
    }
  }

  // Parse photography style (UGC vs professional vs editorial)
  for (const keyword of UGC_STYLE_KEYWORDS) {
    if (lowerPrompt.includes(keyword)) {
      result.photographyStyle = "ugc";
      // UGC style has different negative prompts - more relaxed
      result.negativePrompts = result.negativePrompts.filter(
        (np) => !np.includes("artificial"), // UGC can look more casual
      );
      result.negativePrompts.push("no over-produced look");
      break;
    }
  }

  if (result.photographyStyle === "professional") {
    for (const keyword of EDITORIAL_STYLE_KEYWORDS) {
      if (lowerPrompt.includes(keyword)) {
        result.photographyStyle = "editorial";
        break;
      }
    }
  }

  // Parse atmosphere intent for mood guidance
  for (const [intent, keywords] of Object.entries(ATMOSPHERE_INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerPrompt.includes(keyword)) {
        result.atmosphereIntent = intent as AtmosphereIntent;
        break;
      }
    }
    if (result.atmosphereIntent) break;
  }

  // Parse props and accessories from the prompt
  // These are scene elements the user wants in the background (NOT the product)
  for (const prop of PROPS_KEYWORDS) {
    if (lowerPrompt.includes(prop)) {
      result.props.push(prop);
    }
  }

  // Apply questionnaire answers if provided - these take precedence over detected values
  if (questionnaireAnswers && questionnaireAnswers.length > 0) {
    return applyQuestionnaireAnswers(result, questionnaireAnswers);
  }

  return result;
}

/**
 * Build an enhanced prompt for AI image generation based on parsed context
 *
 * Uses the 5-Element Framework: STYLE → SUBJECT → BACKGROUND → DETAILS → FORMAT
 * Based on Photoroom and industry best practices research
 *
 * @param parsed - Parsed prompt data
 * @param aspectRatio - Output aspect ratio
 * @param hasReferenceImage - Whether a reference image is provided
 * @param explicitSize - Optional explicit product size from questionnaire (overrides detection)
 */
export function buildEnhancedPrompt(
  parsed: ParsedPrompt,
  aspectRatio: string,
  hasReferenceImage: boolean,
  explicitSize?: ProductSize,
): string {
  if (!hasReferenceImage) {
    return `Create a professional ${aspectRatio} image: ${parsed.originalPrompt}`;
  }

  // Build prompt using 5-Element Framework: STYLE → SUBJECT → BACKGROUND → DETAILS → FORMAT
  const sections: string[] = [];

  // 1. STYLE - Photography style and approach (adaptive based on photographyStyle)
  const styleSection = buildStyleSection(parsed);
  sections.push(styleSection);

  // 2. SUBJECT - Product placement rules (adaptive based on product type OR explicit size)
  const subjectSection = buildSubjectSection(parsed, explicitSize);
  sections.push(subjectSection);

  // 3. BACKGROUND - Environment and scene
  const backgroundSection = buildBackgroundSection(parsed);
  sections.push(backgroundSection);

  // 4. DETAILS - Lighting, mood, and atmosphere
  const detailsSection = buildDetailsSection(parsed);
  sections.push(detailsSection);

  // 5. FORMAT - Output specifications
  sections.push(`Output: ${aspectRatio} aspect ratio, photorealistic quality.`);

  // 6. NEGATIVE PROMPTS - Combine default + scale-specific exclusions
  const allNegativePrompts = [...parsed.negativePrompts];

  // Add scale-specific negative prompts if explicit size is provided
  if (explicitSize && SCALE_NEGATIVE_PROMPTS[explicitSize]) {
    allNegativePrompts.push(...SCALE_NEGATIVE_PROMPTS[explicitSize]);
  }

  if (allNegativePrompts.length > 0) {
    sections.push(`Avoid: ${allNegativePrompts.join(", ")}.`);
  }

  return sections.join("\n\n");
}

/**
 * Build STYLE section based on photography style (professional, UGC, editorial)
 */
function buildStyleSection(parsed: ParsedPrompt): string {
  const { photographyStyle, atmosphereIntent } = parsed;

  // Start with critical product placement instruction
  let styleInstruction = `TASK: Place the EXACT product from the attached reference image into a new scene. The product itself must remain UNCHANGED - only the background/environment should be generated.

STYLE: `;

  switch (photographyStyle) {
    case "ugc":
      styleInstruction += `Create an authentic, user-generated content style photograph. Natural, candid feel like a real customer photo. Slightly imperfect but appealing - as if captured on a smartphone in everyday life.`;
      break;
    case "editorial":
      styleInstruction += `Create a high-fashion editorial photograph. Magazine-quality artistic composition with dramatic styling and conceptual approach.`;
      break;
    default:
      styleInstruction += `Create a professional product lifestyle photograph. Clean, polished e-commerce quality with excellent lighting and composition.`;
  }

  // Add atmosphere intent if detected
  if (atmosphereIntent) {
    const atmosphereDescriptions: Record<AtmosphereIntent, string> = {
      luxury: "Convey luxury, exclusivity, and premium quality.",
      everyday: "Convey everyday practicality and approachable appeal.",
      bold: "Convey boldness, confidence, and striking impact.",
      minimal: "Convey minimalist elegance and refined simplicity.",
      cozy: "Convey warmth, comfort, and inviting atmosphere.",
      energetic: "Convey energy, vibrancy, and dynamic excitement.",
      natural: "Convey natural, organic, and authentic feel.",
    };
    styleInstruction += ` ${atmosphereDescriptions[atmosphereIntent]}`;
  }

  return styleInstruction;
}

/**
 * Build SUBJECT section with adaptive framing based on product type or explicit size
 * CRITICAL: This section must strongly enforce preservation of the reference image
 *
 * @param parsed - Parsed prompt data
 * @param explicitSize - Optional explicit product size from questionnaire (takes precedence over detection)
 */
function buildSubjectSection(
  parsed: ParsedPrompt,
  explicitSize?: ProductSize,
): string {
  const { productType } = parsed;

  // CRITICAL: Strong product preservation instructions
  let subjectInstruction = `SUBJECT: **CRITICAL - PRODUCT PRESERVATION REQUIRED**

The attached image contains the EXACT product that MUST appear in the final image. This is NOT a reference or inspiration - it is the ACTUAL product to use.

MANDATORY RULES:
1. Use the EXACT product from the attached image - same shape, same colors, same design, same decorations
2. Do NOT substitute, replace, or generate a similar product
3. Do NOT modify the product's appearance in any way
4. The product must be recognizable as IDENTICAL to the reference image

`;

  // If explicit size is provided via questionnaire, use SIZE_FRAMING_INSTRUCTIONS
  // This takes precedence over automatic product type detection
  if (explicitSize && SIZE_FRAMING_INSTRUCTIONS[explicitSize]) {
    subjectInstruction += SIZE_FRAMING_INSTRUCTIONS[explicitSize];
  } else {
    // Fall back to automatic framing based on detected product type
    switch (productType) {
      case "tall":
        subjectInstruction += `FRAMING: This is a TALL product - use a WIDE shot to capture the FULL HEIGHT from top to bottom. Do not crop any part. Frame with extra headroom above.`;
        break;
      case "small":
        subjectInstruction += `FRAMING: This is a small product - use appropriate framing to showcase details while keeping the entire product visible.`;
        break;
      case "tabletop":
        subjectInstruction += `FRAMING: This is a tabletop product - frame at eye level or slightly elevated, showing the complete product.`;
        break;
      default:
        subjectInstruction += `FRAMING: Show the ENTIRE product fully visible in the frame. Do not crop or cut off any part.`;
    }
  }

  subjectInstruction += `

PRODUCT INTEGRITY: The product's exact appearance, shape, colors, textures, labels, and proportions MUST be preserved exactly as shown in the reference image. Only change the BACKGROUND and ENVIRONMENT - never the product itself.`;

  return subjectInstruction;
}

/**
 * Build BACKGROUND section from environment parsing with category-based defaults
 */
function buildBackgroundSection(parsed: ParsedPrompt): string {
  const { environmentType, location, placement, confidence, productCategory } =
    parsed;

  let background = `BACKGROUND: `;

  if (environmentType === "indoor" && confidence >= 0.5) {
    background += `Indoor setting${location.type ? ` - ${location.type}` : ""}. `;
    if (placement.surface) {
      background += `Product placed on ${placement.surface}. `;
    }
    background += `Use appropriate indoor elements: furniture, decor, natural or warm artificial lighting.`;
  } else if (environmentType === "outdoor" && confidence >= 0.5) {
    background += `Outdoor setting${location.type ? ` - ${location.type}` : ""}. `;
    if (placement.surface) {
      background += `Product on ${placement.surface}. `;
    }
    background += `Natural daylight, outdoor environment with appropriate scenery.`;
  } else {
    // Use category-based default scene when environment is ambiguous
    const categoryScene = CATEGORY_SCENE_DEFAULTS[productCategory];
    if (productCategory !== "general" && categoryScene) {
      background += `Scene: ${categoryScene}. `;
      background += `Based on user request: "${parsed.originalPrompt}".`;
    } else {
      // Fully ambiguous - use original prompt for context
      background += `Scene based on: "${parsed.originalPrompt}". `;
      background += `Create a cohesive setting that complements the product.`;
    }
  }

  return background;
}

/**
 * Build DETAILS section combining lighting, mood, and photography style
 */
function buildDetailsSection(parsed: ParsedPrompt): string {
  const parts: string[] = [];
  parts.push("DETAILS:");

  // Lighting
  const lightingDesc = buildLightingDescription(parsed);
  if (lightingDesc) {
    parts.push(lightingDesc);
  }

  // Mood/atmosphere
  const moodDesc = buildMoodDescription(parsed);
  if (moodDesc) {
    parts.push(moodDesc);
  }

  // Photography style
  const photoDesc = buildPhotographyDescription(parsed);
  if (photoDesc) {
    parts.push(photoDesc);
  }

  // If nothing specific was detected, provide a sensible default
  if (parts.length === 1) {
    parts.push(
      "Soft, flattering lighting with a natural feel. Professional product photography aesthetic.",
    );
  }

  return parts.join(" ");
}

/**
 * Build concise lighting description
 */
function buildLightingDescription(parsed: ParsedPrompt): string {
  const { lighting, environmentType } = parsed;
  const descriptions: string[] = [];

  if (lighting.timeOfDay) {
    const timeMap: Record<string, string> = {
      morning: "soft morning light",
      midday: "bright daylight",
      afternoon: "warm afternoon light",
      goldenHour: "golden hour warmth",
      evening: "soft evening ambient",
      night: "warm artificial lighting",
    };
    descriptions.push(timeMap[lighting.timeOfDay] || lighting.timeOfDay);
  }

  if (lighting.quality) {
    const qualityMap: Record<string, string> = {
      soft: "soft diffused",
      warm: "warm inviting",
      cool: "cool crisp",
      dramatic: "dramatic contrast",
      natural: "natural",
      studio: "studio-quality",
    };
    descriptions.push(qualityMap[lighting.quality] || lighting.quality);
  }

  if (descriptions.length === 0) {
    // Default based on environment
    if (environmentType === "indoor") {
      return "Warm indoor lighting.";
    } else if (environmentType === "outdoor") {
      return "Natural daylight.";
    }
    return "";
  }

  return `Lighting: ${descriptions.join(", ")}.`;
}

/**
 * Build concise mood description
 */
function buildMoodDescription(parsed: ParsedPrompt): string {
  const { mood } = parsed;
  const descriptions: string[] = [];

  if (mood.primary) {
    const moodMap: Record<string, string> = {
      cozy: "cozy inviting",
      elegant: "sophisticated elegant",
      modern: "clean modern",
      rustic: "rustic natural",
      industrial: "urban industrial",
      bohemian: "eclectic bohemian",
      scandinavian: "minimalist Nordic",
      coastal: "light airy coastal",
      festive: "celebratory festive",
      serene: "peaceful calm",
      dramatic: "bold striking",
      playful: "fun colorful",
    };
    descriptions.push(moodMap[mood.primary] || mood.primary);
  }

  if (mood.seasonal) {
    const seasonMap: Record<string, string> = {
      spring: "spring freshness",
      summer: "summer vibrancy",
      fall: "autumn warmth",
      winter: "winter cozy",
      holiday: "holiday festive decor",
    };
    descriptions.push(seasonMap[mood.seasonal] || mood.seasonal);
  }

  if (descriptions.length === 0) {
    return "";
  }

  return `Mood: ${descriptions.join(", ")}.`;
}

/**
 * Build concise photography description
 */
function buildPhotographyDescription(parsed: ParsedPrompt): string {
  const { photography, productType } = parsed;
  const descriptions: string[] = [];

  // Shot type (with adaptive override for tall products)
  if (productType === "tall" && !photography.shotType) {
    descriptions.push("wide shot for full product visibility");
  } else if (photography.shotType) {
    descriptions.push(`${photography.shotType} shot`);
  }

  // Angle
  if (photography.angle) {
    descriptions.push(`${photography.angle} angle`);
  }

  // Depth
  if (photography.depth) {
    descriptions.push(
      photography.depth === "deep"
        ? "everything in focus"
        : "soft background blur",
    );
  }

  if (descriptions.length === 0) {
    return "";
  }

  return `Photography: ${descriptions.join(", ")}.`;
}

/**
 * Build environment-specific guidance section (legacy - kept for compatibility)
 */
function _buildEnvironmentSection(parsed: ParsedPrompt): string {
  const { environmentType, location, confidence } = parsed;

  if (environmentType === "indoor" && confidence >= 0.5) {
    return `
SCENE ENVIRONMENT: INDOOR
- Create an interior scene${location.type ? ` in a ${location.type}` : ""}
- Camera is positioned INSIDE the room, looking at the product in its interior setting
- Show appropriate indoor elements: walls, furniture, decor consistent with ${location.category === "home" ? "a residential home" : "the space type"}
- Use indoor-appropriate lighting (natural window light or warm artificial lighting)
- Background should suggest a complete, lived-in interior space`;
  }

  if (environmentType === "outdoor" && confidence >= 0.5) {
    return `
SCENE ENVIRONMENT: OUTDOOR
- Create an exterior/outdoor scene${location.type ? ` at/on a ${location.type}` : ""}
- Camera is positioned to show the product in its outdoor environment
- Show appropriate outdoor elements: sky, nature, architectural exteriors as appropriate for ${location.category || "the setting"}
- Use natural daylight appropriate for the scene
- Background should suggest a complete outdoor environment`;
  }

  // Ambiguous - provide flexible guidance
  return `
SCENE ENVIRONMENT: CONTEXTUAL
- Carefully interpret the user's description to determine the appropriate setting
- Common INDOOR indicators: rooms (living room, bedroom, kitchen), furniture (table, shelf, mantel), interior features
- Common OUTDOOR indicators: nature (garden, yard, porch), weather elements (snow, sunshine), outdoor structures (deck, patio)
- If the description mentions "door" or "entryway" without clear context, default to showing the INTERIOR side (inside the home looking toward the door)
- Choose lighting and atmosphere that matches the interpreted setting
- When truly ambiguous, select what makes most sense for the product type and create a cohesive scene`;
}

/**
 * Build lighting guidance section
 */
function _buildLightingSection(parsed: ParsedPrompt): string {
  const { lighting, environmentType } = parsed;

  const parts: string[] = ["LIGHTING GUIDANCE:"];

  if (lighting.timeOfDay) {
    const timeDescriptions: Record<string, string> = {
      morning: "soft morning light with gentle, diffused quality",
      midday: "bright, even daylight",
      afternoon: "warm afternoon sunlight",
      goldenHour: "warm golden hour light with rich, amber tones",
      evening: "soft twilight or early evening ambient light",
      night:
        "artificial lighting appropriate for nighttime (warm lamps, ambient glow)",
    };
    parts.push(
      `- Time of day: ${timeDescriptions[lighting.timeOfDay] || lighting.timeOfDay}`,
    );
  }

  if (lighting.quality) {
    const qualityDescriptions: Record<string, string> = {
      soft: "soft, diffused lighting that flatters the product",
      warm: "warm, inviting light with amber/orange tones",
      cool: "cool, crisp lighting with blue undertones",
      dramatic: "dramatic lighting with intentional shadows and contrast",
      natural: "natural, realistic lighting",
      studio: "professional studio-quality lighting",
    };
    parts.push(
      `- Light quality: ${qualityDescriptions[lighting.quality] || lighting.quality}`,
    );
  }

  if (!lighting.timeOfDay && !lighting.quality) {
    // Default based on environment
    if (environmentType === "indoor") {
      parts.push(
        "- Use warm, inviting indoor lighting (natural window light or soft artificial light)",
      );
    } else if (environmentType === "outdoor") {
      parts.push("- Use natural daylight appropriate for an outdoor scene");
    } else {
      parts.push("- Use soft, flattering light appropriate for the scene");
    }
  }

  parts.push("- Ensure the product is well-lit and clearly visible");
  parts.push("- Avoid harsh shadows on the product itself");

  return parts.join("\n");
}

/**
 * Build mood and atmosphere section
 */
function _buildMoodSection(parsed: ParsedPrompt): string | null {
  const { mood } = parsed;

  if (!mood.primary && !mood.seasonal) {
    return null;
  }

  const parts: string[] = ["MOOD & ATMOSPHERE:"];

  if (mood.primary) {
    const moodDescriptions: Record<string, string> = {
      cozy: "Create a warm, cozy, and inviting atmosphere",
      elegant: "Create a sophisticated, elegant, and refined atmosphere",
      modern: "Create a clean, modern, and contemporary atmosphere",
      rustic: "Create a rustic, natural, and organic atmosphere",
      industrial: "Create an urban, industrial aesthetic with raw textures",
      bohemian: "Create an eclectic, artistic, bohemian vibe",
      scandinavian: "Create a minimalist, Nordic-inspired atmosphere",
      coastal: "Create a light, airy, coastal/beach atmosphere",
      festive: "Create a celebratory, festive, joyful atmosphere",
      serene: "Create a peaceful, calm, tranquil atmosphere",
      dramatic: "Create a bold, dramatic, striking atmosphere",
      playful: "Create a fun, playful, colorful atmosphere",
    };
    parts.push(
      `- ${moodDescriptions[mood.primary] || `Atmosphere: ${mood.primary}`}`,
    );
  }

  if (mood.seasonal) {
    const seasonalDescriptions: Record<string, string> = {
      spring:
        "Include spring elements: fresh flowers, bright colors, renewal themes",
      summer:
        "Include summer elements: bright light, warm colors, relaxed vibes",
      fall: "Include fall/autumn elements: warm oranges, browns, cozy textures, harvest themes",
      winter:
        "Include winter elements: cool tones, cozy textures, possible snow or frost",
      holiday:
        "Include holiday/festive elements: decorations, lights, celebratory decor",
    };
    parts.push(
      `- ${seasonalDescriptions[mood.seasonal] || `Season: ${mood.seasonal}`}`,
    );
  }

  return parts.join("\n");
}

/**
 * Get a summary of what was detected for debugging/display
 */
export function getParseDebugSummary(parsed: ParsedPrompt): string {
  const parts: string[] = [];

  parts.push(
    `Environment: ${parsed.environmentType} (${(parsed.confidence * 100).toFixed(0)}%)`,
  );

  if (parsed.productType !== "standard") {
    parts.push(`Product: ${parsed.productType}`);
  }

  if (parsed.productCategory !== "general") {
    parts.push(`Category: ${parsed.productCategory}`);
  }

  if (parsed.photographyStyle !== "professional") {
    parts.push(`Style: ${parsed.photographyStyle}`);
  }

  if (parsed.atmosphereIntent) {
    parts.push(`Intent: ${parsed.atmosphereIntent}`);
  }

  if (parsed.location.type) {
    parts.push(`Location: ${parsed.location.type}`);
  }

  if (parsed.placement.surface) {
    parts.push(`Surface: ${parsed.placement.surface}`);
  }

  if (parsed.lighting.timeOfDay || parsed.lighting.quality) {
    parts.push(
      `Light: ${[parsed.lighting.timeOfDay, parsed.lighting.quality].filter(Boolean).join(", ")}`,
    );
  }

  if (parsed.mood.primary || parsed.mood.seasonal) {
    parts.push(
      `Mood: ${[parsed.mood.primary, parsed.mood.seasonal].filter(Boolean).join(", ")}`,
    );
  }

  return parts.join(" | ");
}
