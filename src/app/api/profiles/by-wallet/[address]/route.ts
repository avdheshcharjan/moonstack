import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ address: string }> }
) {
  try {
    const { address } = await params;

    if (!address) {
      return NextResponse.json(
        { error: 'Wallet address is required', code: 'MISSING_ADDRESS' },
        { status: 400 }
      );
    }

    // Lowercase the address before querying
    const normalizedAddress = address.toLowerCase();

    const profile = await db
      .select()
      .from(profiles)
      .where(eq(profiles.walletAddress, normalizedAddress))
      .limit(1);

    if (profile.length === 0) {
      return NextResponse.json(
        { error: 'Profile not found for this wallet address' },
        { status: 404 }
      );
    }

    return NextResponse.json(profile[0], { status: 200 });
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}