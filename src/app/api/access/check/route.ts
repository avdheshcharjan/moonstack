import { NextRequest, NextResponse } from 'next/server';
import { hasUserMintedNFT } from '@/utils/nft-contract';

export async function GET(request: NextRequest) {
  const walletAddress = request.nextUrl.searchParams.get('wallet');

  if (!walletAddress) {
    return NextResponse.json({
      hasAccess: false,
      reason: 'No wallet address provided'
    });
  }

  try {
    const hasMinted = await hasUserMintedNFT(walletAddress);

    return NextResponse.json({
      hasAccess: hasMinted,
      reason: hasMinted ? null : 'Must mint NFT first'
    });
  } catch (error) {
    console.error('[AccessCheck] Error verifying NFT ownership:', error);
    return NextResponse.json({
      hasAccess: false,
      reason: 'Verification failed'
    }, { status: 500 });
  }
}
