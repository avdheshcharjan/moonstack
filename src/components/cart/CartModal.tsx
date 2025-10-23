'use client';

import { useEffect, useState } from 'react';
import type { CartTransaction } from '@/src/types/cart';
import { cartStorage } from '@/src/utils/cartStorage';
import { executeBatchTransactions } from '@/src/services/batchExecution';
import { useAccount } from 'wagmi';
import CartSwipeableCard from '@/src/components/cart/CartSwipeableCard';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate?: () => void;
}

export function CartModal({ isOpen, onClose, onCartUpdate }: CartModalProps) {
  const [transactions, setTransactions] = useState<CartTransaction[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { address } = useAccount();

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const loadTransactions = () => {
    const txs = cartStorage.getTransactions();
    setTransactions(txs);
    setCurrentIndex(0);
  };

  const handleSwipeRight = () => {
    const currentTx = transactions[currentIndex];
    if (!currentTx || !address) {
      console.error('No transaction or address found', { currentTx, address });
      alert('Cannot execute transaction: No wallet connected or transaction missing');
      onClose();
      return;
    }

    console.log('========== SWIPE RIGHT DETECTED ==========');
    console.log('Current transaction:', JSON.stringify(currentTx, null, 2));
    console.log('User address:', address);
    console.log('==========================================');

    setIsProcessing(true);

    // Execute transaction asynchronously but don't await in the handler
    // This allows the wallet popup to show immediately
    (async () => {
      try {
        console.log('🚀 Starting executeBatchTransactions...');
        const result = await executeBatchTransactions([currentTx], address);
        console.log('✅ Transaction result:', result);

        if (result.success) {
          console.log('✅ Transaction successful, removing from cart');
          cartStorage.removeTransactions([currentTx.id]);
          onCartUpdate?.();
          alert('Transaction approved and executed successfully!');
        } else {
          console.error('❌ Transaction failed:', result.error);
          alert(`Transaction failed: ${result.error}`);
        }
      } catch (error) {
        console.error('❌ Error executing transaction:', error);
        alert(error instanceof Error ? error.message : 'Failed to execute transaction');
      } finally {
        setIsProcessing(false);
        console.log('🔚 Closing modal after transaction');
        // Small delay to ensure user sees the result
        setTimeout(() => onClose(), 500);
      }
    })();
  };

  const handleSwipeLeft = () => {
    const currentTx = transactions[currentIndex];
    if (!currentTx) {
      onClose();
      return;
    }

    console.log('Swipe left detected, discarding transaction');
    // Remove transaction from cart
    cartStorage.removeTransactions([currentTx.id]);
    onCartUpdate?.();

    // Close modal immediately after discard action
    onClose();
  };

  const handleSwipeComplete = () => {
    console.log('Swipe animation completed');
    // Don't close here - let the handlers close after their logic completes
  };

  const formatUSDC = (amount: bigint) => {
    return (Number(amount) / 1_000_000).toFixed(2);
  };

  if (!isOpen) {
    return null;
  }

  const currentTx = transactions[currentIndex];

  return (
    <div
      className={`fixed inset-0 bg-black/95 backdrop-blur-xl ${isProcessing ? 'z-[50]' : 'z-[100]'}`}
      onClick={isProcessing ? undefined : onClose}
    >
      <div
        className="h-full w-full flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Instructions */}
        <div className="flex flex-col items-center p-4 md:p-6 space-y-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold text-white">Cart</h2>
              {transactions.length > 0 && (
                <span className="text-gray-400 text-sm">
                  {currentIndex + 1}/{transactions.length}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors p-2"
              disabled={isProcessing}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Swipe Instructions Note */}
          {transactions.length > 0 && (
            <div className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-lg px-4 py-2 w-full max-w-md">
              <p className="text-center text-sm text-gray-300">
                Swipe <span className="text-green-400 font-semibold">right to approve</span> or{' '}
                <span className="text-red-400 font-semibold">left to discard</span>
              </p>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex items-center justify-center px-4 pb-20">
          {transactions.length === 0 ? (
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 text-gray-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
                  />
                </svg>
              </div>
              <p className="text-gray-400 text-xl mb-2">Cart is empty</p>
              <p className="text-gray-600 text-sm">Add items by swiping right</p>
            </div>
          ) : currentTx ? (
            <div className="w-full max-w-md h-[600px]">
              {isProcessing && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="bg-gray-800 rounded-lg p-6 text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg font-medium">Processing transaction...</p>
                    <p className="text-gray-400 text-sm mt-2">Please confirm in your wallet</p>
                  </div>
                </div>
              )}
              <CartSwipeableCard
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                onSwipeComplete={handleSwipeComplete}
                disabled={isProcessing}
              >
                <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black h-full w-full flex flex-col justify-center items-center p-8 relative">
                  {/* Side Badge */}
                  {currentTx.orderDetails && (
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
                      <div
                        className={`px-6 py-2 rounded-full text-lg font-bold ${
                          currentTx.orderDetails.side === 'YES'
                            ? 'bg-green-500 text-white'
                            : 'bg-red-500 text-white'
                        }`}
                      >
                        {currentTx.orderDetails.side}
                      </div>
                    </div>
                  )}

                  {/* Main Content */}
                  <div className="text-center space-y-8 mt-12">
                    {/* Market Name */}
                    {currentTx.orderDetails && (
                      <div>
                        <p className="text-gray-500 text-sm uppercase tracking-wider mb-2">Market</p>
                        <h3 className="text-white text-3xl font-bold">
                          {currentTx.orderDetails.marketId}
                        </h3>
                      </div>
                    )}

                    {/* Description */}
                    <div>
                      <p className="text-gray-400 text-base">
                        {currentTx.description}
                      </p>
                    </div>

                    {/* Amount - Hero */}
                    <div className="py-8">
                      <p className="text-gray-500 text-sm uppercase tracking-wider mb-3">Amount</p>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-6xl font-bold text-white">
                          ${formatUSDC(currentTx.requiredUSDC || 0n)}
                        </span>
                      </div>
                      <p className="text-gray-500 text-lg mt-2">USDC</p>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="absolute bottom-6 left-0 right-0 text-center">
                    <p className="text-gray-600 text-xs">
                      Added {new Date(currentTx.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </CartSwipeableCard>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-400 text-xl mb-4">All done!</p>
              <button
                onClick={onClose}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
