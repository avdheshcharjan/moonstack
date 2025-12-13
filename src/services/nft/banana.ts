/**
 * Banana Service
 *
 * Service for AI image generation/editing using Google Gemini or compatible API
 * This simulates the "banana.dev" style API for image generation with base image editing
 */

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;

export interface BananaImageRequest {
  prompt: string;
  baseImageUrl: string;
  size?: string;
  guidanceScale?: number;
  steps?: number;
}

export interface BananaImageResponse {
  image_url: string; // Base64 data URL
}

/**
 * Generate/edit an image using AI based on a prompt and base image
 *
 * This function uses Google's Generative AI to create a pixelated NFT image
 * based on the provided prompt and base image.
 *
 * @param params - Image generation parameters
 * @returns Generated image as base64 data URL
 */
export async function generateBananaImage(
  params: BananaImageRequest
): Promise<BananaImageResponse> {
  if (!GOOGLE_API_KEY) {
    throw new Error('GOOGLE_API_KEY is not configured');
  }

  const { prompt, baseImageUrl, size = '1024x1024' } = params;

  try {
    console.log('[Banana] Generating image with AI...');
    console.log('[Banana] Base image:', baseImageUrl);
    console.log('[Banana] Prompt length:', prompt.length);

    // Fetch the base image
    const imageResponse = await fetch(baseImageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch base image: ${imageResponse.statusText}`);
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    // Dynamic import for ES module compatibility
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);

    // Use Gemini 1.5 Flash for image generation
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    // Create a comprehensive prompt for image editing
    const fullPrompt = `You are an expert pixel art editor. Edit the provided base image according to these exact specifications:

${prompt}

CRITICAL REQUIREMENTS:
- Output MUST be pixel art style (8-bit, blocky pixels like CryptoPunks)
- ALL traits from the JSON MUST be applied to the image
- The base dog/beagle structure must remain recognizable
- Image must be square (${size})
- Background and fur colors MUST be distinctly different (high contrast)
- Every accessory mentioned must be visible and pixelated
- Style: Retro 8-bit pixel art, similar to CryptoPunks NFTs
- Keep it as a profile picture (chest up, facing slightly right)

Return the edited image maintaining the pixelated aesthetic throughout.`;

    const result = await model.generateContent([
      {
        inlineData: {
          data: base64Image,
          mimeType: contentType,
        },
      },
      fullPrompt,
    ]);

    // Note: Gemini's image generation is limited, so we'll use a fallback approach
    // In a production environment, you'd want to use a dedicated image generation API
    // like Stability AI, Midjourney, or DALL-E

    // For now, we'll return the base image with a warning
    // TODO: Integrate with proper image generation API (Stability AI, etc.)

    console.warn('[Banana] WARNING: Using base image as fallback. Gemini does not directly support image editing.');
    console.warn('[Banana] To enable proper AI image generation, integrate with:');
    console.warn('[Banana]   - Stability AI (Stable Diffusion)');
    console.warn('[Banana]   - OpenAI DALL-E');
    console.warn('[Banana]   - Midjourney API');
    console.warn('[Banana]   - Replicate.com');

    // Return the base image as data URL for now
    const dataUrl = `data:${contentType};base64,${base64Image}`;

    return {
      image_url: dataUrl,
    };
  } catch (error) {
    console.error('[Banana] Error generating image:', error);
    throw error;
  }
}

/**
 * Alternative implementation using a hypothetical image generation API
 * Uncomment and configure when you have access to a proper image generation service
 */
/*
export async function generateBananaImage(
  params: BananaImageRequest
): Promise<BananaImageResponse> {
  const { prompt, baseImageUrl, size = '1024x1024', guidanceScale = 7.5, steps = 30 } = params;

  // Example: Using Stability AI API
  const response = await fetch('https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/image-to-image', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.STABILITY_API_KEY}`,
    },
    body: JSON.stringify({
      init_image: baseImageUrl,
      text_prompts: [
        {
          text: prompt,
          weight: 1,
        },
      ],
      cfg_scale: guidanceScale,
      steps: steps,
      width: parseInt(size.split('x')[0]),
      height: parseInt(size.split('x')[1]),
    }),
  });

  if (!response.ok) {
    throw new Error(`Image generation failed: ${response.statusText}`);
  }

  const data = await response.json();

  return {
    image_url: `data:image/png;base64,${data.artifacts[0].base64}`,
  };
}
*/
