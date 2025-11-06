'use client';

import { useState, useEffect } from 'react';
import PointsDisplay from '@/src/components/points/PointsDisplay';
import PointsHistory from '@/src/components/points/PointsHistory';
import SeasonTracker from '@/src/components/leaderboard/SeasonTracker';
import { useWallet } from '@/src/hooks/useWallet';

export default function PointsPage() {
  const { address, isConnected } = useWallet();
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#000d1d] to-[#001a33] flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 text-center max-w-md">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-white text-xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-gray-400 text-sm">
            Please connect your wallet to view your points and rewards
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000d1d] to-[#001a33] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-blue-500/20 px-4 py-6">
        <h1 className="text-white text-2xl font-bold mb-1">Your Points</h1>
        <p className="text-gray-400 text-sm">Track your rewards and season progress</p>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Season Tracker */}
        <SeasonTracker />

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all
              ${activeTab === 'overview' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all
              ${activeTab === 'history' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
              }`}
          >
            History
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' ? (
          <PointsDisplay walletAddress={address} />
        ) : (
          <PointsHistory walletAddress={address} />
        )}
      </div>
    </div>
  );
}

