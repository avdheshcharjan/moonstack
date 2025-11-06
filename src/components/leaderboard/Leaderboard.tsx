import { LeaderboardEntry } from '@/src/utils/supabase';
import React, { useEffect, useState } from 'react';
import SeasonTracker from './SeasonTracker';
import WeeklyLeaderboard from './WeeklyLeaderboard';

interface LeaderboardProps {
  currentWallet?: string | null;
}

type ViewMode = 'classic' | 'points';

const Leaderboard: React.FC<LeaderboardProps> = ({ currentWallet }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('points');
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
        const data = await response.json();

        if (!response.ok) {
          // Use the detailed error message from the API if available
          if (data.code === 'LEADERBOARD_NOT_SETUP') {
            setError(data.details || 'Classic leaderboard not set up. Please run the database migration.');
          } else {
            setError(data.details || data.error || 'Failed to fetch leaderboard');
          }
          setEntries([]);
          return;
        }

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

  const formatWallet = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

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
    // Check if it's a setup error
    const isSetupError = error.includes('not set up') || error.includes('does not exist') || error.includes('LEADERBOARD_NOT_SETUP');
    
    return (
      <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-12 text-center">
        <div className="text-6xl mb-4">{isSetupError ? '🛠️' : '⚠️'}</div>
        <div className="text-2xl font-bold text-white mb-2">
          {isSetupError ? 'Leaderboard Setup Required' : 'Error Loading Leaderboard'}
        </div>
        <div className="text-slate-400 mb-4">{error}</div>
        
        {isSetupError && (
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg text-left">
            <p className="text-blue-300 text-sm font-semibold mb-2">Setup Instructions:</p>
            <ol className="text-blue-200 text-sm space-y-1 list-decimal list-inside">
              <li>Go to your Supabase project dashboard</li>
              <li>Navigate to the SQL Editor</li>
              <li>Run: <code className="bg-blue-950 px-2 py-1 rounded">supabase/migrations/complete_setup.sql</code></li>
              <li>Refresh this page</li>
            </ol>
            <p className="text-blue-400 text-xs mt-3">
              💡 Tip: You can also verify your schema setup at <code className="bg-blue-950 px-2 py-1 rounded">/api/admin/verify-schema</code>
            </p>
          </div>
        )}
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
        
        {/* View Toggle */}
        <div className="flex gap-2 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setViewMode('points')}
            className={`px-4 py-2 rounded-md font-semibold text-xs transition-all ${
              viewMode === 'points'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Points
          </button>
          <button
            onClick={() => setViewMode('classic')}
            className={`px-4 py-2 rounded-md font-semibold text-xs transition-all ${
              viewMode === 'classic'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Classic
          </button>
        </div>

      </div>

      {/* Season Tracker */}
      {viewMode === 'points' && <SeasonTracker />}

      {/* Points-Based Leaderboard */}
      {viewMode === 'points' ? (
        <WeeklyLeaderboard currentUserWallet={currentWallet || undefined} />
      ) : (
        <>
      {/* Classic Leaderboard Table */}
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
                        <div className="font-mono text-white">
                          {formatWallet(entry.wallet_address)}
                        </div>
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
        </>
      )}
    </div>
  );
};

export default Leaderboard;
