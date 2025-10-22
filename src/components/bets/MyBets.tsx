import React, { useState, useEffect } from 'react';
import { useLocalStorage } from '@/src/hooks/useLocalStorage';
import { UserPosition } from '@/src/types/orders';

interface MyBetsProps {
  walletAddress: string | null;
}

const MyBets: React.FC<MyBetsProps> = ({ walletAddress }) => {
  const [positions, setPositions] = useLocalStorage<UserPosition[]>(
    `positions_${walletAddress}`,
    []
  );

  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
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
            countdowns[position.id] = `${days}D:${hours}H`;
          } else if (hours > 0) {
            countdowns[position.id] = `${hours}H:${minutes}M`;
          } else {
            countdowns[position.id] = `${minutes}M:${seconds}S`;
          }
        }
      });

      setTimeRemaining(countdowns);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);

    return () => clearInterval(interval);
  }, [positions, walletAddress]);


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

  if (!walletAddress) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
        <div className="text-6xl mb-4">🔐</div>
        <div className="text-2xl font-bold text-white mb-2">Connect Your Wallet</div>
        <div className="text-slate-400">Connect your wallet to view your bets</div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
        <div className="text-6xl mb-4">📊</div>
        <div className="text-2xl font-bold text-white mb-2">No Bets Yet</div>
        <div className="text-slate-400">You haven&apos;t made any predictions yet</div>
      </div>
    );
  }

  const ongoingPositions = positions.filter(p => timeRemaining[p.id] !== 'Expired');
  const completedPositions = positions.filter(p => timeRemaining[p.id] === 'Expired');
  const displayPositions = activeTab === 'ongoing' ? ongoingPositions : completedPositions;

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex items-center gap-2 bg-slate-800/50 rounded-full p-1 w-fit">
        <button
          onClick={() => setActiveTab('ongoing')}
          className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
            activeTab === 'ongoing'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Ongoing
          {ongoingPositions.length > 0 && (
            <span className="ml-2 bg-slate-600 px-2 py-0.5 rounded-full text-xs">
              {ongoingPositions.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-6 py-2.5 rounded-full font-semibold text-sm transition-all ${
            activeTab === 'completed'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Completed
        </button>
      </div>

      {/* Filter Chips - Degen, Analyst, Expert */}
      <div className="flex items-center gap-2">
        <button className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700/50 transition-colors">
          Degen
        </button>
        <button className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700/50 transition-colors">
          Analyst
        </button>
        <button className="px-4 py-2 rounded-lg bg-slate-800/50 border border-slate-700 text-slate-300 text-sm font-medium hover:bg-slate-700/50 transition-colors">
          Expert
        </button>
      </div>

      {/* Positions List */}
      <div className="space-y-3">
        {displayPositions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No {activeTab} positions
          </div>
        ) : (
          displayPositions.slice().reverse().map((position) => {
            const isPump = position.order.isCall;
            const borderColor = isPump ? 'border-green-500/50' : 'border-red-500/50';

            return (
              <div
                key={position.id}
                className={`bg-slate-800/30 rounded-2xl p-4 border-2 ${borderColor} transition-all hover:bg-slate-800/50`}
              >
                <div className="flex items-center gap-4">
                  {/* Token Icon */}
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <img
                      src={getTokenLogo(position.order.underlying)}
                      alt={position.order.underlying}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-xl">
                        {position.order.underlying === 'BTC' ? 'Bitcoin' : position.order.underlying === 'ETH' ? 'Ethereum' : position.order.underlying === 'BNB' ? 'Bnb' : position.order.underlying === 'XRP' ? 'Xrp' : position.order.underlying}
                      </h3>
                      <span className="text-slate-400 text-sm font-medium">
                        {position.order.underlying}
                      </span>
                    </div>
                    <div className="text-slate-400 text-sm mb-3">
                      Predicted {isPump ? 'Pump' : 'Dump'}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 bg-slate-900/50 rounded-xl p-3">
                      <div>
                        <div className="text-slate-500 text-xs mb-1">Entry</div>
                        <div className="text-white font-semibold text-sm">
                          ${position.order.strikes[0]?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs mb-1">Current</div>
                        <div className="text-white font-semibold text-sm">
                          ${position.order.strikes[0]?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs mb-1">Ends in</div>
                        <div className="text-purple-400 font-bold text-sm">
                          {timeRemaining[position.id] || 'Calculating...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MyBets;
