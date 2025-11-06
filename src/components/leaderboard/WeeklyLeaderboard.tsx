'use client';

import { useState, useEffect } from 'react';
import { WeeklyLeaderboardEntry, SeasonLeaderboardEntry } from '@/src/types/seasons';

interface LeaderboardProps {
  currentUserWallet?: string;
}

type TabType = 'weekly' | 'season' | 'alltime';

export default function WeeklyLeaderboard({ currentUserWallet }: LeaderboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('season');
  const [weeklyData, setWeeklyData] = useState<WeeklyLeaderboardEntry[]>([]);
  const [seasonData, setSeasonData] = useState<SeasonLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState<number>(1);
  const [seasonId, setSeasonId] = useState<string>('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'weekly' && seasonId) {
      fetchWeeklyData();
    } else if (activeTab === 'season') {
      fetchSeasonData();
    }
  }, [activeTab, selectedWeek, seasonId]);

  const fetchInitialData = async () => {
    try {
      // Get current season
      const seasonResponse = await fetch('/api/seasons/current');
      const seasonData = await seasonResponse.json();
      
      if (seasonData.current_season) {
        setSeasonId(seasonData.current_season.id);
        setSelectedWeek(seasonData.current_week_number || 1);
      }

      // Fetch season leaderboard by default
      await fetchSeasonData();
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchWeeklyData = async () => {
    if (!seasonId) return;
    
    try {
      setLoading(true);
      const response = await fetch(
        `/api/leaderboard/weekly?season_id=${seasonId}&week_number=${selectedWeek}&limit=100`
      );
      const data = await response.json();
      if (response.ok) {
        setWeeklyData(data.entries || []);
      }
    } catch (error) {
      console.error('Error fetching weekly leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSeasonData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/leaderboard/season?limit=100');
      const data = await response.json();
      if (response.ok) {
        setSeasonData(data.entries || []);
      }
    } catch (error) {
      console.error('Error fetching season leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankBadge = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const isCurrentUser = (address: string) => {
    return currentUserWallet && address.toLowerCase() === currentUserWallet.toLowerCase();
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('season')}
          className={`px-6 py-3 rounded-lg font-semibold text-sm whitespace-nowrap transition-all
            ${activeTab === 'season' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
        >
          Season
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`px-6 py-3 rounded-lg font-semibold text-sm whitespace-nowrap transition-all
            ${activeTab === 'weekly' 
              ? 'bg-blue-600 text-white shadow-lg' 
              : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
        >
          Weekly
        </button>
      </div>

      {/* Week Selector for Weekly Tab */}
      {activeTab === 'weekly' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          <span className="text-gray-400 text-sm whitespace-nowrap">Week:</span>
          {[...Array(12)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setSelectedWeek(i + 1)}
              className={`px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition-colors
                ${selectedWeek === i + 1 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
                }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Leaderboard Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse bg-gray-800/50 rounded-lg p-4 flex items-center gap-4">
              <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-700 rounded w-1/3"></div>
                <div className="h-3 bg-gray-700 rounded w-1/4"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl overflow-hidden">
          {/* Header */}
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-gray-900/50 text-gray-400 text-xs font-semibold">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Wallet</div>
            {activeTab === 'weekly' ? (
              <>
                <div className="col-span-3 text-right">Profit</div>
                <div className="col-span-3 text-right">Points</div>
              </>
            ) : (
              <>
                <div className="col-span-3 text-right">Points</div>
                <div className="col-span-3 text-right">Win Rate</div>
              </>
            )}
          </div>

          {/* Entries */}
          <div className="divide-y divide-gray-700/30">
            {activeTab === 'weekly' ? (
              weeklyData.length > 0 ? (
                weeklyData.map((entry) => (
                  <div
                    key={entry.id}
                    className={`grid grid-cols-12 gap-2 px-4 py-4 hover:bg-gray-700/20 transition-colors
                      ${isCurrentUser(entry.wallet_address) ? 'bg-blue-900/20 border-l-4 border-blue-500' : ''}`}
                  >
                    <div className="col-span-1 flex items-center">
                      <span className="text-white font-bold text-sm">
                        {getRankBadge(entry.rank)}
                      </span>
                    </div>
                    <div className="col-span-5 flex items-center">
                      <span className="text-white font-mono text-sm">
                        {truncateAddress(entry.wallet_address)}
                      </span>
                      {isCurrentUser(entry.wallet_address) && (
                        <span className="ml-2 text-blue-400 text-xs">(You)</span>
                      )}
                    </div>
                    <div className="col-span-3 flex items-center justify-end">
                      <span className={`font-semibold text-sm ${
                        entry.weekly_profit_usd >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        ${entry.weekly_profit_usd.toFixed(2)}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center justify-end">
                      <span className="text-yellow-400 font-semibold text-sm">
                        {entry.weekly_points_earned.toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">No data for this week</p>
                </div>
              )
            ) : (
              seasonData.length > 0 ? (
                seasonData.map((entry) => (
                  <div
                    key={entry.wallet_address}
                    className={`grid grid-cols-12 gap-2 px-4 py-4 hover:bg-gray-700/20 transition-colors
                      ${isCurrentUser(entry.wallet_address) ? 'bg-blue-900/20 border-l-4 border-blue-500' : ''}`}
                  >
                    <div className="col-span-1 flex items-center">
                      <span className="text-white font-bold text-sm">
                        {getRankBadge(entry.rank)}
                      </span>
                    </div>
                    <div className="col-span-5 flex items-center">
                      <span className="text-white font-mono text-sm">
                        {truncateAddress(entry.wallet_address)}
                      </span>
                      {isCurrentUser(entry.wallet_address) && (
                        <span className="ml-2 text-blue-400 text-xs">(You)</span>
                      )}
                    </div>
                    <div className="col-span-3 flex items-center justify-end">
                      <span className="text-yellow-400 font-semibold text-sm">
                        {entry.current_season_points.toLocaleString()}
                      </span>
                    </div>
                    <div className="col-span-3 flex items-center justify-end">
                      <span className="text-green-400 font-semibold text-sm">
                        {entry.total_trades > 0 
                          ? `${((entry.winning_trades / entry.total_trades) * 100).toFixed(0)}%`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-sm">No data available</p>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

