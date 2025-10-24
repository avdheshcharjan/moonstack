import React, { useState, useEffect } from 'react';
import { DbUserPosition } from '@/src/utils/supabase';
import { getBaseScanTxUrl, formatTxHash } from '@/src/utils/basescan';

interface MyBetsProps {
  walletAddress: string | null;
}

const MyBets: React.FC<MyBetsProps> = ({ walletAddress }) => {
  const [positions, setPositions] = useState<DbUserPosition[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'ongoing' | 'completed'>('ongoing');
  const [timeRemaining, setTimeRemaining] = useState<Record<string, string>>({});

  // Fetch positions from database
  useEffect(() => {
    if (!walletAddress) {
      setPositions([]);
      return;
    }

    const fetchPositions = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/positions?wallet=${walletAddress}`);

        if (!response.ok) {
          throw new Error('Failed to fetch positions');
        }

        const data = await response.json();
        setPositions(data.data || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();

    // Refresh positions every 30 seconds
    const interval = setInterval(fetchPositions, 30000);

    return () => clearInterval(interval);
  }, [walletAddress]);

  useEffect(() => {
    if (!walletAddress) {
      return;
    }

    const updateCountdowns = () => {
      const countdowns: Record<string, string> = {};

      positions.forEach((position) => {
        const now = Date.now();
        const expiryTime = new Date(position.expiry).getTime();
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

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
        <div className="text-2xl font-bold text-white mb-2">Loading...</div>
        <div className="text-slate-400">Fetching your positions</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <div className="text-2xl font-bold text-white mb-2">Error Loading Bets</div>
        <div className="text-slate-400">{error}</div>
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

      {/* Positions List */}
      <div className="space-y-3">
        {displayPositions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            No {activeTab} positions
          </div>
        ) : (
          displayPositions.slice().reverse().map((position) => {
            const isYes = position.is_call;
            const borderColor = isYes ? 'border-green-500/50' : 'border-red-500/50';

            return (
              <div
                key={position.id}
                className={`bg-slate-800/30 rounded-2xl p-4 border-2 ${borderColor} transition-all hover:bg-slate-800/50`}
              >
                <div className="flex items-center gap-4">
                  {/* Token Icon */}
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <img
                      src={getTokenLogo(position.underlying)}
                      alt={position.underlying}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-bold text-xl">
                        {position.underlying === 'BTC' ? 'Bitcoin' : position.underlying === 'ETH' ? 'Ethereum' : position.underlying === 'BNB' ? 'Bnb' : position.underlying === 'XRP' ? 'Xrp' : position.underlying}
                      </h3>
                      <span className="text-slate-400 text-sm font-medium">
                        {position.underlying}
                      </span>
                    </div>
                    <div className="text-slate-400 text-sm mb-3">
                      Predicted {isYes ? 'Yes' : 'No'}
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 bg-slate-900/50 rounded-xl p-3">
                      <div>
                        <div className="text-slate-500 text-xs mb-1">Entry</div>
                        <div className="text-white font-semibold text-sm">
                          ${position.strikes[0]?.toLocaleString() || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs mb-1">PnL</div>
                        <div className={`font-semibold text-sm ${
                          position.pnl > 0 ? 'text-green-400' : position.pnl < 0 ? 'text-red-400' : 'text-white'
                        }`}>
                          {position.pnl > 0 ? '+' : ''}${position.pnl.toFixed(2)}
                          {position.pnl_percentage !== 0 && (
                            <span className="text-xs ml-1">
                              ({position.pnl_percentage > 0 ? '+' : ''}{position.pnl_percentage.toFixed(1)}%)
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-xs mb-1">Ends in</div>
                        <div className="text-purple-400 font-bold text-sm">
                          {timeRemaining[position.id] || 'Calculating...'}
                        </div>
                      </div>
                    </div>

                    {/* Transaction Link */}
                    {position.tx_hash && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50">
                        <a
                          href={getBaseScanTxUrl(position.tx_hash as `0x${string}`)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          <span>View on BaseScan: {formatTxHash(position.tx_hash as `0x${string}`)}</span>
                        </a>
                      </div>
                    )}
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
