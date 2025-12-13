import { NextRequest, NextResponse } from 'next/server';
import { uploadToIPFS } from '@/services/nft/ipfs';
import type { TierTraits } from '@/utils/nft/tier';

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validate request body
    const { imageDataUrl, tier, traits, fid } = body;

    if (!imageDataUrl || typeof imageDataUrl !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid imageDataUrl' },
        { status: 400 }
      );
    }

    if (!tier || typeof tier !== 'number' || tier < 1 || tier > 5) {
      return NextResponse.json(
        { error: 'Missing or invalid tier (must be 1-5)' },
        { status: 400 }
      );
    }

    if (!traits || typeof traits !== 'object') {
      return NextResponse.json(
        { error: 'Missing or invalid traits' },
        { status: 400 }
      );
    }

    if (!fid || typeof fid !== 'number') {
      return NextResponse.json(
        { error: 'Missing or invalid fid' },
        { status: 400 }
      );
    }

    // Validate data URL format
    if (!imageDataUrl.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image data URL format' },
        { status: 400 }
      );
    }

    console.log(`\n=== IPFS UPLOAD ===`);
    console.log(`FID: ${fid}, Tier: ${tier}`);

    // Upload to IPFS
    const result = await uploadToIPFS({
      imageDataUrl,
      tier,
      traits: traits as TierTraits,
      fid,
    });

    console.log(`Image URL: ${result.imageUrl}`);
    console.log(`Metadata URL: ${result.metadataUrl}`);
    console.log(`===================\n`);

    return NextResponse.json({
      success: true,
      imageUrl: result.imageUrl,
      metadataUrl: result.metadataUrl,
    }, { headers: corsHeaders });
  } catch (err: any) {
    console.error('Error uploading to IPFS:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to upload to IPFS' },
      { status: 500, headers: corsHeaders }
    );
  }
}
