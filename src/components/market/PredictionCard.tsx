import React from 'react';
import { BinaryPair } from '@/src/types/prediction';
import { MarketData } from '@/src/types/orders';
import RollingNumber from '@/src/components/shared/RollingNumber';

interface PredictionCardProps {
  pair: BinaryPair;
  marketData: MarketData;
  betSize: number;
}

const PredictionCard: React.FC<PredictionCardProps> = React.memo(({
  pair,
  marketData,
  betSize,
}) => {
  const currentPrice = marketData[pair.underlying] ?? 0;
  const threshold = pair.threshold;
  const isAboveThreshold = currentPrice > threshold;

  const timeRemaining = (() => {
    const now = new Date();
    const diff = pair.expiry.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} left`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} left`;
    } else {
      return 'Expires soon';
    }
  })();

  const formattedExpiry = pair.expiry.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const contracts = pair.callParsed.pricePerContract > 0
    ? betSize / pair.callParsed.pricePerContract
    : 0;

  const potentialPayout = contracts * pair.callParsed.strikeWidth;

  const strikeRange = {
    lower: pair.callParsed.strikes[0],
    upper: pair.callParsed.strikes[1],
  };

  const impliedProb = Math.round(pair.impliedProbability.up);

  return (
    <div className="w-full max-w-md mx-auto h-[600px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-3xl shadow-2xl overflow-hidden">
      <div className="h-full flex flex-col p-6">

        <div className="flex-1 flex flex-col justify-between">

          <div className="space-y-6">
            <div className="text-white text-3xl font-bold leading-tight text-center">
              {pair.question}
            </div>

            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-center">
              <div className="text-white text-6xl font-black mb-2">
                {impliedProb}%
              </div>
              <div className="text-purple-100 text-lg font-medium">
                market confidence
              </div>
            </div>

            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="text-slate-400 text-sm font-medium">
                  Current Price
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  isAboveThreshold
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {isAboveThreshold ? '↑ Above' : '↓ Below'} ${threshold.toLocaleString()}
                </div>
              </div>
              <div className="text-white text-3xl font-bold">
                <RollingNumber
                  value={currentPrice}
                  decimals={2}
                  prefix="$"
                  formatOptions={{
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-slate-300">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-lg font-medium">{timeRemaining}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Expires {formattedExpiry}</span>
            </div>
          </div>

          <div className="space-y-3 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/70 rounded-xl p-4 border border-slate-700">
                <div className="text-slate-400 text-xs font-medium mb-1">
                  Your Bet
                </div>
                <div className="text-white text-xl font-bold">
                  ${betSize} USDC
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 rounded-xl p-4 border border-green-500/30">
                <div className="text-green-300 text-xs font-medium mb-1">
                  Win Potential
                </div>
                <div className="text-green-400 text-xl font-bold">
                  ${potentialPayout.toFixed(2)}
                </div>
              </div>
            </div>

            <div className="text-center text-slate-500 text-xs">
              Range: ${strikeRange.lower.toLocaleString()} - ${strikeRange.upper.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

PredictionCard.displayName = 'PredictionCard';

export default PredictionCard;
