'use client';

import { useEffect, useState } from 'react';
import type { CartTransaction } from '@/src/types/cart';
import { cartStorage } from '@/src/utils/cartStorage';
import { executeBatchTransactions } from '@/src/services/batchExecution';
import { useAccount } from 'wagmi';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate?: () => void;
}

export function CartModal({ isOpen, onClose, onCartUpdate }: CartModalProps) {
  const [transactions, setTransactions] = useState<CartTransaction[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
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

  const toggleSelectAll = () => {
    if (selectedIds.size === transactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(transactions.map(tx => tx.id)));
    }
  };

  const handleApprove = async () => {
    if (!address) {
      alert('Please connect your wallet');
      return;
    }

    if (selectedIds.size === 0) {
      alert('Please select at least one transaction');
      return;
    }

    setIsProcessing(true);
    try {
      const selectedTransactions = transactions.filter(tx => selectedIds.has(tx.id));
      const result = await executeBatchTransactions(selectedTransactions, address);

      if (result.success) {
        // Remove executed transactions from cart
        cartStorage.removeTransactions(Array.from(selectedIds));
        loadTransactions();
        onCartUpdate?.();

        if (transactions.length === selectedIds.size) {
          // All transactions were executed, close modal
          onClose();
        }

        alert(`Successfully executed ${selectedIds.size} transaction(s)!`);
      } else {
        alert(`Batch execution failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Error executing batch transactions:', error);
      alert(error instanceof Error ? error.message : 'Failed to execute transactions');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscard = () => {
    if (selectedIds.size === 0) {
      alert('Please select at least one transaction to discard');
      return;
    }

    if (confirm(`Are you sure you want to discard ${selectedIds.size} transaction(s)?`)) {
      cartStorage.removeTransactions(Array.from(selectedIds));
      loadTransactions();
      onCartUpdate?.();

      if (transactions.length === selectedIds.size) {
        // All transactions were discarded, close modal
        onClose();
      }
    }
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border-0 md:border md:border-gray-700 rounded-none md:rounded-lg shadow-xl w-full h-full md:max-w-2xl md:w-full md:mx-4 md:max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-700">
          <h2 className="text-xl md:text-2xl font-bold text-white">Transaction Cart</h2>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {transactions.length === 0 ? (
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
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center mb-4 p-3 bg-gray-800 rounded-lg">
                <input
                  type="checkbox"
                  id="select-all"
                  checked={selectedIds.size === transactions.length}
                  onChange={toggleSelectAll}
                  className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  disabled={isProcessing}
                />
                <label htmlFor="select-all" className="ml-3 text-white font-medium cursor-pointer">
                  Select All ({transactions.length})
                </label>
              </div>

              {/* Transaction List */}
              <div className="space-y-3">
                {transactions.map((tx) => (
                  <div
                    key={tx.id}
                    className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                      selectedIds.has(tx.id)
                        ? 'bg-blue-900/20 border-blue-500'
                        : 'bg-gray-800 border-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedIds.has(tx.id)}
                      onChange={() => toggleSelection(tx.id)}
                      className="w-5 h-5 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500 mt-1"
                      disabled={isProcessing}
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium truncate">{tx.description}</h3>
                      <div className="mt-1 text-sm text-gray-400">
                        <p>Amount: ${formatUSDC(tx.requiredUSDC || 0n)} USDC</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Added: {new Date(tx.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    {tx.orderDetails && (
                      <div
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          tx.orderDetails.side === 'YES'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}
                      >
                        {tx.orderDetails.side}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {transactions.length > 0 && (
          <div className="border-t border-gray-700 p-4 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm md:text-base text-gray-400">Total Selected ({selectedIds.size}):</span>
              <span className="text-xl md:text-2xl font-bold text-white">
                ${formatUSDC(getTotalUSDC())} USDC
              </span>
            </div>

            <div className="flex flex-col md:flex-row gap-3">
              <button
                onClick={handleDiscard}
                disabled={isProcessing || selectedIds.size === 0}
                className="w-full md:flex-1 px-4 md:px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors text-sm md:text-base"
              >
                Discard Selected
              </button>
              <button
                onClick={handleApprove}
                disabled={isProcessing || selectedIds.size === 0}
                className="w-full md:flex-1 px-4 md:px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-lg transition-colors text-sm md:text-base"
              >
                {isProcessing ? 'Processing...' : 'Approve & Execute'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
