'use client';

import { useEffect, useState } from 'react';
import type { CartTransaction } from '@/src/types/cart';
import { cartStorage } from '@/src/utils/cartStorage';
import { executeBatchTransactions } from '@/src/services/batchExecution';
import { useAccount } from 'wagmi';
import SwipeableCard from '@/src/components/market/SwipeableCard';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate?: () => void;
}

export function CartModal({ isOpen, onClose, onCartUpdate }: CartModalProps) {
  const [transactions, setTransactions] = useState<CartTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const { address } = useAccount();

  useEffect(() => {
    if (isOpen) {
      loadTransactions();
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      // Restore body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    // Cleanup function to restore scroll on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const loadTransactions = () => {
    const txs = cartStorage.getTransactions();
    setTransactions(txs);
    setCurrentIndex(0);
    // Auto-select all by default
    setSelectedIds(new Set(txs.map(tx => tx.id)));
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSwipeRight = async () => {
    // Swipe right = Approve current transaction
    const currentTx = transactions[currentIndex];
    if (!currentTx || !address) return;

    setIsProcessing(true);
    try {
      const result = await executeBatchTransactions([currentTx], address);

      if (result.success) {
        // Remove executed transaction from cart
        cartStorage.removeTransactions([currentTx.id]);
        loadTransactions();
        onCartUpdate?.();

        alert(`Transaction approved and executed!`);
      } else {
        alert(`Transaction failed: ${result.error}`);
        // Move to next card even on failure
        setCurrentIndex(prev => prev + 1);
      }
    } catch (error) {
      console.error('Error executing transaction:', error);
      alert(error instanceof Error ? error.message : 'Failed to execute transaction');
      setCurrentIndex(prev => prev + 1);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSwipeLeft = () => {
    // Swipe left = Discard current transaction
    const currentTx = transactions[currentIndex];
    if (!currentTx) return;

    cartStorage.removeTransactions([currentTx.id]);
    loadTransactions();
    onCartUpdate?.();
  };

  const handleSwipeUp = () => {
    // Skip to next transaction
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipeComplete = () => {
    // Auto-advance to next card
    setTimeout(() => {
      if (currentIndex < transactions.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        // All cards swiped, close modal
        onClose();
      }
    }, 100);
  };

  const getTotalUSDC = () => {
    return transactions
      .filter(tx => selectedIds.has(tx.id))
      .reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border-0 md:border md:border-gray-700 rounded-none md:rounded-lg shadow-xl w-full h-full md:max-w-2xl md:w-full md:mx-4 md:max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-white">Transaction Cart</h2>
            <p className="text-sm text-gray-400 mt-1">
              {transactions.length > 0 ? `${currentIndex + 1} of ${transactions.length}` : 'Empty'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            disabled={isProcessing}
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Swipe Instructions */}
        <div className="px-4 py-3 bg-gray-800/50 border-b border-gray-700">
          <div className="flex justify-around text-xs md:text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center">
                <span className="text-red-400">←</span>
              </div>
              <span className="text-gray-400">Swipe left to discard</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                <span className="text-green-400">→</span>
              </div>
              <span className="text-gray-400">Swipe right to approve</span>
            </div>
          </div>
        </div>

        {/* Content - Swipeable Card */}
        <div className="flex-1 overflow-hidden p-4 md:p-6 relative">
          {transactions.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center py-12">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-600"
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
                <p className="text-gray-400 text-lg">Your cart is empty</p>
                <p className="text-gray-500 text-sm mt-2">Add transactions by swiping cards</p>
              </div>
            </div>
          ) : currentTx ? (
            <div className="h-full w-full">
              <SwipeableCard
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                onSwipeUp={handleSwipeUp}
                onSwipeComplete={handleSwipeComplete}
                disabled={isProcessing}
              >
                <div className="bg-gradient-to-br from-gray-800 to-gray-900 h-full w-full p-6 md:p-8 flex flex-col justify-between">
                  {/* Card Content */}
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="space-y-4">
                      {/* Badge */}
                      {currentTx.orderDetails && (
                        <div className="flex justify-center">
                          <div
                            className={`px-4 py-2 rounded-full text-sm font-bold ${
                              currentTx.orderDetails.side === 'YES'
                                ? 'bg-green-500/30 text-green-300 border-2 border-green-400'
                                : 'bg-red-500/30 text-red-300 border-2 border-red-400'
                            }`}
                          >
                            {currentTx.orderDetails.side}
                          </div>
                        </div>
                      )}

                      {/* Description */}
                      <h3 className="text-2xl md:text-3xl font-bold text-white text-center">
                        {currentTx.description}
                      </h3>

                      {/* Amount */}
                      <div className="text-center space-y-2">
                        <p className="text-gray-400 text-sm">Amount</p>
                        <p className="text-4xl md:text-5xl font-bold text-white">
                          ${formatUSDC(currentTx.requiredUSDC || 0n)}
                        </p>
                        <p className="text-gray-400 text-lg">USDC</p>
                      </div>

                      {/* Timestamp */}
                      <p className="text-center text-sm text-gray-500">
                        Added: {new Date(currentTx.timestamp).toLocaleString()}
                      </p>

                      {/* Order Details */}
                      {currentTx.orderDetails && (
                        <div className="mt-6 p-4 bg-gray-800/50 rounded-lg space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Market:</span>
                            <span className="text-white font-medium">{currentTx.orderDetails.marketId}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Position:</span>
                            <span className="text-white font-medium">{currentTx.orderDetails.side}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checkbox for selection */}
                  <div className="mt-6 flex items-center justify-center">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(currentTx.id)}
                        onChange={() => toggleSelection(currentTx.id)}
                        className="w-6 h-6 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                        disabled={isProcessing}
                      />
                      <span className="text-gray-300 text-sm">Include in batch execution</span>
                    </label>
                  </div>
                </div>
              </SwipeableCard>
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-400 text-lg">All transactions reviewed!</p>
                <button
                  onClick={onClose}
                  className="mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Only show selected transactions summary */}
        {transactions.length > 0 && selectedIds.size > 0 && (
          <div className="border-t border-gray-700 p-4 md:p-6 bg-gray-800/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Selected Transactions</p>
                <p className="text-lg font-bold text-white">{selectedIds.size} selected</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Total Amount</p>
                <p className="text-2xl font-bold text-white">
                  ${formatUSDC(getTotalUSDC())} USDC
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
