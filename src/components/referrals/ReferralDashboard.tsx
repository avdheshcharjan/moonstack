'use client';

import { useState, useEffect } from 'react';
import { ReferralStats, RefereeInfo } from '@/src/types/referrals';
import ShareReferralModal from '../shared/ShareReferralModal';

interface ReferralDashboardProps {
  walletAddress: string;
}

export default function ReferralDashboard({ walletAddress }: ReferralDashboardProps) {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referees, setReferees] = useState<RefereeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReferralStats();
  }, [walletAddress]);

  const fetchReferralStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/referrals/stats?wallet=${walletAddress}`);
      const data = await response.json();

      if (response.ok) {
        setStats({
          total_referrals: data.total_referrals,
          active_referrals: data.active_referrals,
          inactive_referrals: data.inactive_referrals,
          bonus_multiplier: data.bonus_multiplier,
          bonus_tier: data.bonus_tier,
          total_bonus_points: data.total_bonus_points,
          referral_code: data.referral_code,
          referral_link: data.referral_link,
        });
        setReferees(data.referees || []);
      }
    } catch (error) {
      console.error('Error fetching referral stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (stats?.referral_link) {
      navigator.clipboard.writeText(stats.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getBonusTierInfo = (tier: string) => {
    switch (tier) {
      case 'FLAT':
        return {
          name: 'Starter',
          description: '100 points per active referral',
          color: 'bg-gray-500',
          next: 'Get 10 active referrals for 1.2x multiplier',
        };
      case 'TIER_1':
        return {
          name: 'Bronze',
          description: '1.2x multiplier on referee points',
          color: 'bg-orange-500',
          next: 'Get 30 active referrals for 1.5x multiplier',
        };
      case 'TIER_2':
        return {
          name: 'Gold',
          description: '1.5x multiplier on referee points',
          color: 'bg-yellow-500',
          next: 'Maximum tier reached!',
        };
      default:
        return {
          name: 'Unknown',
          description: '',
          color: 'bg-gray-500',
          next: '',
        };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-400">Failed to load referral stats</p>
      </div>
    );
  }

  const tierInfo = getBonusTierInfo(stats.bonus_tier);

  return (
    <div className="space-y-6 pb-6">
      {/* Referral Code Card */}
      <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl p-6 shadow-lg">
        <div className="text-center">
          <p className="text-white/80 text-sm mb-2">Your Referral Code</p>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4 mb-4">
            <p className="text-white text-3xl font-bold tracking-widest">
              {stats.referral_code}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={copyReferralLink}
              className="flex-1 bg-white text-blue-600 font-semibold py-3 px-4 rounded-lg 
                       hover:bg-blue-50 transition-colors duration-200 active:scale-95"
            >
              {copied ? '✓ Copied!' : 'Copy Link'}
            </button>
            <button
              onClick={() => setShowShareModal(true)}
              className="flex-1 bg-white/10 backdrop-blur-sm text-white font-semibold py-3 px-4 
                       rounded-lg hover:bg-white/20 transition-colors duration-200 active:scale-95"
            >
              Share
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Total Referrals</p>
          <p className="text-white text-3xl font-bold">{stats.total_referrals}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4">
          <p className="text-gray-400 text-sm mb-1">Active Referrals</p>
          <p className="text-green-400 text-3xl font-bold">{stats.active_referrals}</p>
        </div>
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 col-span-2">
          <p className="text-gray-400 text-sm mb-1">Total Bonus Points</p>
          <p className="text-yellow-400 text-3xl font-bold">
            {stats.total_bonus_points.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Bonus Tier Card */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">Current Tier</p>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${tierInfo.color}`}></div>
              <p className="text-white text-xl font-bold">{tierInfo.name}</p>
            </div>
          </div>
          {stats.bonus_multiplier > 0 && (
            <div className="text-right">
              <p className="text-gray-400 text-sm">Multiplier</p>
              <p className="text-yellow-400 text-2xl font-bold">
                {stats.bonus_multiplier}x
              </p>
            </div>
          )}
        </div>
        <p className="text-gray-300 text-sm mb-3">{tierInfo.description}</p>
        <div className="bg-gray-700/50 rounded-lg p-3">
          <p className="text-gray-400 text-xs mb-1">Next Tier</p>
          <p className="text-gray-200 text-sm">{tierInfo.next}</p>
        </div>
      </div>

      {/* Referees List */}
      {referees.length > 0 && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
          <h3 className="text-white text-lg font-bold mb-4">Your Referrals</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {referees.map((referee, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3"
              >
                <div className="flex-1">
                  <p className="text-white font-mono text-sm">
                    {referee.wallet_address}
                  </p>
                  <p className="text-gray-400 text-xs">
                    {referee.is_active ? (
                      <>
                        {referee.total_trades_count} trades · {referee.points_generated} pts
                      </>
                    ) : (
                      'Not active yet'
                    )}
                  </p>
                </div>
                <div>
                  {referee.is_active ? (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded">
                      Active
                    </span>
                  ) : (
                    <span className="bg-gray-500/20 text-gray-400 text-xs px-2 py-1 rounded">
                      Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Share Modal */}
      {showShareModal && stats && (
        <ShareReferralModal
          referralCode={stats.referral_code}
          referralLink={stats.referral_link}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
}

