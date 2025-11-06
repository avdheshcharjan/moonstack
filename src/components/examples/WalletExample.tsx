'use client';

import React from 'react';
import { useWallet } from '@/src/contexts/WalletContext';
import { useOnchainKit } from '@/src/hooks/useOnchainKit';
import { 
  Identity, 
  Avatar, 
  Name, 
  Address 
} from '@coinbase/onchainkit/identity';

/**
 * Example component demonstrating OnchainKit wallet integration
 * 
 * This shows:
 * 1. How to use the useWallet hook (backward compatible)
 * 2. How to use the useOnchainKit hook (new features)
 * 3. How to use OnchainKit identity components
 */
export function WalletExample() {
  // Method 1: Using the existing wallet hook (backward compatible)
  const { walletAddress, chainId, isConnecting, connectWallet, disconnectWallet } = useWallet();

  // Method 2: Using the new OnchainKit hook (recommended for new features)
  const { 
    address, 
    isConnected, 
    balance, 
    balanceSymbol,
    isOnBase,
  } = useOnchainKit();

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-6">
      <div className="bg-slate-800 rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-bold text-white">Wallet Status</h2>
        
        {/* Connection Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Connected:</span>
            <span className="text-white font-mono">
              {isConnected ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Loading:</span>
            <span className="text-white font-mono">
              {isConnecting ? '⏳ Yes' : '✅ No'}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-slate-400">On Base:</span>
            <span className="text-white font-mono">
              {isOnBase ? '✅ Yes' : '❌ No'}
            </span>
          </div>
        </div>

        {/* Wallet Address */}
        {walletAddress && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Address:</span>
              <span className="text-white font-mono text-sm">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Chain ID:</span>
              <span className="text-white font-mono">{chainId}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Balance:</span>
              <span className="text-white font-mono">
                {balance ? `${parseFloat(balance).toFixed(4)} ${balanceSymbol}` : 'Loading...'}
              </span>
            </div>
          </div>
        )}

        {/* OnchainKit Identity Component Example */}
        {address && (
          <div className="border-t border-slate-700 pt-4">
            <h3 className="text-lg font-semibold text-white mb-2">Identity Display</h3>
            <Identity 
              address={address} 
              className="bg-slate-700 rounded-lg p-4"
              hasCopyAddressOnClick
            >
              <Avatar className="mr-2" />
              <div className="flex flex-col">
                <Name className="text-white font-semibold" />
                <Address className="text-slate-400 text-sm" />
              </div>
            </Identity>
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-slate-700 pt-4 space-y-2">
          {!isConnected ? (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          ) : (
            <button
              onClick={disconnectWallet}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
            >
              Disconnect Wallet
            </button>
          )}
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="bg-slate-800 rounded-lg p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">How to Use</h2>
        <div className="text-slate-300 space-y-2 text-sm">
          <p>
            <strong className="text-white">Method 1 (Backward Compatible):</strong><br />
            Use <code className="bg-slate-700 px-1 py-0.5 rounded">useWallet()</code> hook 
            for basic wallet info (address, chainId, connect/disconnect)
          </p>
          <p>
            <strong className="text-white">Method 2 (New Features):</strong><br />
            Use <code className="bg-slate-700 px-1 py-0.5 rounded">useOnchainKit()</code> hook 
            for advanced features (balance, signing, chain validation)
          </p>
          <p>
            <strong className="text-white">Identity Components:</strong><br />
            Use OnchainKit components like <code className="bg-slate-700 px-1 py-0.5 rounded">Identity</code>, 
            <code className="bg-slate-700 px-1 py-0.5 rounded">Avatar</code>, 
            <code className="bg-slate-700 px-1 py-0.5 rounded">Name</code>, 
            <code className="bg-slate-700 px-1 py-0.5 rounded">Address</code> for rich UI
          </p>
        </div>
      </div>
    </div>
  );
}

