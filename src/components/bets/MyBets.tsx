import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '@/src/hooks/useLocalStorage';
import { UserPosition, MarketData } from '@/src/types/orders';

interface MyBetsProps {
  walletAddress: string | null;
  marketData: MarketData | null;
}

const MyBets: React.FC<MyBetsProps> = ({ walletAddress, marketData }) => {
  const [positions, setPositions] = useLocalStorage<UserPosition[]>(
    `positions_${walletAddress}`,
    []
  );

  const [timeRemaining, setTimeRemaining] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    const updateCountdowns = () => {
      const countdowns: Record<string, string> = {};

      positions.forEach((position) => {
        const now = Date.now();
        const expiryTime = position.order.expiry.getTime();
        const diff = expiryTime - now;

        if (diff <= 0) {
          countdowns[position.id] = 'Expired';
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);

          if (days > 0) {
            countdowns[position.id] = `${days}d ${hours}h`;
          } else if (hours > 0) {
            countdowns[position.id] = `${hours}h ${minutes}m`;
          } else {
            countdowns[position.id] = `${minutes}m ${seconds}s`;
          }
        }
      });

      setTimeRemaining(countdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [positions, walletAddress]);

  const calculateIsWinning = (position: UserPosition): boolean => {
    if (!marketData) {
      return false;
    }

    const currentPrice = marketData[position.order.underlying];
    if (!currentPrice) {
      return false;
    }

    const strikes = position.order.strikes;
    const isCall = position.order.isCall;

    if (isCall) {
      const topStrike = Math.max(...strikes);
      return currentPrice > topStrike;
    } else {
      const bottomStrike = Math.min(...strikes);
      return currentPrice < bottomStrike;
    }
  };

  const getAssetIcon = (asset: string): string => {
    const icons: Record<string, string> = {
      BTC: '₿',
      ETH: 'Ξ',
      SOL: '◎',
      XRP: 'X',
      BNB: 'B',
    };
    return icons[asset] || asset;
  };

  if (!walletAddress) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="text-4xl mb-4">🔐</div>
        <div className="text-xl font-bold text-gray-600 mb-2">Connect Your Wallet</div>
        <div className="text-gray-500">Connect your wallet to view your bets</div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-12 text-center">
        <div className="text-4xl mb-4">📊</div>
        <div className="text-xl font-bold text-gray-600 mb-2">No Bets Yet</div>
        <div className="text-gray-500">You haven&apos;t made any predictions yet</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Ongoing</h2>
        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-semibold">
          {positions.filter(p => timeRemaining[p.id] !== 'Expired').length}
        </div>
      </div>

      {positions.slice().reverse().map((position) => {
        const isWinning = calculateIsWinning(position);
        const isExpired = timeRemaining[position.id] === 'Expired';
        const borderColor = isExpired
          ? 'border-gray-300'
          : isWinning
          ? 'border-green-500'
          : 'border-red-500';
        const currentPrice = marketData?.[position.order.underlying] || 0;

        return (
          <div
            key={position.id}
            className={`bg-gray-900 rounded-lg p-4 border-2 ${borderColor} transition-colors`}
          >
            <div className="flex items-start gap-3">
              <div className="text-4xl">
                {getAssetIcon(position.order.underlying)}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-white font-bold text-lg">
                      {position.order.underlying} {position.order.underlying === 'BTC' ? 'btc' : position.order.underlying.toLowerCase()}
                    </div>
                    <div className="text-gray-400 text-sm">
                      Predicted {position.order.isCall ? 'Pump' : 'Dump'}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div>
                    <div className="text-gray-400 text-xs">Entry</div>
                    <div className="text-white font-semibold">
                      ${position.order.strikes[0]?.toLocaleString() || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Current</div>
                    <div className="text-white font-semibold">
                      ${currentPrice.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-xs">Ends in</div>
                    <div className="text-purple-400 font-semibold text-sm">
                      {timeRemaining[position.id] || 'Calculating...'}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-700">
                  <a
                    href={`https://basescan.org/tx/${position.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm hover:underline"
                  >
                    View Transaction →
                  </a>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MyBets;
