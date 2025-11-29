'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BinaryPair } from '@/src/types/prediction';
import { MarketData } from '@/src/types/orders';
import PredictionCard from '@/src/components/market/PredictionCard';
import { pairBinaryOptions } from '@/src/utils/binaryPairing';
import { parseOrder } from '@/src/utils/optionsParser';

export default function SharePage(): React.ReactElement {
  const params = useParams();
  const router = useRouter();
  const [pair, setPair] = useState<BinaryPair | null>(null);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPairData(): Promise<void> {
      try {
        const id = params.id as string;
        const decodedId = decodeURIComponent(id);

        // Fetch orders and market data
        const response = await fetch('/api/orders');
        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        if (!data?.data) {
          throw new Error('Invalid response format');
        }

        const rawOrders = data.data.orders || [];
        const parsedOrders = rawOrders.map(parseOrder);
        const binaries = parsedOrders.filter((order: { isBinary: boolean }) => order.isBinary);
        const pairs = pairBinaryOptions(binaries.map((parsed: { rawOrder: BinaryPair }) => parsed.rawOrder));

        // Find the matching pair by ID
        const matchingPair = pairs.find((p: BinaryPair) => p.id === decodedId);

        if (!matchingPair) {
          throw new Error('Prediction not found');
        }

        setPair(matchingPair);
        setMarketData(data.data.market_data || null);
      } catch (err) {
        console.error('Error fetching pair:', err);
        setError(err instanceof Error ? err.message : 'Failed to load prediction');
      } finally {
        setLoading(false);
      }
    }

    fetchPairData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000d1d] via-slate-900 to-[#000d1d] flex items-center justify-center">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 mx-auto text-purple-500 mb-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <div className="text-white text-xl">Loading prediction...</div>
        </div>
      </div>
    );
  }

  if (error || !pair || !marketData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#000d1d] via-slate-900 to-[#000d1d] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div className="text-white text-2xl font-bold mb-2">Prediction Not Found</div>
          <div className="text-slate-400 text-sm mb-6">{error || 'This prediction may have expired or been removed'}</div>
          <button
            onClick={() => router.push('/app')}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000d1d] via-slate-900 to-[#000d1d] py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 text-center">
          <h1 className="text-white text-3xl font-bold mb-2">Shared Prediction</h1>
          <p className="text-slate-400">Make your prediction on Thetanuts</p>
        </div>

        {/* Card */}
        <div className="max-w-md mx-auto">
          <PredictionCard
            pair={pair}
            marketData={marketData}
            betSize={5}
          />
        </div>

        {/* Call to Action */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/app')}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            Make Your Prediction
          </button>
        </div>
      </div>
    </div>
  );
}
