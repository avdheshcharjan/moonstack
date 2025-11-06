'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@/src/hooks/useWallet';

export default function ReferralLandingPage() {
  const params = useParams();
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const code = params.code as string;
  
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Auto-apply referral code if wallet is connected
    if (isConnected && address && code) {
      applyReferralCode();
    }
  }, [isConnected, address, code]);

  const applyReferralCode = async () => {
    if (!address) return;
    
    try {
      setValidating(true);
      setError(null);
      
      const response = await fetch('/api/referrals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code,
          referee_wallet: address,
        }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setSuccess(true);
        // Redirect to home after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setError(data.error || 'Failed to apply referral code');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000d1d] to-[#001a33] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Hero Card */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-2xl p-8 text-center mb-6 shadow-2xl">
          <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
          </div>
          <h1 className="text-white text-3xl font-bold mb-2">Welcome to Moonstack!</h1>
          <p className="text-white/80 text-sm mb-4">
            You've been invited with referral code
          </p>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3">
            <p className="text-white text-2xl font-bold tracking-widest">{code}</p>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-gray-900/50 backdrop-blur-sm rounded-xl p-6">
          {!isConnected ? (
            <div className="text-center">
              <p className="text-white font-semibold mb-4">Connect your wallet to get started</p>
              <p className="text-gray-400 text-sm mb-4">
                Your referral code will be automatically applied when you connect
              </p>
              <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                <p className="text-blue-300 text-xs">
                  💡 Complete your first trade to activate the referral and start earning bonus points!
                </p>
              </div>
            </div>
          ) : validating ? (
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-white">Applying referral code...</p>
            </div>
          ) : success ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Referral Applied!</h3>
              <p className="text-gray-400 text-sm mb-4">
                Complete your first trade to activate the referral bonus
              </p>
              <p className="text-gray-500 text-xs">Redirecting to home...</p>
            </div>
          ) : error ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h3 className="text-white text-xl font-bold mb-2">Error</h3>
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                onClick={() => router.push('/')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg 
                         transition-colors duration-200"
              >
                Continue to Moonstack
              </button>
            </div>
          ) : null}
        </div>

        {/* Features */}
        <div className="mt-6 space-y-3">
          <div className="flex items-start gap-3 text-sm">
            <div className="bg-blue-500/20 p-2 rounded-lg">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">Gasless Trading</p>
              <p className="text-gray-400 text-xs">Zero gas fees on all transactions</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="bg-green-500/20 p-2 rounded-lg">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">Earn Points</p>
              <p className="text-gray-400 text-xs">Points convert to future airdrops</p>
            </div>
          </div>
          <div className="flex items-start gap-3 text-sm">
            <div className="bg-purple-500/20 p-2 rounded-lg">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-semibold">Compete on Leaderboard</p>
              <p className="text-gray-400 text-xs">Climb ranks and earn recognition</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

