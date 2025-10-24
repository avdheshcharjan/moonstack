'use client';

import { CartModal } from '@/src/components/cart/CartModal';
import { cartStorage } from '@/src/utils/cartStorage';
import { useWallet } from '@/src/hooks/useWallet';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { getBaseAccountSDK } from '@/src/lib/smartAccount';
import React, { useEffect, useState } from 'react';

interface TopBarProps {
  // Removed onProfileClick prop
}

const TopBar: React.FC<TopBarProps> = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [showWalletMenu, setShowWalletMenu] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { walletAddress, disconnectWallet, connectWallet } = useWallet();

  // Handle client-side mounting
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Poll for wallet connection after sign-in button is clicked
  useEffect(() => {
    if (!walletAddress && isMounted) {
      const pollInterval = setInterval(() => {
        connectWallet();
      }, 1000);

      return () => clearInterval(pollInterval);
    }
  }, [walletAddress, isMounted, connectWallet]);

  useEffect(() => {
    const updateCartCount = () => {
      const count = cartStorage.getCount();
      console.log('[TopBar] Updating cart count:', { count });
      setCartCount(count);
    };

    // Initial load
    console.log('[TopBar] Initial cart count load');
    updateCartCount();

    // Listen for storage changes
    const handleStorageChange = () => {
      console.log('[TopBar] Cart storage changed event received');
      updateCartCount();
    };

    window.addEventListener('storage', handleStorageChange);

    // Custom event for same-window updates
    window.addEventListener('cartUpdated', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleStorageChange);
    };
  }, []);

  const handleCartUpdate = () => {
    setCartCount(cartStorage.getCount());
    // Dispatch custom event for other components
    window.dispatchEvent(new Event('cartUpdated'));
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setShowWalletMenu(false);
  };

  const handleSignIn = async () => {
    console.log('Sign in with Base clicked');

    try {
      // Initialize SDK and trigger wallet connection
      const sdk = getBaseAccountSDK();
      const provider = sdk.getProvider();

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
  return (
    <div className={`fixed top-0 left-0 right-0  z-50 border-b border-slate-800/50 touch-none pointer-events-auto 
    ${isCartOpen ? 'h-screen' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
              <img
                src="/logo.png"
                alt="MOONSTACK"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white text-2xl font-black tracking-tight">Moonstack</span>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-3">
            {/* Wallet Button */}
            {isMounted && (
              <>
                {walletAddress ? (
                  <div className="relative">
                    <button
                      onClick={() => setShowWalletMenu(!showWalletMenu)}
                      className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-lg font-medium text-sm transition-all shadow-lg hover:shadow-xl"
                    >
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span>{truncateAddress(walletAddress)}</span>
                    </button>

                    {/* Wallet Menu Dropdown */}
                    {showWalletMenu && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowWalletMenu(false)}
                        />
                        {/* Menu */}
                        <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 overflow-hidden">
                          <div className="p-4 border-b border-slate-700">
                            <p className="text-xs text-gray-400 mb-1">Connected Wallet</p>
                            <p className="text-white font-mono text-sm break-all">{walletAddress}</p>
                          </div>
                          <button
                            onClick={handleDisconnect}
                            className="w-full px-4 py-3 text-left text-red-400 hover:bg-slate-700 transition-colors flex items-center gap-2"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Disconnect
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="scale-90">
                    <SignInWithBaseButton
                      align="center"
                      variant="solid"
                      colorScheme="dark"
                      onClick={handleSignIn}
                    />
                  </div>
                )}
              </>
            )}

            {/* Cart Icon */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 text-gray-300 hover:text-white transition-colors"
              aria-label="Shopping cart"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Cart Modal */}
      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onCartUpdate={handleCartUpdate}
      />
    </div>
  );
};

export default TopBar;
