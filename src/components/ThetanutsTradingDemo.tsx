import React, { useState, useEffect } from 'react';
import { useWallet } from '@/src/hooks/useWallet';
import SwipeView from '@/src/components/market/SwipeView';
import BetSettings from '@/src/components/settings/BetSettings';
import MyBets from '@/src/components/bets/MyBets';
import FAQ from '@/src/components/faq/FAQ';
import TopBar from '@/src/components/layout/TopBar';
import BottomNav from '@/src/components/layout/BottomNav';

const ThetanutsTradingDemo = () => {
  const [mounted, setMounted] = useState(false);

  // Wallet state - using hook
  const { walletAddress, chainId, isConnecting, connectWallet, disconnectWallet } = useWallet();

  // Page navigation
  const [currentView, setCurrentView] = useState<'play' | 'mybets' | 'moonai' | 'leaders' | 'faq'>('play');

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch - return null during SSR
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000d1d] via-slate-900 to-[#000d1d]">
      {/* Top Bar */}
      <TopBar onProfileClick={() => setCurrentView('mybets')} />

      {/* Main Content */}
      <div className="pt-20 pb-24 px-4 max-w-7xl mx-auto">
        {/* Play View */}
        {currentView === 'play' && (
          <>
            {!walletAddress ? (
              <div className="flex items-center justify-center min-h-[600px]">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-12 text-center max-w-md">
                  <div className="text-6xl mb-4">🔐</div>
                  <div className="text-2xl font-bold text-white mb-2">Connect Your Wallet</div>
                  <div className="text-slate-400 mb-6">Please connect your wallet to start trading</div>
                  <button
                    onClick={connectWallet}
                    disabled={isConnecting}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-4 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 shadow-lg"
                  >
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </button>
                </div>
              </div>
            ) : (
              <SwipeView walletAddress={walletAddress} />
            )}
          </>
        )}

        {/* My Bets View */}
        {currentView === 'mybets' && (
          <div className="space-y-6">
            <BetSettings walletAddress={walletAddress} />
            <MyBets walletAddress={walletAddress} />
          </div>
        )}

        {/* Moon AI View */}
        {currentView === 'moonai' && (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <div className="text-6xl mb-4">🚀</div>
              <div className="text-2xl font-bold text-white mb-2">Moon AI</div>
              <div className="text-slate-400">Coming soon...</div>
            </div>
          </div>
        )}

        {/* Leaders View */}
        {currentView === 'leaders' && (
          <div className="flex items-center justify-center min-h-[600px]">
            <div className="text-center">
              <div className="text-6xl mb-4">🏆</div>
              <div className="text-2xl font-bold text-white mb-2">Leaderboard</div>
              <div className="text-slate-400">Coming soon...</div>
            </div>
          </div>
        )}

        {/* FAQ View */}
        {currentView === 'faq' && <FAQ />}

      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={currentView} onTabChange={(tab) => setCurrentView(tab as typeof currentView)} />
    </div>
  );
};

export default ThetanutsTradingDemo;
