'use client';

import { useState, useEffect } from 'react';
import { SeasonInfo } from '@/src/types/seasons';

export default function SeasonTracker() {
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSeasonInfo();
    // Refresh every hour
    const interval = setInterval(fetchSeasonInfo, 3600000);
    return () => clearInterval(interval);
  }, []);

  const fetchSeasonInfo = async () => {
    try {
      const response = await fetch('/api/seasons/current');
      const data = await response.json();
      if (response.ok) {
        setSeasonInfo(data);
      }
    } catch (error) {
      console.error('Error fetching season info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse bg-gray-800/50 rounded-xl p-6">
        <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }

  if (!seasonInfo?.current_season) {
    return (
      <div className="bg-gray-800/50 rounded-xl p-6">
        <p className="text-gray-400 text-center">No active season</p>
      </div>
    );
  }

  const progressPercentage = (seasonInfo.current_week_number / 12) * 100;
  const startDate = new Date(seasonInfo.current_season.start_date);
  const endDate = new Date(seasonInfo.current_season.end_date);

  return (
    <div className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white text-xl font-bold">
            Season {seasonInfo.current_season.season_number}
          </h3>
          <p className="text-gray-400 text-sm">
            {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-white">
            Week {seasonInfo.current_week_number}
          </p>
          <p className="text-gray-400 text-sm">of 12</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="bg-gray-700/50 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-purple-500 to-blue-500 h-full transition-all duration-500 
                     relative overflow-hidden"
            style={{ width: `${progressPercentage}%` }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent 
                          animate-shimmer"></div>
          </div>
        </div>
      </div>

      {/* Time Remaining */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">Time Remaining</span>
        <span className="text-white font-semibold">
          {seasonInfo.days_until_end} days · {seasonInfo.weeks_remaining} weeks
        </span>
      </div>

      {/* Season Message */}
      <div className="mt-4 bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
        <p className="text-purple-300 text-xs text-center">
          🏆 Top performers will be featured in the weekly leaderboard. Keep trading to climb the ranks!
        </p>
      </div>
    </div>
  );
}

