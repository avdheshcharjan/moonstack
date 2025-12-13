import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Fetch profile by ID
    const profile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, parseInt(id)))
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json(profile[0], { status: 200 });
  } catch (error: any) {
    console.error('GET profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate ID
    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json(
        { error: 'Valid ID is required', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // Check if profile exists
    const existingProfile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.id, parseInt(id)))
      .limit(1);

    if (existingProfile.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found', code: 'PROFILE_NOT_FOUND' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      walletAddress,
      farcasterFid,
      ensName,
      baseName,
      displayName,
      avatarUrl,
    } = body;

    // Prepare update object with only provided fields
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (walletAddress !== undefined) {
      updates.walletAddress = walletAddress.toLowerCase();
    }

    if (farcasterFid !== undefined) {
      updates.farcasterFid = farcasterFid;
    }

    if (ensName !== undefined) {
      updates.ensName = ensName;
    }

    if (baseName !== undefined) {
      updates.baseName = baseName;
    }

    if (displayName !== undefined) {
      updates.displayName = displayName;
    }

    if (avatarUrl !== undefined) {
      updates.avatarUrl = avatarUrl;
    }

    // Check for duplicate walletAddress if being updated
    if (walletAddress !== undefined) {
      const duplicateWallet = await db
        .select()
        .from(profiles)
        .where(eq(profiles.walletAddress, updates.walletAddress))
        .limit(1);

      if (
        duplicateWallet.length > 0 &&
        duplicateWallet[0].id !== parseInt(id)
      ) {
        return NextResponse.json(
          {
            error: 'Wallet address already exists',
            code: 'DUPLICATE_WALLET_ADDRESS',
          },
          { status: 400 }
        );
      }
    }

    // Check for duplicate farcasterFid if being updated
    if (farcasterFid !== undefined) {
      const duplicateFid = await db
        .select()
        .from(profiles)
        .where(eq(profiles.farcasterFid, farcasterFid))
        .limit(1);

      if (duplicateFid.length > 0 && duplicateFid[0].id !== parseInt(id)) {
        return NextResponse.json(
          {
            error: 'Farcaster FID already exists',
            code: 'DUPLICATE_FARCASTER_FID',
          },
          { status: 400 }
        );
      }
    }

    // Update profile
    const updatedProfile = await db
      .update(profiles)
      .set(updates)
      .where(eq(profiles.id, parseInt(id)))
      .returning() as any[];

    return NextResponse.json(updatedProfile[0], { status: 200 });
  } catch (error: any) {
    console.error('PATCH profile error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + error.message },
      { status: 500 }
    );
  }
}