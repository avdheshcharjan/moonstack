import CoinGeckoChart from '@/src/components/charts/CoinGeckoChart';
import RollingNumber from '@/src/components/shared/RollingNumber';
import { MarketData } from '@/src/types/orders';
import { BinaryPair } from '@/src/types/prediction';
import { copyToClipboard, generateShareUrl } from '@/src/utils/shareUtils';
import React, { useState } from 'react';
import BearishBullishSpectrum from './BearishBullishSpectrum';

interface PredictionCardProps {
  pair: BinaryPair;
  marketData: MarketData;
  betSize: number;
  onDump?: () => void;
  onPump?: () => void;
  onSkip?: () => void;
  isProcessing?: boolean;
  currentIndex?: number;
  totalCards?: number;
}

const PredictionCard: React.FC<PredictionCardProps> = React.memo(({
  pair,
  marketData,
  betSize,
  onDump,
  onPump,
  onSkip,
  isProcessing = false,
  currentIndex,
  totalCards,
}) => {
  const [showCopied, setShowCopied] = useState(false);
  const currentPrice = marketData[pair.underlying] ?? 0;
  const threshold = pair.threshold;
  const isAboveThreshold = currentPrice > threshold;

  const handleShare = async (): Promise<void> => {
    const shareUrl = generateShareUrl(pair);
    const success = await copyToClipboard(shareUrl);

    if (success) {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const timeRemaining = (() => {
    const now = new Date();
    const diff = pair.expiry.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (days > 0) {
      return `${days}d`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '<1m';
    }
  })();

  // Calculate expected total payout for UP (YES) bet (includes bet amount + profit)
  const upContracts = pair.callParsed.pricePerContract > 0
    ? betSize / pair.callParsed.pricePerContract
    : 0;
  const upProfit = upContracts * pair.callParsed.strikeWidth;
  // const upPayout = betSize + upProfit;
  const upPayout = upProfit;

  // Calculate expected total payout for DOWN (NO) bet (includes bet amount + profit)
  const downContracts = pair.putParsed.pricePerContract > 0
    ? betSize / pair.putParsed.pricePerContract
    : 0;
  const downProfit = downContracts * pair.putParsed.strikeWidth;
  // const downPayout = betSize + downProfit;
  const downPayout = downProfit;

  const impliedProb = Math.round(pair.impliedProbability.up);
  const bearishProb = 100 - impliedProb;

  const priceChange = ((currentPrice - threshold) / threshold) * 100;
  const priceChangeText = priceChange >= 0 ? `+${priceChange.toFixed(2)}%` : `${priceChange.toFixed(2)}%`;

  const getTradingViewSymbol = (underlying: string): string => {
    const symbolMap: Record<string, string> = {
      'BTC': 'BINANCE:BTCUSDT',
      'ETH': 'BINANCE:ETHUSDT',
      'BNB': 'BINANCE:BNBUSDT',
      'SOL': 'BINANCE:SOLUSDT',
    };
    return symbolMap[underlying] || 'BINANCE:BTCUSDT';
  };

  const upMultiplier = betSize > 0 ? (upPayout / betSize).toFixed(2) : '0';
  const downMultiplier = betSize > 0 ? (downPayout / betSize).toFixed(2) : '0';

  const getTokenLogo = (symbol: string): string => {
    const logoMap: Record<string, string> = {
      'BTC': '/img/btc.png',
      'ETH': '/img/eth.png',
      'BNB': '/img/bnb.png',
      'SOL': '/img/sol.png',
      'XRP': '/img/xrp.png',
    };
    return logoMap[symbol] || '/img/btc.png';
  };

  const progressPercentage = currentIndex !== undefined && totalCards !== undefined && totalCards > 0
    ? ((currentIndex + 1) / totalCards) * 100
    : 0;

  return (
    <div className="w-full max-w-md mx-auto h-full bg-gradient-to-br from-[#000d1d] via-slate-900 to-[#000d1d] rounded-3xl shadow-2xl overflow-hidden border border-slate-800">
      <div className="h-full flex flex-col justify-between">
        {/* Progress Bar */}
        {currentIndex !== undefined && totalCards !== undefined && (
          <div className="w-full bg-slate-700 h-2">
            <div
              className="bg-gradient-to-r from-purple-600 to-pink-600 h-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}

        {/* Header Section */}
        <div className="px-4 pt-4 pb-2 space-y-2">
          {/* Asset Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-slate-800 flex items-center justify-center">
                  <img
                    src={getTokenLogo(pair.underlying)}
                    alt={pair.underlying}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white text-lg font-bold">{pair.underlying}</span>
                  </div>
                </div>
              </div>

              {/* Share Button */}
              <button
                onClick={handleShare}
                className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors active:scale-95"
                title="Share this prediction"
              >
                {showCopied ? (
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                )}
              </button>
            </div>

            {/* Question */}
            <div className="text-white text-lg font-black leading-tight">
              {pair.question}
            </div>
          </div>

          {/* Price Info */}
          <div className="space-y-0.5">
            <div className="text-white text-2xl font-black">
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
            <div className={`flex items-center gap-1 text-base font-semibold ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
              <span>{priceChange >= 0 ? '↑' : '↓'}</span>
              <span>{priceChangeText} (1d)</span>
            </div>
          </div>

          {/* Bearish/Bullish Spectrum */}
          <BearishBullishSpectrum
            bearishPercentage={bearishProb}
            bullishPercentage={impliedProb}
            showLabels={true}
          />
        </div>

        {/* Chart Section - Takes all available space */}
        <div className="flex-1 px-2 flex flex-col">
          <div className="flex-1 rounded-xl overflow-hidden bg-slate-950" data-noswipe="true">
            <CoinGeckoChart
              symbol={getTradingViewSymbol(pair.underlying)}
              theme="dark"
              autosize={false}
            />
          </div>
        </div>

        {/* Bottom Section - Action Buttons */}
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-stretch justify-center gap-2">
            <button
              onClick={onDump}
              disabled={isProcessing || !onDump}
              className="flex-1 relative bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:active:scale-100"
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg tracking-wider">NO!</span>
                <span className="text-xs font-normal opacity-90">
                  ${downPayout.toFixed(2)} ({downMultiplier}x)
                </span>
              </div>
            </button>

            <button
              onClick={onSkip}
              disabled={isProcessing || !onSkip}
              className="flex-1 relative bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:active:scale-100"
            >
              <span className="text-lg tracking-wider">SKIP</span>
            </button>

            <button
              onClick={onPump}
              disabled={isProcessing || !onPump}
              className="flex-1 relative bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:active:scale-100"
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="text-lg tracking-wider">YES!</span>
                <span className="text-xs font-normal opacity-90">
                  ${upPayout.toFixed(2)} ({upMultiplier}x)
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

PredictionCard.displayName = 'PredictionCard';

export default PredictionCard;
