import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, farcasterFid, displayName, avatarUrl } = body;

    console.log('[Link Farcaster] Request:', { profileId, farcasterFid });

    if (!profileId || !farcasterFid) {
      return NextResponse.json(
        { error: 'Profile ID and Farcaster FID are required' },
        { status: 400 }
      );
    }

    // Check if this FID is already linked to another profile
    const existingProfile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.farcasterFid, farcasterFid))
      .limit(1);

    console.log('[Link Farcaster] Existing profile with FID:', existingProfile.length > 0 ? existingProfile[0].id : 'none');
    console.log('[Link Farcaster] Target profile ID:', profileId);

    if (existingProfile.length > 0 && existingProfile[0].id !== parseInt(profileId)) {
      console.error('[Link Farcaster] FID already linked to different profile:', {
        existingProfileId: existingProfile[0].id,
        requestedProfileId: profileId,
        farcasterFid
      });
      return NextResponse.json(
        {
          error: 'This Farcaster account is already linked to another profile',
          existingProfileId: existingProfile[0].id,
          requestedProfileId: profileId
        },
        { status: 409 }
      );
    }

    // If FID is already linked to this profile, just return success
    if (existingProfile.length > 0 && existingProfile[0].id === parseInt(profileId)) {
      console.log('[Link Farcaster] FID already linked to this profile, returning success');
      return NextResponse.json({
        success: true,
        profile: existingProfile[0],
        message: 'Farcaster account already linked to this profile'
      });
    }

    // Update the profile with Farcaster information
    const updated = await db
      .update(profiles)
      .set({
        farcasterFid: farcasterFid,
        displayName: displayName || null,
        avatarUrl: avatarUrl || null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(profiles.id, profileId))
      .returning() as any[];

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: updated[0],
    });
  } catch (error) {
    console.error('Error linking Farcaster account:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
