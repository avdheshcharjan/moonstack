'use client';

import { useEffect } from 'react';
import ReferralDashboard from '@/src/components/referrals/ReferralDashboard';
import { useWallet } from '@/src/hooks/useWallet';

export default function ReferralsPage() {
  const { address, isConnected } = useWallet();

  // Generate referral code when user connects
  useEffect(() => {
    if (address) {
      generateReferralCode();
    }
  }, [address]);

  const generateReferralCode = async () => {
    try {
      await fetch('/api/referrals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet_address: address }),
      });
    } catch (error) {
      console.error('Error generating referral code:', error);
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#000d1d] to-[#001a33] flex items-center justify-center p-4">
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 text-center max-w-md">
          <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <h2 className="text-white text-xl font-bold mb-2">Wallet Not Connected</h2>
          <p className="text-gray-400 text-sm">
            Please connect your wallet to access your referral dashboard
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000d1d] to-[#001a33] pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-purple-500/20 px-4 py-6">
        <h1 className="text-white text-2xl font-bold mb-1">Referrals</h1>
        <p className="text-gray-400 text-sm">Share your code and earn bonus points</p>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <ReferralDashboard walletAddress={address} />
      </div>
    </div>
  );
}

