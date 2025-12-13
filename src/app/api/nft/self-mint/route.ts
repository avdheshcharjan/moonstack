import { NextRequest, NextResponse } from 'next/server';
import { fetchNeynarProfile } from '@/services/nft/neynar';
import { extractTraitsFromPfp } from '@/services/nft/vision';
import { generateBananaImage } from '@/services/nft/banana';
import { uploadToIPFS } from '@/services/nft/ipfs';
import { mapScoreToTier, getBaseImageForTier } from '@/utils/nft/tier';
import { composeFinalPrompt } from '@/utils/nft/prompt';

export const maxDuration = 60;

// CORS headers to allow Moonstack origin
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.MOONSTACK_URL || 'http://localhost:3001',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/**
 * Self-Mint NFT Endpoint
 *
 * Generates a personalized pixelated PFP NFT for the user themselves.
 * This is adapted from the gift flow but for self-minting.
 *
 * @param walletAddress - User's wallet address
 * @param farcasterFid - User's Farcaster FID
 *
 * @returns Generated NFT image data, IPFS URLs, tier, and traits
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress, farcasterFid } = body;

    // Validation
    if (!farcasterFid || typeof farcasterFid !== 'number') {
      return NextResponse.json(
        { error: 'Farcaster FID is required and must be a number' },
        { status: 400 }
      );
    }

    if (!walletAddress || typeof walletAddress !== 'string') {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    console.log('[Self-Mint NFT] Starting generation for user:', {
      fid: farcasterFid,
      wallet: walletAddress,
    });

    // Step 1: Fetch user's Neynar profile
    console.log('[Self-Mint NFT] Fetching Neynar profile...');
    const profile = await fetchNeynarProfile(farcasterFid);

    // Step 2: Map score to tier
    const tier = mapScoreToTier(profile.score);
    const baseImageUrl = getBaseImageForTier(tier);

    if (!baseImageUrl) {
      return NextResponse.json(
        { error: 'Missing base image for tier. Check BASE_CAT_IMAGE_T* environment variables.' },
        { status: 500 }
      );
    }

    console.log('[Self-Mint NFT] User tier:', tier);
    console.log('[Self-Mint NFT] Base image:', baseImageUrl);

    // Step 3: Extract traits from user's PFP
    console.log('[Self-Mint NFT] Extracting traits from PFP...');
    const pfpUrl = profile.pfpUrl;
    const traits = await extractTraitsFromPfp(pfpUrl || baseImageUrl, tier);

    console.log('[Self-Mint NFT] Extracted traits:', JSON.stringify(traits, null, 2));

    // Step 4: Compose AI prompt
    const prompt = composeFinalPrompt(tier, traits);

    // Step 5: Generate pixelated NFT image
    console.log('[Self-Mint NFT] Generating NFT image with AI...');
    const result = await generateBananaImage({
      prompt,
      baseImageUrl,
      size: '1024x1024',
      guidanceScale: 7.5,
      steps: 30,
    });

    console.log('[Self-Mint NFT] NFT image generated successfully');

    // Step 6: Upload to IPFS
    console.log('[Self-Mint NFT] Uploading to IPFS...');
    const ipfsResult = await uploadToIPFS({
      imageDataUrl: result.image_url,
      tier,
      traits,
      fid: farcasterFid,
    });

    console.log('[Self-Mint NFT] Upload complete!');
    console.log('[Self-Mint NFT] Image URL:', ipfsResult.imageUrl);
    console.log('[Self-Mint NFT] Metadata URL:', ipfsResult.metadataUrl);

    // Return all data needed for minting
    return NextResponse.json({
      success: true,
      imageData: result.image_url, // Base64 data URL for preview
      imageUrl: ipfsResult.imageUrl, // IPFS URL for image
      metadataUrl: ipfsResult.metadataUrl, // IPFS URL for metadata (use this for minting)
      tier,
      traits,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[Self-Mint NFT] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to generate NFT',
        details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      },
      { status: 500, headers: corsHeaders }
    );
  }
}
