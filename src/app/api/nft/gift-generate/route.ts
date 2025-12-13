import { NextRequest, NextResponse } from 'next/server';
import { fetchNeynarProfile } from '@/services/nft/neynar';
import { extractTraitsFromPfp } from '@/services/nft/vision';
import { generateBananaImage } from '@/services/nft/banana';
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { recipientFid, recipientUsername, recipientDisplayName, recipientPfpUrl } = body;

    if (!recipientFid) {
      return NextResponse.json(
        { error: 'Recipient FID is required' },
        { status: 400 }
      );
    }

    console.log('[Gift NFT Generation] Generating NFT for recipient:', {
      fid: recipientFid,
      username: recipientUsername,
      displayName: recipientDisplayName,
    });

    // Fetch recipient's Neynar profile
    const profile = await fetchNeynarProfile(recipientFid);

    const tier = mapScoreToTier(profile.score);
    const baseImageUrl = getBaseImageForTier(tier);

    if (!baseImageUrl) {
      return NextResponse.json(
        { error: 'Missing base image for tier' },
        { status: 500 }
      );
    }

    const pfpUrl = recipientPfpUrl || profile.pfpUrl;
    const traits = await extractTraitsFromPfp(pfpUrl || baseImageUrl, tier);
    const prompt = composeFinalPrompt(tier, traits);

    console.log('[Gift NFT Generation] Tier:', tier);
    console.log('[Gift NFT Generation] Traits:', JSON.stringify(traits, null, 2));

    const result = await generateBananaImage({
      prompt,
      baseImageUrl,
      size: '1024x1024',
      guidanceScale: 7.5,
      steps: 30,
    });

    console.log('[Gift NFT Generation] Successfully generated NFT');

    return NextResponse.json({
      success: true,
      imageData: result.image_url,
      tier,
      traits,
    }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('[Gift NFT Generation] Unexpected error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
