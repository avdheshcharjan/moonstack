import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const API_URL = process.env.API_URL || 'https://round-snowflake-9c31.devops-118.workers.dev/';

export async function GET() {
  try {
    console.log('Fetching data from Thetanuts API:', API_URL);
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error Response:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`✅ Successfully fetched ${data.data?.orders?.length || 0} orders`);

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching from API:', errorMessage);
    console.error('Full error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch data',
        message: errorMessage
      },
      { status: 500 }
    );
  }
}
