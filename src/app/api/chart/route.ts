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
    const timeRangeNum = parseFloat(timeRange);

    // For sub-day intervals, CoinGecko requires 'days=1' with appropriate interval
    // For 1 day or more, use the actual days value
    const days = timeRangeNum < 1 ? '1' : timeRange;

    const url = new URL(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart`);
    url.searchParams.append('vs_currency', 'usd');
    url.searchParams.append('days', days);

    // Set interval based on time range for better granularity
    if (timeRangeNum <= 0.04) {
      // 1 hour - use 5 minute intervals (only available with API key or days=1)
      if (COINGECKO_API_KEY) {
        url.searchParams.append('interval', '5m');
      }
    } else if (timeRangeNum <= 0.25) {
      // 6 hours - use 15 minute intervals
      if (COINGECKO_API_KEY) {
        url.searchParams.append('interval', '15m');
      }
    } else if (timeRangeNum <= 1) {
      // 12 hours to 1 day - use hourly intervals
      if (COINGECKO_API_KEY) {
        url.searchParams.append('interval', 'hourly');
      }
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

    const data = await response.json() as { prices: [number, number][] };

    // Filter data to match the requested time range for sub-day intervals
    if (timeRangeNum < 1 && data.prices) {
      const now = Date.now();
      const hoursAgo = timeRangeNum * 24; // Convert days to hours
      const cutoffTime = now - (hoursAgo * 60 * 60 * 1000);

      data.prices = data.prices.filter(([timestamp]) => timestamp >= cutoffTime);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching chart data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch chart data' },
      { status: 500 }
    );
  }
}
