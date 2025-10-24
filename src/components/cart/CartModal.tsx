'use client';

import { useWallet } from '@/src/hooks/useWallet';
import { executeBatchTransactions } from '@/src/services/batchExecution';
import type { CartTransaction } from '@/src/types/cart';
import { cartStorage } from '@/src/utils/cartStorage';
import { useEffect, useState } from 'react';
import type { Address } from 'viem';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate?: () => void;
}

export function CartModal({ isOpen, onClose, onCartUpdate }: CartModalProps) {
  const [transactions, setTransactions] = useState<CartTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const { walletAddress: address } = useWallet();

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
  };

  const handleRemoveTransaction = (id: string) => {
    cartStorage.removeTransaction(id);
    loadTransactions();
    onCartUpdate?.();
  };

  const handleClearCart = () => {
    if (window.confirm('Clear all transactions from cart?')) {
      cartStorage.clearCart();
      loadTransactions();
      onCartUpdate?.();
    }
  };

  const handleExecuteBatch = async () => {
    if (transactions.length === 0 || !address) {
      alert('Cannot execute: No wallet connected or cart is empty');
      return;
    }

    console.log('========== BATCH EXECUTION STARTED ==========');
    console.log('Total transactions:', transactions.length);
    console.log('User address:', address);
    console.log('==========================================');

    setIsProcessing(true);

    try {
      console.log('🚀 Executing batch of', transactions.length, 'transactions...');
      const result = await executeBatchTransactions(transactions, address as Address);
      console.log('✅ Batch execution result:', result);

      if (result.success && result.txHash) {
        console.log('✅ Batch execution successful!');

        // Clear entire cart
        cartStorage.clearCart();
        loadTransactions();
        onCartUpdate?.();

        // Format tx hash safely
        const txHash = String(result.txHash);
        const shortHash = txHash.length > 18
          ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}`
          : txHash;

        alert(`Batch executed successfully!\nTx: ${shortHash}`);
        onClose();
      } else {
        console.error('❌ Batch execution failed:', result.error);
        alert(`Batch execution failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error executing batch:', error);
      alert(error instanceof Error ? error.message : 'Failed to execute batch');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatUSDC = (amount: bigint) => {
    return (Number(amount) / 1_000_000).toFixed(2);
  };

  // Calculate total USDC
  const totalUSDC = transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100]"
      onClick={isProcessing ? undefined : onClose}
    >
      <div
        className="h-full w-full flex flex-col max-w-2xl mx-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-white">Cart</h2>
            {transactions.length > 0 && (
              <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full font-medium">
                {transactions.length} {transactions.length === 1 ? 'item' : 'items'}
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

        {/* Main Content Area */}
        {transactions.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
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
              <p className="text-gray-600 text-sm">Add bets by swiping on market cards</p>
            </div>
          </div>
        ) : (
          <>
            {/* Transactions List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {transactions.map((tx, index) => (
                <div
                  key={tx.id}
                  className="bg-gray-800/60 backdrop-blur-sm border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-gray-500 text-sm font-mono">#{index + 1}</span>
                        {tx.orderDetails && (
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${tx.orderDetails.side === 'YES'
                                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                : 'bg-red-500/20 text-red-400 border border-red-500/30'
                              }`}
                          >
                            {tx.orderDetails.side}
                          </span>
                        )}
                      </div>
                      {tx.orderDetails && (
                        <h3 className="text-white font-semibold text-lg mb-1">
                          {tx.orderDetails.marketId}
                        </h3>
                      )}
                      <p className="text-gray-400 text-sm mb-2">{tx.description}</p>
                      <p className="text-gray-600 text-xs">
                        Added {new Date(tx.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">
                          ${formatUSDC(tx.requiredUSDC || 0n)}
                        </div>
                        <div className="text-gray-500 text-xs">USDC</div>
                      </div>
                      <button
                        onClick={() => handleRemoveTransaction(tx.id)}
                        className="text-red-400 hover:text-red-300 transition-colors p-1"
                        title="Remove"
                        disabled={isProcessing}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer with Total and Actions */}
            <div className="border-t border-gray-800 p-6 space-y-4 bg-gray-900/80 backdrop-blur-sm">
              {/* Total */}
              <div className="flex items-center justify-between">
                <div className="text-gray-400 text-lg">Total Amount</div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">${formatUSDC(totalUSDC)}</div>
                  <div className="text-gray-500 text-sm">USDC</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleClearCart}
                  disabled={isProcessing}
                  className="flex-1 px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear All
                </button>
                <button
                  onClick={handleExecuteBatch}
                  disabled={isProcessing || transactions.length === 0}
                  className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-500 shadow-lg shadow-blue-500/50"
                >
                  {isProcessing ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    `Execute Batch (${transactions.length})`
                  )}
                </button>
              </div>

              {/* Info Text */}
              {transactions.length > 0 && (
                <p className="text-gray-500 text-xs text-center">
                  All {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} will be executed atomically in a single batch
                </p>
              )}
            </div>
          </>
        )}
      </div>

    </div>
  );
}
