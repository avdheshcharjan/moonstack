import { NextRequest, NextResponse } from 'next/server';

const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;

export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const coinId = searchParams.get('coinId');
  const timeRange = searchParams.get('timeRange') || '1';

  if (!coinId) {
    return NextResponse.json({ error: 'coinId is required' }, { status: 400 });
  }

  try {
    const url = new URL(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`);
    url.searchParams.append('vs_currency', 'usd');
    url.searchParams.append('days', timeRange);

    if (COINGECKO_API_KEY) {
      url.searchParams.append('interval', 'hourly');
    }

    const headers: HeadersInit = {
      'Accept': 'application/json',
    };

    if (COINGECKO_API_KEY) {
      headers['x-cg-demo-api-key'] = COINGECKO_API_KEY;
    }

    const response = await fetch(url.toString(), {
      headers,
      next: { revalidate: 60 }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`CoinGecko API error: ${response.status} - ${errorText}`);
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data: unknown = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
