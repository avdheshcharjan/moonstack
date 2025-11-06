'use client';

import { useState, useEffect } from 'react';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import InviteCodeInput from './InviteCodeInput';

interface SignInModalProps {
  onConnect: () => void;
  initialInviteCode?: string | null;
  onInviteCodeChange?: (code: string) => void;
}

export default function SignInModal({ 
  onConnect, 
  initialInviteCode,
  onInviteCodeChange 
}: SignInModalProps) {
  const [inviteCode, setInviteCode] = useState(initialInviteCode || '');
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [isCodeValid, setIsCodeValid] = useState(false);

  // Update invite code when prop changes
  useEffect(() => {
    if (initialInviteCode) {
      console.log('📝 SignInModal: Received initial invite code:', initialInviteCode);
      setInviteCode(initialInviteCode);
      setShowInviteInput(true);
      
      // Save to localStorage immediately
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingReferralCode', initialInviteCode);
        console.log('💾 SignInModal: Saved to localStorage:', initialInviteCode);
      }
    }
  }, [initialInviteCode]);

  // Notify parent of code changes and save to storage
  useEffect(() => {
    if (inviteCode) {
      console.log('📝 SignInModal: Invite code changed:', inviteCode);
      onInviteCodeChange?.(inviteCode);
      
      // Save to localStorage whenever code changes
      if (typeof window !== 'undefined') {
        localStorage.setItem('pendingReferralCode', inviteCode);
        console.log('💾 SignInModal: Updated localStorage:', inviteCode);
      }
    }
  }, [inviteCode, onInviteCodeChange]);

  const handleConnect = () => {
    console.log('🔐 Sign in clicked with invite code:', inviteCode || 'none');
    onConnect();
  };

  return (
    <div className="flex items-center justify-center min-h-[600px] px-4">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 sm:p-12 text-center max-w-md w-full">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-white mb-3">
          Welcome to Moonstack
        </h1>
        
        {/* Subtitle */}
        <p className="text-slate-400 mb-6">
          Sign in with Base Account for instant smart wallet access
        </p>

        {/* Invite Code Section */}
        {!showInviteInput ? (
          <button
            onClick={() => setShowInviteInput(true)}
            className="text-sm text-blue-400 hover:text-blue-300 mb-6 underline transition-colors"
          >
            Have an invite code?
          </button>
        ) : (
          <div className="mb-6 space-y-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Invite Code <span className="text-slate-500">(Optional)</span>
            </label>
            <InviteCodeInput
              value={inviteCode}
              onChange={setInviteCode}
              onValidChange={setIsCodeValid}
            />
            {inviteCode && isCodeValid && (
              <p className="text-xs text-green-400 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Valid invite code
              </p>
            )}
          </div>
        )}

        {/* Sign In Button */}
        <div className="mb-6">
          <SignInWithBaseButton
            align="center"
            variant="solid"
            colorScheme="dark"
            onClick={handleConnect}
          />
        </div>

        {/* Info Cards */}
        <div className="mt-8 space-y-3 text-left">
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Gasless Trading</p>
              <p className="text-slate-400 text-xs">Zero gas fees on all transactions</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Earn Points</p>
              <p className="text-slate-400 text-xs">Points convert to future airdrops</p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex-shrink-0 mt-0.5">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-white text-sm font-semibold">Compete on Leaderboard</p>
              <p className="text-slate-400 text-xs">Climb ranks and earn recognition</p>
            </div>
          </div>
        </div>

        {/* Optional: Skip without code */}
        {showInviteInput && inviteCode && (
          <button
            onClick={() => {
              setInviteCode('');
              setShowInviteInput(false);
            }}
            className="mt-4 text-xs text-slate-500 hover:text-slate-400 transition-colors"
          >
            Continue without invite code
          </button>
        )}
      </div>
    </div>
  );
}

