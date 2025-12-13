import MyBets from '@/components/bets/MyBets';
import FAQ from '@/components/faq/FAQ';
import BottomNav from '@/components/layout/BottomNav';
import TopBar from '@/components/layout/TopBar';
import Leaderboard from '@/components/leaderboard/Leaderboard';
import SwipeView from '@/components/market/SwipeView';
import { OnboardingModal } from '@/components/onboarding';
import BetSettings from '@/components/settings/BetSettings';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useWallet } from '@/hooks/useWallet';
import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect, useState } from 'react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

const Moonstack = () => {
  const [mounted, setMounted] = useState(false);

  // Wallet state - using hook
  const { walletAddress } = useWallet();

  // Onboarding state
  const {
    shouldShowOnboarding,
    markOnboardingAsSeen,
    setDontShowAgain,
    isLoading: onboardingLoading,
  } = useOnboarding();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Debug: Log wallet state changes
  useEffect(() => {
    console.log('🔍 Moonstack wallet state:', { walletAddress });
  }, [walletAddress]);

  // Page navigation
  const [currentView, setCurrentView] = useState<'play' | 'mybets' | 'moonai' | 'leaders' | 'faq'>('play');

  // Handle hydration and MiniApp SDK ready
  useEffect(() => {
    setMounted(true);
    sdk.actions.ready();
  }, []);

  // Show onboarding on first visit after wallet connects
  useEffect(() => {
    if (mounted && !onboardingLoading && walletAddress && shouldShowOnboarding()) {
      // Small delay to ensure smooth transition after wallet connection
      const timer = setTimeout(() => {
        setShowOnboardingModal(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mounted, onboardingLoading, walletAddress, shouldShowOnboarding]);

  // Prevent hydration mismatch - return null during SSR
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000d1d] via-slate-900 to-[#000d1d] overflow-x-hidden">


      {/* Main Content */}
      <div className="pt-16 pb-20 px-2 max-w-7xl mx-auto">
        {/* Play View */}
        {currentView === 'play' && (
          <>
            {!walletAddress ? (
              <div className="flex items-center justify-center min-h-[600px]">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-12 text-center max-w-md">
                  <div className="text-6xl mb-4">🔐</div>
                  <div className="text-2xl font-bold text-white mb-2">Connect Your Wallet</div>
                  <div className="text-slate-400 mb-6">Sign in with Base Account for instant smart wallet access</div>

                  <div className="flex justify-center">
                    <Wallet>
                      <ConnectWallet className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors">
                        <Avatar className="h-6 w-6" />
                        <Name />
                      </ConnectWallet>
                      <WalletDropdown>
                        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                          <Avatar className="w-8 h-8" />
                          <Name />
                          <Address className="text-slate-400" />
                          <EthBalance />
                        </Identity>
                        <WalletDropdownBasename />
                        <WalletDropdownDisconnect />
                      </WalletDropdown>
                    </Wallet>
                  </div>
                </div>
              </div>
            ) : (
              <SwipeView walletAddress={walletAddress} />
            )}
          </>
        )}

        {/* My Bets View */}
        {currentView === 'mybets' && (
          <div className="pt-4 space-y-6">
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
          <Leaderboard currentWallet={walletAddress} />
        )}

        {/* FAQ View */}
        {currentView === 'faq' && <FAQ />}

      </div>

      {/* Bottom Navigation */}
      <BottomNav activeTab={currentView} onTabChange={(tab) => setCurrentView(tab as typeof currentView)} />

      {/* Top Bar - Wallet connection handled by OnchainKit */}
      <TopBar />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onComplete={markOnboardingAsSeen}
        onDontShowAgain={setDontShowAgain}
      />
    </div>
  );
};

export default Moonstack;
