/**
 * CartButton - Floating Cart Button with Badge
 *
 * Displays a shopping cart icon with item count badge
 * Opens the cart drawer when clicked
 */

'use client';

import { useCartItemCount } from '@/src/contexts/CartContext';

interface CartButtonProps {
  onClick: () => void;
  className?: string;
}

export function CartButton({ onClick, className = '' }: CartButtonProps): JSX.Element {
  const itemCount = useCartItemCount();

  if (itemCount === 0) {
    return <></>;
  }

  return (
    <button
      onClick={onClick}
      className={`fixed top-2 right-3 z-[100] bg-blue-600 text-white rounded-full p-3 shadow-lg hover:bg-blue-700 transition-all duration-200 hover:scale-110 active:scale-95 ${className}`}
      aria-label={`Open cart with ${itemCount} items`}
    >
      <div className="relative">
        {/* Cart Icon */}
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>

        {/* Badge */}
        {itemCount > 0 && (
          <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {itemCount > 9 ? '9+' : itemCount}
          </div>
        )}
      </div>
    </button>
  );
}
