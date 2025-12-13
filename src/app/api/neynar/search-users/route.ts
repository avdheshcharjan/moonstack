import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const limit = searchParams.get('limit') || '10';

    if (!query || query.trim() === '') {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEYNAR_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Neynar API key not configured' },
        { status: 500 }
      );
    }

    // Call Neynar API to search users
    const response = await fetch(
      `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(query)}&limit=${limit}`,
      {
        headers: {
          'accept': 'application/json',
          'api_key': apiKey,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      console.error('Neynar API error:', errorData);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      users: data.result?.users || [],
    });
  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
