import { NextRequest, NextResponse } from 'next/server';
import { fetchNeynarProfile, fetchNeynarScore, NeynarProfile } from '@/services/nft/neynar';
import { extractTraitsFromPfp } from '@/services/nft/vision';
import { generateBananaImage } from '@/services/nft/banana';
import { mapScoreToTier, getBaseImageForTier } from '@/utils/nft/tier';
import { composeFinalPrompt } from '@/utils/nft/prompt';
import type { SDKContextData } from '@/types/farcaster';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fid: number = Number(body?.fid);
    if (!Number.isFinite(fid)) {
      return NextResponse.json({ error: 'Missing or invalid fid' }, { status: 400 });
    }

    const sdkContext: SDKContextData | undefined = body?.sdkContext;

    let profile: NeynarProfile;

    if (sdkContext?.source === 'sdk' && sdkContext.user && sdkContext.user.fid === fid) {
      console.log('Using SDK context for profile data');
      const score = await fetchNeynarScore(fid);
      profile = {
        fid,
        username: sdkContext.user.username || String(fid),
        displayName: sdkContext.user.displayName,
        pfpUrl: sdkContext.user.pfpUrl,
        score
      };
    } else {
      console.log('Using Neynar API for full profile data');
      profile = await fetchNeynarProfile(fid);
    }

    const tier = mapScoreToTier(profile.score);
    const baseImageUrl = getBaseImageForTier(tier);

    if (!baseImageUrl) {
      return NextResponse.json({ error: 'Missing base image for tier' }, { status: 500 });
    }

    const pfpUrl = profile.pfpUrl;
    const traits = await extractTraitsFromPfp(pfpUrl || baseImageUrl, tier);
    const prompt = composeFinalPrompt(tier, traits);

    console.log('\n=== NFT GENERATION DEBUG ===');
    console.log('FID:', fid);
    console.log('Neynar Score:', profile.score);
    console.log('Tier:', tier);
    console.log('\nExtracted Traits:');
    console.log(JSON.stringify(traits, null, 2));
    console.log('\n📝 Final Prompt Sent to Image Generation:');
    console.log('-------------------------------------------');
    console.log(prompt);
    console.log('-------------------------------------------\n');

    const result = await generateBananaImage({
      prompt,
      baseImageUrl,
      size: '1024x1024',
      guidanceScale: 7.5,
      steps: 30,
    });

    return NextResponse.json({
      image_url: result.image_url,
      tier,
      traits,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Unknown error' }, { status: 500 });
  }
}
