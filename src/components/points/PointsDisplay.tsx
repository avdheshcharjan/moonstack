'use client';

import { useState, useEffect } from 'react';
import { PointsBalance } from '@/src/types/points';
import { SeasonInfo } from '@/src/types/seasons';
import RollingNumber from '../shared/RollingNumber';

interface PointsDisplayProps {
  walletAddress: string;
  compact?: boolean;
}

export default function PointsDisplay({ walletAddress, compact = false }: PointsDisplayProps) {
  const [balance, setBalance] = useState<PointsBalance | null>(null);
  const [seasonInfo, setSeasonInfo] = useState<SeasonInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPointsData();
  }, [walletAddress]);

  const fetchPointsData = async () => {
    try {
      setLoading(true);
      
      // Fetch points balance
      const balanceResponse = await fetch(`/api/points/balance?wallet=${walletAddress}`);
      const balanceData = await balanceResponse.json();

      // Fetch season info
      const seasonResponse = await fetch('/api/seasons/current');
      const seasonData = await seasonResponse.json();

      if (balanceResponse.ok) {
        setBalance(balanceData);
      }

      if (seasonResponse.ok) {
        setSeasonInfo(seasonData);
      }
    } catch (error) {
      console.error('Error fetching points data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${compact ? 'py-2' : 'py-8'}`}>
        <div className="animate-pulse space-y-3">
          <div className="bg-gray-700 h-12 rounded-lg"></div>
          {!compact && <div className="bg-gray-700 h-8 rounded-lg"></div>}
        </div>
      </div>
    );
  }

  if (!balance) {
    return null;
  }

  // Compact version for TopBar
  if (compact) {
    return (
      <div className="flex items-center gap-2 bg-gradient-to-r from-yellow-600 to-orange-600 
                    px-3 py-1.5 rounded-full cursor-pointer hover:scale-105 transition-transform">
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
        <span className="text-white font-bold text-sm">
          {balance.current_season_points.toLocaleString()}
        </span>
      </div>
    );
  }

  // Full version for Points page
  const seasonProgress = seasonInfo?.current_week_number 
    ? (seasonInfo.current_week_number / 12) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Main Points Display */}
      <div className="bg-gradient-to-br from-yellow-600 via-orange-600 to-red-600 rounded-2xl p-6 shadow-lg">
        <div className="text-center">
          <p className="text-white/80 text-sm mb-2">Season Points</p>
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <RollingNumber value={balance.current_season_points} className="text-white text-5xl font-bold" />
          </div>
          <p className="text-white/60 text-xs">
            Rank #{balance.season_rank} · {balance.total_points.toLocaleString()} lifetime points
          </p>
        </div>
      </div>

      {/* Season Progress */}
      {seasonInfo?.current_season && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-white font-semibold">
                Season {seasonInfo.current_season.season_number}
              </p>
              <p className="text-gray-400 text-xs">
                Week {seasonInfo.current_week_number} of 12
              </p>
            </div>
            <div className="text-right">
              <p className="text-gray-400 text-xs">Time Remaining</p>
              <p className="text-white font-semibold">
                {seasonInfo.days_until_end} days
              </p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
              style={{ width: `${seasonProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Points Breakdown */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Points Breakdown</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-300 text-sm">Trade Points</span>
            </div>
            <span className="text-white font-semibold">
              {balance.breakdown.trade_points.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-300 text-sm">Referral Bonuses</span>
            </div>
            <span className="text-white font-semibold">
              {balance.breakdown.referral_bonus_points.toLocaleString()}
            </span>
          </div>
          {balance.breakdown.adjustment_points > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                <span className="text-gray-300 text-sm">Adjustments</span>
              </div>
              <span className="text-white font-semibold">
                {balance.breakdown.adjustment_points.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-4">
        <p className="text-blue-300 text-sm">
          💡 <strong>Your points = your future airdrop claim.</strong> Keep trading and referring to maximize your allocation when the token launches!
        </p>
      </div>
    </div>
  );
}

