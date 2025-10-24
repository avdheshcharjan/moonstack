import MyBets from '@/src/components/bets/MyBets';
import FAQ from '@/src/components/faq/FAQ';
import BottomNav from '@/src/components/layout/BottomNav';
import TopBar from '@/src/components/layout/TopBar';
import SwipeView from '@/src/components/market/SwipeView';
import BetSettings from '@/src/components/settings/BetSettings';
import { useWallet } from '@/src/hooks/useWallet';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { getBaseAccountSDK } from '@/src/lib/smartAccount';
import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect, useState } from 'react';

const Moonstack = () => {
  const [mounted, setMounted] = useState(false);

  // Wallet state - using hook
  const { walletAddress, connectWallet } = useWallet();

  // Page navigation
  const [currentView, setCurrentView] = useState<'play' | 'mybets' | 'moonai' | 'leaders' | 'faq'>('play');

  // Swipe instructions modal state (persists during session)
  const [hasSeenSwipeInstructions, setHasSeenSwipeInstructions] = useState(false);

  // Handle hydration and MiniApp SDK ready
  useEffect(() => {
    setMounted(true);
    sdk.actions.ready();
  }, []);

  const handleSignIn = async () => {
    console.log('Main page sign in clicked');

    try {
      // Initialize SDK and trigger wallet connection
      const baseSDK = getBaseAccountSDK();
      const provider = baseSDK.getProvider();

      // Generate a unique nonce for security
      const nonce = Math.random().toString(36).substring(2, 15);

      // Request account connection via wallet_connect with SIWE
      const response = await provider.request({
        method: 'wallet_connect',
        params: [{
          version: '1',
          capabilities: {
            signInWithEthereum: {
              nonce: nonce,
              chainId: '0x2105', // Base Mainnet
            }
          }
        }],
      });

      console.log('Base Account connection response:', response);

      // After connection, check for the account
      await connectWallet();
    } catch (error) {
      console.error('Sign in failed:', error);
    }
  };

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

                  <SignInWithBaseButton
                    align="center"
                    variant="solid"
                    colorScheme="dark"
                    onClick={handleSignIn}
                  />
                </div>
              </div>
            ) : (
              <SwipeView 
                walletAddress={walletAddress} 
                hasSeenSwipeInstructions={hasSeenSwipeInstructions}
                onSwipeInstructionsSeen={() => setHasSeenSwipeInstructions(true)}
              />
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

      {/* Top Bar */}
      <TopBar />
    </div>
  );
};

export default Moonstack;
