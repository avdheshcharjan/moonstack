import { NextRequest, NextResponse } from 'next/server';
import { PointsService } from '@/lib/points-service';
import { hasUserMintedNFT } from '@/utils/nft/contract';

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
    const { profileId, walletAddress } = body;

    if (!profileId) {
      return NextResponse.json(
        { error: 'Profile ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify that the user has actually minted an NFT on-chain
    const hasMinted = await hasUserMintedNFT(walletAddress);

    if (!hasMinted) {
      return NextResponse.json(
        { error: 'No NFT mint found for this wallet address' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Award points for minting AURA
    const result = await PointsService.awardPoints({
      profileId,
      ruleKey: 'MINT_AURA',
      sourceId: `${profileId}:mint_aura:${walletAddress}:${Date.now()}`,
      evidence: {
        action: 'mint',
        walletAddress,
        verificationMethod: 'on-chain',
        verifiedOnChain: true,
        verifiedAt: new Date().toISOString(),
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message,
      points: result.points,
    }, { headers: corsHeaders });
  } catch (error) {
    console.error('Error verifying mint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
}
