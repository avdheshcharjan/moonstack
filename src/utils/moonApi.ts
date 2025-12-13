/**
 * Moon API Client
 *
 * Client for calling Moon backend APIs for NFT generation and points awards
 */

const MOON_API_BASE = process.env.NEXT_PUBLIC_MOON_API_URL || 'http://localhost:3000';

export interface SelfMintNFTRequest {
  walletAddress: string;
  farcasterFid: number;
}

export interface SelfMintNFTResponse {
  success: boolean;
  imageData: string; // Base64 data URL for preview
  imageUrl: string; // IPFS URL for image
  metadataUrl: string; // IPFS URL for metadata (use this for minting)
  tier: number; // 1-5
  traits: {
    furColour?: string;
    cape?: string;
    hat?: string;
    necklace?: string;
    glasses?: string;
    aura?: string;
    eyeColour?: string;
    background?: string;
  };
}

export interface AwardMintPointsRequest {
  profileId: number;
  walletAddress: string;
}

export interface AwardMintPointsResponse {
  success: boolean;
  message: string;
  points: number;
}

/**
 * Generate a personalized NFT for self-minting
 *
 * This endpoint generates an AI-powered pixelated PFP NFT based on the user's
 * Farcaster profile and uploads it to IPFS.
 *
 * @param walletAddress - User's wallet address
 * @param farcasterFid - User's Farcaster FID
 * @returns Generated NFT data including image and metadata URLs
 */
export async function generateSelfMintNFT(
  walletAddress: string,
  farcasterFid: number
): Promise<SelfMintNFTResponse> {
  const response = await fetch(`${MOON_API_BASE}/api/nft/self-mint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ walletAddress, farcasterFid }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'NFT generation failed');
  }

  return response.json();
}

/**
 * Award points for minting an NFT
 *
 * This endpoint verifies that the user has minted an NFT on-chain
 * and awards them points for the MINT_AURA action.
 *
 * @param profileId - User's profile ID in the Moon database
 * @param walletAddress - User's wallet address that minted the NFT
 * @returns Points award result
 */
export async function awardMintPoints(
  profileId: number,
  walletAddress: string
): Promise<AwardMintPointsResponse> {
  const response = await fetch(`${MOON_API_BASE}/api/tasks/mint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ profileId, walletAddress }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Points award failed');
  }

  return response.json();
}

/**
 * Check if Moon API is reachable
 *
 * @returns true if the API is reachable, false otherwise
 */
export async function checkMoonAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${MOON_API_BASE}/api/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Moon API health check failed:', error);
    return false;
  }
}
