/**
 * Vision Service
 *
 * Service for extracting traits from profile pictures using Google Gemini Vision AI
 */

import { Tier, BASE_TIER_TRAITS, TierTraits } from '@/utils/nft/tier';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

/**
 * Extract visual traits from a profile picture using Google Gemini Vision
 *
 * @param imageUrl - URL of the profile picture to analyze
 * @param tier - User's tier (1-5) to provide context
 * @returns Extracted traits based on the image analysis
 */
export async function extractTraitsFromPfp(
  imageUrl: string,
  tier: Tier
): Promise<TierTraits> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  try {
    // Dynamic import for ES module compatibility
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    // Get base traits for this tier
    const baseTrait = BASE_TIER_TRAITS[tier];

    // Fetch image data
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');

    // Get the image MIME type
    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';

    // Create prompt for trait extraction
    const prompt = `Analyze this profile picture and extract visual traits for a pixelated cyberpunk NFT character.

Based on what you see in the image, describe the following traits in a cyberpunk pixelated aesthetic:

1. Fur/Skin Color: What is the dominant color or pattern? (e.g., "chrome plating", "weathered gunmetal", "neon green", etc.)
2. Background: What kind of environment or background would suit this character? (e.g., "digital void", "neon-lit street", "futuristic cityscape")
3. Eye Color: What color are the eyes or what kind of optical enhancement? (e.g., "glowing blue", "scanning red laser", "cybernetic green")
4. Aura/Vibe: What kind of energy or aura surrounds this character? (e.g., "electric discharge", "holographic shimmer", "toxic fumes")

Tier context: This is a Tier ${tier} character (${tier === 1 ? 'Omnipotent' : tier === 2 ? 'Mecha-Warlord' : tier === 3 ? 'Toxic Mutant' : tier === 4 ? 'Hypebeast' : 'Wholesome Derp'}).

Return ONLY a JSON object with these exact keys (no markdown, no code blocks):
{
  "furColour": "...",
  "background": "...",
  "eyeColour": "...",
  "aura": "..."
}`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: contentType,
        },
      },
      prompt,
    ]);

    const response = await result.response;
    const text = response.text();

    // Parse JSON from response
    let extractedTraits: Partial<TierTraits>;
    try {
      // Try to extract JSON from the response (remove markdown code blocks if present)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      extractedTraits = JSON.parse(jsonMatch[0]);
    } catch (error) {
      console.warn('Failed to parse AI response, using base traits:', text);
      extractedTraits = {};
    }

    // Merge extracted traits with base traits (base traits are fallback)
    const finalTraits: TierTraits = {
      furColour: extractedTraits.furColour || baseTrait.furColour,
      cape: baseTrait.cape, // Keep tier-specific cape
      hat: baseTrait.hat, // Keep tier-specific hat
      necklace: baseTrait.necklace, // Keep tier-specific necklace
      glasses: baseTrait.glasses, // Keep tier-specific glasses
      aura: extractedTraits.aura || baseTrait.aura,
      eyeColour: extractedTraits.eyeColour || baseTrait.eyeColour,
      background: extractedTraits.background || baseTrait.background,
    };

    console.log('[Vision] Extracted traits:', finalTraits);

    return finalTraits;
  } catch (error) {
    console.error('[Vision] Error extracting traits:', error);
    // Fallback to base traits on error
    return BASE_TIER_TRAITS[tier];
  }
}
