import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const wallet = searchParams.get('wallet');
    const fid = searchParams.get('fid');

    // Validate that at least one parameter is provided
    if (!wallet && !fid) {
      return NextResponse.json(
        { error: 'Either wallet address or Farcaster FID is required' },
        { status: 400 }
      );
    }

    let profile;

    // Search by wallet address (case-insensitive)
    if (wallet) {
      const normalizedWallet = wallet.toLowerCase();
      const result = await db
        .select()
        .from(profiles)
        .where(eq(profiles.walletAddress, normalizedWallet))
        .limit(1);

      if (result.length > 0) {
        profile = result[0];
      }
    }

    // Search by Farcaster FID if wallet search didn't find anything
    if (!profile && fid) {
      const farcasterFid = parseInt(fid);
      
      if (isNaN(farcasterFid)) {
        return NextResponse.json(
          { error: 'Invalid Farcaster FID format' },
          { status: 400 }
        );
      }

      const result = await db
        .select()
        .from(profiles)
        .where(eq(profiles.farcasterFid, farcasterFid))
        .limit(1);

      if (result.length > 0) {
        profile = result[0];
      }
    }

    // Return 404 if profile not found
    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Return the profile
    return NextResponse.json(profile, { status: 200 });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}