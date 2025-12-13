import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fid = searchParams.get('fid');

    if (!fid) {
      return NextResponse.json(
        { error: 'Farcaster FID is required' },
        { status: 400 }
      );
    }

    const neynarApiKey = process.env.NEYNAR_API_KEY;
    if (!neynarApiKey) {
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      );
    }

    // Fetch user data from Neynar
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fid}`,
      {
        headers: {
          'api_key': neynarApiKey,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch user from Neynar');
    }

    const data = await response.json();
    
    if (!data.users || data.users.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = data.users[0];

    return NextResponse.json({
      fid: user.fid,
      username: user.username,
      displayName: user.display_name,
      avatarUrl: user.pfp_url,
      bio: user.profile?.bio?.text,
      verifications: user.verifications || [],
    });
  } catch (error) {
    console.error('Error fetching Neynar user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
