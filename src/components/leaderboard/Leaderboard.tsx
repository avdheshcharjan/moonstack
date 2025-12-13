import { LeaderboardEntry } from '@/types/orders';
import React, { useEffect, useState } from 'react';
import { Identity, Avatar, Name, Address } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

interface LeaderboardProps {
  currentWallet?: string | null;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ currentWallet }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'total_pnl' | 'win_rate' | 'roi_percentage'>('total_pnl');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/leaderboard?orderBy=${sortBy}&limit=100`);

        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }

        const data = await response.json();
        setEntries(data.data || []);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        setEntries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    // Refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);

    return () => clearInterval(interval);
  }, [sortBy]);

  const getRankEmoji = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  if (loading) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
        <div className="text-2xl font-bold text-white mb-2">Loading Leaderboard...</div>
        <div className="text-slate-400">Fetching rankings</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
        <div className="text-6xl mb-4">⚠️</div>
        <div className="text-2xl font-bold text-white mb-2">Error Loading Leaderboard</div>
        <div className="text-slate-400">{error}</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <div className="text-2xl font-bold text-white mb-2">No Rankings Yet</div>
        <div className="text-slate-400">Be the first to make predictions!</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-4 px-2">
        <h2 className="text-3xl font-bold text-white">🏆 Leaderboard</h2>

        {/* Sort Options */}
        {/* <div className="flex items-center gap-2 bg-slate-800/50 rounded-full p-1">
          <button
            onClick={() => setSortBy('total_pnl')}
            className={`px-4 py-2 rounded-full font-semibold text-xs transition-all ${sortBy === 'total_pnl'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            Total PnL
          </button>
          <button
            onClick={() => setSortBy('win_rate')}
            className={`px-4 py-2 rounded-full font-semibold text-xs transition-all ${sortBy === 'win_rate'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            Win Rate
          </button>
          <button
            onClick={() => setSortBy('roi_percentage')}
            className={`px-4 py-2 rounded-full font-semibold text-xs transition-all ${sortBy === 'roi_percentage'
              ? 'bg-slate-700 text-white'
              : 'text-slate-400 hover:text-white'
              }`}
          >
            ROI %
          </button>
        </div> */}
      </div>

      {/* Leaderboard Table */}
      <div className="bg-slate-800/30 rounded-2xl border border-slate-700 overflow-hidden px-2">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-900/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Wallet
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Bets
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Win Rate
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total PnL
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  ROI
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {entries.map((entry, index) => {
                const rank = index + 1;
                const isCurrentUser = currentWallet?.toLowerCase() === entry.wallet_address.toLowerCase();

                return (
                  <tr
                    key={entry.wallet_address}
                    className={`transition-colors ${isCurrentUser
                      ? 'bg-purple-500/10 border-l-4 border-purple-500'
                      : 'hover:bg-slate-800/50'
                      }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-bold text-white">
                        {getRankEmoji(rank)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Identity
                          address={entry.wallet_address as `0x${string}`}
                          chain={base}
                        >
                          <Avatar className="w-8 h-8" />
                          <Name className="text-white font-medium">
                            <Address className="font-mono text-white" />
                          </Name>
                        </Identity>
                        {isCurrentUser && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded">
                            YOU
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="text-white font-medium">
                        {entry.total_bets}
                        <span className="text-slate-500 text-xs ml-1">
                          ({entry.settled_bets} settled)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`font-semibold ${entry.win_rate >= 60 ? 'text-green-400' :
                        entry.win_rate >= 40 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                        {entry.win_rate.toFixed(1)}%
                        <div className="text-slate-500 text-xs">
                          {entry.winning_bets}W / {entry.losing_bets}L
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`font-bold text-lg ${entry.total_pnl > 0 ? 'text-green-400' :
                        entry.total_pnl < 0 ? 'text-red-400' :
                          'text-white'
                        }`}>
                        {entry.total_pnl > 0 ? '+' : ''}${entry.total_pnl.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className={`font-semibold ${entry.roi_percentage > 0 ? 'text-green-400' :
                        entry.roi_percentage < 0 ? 'text-red-400' :
                          'text-white'
                        }`}>
                        {entry.roi_percentage > 0 ? '+' : ''}{entry.roi_percentage.toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Total Traders</div>
          <div className="text-white font-bold text-2xl">{entries.length}</div>
        </div>
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Total Bets</div>
          <div className="text-white font-bold text-2xl">
            {entries.reduce((sum, e) => sum + e.total_bets, 0)}
          </div>
        </div>
        <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700">
          <div className="text-slate-400 text-sm mb-1">Total Volume</div>
          <div className={`font-bold text-2xl ${entries.reduce((sum, e) => sum + e.total_pnl, 0) > 0 ? 'text-green-400' : 'text-red-400'
            }`}>
            ${Math.abs(entries.reduce((sum, e) => sum + e.total_pnl, 0)).toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
