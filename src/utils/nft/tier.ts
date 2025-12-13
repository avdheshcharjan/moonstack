export type Tier = 1 | 2 | 3 | 4 | 5;

export type TierTraits = {
  furColour?: string;
  cape?: string;
  hat?: string;
  necklace?: string;
  glasses?: string;
  aura?: string;
  eyeColour?: string;
  background: string;
};

// Neynar score ranges for each tier
export function mapScoreToTier(score: number): Tier {
  if (score >= 0.9) return 1;
  if (score >= 0.8) return 2;
  if (score >= 0.7) return 3;
  if (score >= 0.6) return 4;
  return 5; 
}

// Base traits per tier with mandatory fields
// ALL TRAITS ARE NOW IN A PIXELATED CYBERPUNK STYLE
export const BASE_TIER_TRAITS: Record<Tier, TierTraits> = {
  // TIER 1: THE OMNIPOTENT (Cyber-Deity Vibe)
  // Vibe: A digital god made of pure data and advanced tech.
  1: {
    furColour: "pixelated chrome plating reflecting digital nebulae and circuit patterns", 
    cape: "flowing cloak of shimmering pixel data streams and glitch artifacts",
    hat: "floating halo of orbiting server racks and glowing code sprites",
    necklace: "amulet containing a trapped rogue AI consciousness in a data prism",
    glasses: "wireframe monocle projecting complex schematics",
    aura: "bending reality with digital artifacting, wireframes, and energy ripples",
    eyeColour: "glowing blue optical sensors with binary code scrolling",
    background: "pixelated digital void with massive floating data structures and network nodes",
  },

  // TIER 2: THE MECHA-WARLORD (High-Tech Mercenary Vibe)
  // Vibe: Battle-hardened, heavy cybernetics, military-grade hardware.
  2: {
    furColour: "weathered gunmetal pixel armor with exposed wiring and pistons",
    cape: "armored jetpack with blocky plasma thrusters and heat distortion",
    hat: "heavy tactical helmet with multiple glowing sensor arrays and antennae", 
    necklace: "chest-mounted arc reactor core with flickering LEDs and power conduits",
    glasses: "thermal imaging visor with pixelated scanlines and HUD overlay",
    aura: "crackling electric discharge and magnetic field lines from exposed parts",
    eyeColour: "scanning red laser eye with a targeting reticle",
    background: "grimy pixelated Neo-Tokyo street level with neon signs and rain",
  },

  // TIER 3: THE TOXIC MUTANT (Bio-Hacker Outcast Vibe)
  // Vibe: Scavenged tech, dangerous modifications, chemical leaks.
  3: {
    furColour: "patchwork skin of rusty metal and glowing green synthetic flesh",
    cape: "tattered trench coat patched with circuit boards and wires",
    hat: "scavenged rebreather mask with glowing, sputtering filters",
    necklace: "rusty bicycle chain with a data-spike padlock and keys",
    glasses: "mismatched goggles with one cracked lens and one glowing cyber-eye",
    aura: "leaking noxious green digital gas with pixelated fumes and radiation symbols",
    eyeColour: "one cybernetic eye and one empty socket with a dangling wire",
    background: "pixelated underground sewer system with leaking pipes and glowing sludge",
  },

  // TIER 4: THE HYPEBEAST (Street-Samurai Degen Vibe)
  // Vibe: Flashy, trendy, wealthy street-samurai with digital flair.
  4: {
    furColour: "pixelated synthetic fur with neon circuit patterns and branding",
    cape: "oversized holographic puffer jacket with scrolling text and advertisements",
    hat: "backwards smart-cap with a scrolling LED display showing crypto prices", 
    necklace: "thick gold chain with a massive spinning, diamond-encrusted Bitcoin logo",
    glasses: "pixelated smart-glasses displaying stock tickers and social media feeds",
    aura: "floating holographic yen symbols, digital diamonds, and 'BUY' signals",
    eyeColour: "augmented eyes with a constant data stream overlay and red glow",
    background: "pixelated back-alley market with neon-lit stalls and data cables",
  },

  // TIER 5: THE WHOLESOME DERP (Glitched Rookie Vibe)
  // Vibe: Low-level, slightly buggy, aspiring cyberpunk with junk tech.
  5: {
    furColour: "soft, low-res pixel wool with occasional texture glitches",
    // Funny/Silly items to contrast the upper tiers
    cape: "small, pixelated red superhero cape with a low-battery icon", 
    hat: "", 
    necklace: "bowtie made from a salvaged circuit board piece and wire",
    glasses: "",
    aura: "tiny floating error icons, question marks, and heart sprites",
    eyeColour: "black eyes",
    background: "pixelated bedroom with a cluttered desk, old computer terminal, and posters",
  },
};

export function getBaseImageForTier(tier: Tier): string {
  switch (tier) {
    case 1:
      return process.env.BASE_BEAGLE_IMAGE_T1 || "https://ipfs.io/ipfs/bafybeibbbfnuqcqott4l7whb2zu2iys5lrcemg7l2d3fclg5dq6rygtxd4/tier1.png";
    case 2:
      return process.env.BASE_BEAGLE_IMAGE_T2 || "https://ipfs.io/ipfs/bafybeibbbfnuqcqott4l7whb2zu2iys5lrcemg7l2d3fclg5dq6rygtxd4/tier2.png";
    case 3:
      return process.env.BASE_BEAGLE_IMAGE_T3 || "https://ipfs.io/ipfs/bafybeibbbfnuqcqott4l7whb2zu2iys5lrcemg7l2d3fclg5dq6rygtxd4/tier3.png";
    case 4:
      return process.env.BASE_BEAGLE_IMAGE_T4 || "https://ipfs.io/ipfs/bafybeibbbfnuqcqott4l7whb2zu2iys5lrcemg7l2d3fclg5dq6rygtxd4/tier4.png";
    case 5:
      return process.env.BASE_BEAGLE_IMAGE_T5 || "https://ipfs.io/ipfs/bafybeibbbfnuqcqott4l7whb2zu2iys5lrcemg7l2d3fclg5dq6rygtxd4/tier5.png";
  }
}

export function enforceTraitKeys(
  base: TierTraits,
  incoming: Partial<TierTraits>
): TierTraits {
  const result: TierTraits = {
    background: incoming.background || base.background,
  };

  if (base.furColour !== undefined) {
    result.furColour = incoming.furColour || base.furColour;
  }
  if (base.cape !== undefined) {
    result.cape = incoming.cape || base.cape;
  }
  if (base.hat !== undefined) {
    result.hat = incoming.hat || base.hat;
  }
  if (base.necklace !== undefined) {
    result.necklace = incoming.necklace || base.necklace;
  }
  if (base.glasses !== undefined) {
    result.glasses = incoming.glasses || base.glasses;
  }
  if (base.aura !== undefined) {
    result.aura = incoming.aura || base.aura;
  }
  if (base.eyeColour !== undefined) {
    result.eyeColour = incoming.eyeColour || base.eyeColour;
  }

  return result;
}