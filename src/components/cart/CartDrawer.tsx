/**
 * CartDrawer - Main Cart UI Component
 *
 * Displays cart items in a slide-out drawer with:
 * - List of pending transactions
 * - Total USDC amount
 * - Batch execution button
 * - Loading states
 * - Error handling
 */

'use client';

import { useCart, useCartTotal } from '@/contexts/CartContext';
import type { CartComponentProps } from '@/types/cart';
import { useState } from 'react';
import { Address } from 'viem';
import { CartItemComponent } from './CartItemComponent';

interface CartDrawerProps extends CartComponentProps {
  onSuccess?: (transactionHash: string) => void;
  walletAddress: string
}

export function CartDrawer({
  isOpen = false,
  onClose,
  onSuccess,
  className = '',
  walletAddress
}: CartDrawerProps): JSX.Element {
  const {
    items,
    removeItem,
    clearCart,
    executeBatch,
    isExecuting,
    executionStatus,
    error,
  } = useCart();
  const cartTotal = useCartTotal();

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const handleExecuteBatch = async () => {
    console.log(isExecuting);
    if (!walletAddress) {
      showErrorToast('Please connect your wallet first');
      return;
    }

    if (items.length === 0) {
      showErrorToast('Cart is empty');
      return;
    }

    try {
      const result = await executeBatch(walletAddress as Address);

      if (result.status === 'CONFIRMED' && result.transactionHash) {
        showSuccessToast('Batch executed successfully!');
        onSuccess?.(result.transactionHash);
        onClose?.();
      } else {
        showErrorToast(result.error || 'Batch execution failed');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      showErrorToast(errorMsg);
    }
  };

  const showSuccessToast = (message: string) => {
    setToastMessage(message);
    setToastType('success');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const showErrorToast = (message: string) => {
    setToastMessage(message);
    setToastType('error');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 5000);
  };

  const getStatusMessage = () => {
    if (!executionStatus) return null;

    const messages = {
      preparing: 'Preparing batch transaction...',
      checking_balance: 'Checking USDC balance...',
      approving: 'Approving USDC...',
      executing: 'Executing batch...',
      confirming: 'Confirming transaction...',
    };

    return messages[executionStatus];
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-md bg-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out z-[100] ${isOpen ? 'translate-x-0' : 'translate-x-full'
          } ${className}`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <h2 className="text-xl font-bold text-white">
              Transaction Cart ({items.length})
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Close cart"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Cart items list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <svg
                  className="w-16 h-16 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                <p className="text-center">Your cart is empty</p>
                <p className="text-sm text-center mt-1">
                  Add items by swiping on markets
                </p>
              </div>
            ) : (
              items.map((item) => (
                <CartItemComponent
                  key={item.id}
                  item={item}
                  onRemove={removeItem}
                />
              ))
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="border-t border-gray-800 p-4 space-y-4">
              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total USDC Required:</span>
                <span className="text-2xl font-bold text-white">{cartTotal}</span>
              </div>

              {/* Status message */}
              {isExecuting && executionStatus && (
                <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-500 border-t-transparent" />
                    <span className="text-sm text-blue-400">
                      {getStatusMessage()}
                    </span>
                  </div>
                </div>
              )}

              {/* Error message */}
              {error && !isExecuting && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2">
                <button
                  onClick={handleExecuteBatch}
                  // disabled={isExecuting || items.length === 0 || !walletAddress}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isExecuting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Approve All ({items.length})</span>
                    </>
                  )}
                </button>

                <button
                  onClick={clearCart}
                  disabled={isExecuting || items.length === 0}
                  className="w-full bg-gray-800 hover:bg-gray-700 disabled:bg-gray-800 disabled:cursor-not-allowed text-gray-300 font-semibold py-2 rounded-lg transition-colors text-sm"
                >
                  Clear Cart
                </button>
              </div>

              {/* Info text */}
              <p className="text-xs text-gray-500 text-center">
                All transactions will be executed in a single batch.
                {items.length > 1 && ` Saving ${items.length} separate transactions!`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
          <div
            className={`max-w-md w-full rounded-lg shadow-lg p-4 flex items-center gap-3 ${toastType === 'success'
              ? 'bg-green-500 text-white'
              : 'bg-red-500 text-white'
              }`}
          >
            <span className="text-lg">
              {toastType === 'success' ? '✓' : '✗'}
            </span>
            <span className="flex-1">{toastMessage}</span>
            <button
              onClick={() => setShowToast(false)}
              className="text-white hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </>
  );
}
