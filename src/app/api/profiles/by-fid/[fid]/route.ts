import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fid: string }> }
) {
  try {
    const { fid } = await params;

    // Validate fid is a valid integer
    if (!fid || isNaN(parseInt(fid))) {
      return NextResponse.json(
        { error: 'Invalid Farcaster FID' },
        { status: 400 }
      );
    }

    const farcasterFid = parseInt(fid);

    // Query profile by Farcaster FID
    const profile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.farcasterFid, farcasterFid))
      .limit(1);

    // Return 404 if profile not found
    if (profile.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found for this Farcaster FID' },
        { status: 404 }
      );
    }

    // Return profile object
    return NextResponse.json(profile[0], { status: 200 });
  } catch (error: any) {
    console.error('GET /api/profiles/by-fid/[fid] error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}