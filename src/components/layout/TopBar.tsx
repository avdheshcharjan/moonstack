'use client';

import { CartModal } from '@/src/components/cart/CartModal';
import { cartStorage } from '@/src/utils/cartStorage';
import React, { useEffect, useState } from 'react';

interface TopBarProps {
  // Removed onProfileClick prop
}

const TopBar: React.FC<TopBarProps> = () => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Initial load
    updateCartCount();

    // Listen for storage changes
    const handleStorageChange = () => {
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

  const updateCartCount = () => {
    setCartCount(cartStorage.getCount());
  };

  const handleCartUpdate = () => {
    updateCartCount();
    // Dispatch custom event for other components
    window.dispatchEvent(new Event('cartUpdated'));
  };
  return (
    <div className="fixed top-0 left-0 right-0  z-50 border-b border-slate-800/50 touch-none pointer-events-auto h-screen">
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
