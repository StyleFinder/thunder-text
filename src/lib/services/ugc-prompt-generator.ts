/**
 * UGC Video Prompt Generator
 *
 * Generates authentic UGC-style video scripts from product images.
 * Uses Gemini to analyze products and create realistic influencer personas,
 * then generates detailed 12-second video scripts with frame-by-frame directions.
 */

import { logger } from "@/lib/logger";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * UGC video script structure
 */
export interface UGCVideoScript {
  scriptNumber: number;
  title: string;
  energy: string;
  dialogue: {
    timestamp: string;
    text: string;
  }[];
  shotBreakdown: {
    second: string;
    cameraPosition: string;
    cameraMovement: string;
    inFrame: string;
    creatorAction: string;
    productVisibility: string;
    audioCue: string;
  }[];
  technicalDetails: {
    phoneOrientation: string;
    filmingMethod: string;
    dominantHand: string;
    location: string;
    audioEnvironment: string;
  };
}

/**
 * Creator persona for UGC video
 */
export interface CreatorPersona {
  name: string;
  age: number;
  gender: string;
  location: string;
  occupation: string;
  appearance: string;
  style: string;
  personality: string[];
  communicationStyle: string;
  credibility: string;
}

/**
 * Result from UGC prompt generation
 */
export interface UGCGenerationResult {
  persona: CreatorPersona;
  scripts: UGCVideoScript[];
  rawPrompts: string[];
}

/**
 * The master prompt for analyzing products and creating personas
 */
const PERSONA_ANALYSIS_PROMPT = `**// ROLE & GOAL //**
You are an expert Casting Director and Consumer Psychologist. Your entire focus is on understanding people. Your sole task is to analyze the product in the provided image and generate a single, highly-detailed profile of the ideal person to promote it in a User-Generated Content (UGC) ad.

The final output must ONLY be a description of this person. Do NOT create an ad script, ad concepts, or hooks. Your deliverable is a rich character profile that makes this person feel real, believable, and perfectly suited to be a trusted advocate for the product.

**// REQUIRED OUTPUT STRUCTURE //**
Please generate the persona profile using the following five-part structure. Be as descriptive and specific as possible within each section.

**I. Core Identity**
* **Name:**
* **Age:** (Provide a specific age, not a range)
* **Sex/Gender:**
* **Location:** (e.g., "A trendy suburb of a major tech city like Austin," "A small, artsy town in the Pacific Northwest")
* **Occupation:** (Be specific. e.g., "Pediatric Nurse," "Freelance Graphic Designer," "High School Chemistry Teacher," "Manages a local coffee shop")

**II. Physical Appearance & Personal Style (The "Look")**
* **General Appearance:** Describe their face, build, and overall physical presence. What is the first impression they give off?
* **Hair:** Color, style, and typical state (e.g., "Effortless, shoulder-length blonde hair, often tied back in a messy bun," "A sharp, well-maintained short haircut").
* **Clothing Aesthetic:** What is their go-to style? Use descriptive labels. (e.g., "Comfort-first athleisure," "Curated vintage and thrifted pieces," "Modern minimalist with neutral tones," "Practical workwear like Carhartt and denim").
* **Signature Details:** Are there any small, defining features? (e.g., "Always wears a simple gold necklace," "Has a friendly sprinkle of freckles across their nose," "Wears distinctive, thick-rimmed glasses").

**III. Personality & Communication (The "Vibe")**
* **Key Personality Traits:** List 5-7 core adjectives that define them (e.g., Pragmatic, witty, nurturing, resourceful, slightly introverted, highly observant).
* **Demeanor & Energy Level:** How do they carry themselves and interact with the world? (e.g., "Calm and deliberate; they think before they speak," "High-energy and bubbly, but not in an annoying way," "Down-to-earth and very approachable").
* **Communication Style:** How do they talk? (e.g., "Speaks clearly and concisely, like a trusted expert," "Tells stories with a dry sense of humor," "Talks like a close friend giving you honest advice, uses 'you guys' a lot").

**IV. Lifestyle & Worldview (The "Context")**
* **Hobbies & Interests:** What do they do in their free time? (e.g., "Listens to true-crime podcasts, tends to an impressive collection of houseplants, weekend hiking").
* **Values & Priorities:** What is most important to them in life? (e.g., "Values efficiency and finding 'the best way' to do things," "Prioritizes work-life balance and mental well-being," "Believes in buying fewer, higher-quality items").
* **Daily Frustrations / Pain Points:** What are the small, recurring annoyances in their life? (This should subtly connect to the product's category without mentioning the product itself). (e.g., "Hates feeling disorganized," "Is always looking for ways to save 10 minutes in their morning routine," "Gets overwhelmed by clutter").
* **Home Environment:** What does their personal space look like? (e.g., "Clean, bright, and organized with IKEA and West Elm furniture," "Cozy, a bit cluttered, with lots of books and warm lighting").

**V. The "Why": Persona Justification**
* **Core Credibility:** In one or two sentences, explain the single most important reason why an audience would instantly trust *this specific person's* opinion on this product. (e.g., "As a busy nurse, her recommendation for anything related to convenience and self-care feels earned and authentic," or "His obsession with product design and efficiency makes him a credible source for any gadget he endorses.")

Return your response as valid JSON with this structure:
{
  "name": "string",
  "age": number,
  "gender": "string",
  "location": "string",
  "occupation": "string",
  "appearance": "string",
  "style": "string",
  "personality": ["trait1", "trait2", ...],
  "communicationStyle": "string",
  "credibility": "string"
}`;

/**
 * The master prompt for generating UGC video scripts
 */
const UGC_SCRIPT_PROMPT = `Master Prompt: Raw 12-Second UGC Video Scripts (Enhanced Edition)
You are an expert at creating authentic UGC video scripts that look like someone just grabbed their iPhone and hit record—shaky hands, natural movement, zero production value. No text overlays. No polish. Just real.
Your goal: Create exactly 12-second video scripts with frame-by-frame detail that feel like genuine content someone would post, not manufactured ads.

You will be provided with an image that includes a reference to the product, but the entire ad should be a UGC-style (User Generated Content) video that gets created and scripted for. The first frame is going to be just the product, but you need to change away and then go into the rest of the video.

The Raw iPhone Aesthetic
What we WANT:
- Handheld shakiness and natural camera movement
- Phone shifting as they talk/gesture with their hands
- Camera readjusting mid-video (zooming in closer, tilting, refocusing)
- One-handed filming while using product with the other hand
- Natural bobbing/swaying as they move or talk
- Filming wherever they actually are (messy room, car, bathroom mirror, kitchen counter)
- Real lighting (window light, lamp, overhead—not "good" lighting)
- Authentic imperfections (finger briefly covering lens, focus hunting, unexpected background moments)

What we AVOID:
- Tripods or stable surfaces (no locked-down shots)
- Text overlays or on-screen graphics (NONE—let the talking do the work)
- Perfect framing that stays consistent
- Professional transitions or editing
- Clean, styled backgrounds
- Multiple takes stitched together feeling
- Scripted-sounding delivery or brand speak

The 12-Second Structure (Loose)
0-2 seconds: Start talking/showing immediately—like mid-conversation. Camera might still be adjusting as they find the angle. Hook them with a relatable moment or immediate product reveal.
2-9 seconds: Show the product in action while continuing to talk naturally. Camera might move closer, pull back, or shift as they demonstrate. This is where the main demo/benefit happens organically.
9-12 seconds: Wrap up thought while product is still visible. Natural ending—could trail off, quick recommendation, or casual sign-off. Dialogue must finish by the 12-second mark.

Critical: NO Invented Details
- Only use the exact Product Name provided
- Only reference what's visible in the Product Image
- Only use the Creator Profile details given
- Do not create slogans, brand messaging, or fake details
- Stay true to what the product actually does based on the image

Output: 3 Natural Scripts
Three different authentic approaches:
1. Excited Discovery - Just found it, have to share
2. Casual Recommendation - Talking to camera like a friend
3. In-the-Moment Demo - Showing while using it

Return your response as valid JSON array with this structure:
[
  {
    "scriptNumber": 1,
    "title": "short title in 3-5 words",
    "energy": "description of energy/vibe",
    "dialogue": [
      {"timestamp": "0:00-0:02", "text": "opening line"},
      {"timestamp": "0:02-0:09", "text": "main talking section"},
      {"timestamp": "0:09-0:12", "text": "closing thought"}
    ],
    "shotBreakdown": [
      {
        "second": "0-1",
        "cameraPosition": "description",
        "cameraMovement": "description",
        "inFrame": "description",
        "creatorAction": "description",
        "productVisibility": "description",
        "audioCue": "what's being said"
      }
      // ... for each second 0-12
    ],
    "technicalDetails": {
      "phoneOrientation": "vertical/horizontal",
      "filmingMethod": "selfie mode/back camera/etc",
      "dominantHand": "which hand holds phone vs product",
      "location": "room/setting details",
      "audioEnvironment": "sound environment"
    }
  }
  // ... 3 scripts total
]`;

/**
 * Get the Gemini API key
 */
function getGeminiApiKey(): string {
  const apiKey =
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Gemini API key not configured. Set GOOGLE_GEMINI_API_KEY, GEMINI_API_KEY, or GOOGLE_AI_API_KEY",
    );
  }
  return apiKey;
}

/**
 * Call Gemini API with image and text
 */
async function callGeminiWithImage(
  prompt: string,
  imageBase64: string,
  model: string = "gemini-2.5-pro",
): Promise<string> {
  const apiKey = getGeminiApiKey();

  const response = await fetch(
    `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: imageBase64.replace(/^data:[^;]+;base64,/, ""),
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: 8192,
        },
      }),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    logger.error("Gemini API error", undefined, {
      component: "ugc-prompt-generator",
      status: response.status,
      error: error.error?.message,
    });
    throw new Error(
      `Gemini API error: ${error.error?.message || "Unknown error"}`,
    );
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("No content in Gemini response");
  }

  return text;
}

/**
 * Parse JSON from Gemini response (handles markdown code blocks)
 */
function parseJsonResponse<T>(text: string): T {
  // Remove markdown code blocks if present
  let jsonText = text
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  // Try to find JSON array or object
  const jsonMatch = jsonText.match(/[\[{][\s\S]*[\]}]/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  try {
    return JSON.parse(jsonText);
  } catch (parseError) {
    logger.error("Failed to parse Gemini JSON response", parseError as Error, {
      component: "ugc-prompt-generator",
      responseLength: text.length,
      jsonTextLength: jsonText.length,
      firstChars: jsonText.substring(0, 200),
    });
    throw new Error(
      `Failed to parse Gemini response as JSON: ${(parseError as Error).message}`,
    );
  }
}

/**
 * Validate and normalize persona data from Gemini response
 */
function normalizePersona(raw: Partial<CreatorPersona>): CreatorPersona {
  return {
    name: raw.name || "Alex",
    age: raw.age || 28,
    gender: raw.gender || "non-binary",
    location: raw.location || "A trendy urban neighborhood",
    occupation: raw.occupation || "Content Creator",
    appearance: raw.appearance || "Friendly and approachable",
    style: raw.style || "Casual and authentic",
    personality: Array.isArray(raw.personality)
      ? raw.personality
      : ["friendly", "enthusiastic", "genuine", "relatable"],
    communicationStyle:
      raw.communicationStyle ||
      "Conversational and warm, like talking to a friend",
    credibility:
      raw.credibility ||
      "Their authentic enthusiasm makes their recommendations feel genuine",
  };
}

/**
 * Analyze a product image and generate a creator persona
 */
export async function generateCreatorPersona(
  productImageBase64: string,
  productName: string,
): Promise<CreatorPersona> {
  logger.info("Generating UGC creator persona", {
    component: "ugc-prompt-generator",
    productName,
  });

  const prompt =
    PERSONA_ANALYSIS_PROMPT + `\n\n**Product Name:** ${productName}`;

  const response = await callGeminiWithImage(prompt, productImageBase64);
  const rawPersona = parseJsonResponse<Partial<CreatorPersona>>(response);

  // Normalize and validate the persona data
  const persona = normalizePersona(rawPersona);

  logger.info("Creator persona generated", {
    component: "ugc-prompt-generator",
    personaName: persona.name,
    occupation: persona.occupation,
    hasPersonality: Array.isArray(persona.personality),
  });

  return persona;
}

/**
 * Generate UGC video scripts based on product and persona
 */
export async function generateUGCScripts(
  productImageBase64: string,
  productName: string,
  persona: CreatorPersona,
): Promise<UGCVideoScript[]> {
  logger.info("Generating UGC video scripts", {
    component: "ugc-prompt-generator",
    productName,
    personaName: persona.name,
  });

  const personaDescription = `
Creator Profile:
- Name: ${persona.name}
- Age: ${persona.age}
- Occupation: ${persona.occupation}
- Location: ${persona.location}
- Appearance: ${persona.appearance}
- Style: ${persona.style}
- Personality: ${persona.personality.join(", ")}
- Communication Style: ${persona.communicationStyle}
- Credibility: ${persona.credibility}
`;

  const prompt =
    UGC_SCRIPT_PROMPT +
    `

**Creator Profile:**
${personaDescription}

**Product Name:** ${productName}`;

  const response = await callGeminiWithImage(prompt, productImageBase64);
  const scripts = parseJsonResponse<UGCVideoScript[]>(response);

  logger.info("UGC scripts generated", {
    component: "ugc-prompt-generator",
    scriptCount: scripts.length,
  });

  return scripts;
}

/**
 * Generate a complete video prompt from a script
 * This combines the script into a single prompt for Sora
 */
export function buildSoraPrompt(
  script: UGCVideoScript,
  persona: CreatorPersona,
  productName: string,
): string {
  // Build a detailed prompt for Sora from the script
  const shotDescriptions = script.shotBreakdown
    .map(
      (shot) =>
        `[Second ${shot.second}] ${shot.cameraPosition}. ${shot.inFrame}. ${shot.creatorAction}. Product: ${shot.productVisibility}. Audio: "${shot.audioCue}"`,
    )
    .join("\n");

  return `Create a 12-second authentic UGC-style vertical video (9:16 aspect ratio) of a real person talking about and demonstrating a product.

CREATOR APPEARANCE:
- ${persona.appearance}
- Style: ${persona.style}
- Vibe: ${persona.communicationStyle}

PRODUCT: ${productName}

VIDEO STYLE:
- Handheld iPhone selfie footage with natural shake
- ${script.technicalDetails.filmingMethod}
- ${script.technicalDetails.location}
- Real, unpolished, authentic feel
- NO text overlays or graphics

ENERGY: ${script.energy}

DIALOGUE (must be spoken naturally):
${script.dialogue.map((d) => `${d.timestamp}: "${d.text}"`).join("\n")}

SHOT-BY-SHOT BREAKDOWN:
${shotDescriptions}

TECHNICAL:
- Phone orientation: ${script.technicalDetails.phoneOrientation}
- Dominant hand: ${script.technicalDetails.dominantHand}
- Audio environment: ${script.technicalDetails.audioEnvironment}

Make this feel like genuine UGC content - imperfect, authentic, and relatable.`;
}

/**
 * Generate complete UGC video prompts from a product image
 *
 * This is the main entry point that:
 * 1. Analyzes the product and creates a persona
 * 2. Generates 3 different script variations
 * 3. Builds Sora-ready prompts for each script
 */
export async function generateUGCVideoPrompts(
  productImageBase64: string,
  productName: string,
): Promise<UGCGenerationResult> {
  logger.info("Starting full UGC prompt generation", {
    component: "ugc-prompt-generator",
    productName,
  });

  // Step 1: Generate creator persona
  const persona = await generateCreatorPersona(productImageBase64, productName);

  // Step 2: Generate scripts
  const scripts = await generateUGCScripts(
    productImageBase64,
    productName,
    persona,
  );

  // Step 3: Build Sora prompts
  const rawPrompts = scripts.map((script) =>
    buildSoraPrompt(script, persona, productName),
  );

  logger.info("UGC prompt generation complete", {
    component: "ugc-prompt-generator",
    productName,
    personaName: persona.name,
    scriptCount: scripts.length,
  });

  return {
    persona,
    scripts,
    rawPrompts,
  };
}
