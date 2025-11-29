import MyBets from '@/src/components/bets/MyBets';
import FAQ from '@/src/components/faq/FAQ';
import BottomNav from '@/src/components/layout/BottomNav';
import TopBar from '@/src/components/layout/TopBar';
import SwipeView from '@/src/components/market/SwipeView';
import BetSettings from '@/src/components/settings/BetSettings';
import Leaderboard from '@/src/components/leaderboard/Leaderboard';
import ReferralDashboard from '@/src/components/referrals/ReferralDashboard';
import SignInModal from '@/src/components/auth/SignInModal';
import { OnboardingModal } from '@/src/components/onboarding';
import { useWallet } from '@/src/hooks/useWallet';
import { useOnboarding } from '@/src/hooks/useOnboarding';
import { sdk } from '@farcaster/miniapp-sdk';
import { useEffect, useState } from 'react';

const Moonstack = () => {
  const [mounted, setMounted] = useState(false);

  // Wallet state - using hook
  const { walletAddress, connectWallet } = useWallet();

  // Onboarding state
  const {
    shouldShowOnboarding,
    markOnboardingAsSeen,
    setDontShowAgain,
    isLoading: onboardingLoading,
  } = useOnboarding();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Referral/invite code state
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  // Debug: Log wallet state changes
  useEffect(() => {
    console.log('🔍 Moonstack wallet state:', { walletAddress });
  }, [walletAddress]);

  // Check URL for referral code on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !mounted) return;

    const params = new URLSearchParams(window.location.search);
    const refCode = params.get('ref');

    if (refCode) {
      console.log('🔗 Found referral code in URL:', refCode);
      setInviteCode(refCode);
      localStorage.setItem('pendingReferralCode', refCode);
      
      // Clean URL (remove ref param) 
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    } else {
      // Check localStorage for pending code
      const pendingCode = localStorage.getItem('pendingReferralCode');
      if (pendingCode) {
        console.log('💾 Found pending referral code in storage:', pendingCode);
        setInviteCode(pendingCode);
      }
    }
  }, [mounted]);

  // Auto-generate referral code and apply invite code when wallet connects
  useEffect(() => {
    if (walletAddress && mounted) {
      console.log('💫 Wallet connected, ensuring referral code exists...');
      
      // 1. Ensure user has their own referral code
      fetch('/api/referrals/ensure-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: walletAddress }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.code) {
            console.log(`✅ Referral code ${data.isNew ? 'generated' : 'verified'}: ${data.code}`);
          } else {
            console.error('❌ Failed to ensure referral code:', data.error);
          }
        })
        .catch(err => {
          console.error('❌ Error ensuring referral code:', err);
        });

      // 2. Apply invite code if present
      const pendingCode = localStorage.getItem('pendingReferralCode') || inviteCode;
      
      if (pendingCode) {
        console.log('🎁 Applying invite code:', pendingCode);
        
        fetch('/api/referrals/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            code: pendingCode,
            referee_wallet: walletAddress
          })
        })
          .then(res => {
            console.log('📊 Validation API response status:', res.status);
            return res.json();
          })
          .then(data => {
            console.log('📊 Validation API response data:', data);
            
            if (data.valid) {
              console.log('✅ Invite code applied successfully!');
              console.log('✅ Referral saved to database:', {
                code: pendingCode,
                referee: walletAddress,
                referrer: data.referrer_wallet
              });
              // Show success toast (you can add toast notification here)
              localStorage.removeItem('pendingReferralCode');
              setInviteCode(null);
            } else {
              console.error('❌ Validation failed:', {
                error: data.error,
                details: data.details,
                code: data.code
              });
              // Show error toast but continue (code is optional)
              localStorage.removeItem('pendingReferralCode');
              setInviteCode(null);
            }
          })
          .catch(err => {
            console.error('❌ Error applying invite code:', err);
            // Clear even on error
            localStorage.removeItem('pendingReferralCode');
            setInviteCode(null);
          });
      }
    }
  }, [walletAddress, mounted, inviteCode]);

  // Page navigation
  const [currentView, setCurrentView] = useState<'play' | 'mybets' | 'referrals' | 'leaders' | 'faq'>('play');

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
              <SignInModal
                onConnect={connectWallet}
                initialInviteCode={inviteCode}
                onInviteCodeChange={setInviteCode}
              />
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

        {/* Referrals View */}
        {currentView === 'referrals' && (
          <div className="max-w-2xl mx-auto">
            {walletAddress ? (
              <ReferralDashboard walletAddress={walletAddress} />
            ) : (
              <div className="flex items-center justify-center min-h-[600px]">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-12 text-center max-w-md">
                  <div className="text-6xl mb-4">🔗</div>
                  <div className="text-2xl font-bold text-white mb-2">Connect Your Wallet</div>
                  <div className="text-slate-400 mb-6">Connect to view your referral dashboard</div>
                  <SignInModal
                    onConnect={connectWallet}
                  />
                </div>
              </div>
            )}
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

      {/* Top Bar - Pass wallet address */}
      <TopBar walletAddress={walletAddress} />

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
