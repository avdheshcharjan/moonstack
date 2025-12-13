import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq, or, like } from 'drizzle-orm';
import { withApiRateLimit } from '@/lib/with-rate-limit';
import { CommonErrors, successResponse } from '@/lib/api-response';

// CORS headers to allow Moonstack origin
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.MOONSTACK_URL || 'http://localhost:3001',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

// Helper function to generate unique 8-character alphanumeric referral code
function generateReferralCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Helper function to check if referral code exists
async function isReferralCodeUnique(code: string): Promise<boolean> {
  const existing = await db.select()
    .from(profiles)
    .where(eq(profiles.referralCode, code))
    .limit(1);
  return existing.length === 0;
}

// Helper function to generate unique referral code
async function generateUniqueReferralCode(): Promise<string> {
  let code = generateReferralCode();
  let attempts = 0;
  const maxAttempts = 10;
  
  while (!await isReferralCodeUnique(code) && attempts < maxAttempts) {
    code = generateReferralCode();
    attempts++;
  }
  
  if (attempts === maxAttempts) {
    throw new Error('Failed to generate unique referral code');
  }
  
  return code;
}

async function getHandler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    // Single profile by ID
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({
          error: "Valid ID is required",
          code: "INVALID_ID"
        }, { status: 400, headers: corsHeaders });
      }

      const profile = await db.select()
        .from(profiles)
        .where(eq(profiles.id, parseInt(id)))
        .limit(1);

      if (profile.length === 0) {
        return NextResponse.json({
          error: 'Profile not found',
          code: 'PROFILE_NOT_FOUND'
        }, { status: 404, headers: corsHeaders });
      }

      return NextResponse.json(profile[0], { status: 200, headers: corsHeaders });
    }

    // List profiles with pagination and search
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '10'), 100);
    const offset = parseInt(searchParams.get('offset') ?? '0');
    const search = searchParams.get('search');

    let query = db.select().from(profiles) as any;

    if (search) {
      query = query.where(
        or(
          like(profiles.displayName, `%${search}%`),
          like(profiles.walletAddress, `%${search}%`),
          like(profiles.ensName, `%${search}%`),
          like(profiles.baseName, `%${search}%`)
        )
      ) as any;
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results, { status: 200, headers: corsHeaders });

  } catch (error: any) {
    console.error('GET error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error.message
    }, { status: 500, headers: corsHeaders });
  }
}

async function postHandler(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      walletAddress,
      farcasterFid,
      ensName,
      baseName,
      displayName,
      avatarUrl,
      referredBy
    } = body;

    // Validation: farcasterFid is REQUIRED (FID-first approach)
    if (!farcasterFid || isNaN(parseInt(farcasterFid.toString()))) {
      return NextResponse.json({
        error: "Valid Farcaster FID is required. Please open this app in Farcaster.",
        code: "MISSING_FID"
      }, { status: 400, headers: corsHeaders });
    }

    // Validation: displayName is required
    if (!displayName || displayName.trim().length === 0) {
      return NextResponse.json({
        error: "displayName is required",
        code: "MISSING_DISPLAY_NAME"
      }, { status: 400, headers: corsHeaders });
    }

    // Generate unique referral code
    const referralCode = await generateUniqueReferralCode();

    // Prepare insert data
    const now = new Date().toISOString();
    const insertData: any = {
      displayName: displayName.trim(),
      referralCode,
      createdAt: now,
      updatedAt: now
    };

    // Add farcasterFid (REQUIRED)
    insertData.farcasterFid = parseInt(farcasterFid.toString());

    // Add optional wallet address if provided
    if (walletAddress) {
      insertData.walletAddress = walletAddress.toLowerCase();
    }
    if (ensName) {
      insertData.ensName = ensName.trim();
    }
    if (baseName) {
      insertData.baseName = baseName.trim();
    }
    if (avatarUrl) {
      insertData.avatarUrl = avatarUrl.trim();
    }
    if (referredBy !== undefined && referredBy !== null) {
      // Validate that referredBy profile exists
      const referrer = await db.select()
        .from(profiles)
        .where(eq(profiles.id, referredBy))
        .limit(1);
      
      if (referrer.length === 0) {
        return NextResponse.json({
          error: "Referrer profile not found",
          code: "INVALID_REFERRER"
        }, { status: 400, headers: corsHeaders });
      }
      insertData.referredBy = referredBy;
    }

    // Insert new profile
    const newProfile = await db.insert(profiles)
      .values(insertData)
      .returning() as any[];

    return NextResponse.json(newProfile[0], { status: 201, headers: corsHeaders });

  } catch (error: any) {
    console.error('POST error:', error);
    
    // Handle unique constraint violations
    if (error.message && error.message.includes('UNIQUE constraint failed')) {
      if (error.message.includes('wallet_address')) {
        return NextResponse.json({
          error: "Wallet address already exists",
          code: "DUPLICATE_WALLET_ADDRESS"
        }, { status: 400, headers: corsHeaders });
      }
      if (error.message.includes('farcaster_fid')) {
        return NextResponse.json({
          error: "Farcaster FID already exists",
          code: "DUPLICATE_FARCASTER_FID"
        }, { status: 400, headers: corsHeaders });
      }
    }

    return CommonErrors.internalError(
      process.env.NODE_ENV === 'production'
        ? 'Failed to create profile'
        : error.message
    );
  }
}

// Apply rate limiting
export const GET = withApiRateLimit(getHandler, 'relaxed');
export const POST = withApiRateLimit(postHandler, 'standard');