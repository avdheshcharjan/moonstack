/**
 * CartItemComponent - Individual Cart Item Display
 *
 * Shows option details with remove button
 */

'use client';

import type { CartItemComponentProps } from '@/src/types/cart';

export function CartItemComponent({
  item,
  onRemove,
  className = '',
}: CartItemComponentProps): JSX.Element {
  const { metadata } = item;

  return (
    <div
      className={`bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left side - Option details */}
        <div className="flex-1 min-w-0">
          {/* Market name */}
          <h3 className="font-semibold text-white text-sm truncate">
            {metadata.marketName}
          </h3>

          {/* Action badge */}
          <div className="mt-1">
            <span
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${metadata.action === 'yes'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
                }`}
            >
              {metadata.action === 'yes' ? '✓ YES' : '✗ NO'} ({metadata.optionType})
            </span>
          </div>

          {/* Details grid */}
          <div className="mt-2 space-y-1 text-xs text-gray-400">
            <div className="flex justify-between">
              <span>Strike:</span>
              <span className="text-white">{metadata.strikePrice}</span>
            </div>
            <div className="flex justify-between">
              <span>Expiry:</span>
              <span className="text-white">{metadata.expiryFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span>Contracts:</span>
              <span className="text-white">
                {(Number(metadata.numContracts) / 1e6).toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Price per contract:</span>
              <span className="text-white">${metadata.pricePerContract}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="mt-3 pt-2 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Amount:</span>
              <span className="text-lg font-bold text-white">
                ${metadata.usdcAmountFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Right side - Remove button */}
        <button
          onClick={() => onRemove(item.id)}
          className="flex-shrink-0 text-gray-400 hover:text-red-400 transition-colors p-1"
          aria-label="Remove from cart"
        >
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
