import { Tier, TierTraits } from "./tier";

const NEGATIVE_PROMPT =
  "null, none, shirt, t-shirt, hoodie, top, jacket, coat, clothes instead of cape, background colour matching fur colour, same colour palette for fur and background, monotone colour scheme, blurry, text, watermark, human features, multiple heads";

export function composeFinalPrompt(tier: Tier, traits: TierTraits): string {
  // Build JSON object with only defined traits
  const traitsJson: Record<string, string> = {};

  if (traits.furColour) {
    traitsJson["Fur colour"] = traits.furColour;
  }
  if (traits.cape) {
    traitsJson["Cape"] = traits.cape;
  }
  if (traits.hat) {
    traitsJson["Hat"] = traits.hat;
  }
  if (traits.necklace) {
    traitsJson["Necklace"] = traits.necklace;
  }
  if (traits.glasses) {
    traitsJson["Glasses"] = traits.glasses;
  }
  if (traits.aura) {
    traitsJson["Aura"] = traits.aura;
  }
  if (traits.eyeColour) {
    traitsJson["Eye colour"] = traits.eyeColour;
  }
  if (traits.background) {
    traitsJson["Background"] = traits.background;
  }

  // Format as JSON string with proper indentation
  const prompt = JSON.stringify(traitsJson, null, 2);

  // Add instruction line and negative prompt
  return `${prompt}\n\nedit this image, every trait should be applied mandatorily!\n\nA square pixel art NFT profile picture, heavily inspired by the 8-bit CryptoPunks aesthetic. The subject is a beagle dog shown from the chest up, facing slightly to the right. The base pixel architecture of the beagle's head and snout remains consistent across variations, onto which unique pixel traits are layered...\n\nNegative prompt: ${NEGATIVE_PROMPT}`;
}
