'use client';

import { useEffect, useState } from 'react';
import type { Address } from 'viem';
import type { CartTransaction } from '@/src/types/cart';
import { cartStorage } from '@/src/utils/cartStorage';
import { executeBatchTransactions } from '@/src/services/batchExecution';
import { useAccount } from 'wagmi';
import CartSwipeableCard from '@/src/components/cart/CartSwipeableCard';
import { useToastManager } from '@/src/components/shared/ToastContainer';
import ApprovalModal from '@/src/components/cart/ApprovalModal';
import { checkUSDCAllowance } from '@/src/utils/usdcApproval';
import { getBaseAccountAddress, isBaseAccountConnected } from '@/src/lib/smartAccount';
import { OPTION_BOOK_ADDRESS } from '@/src/utils/contracts';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate?: () => void;
}

export function CartModal({ isOpen, onClose, onCartUpdate }: CartModalProps) {
  const [transactions, setTransactions] = useState<CartTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);
  const { address } = useAccount();
  const { addToast } = useToastManager();

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

  // Check allowance when modal opens with transactions
  useEffect(() => {
    if (isOpen && address && transactions.length > 0) {
      checkAllowance();
    }
  }, [isOpen, address, transactions.length]);

  const loadTransactions = () => {
    const txs = cartStorage.getTransactions();
    setTransactions(txs);
  };

  const checkAllowance = async () => {
    if (!address || transactions.length === 0) return;

    setIsCheckingAllowance(true);
    try {
      const totalNeeded = getTotalUSDC();
      const baseAccountAddress = await getBaseAccountAddress();
      const currentAllowance = await checkUSDCAllowance(
        baseAccountAddress,
        OPTION_BOOK_ADDRESS as Address
      );

      console.log('Cart total USDC needed:', formatUSDC(totalNeeded));
      console.log('Current allowance:', formatUSDC(currentAllowance));

      if (totalNeeded > currentAllowance) {
        console.log('Insufficient allowance, showing approval modal');
        setShowApprovalModal(true);
      }
    } catch (error) {
      console.error('Failed to check allowance:', error);
      // Continue anyway - user will see error when executing
    } finally {
      setIsCheckingAllowance(false);
    }
  };

  const handleApprovalComplete = () => {
    setShowApprovalModal(false);
    // Re-check allowance after approval
    checkAllowance();
  };

  const handleSwipeRight = async () => {
    console.log('🔄 SWIPE RIGHT DETECTED - Starting transaction execution');
    console.log('User address:', address);
    console.log('Transactions in cart:', transactions.length);

    if (!address) {
      console.error('❌ No address found');
      addToast('Please sign in with Base to execute transactions', 'error');
      return;
    }

    if (transactions.length === 0) {
      console.error('❌ No transactions found', { txCount: transactions.length });
      addToast('Cart is empty', 'error');
      return;
    }

    // Check if Base Account is connected before attempting batch execution
    console.log('🔍 Checking Base Account connection...');
    let baseAccountConnected = false;
    try {
      baseAccountConnected = await isBaseAccountConnected();
      console.log('Base Account connected:', baseAccountConnected);
    } catch (error) {
      console.error('❌ Error checking Base Account connection:', error);
      addToast('Failed to verify Base Account connection. Please try again.', 'error');
      return;
    }

    if (!baseAccountConnected) {
      console.error('❌ Base Account not connected. User needs to sign in with Base Account.');
      addToast('Please connect with Base Account to execute batch transactions', 'error');
      return;
    }

    console.log('========== BATCH EXECUTION STARTED ==========');
    console.log('Total transactions:', transactions.length);
    console.log('User address:', address);
    console.log('Transactions details:', transactions.map(tx => ({
      id: tx.id,
      to: tx.to,
      requiredUSDC: tx.requiredUSDC?.toString(),
    })));
    console.log('==========================================');

    setIsProcessing(true);

    try {
      console.log('🚀 Calling executeBatchTransactions...');
      const result = await executeBatchTransactions(transactions, address);
      console.log('✅ Batch execution completed, result:', result);

      if (result.success && result.txHash) {
        console.log('✅ Transaction successful, hash:', result.txHash);

        // Clear cart
        cartStorage.clearCart();
        onCartUpdate?.();

        // Show success toast with BaseScan link
        addToast('Executed Successfully', 'success', result.txHash);

        // Auto-close modal after 2 seconds
        setTimeout(() => onClose(), 2000);
      } else {
        console.error('❌ Batch execution failed:', result.error);
        addToast(`Transaction failed: ${result.error}`, 'error');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('❌ Caught error executing batch:', error);
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute batch';
      addToast(errorMessage, 'error');
      setIsProcessing(false);
    }
  };

  const handleSwipeLeft = () => {
    console.log('Swipe left detected, discarding ALL transactions');

    // Clear entire cart
    cartStorage.clearCart();
    onCartUpdate?.();

    // Close modal immediately
    onClose();
  };

  const handleSwipeComplete = () => {
    console.log('Swipe animation completed');
    // Don't close here - let the handlers close after their logic completes
  };

  const formatUSDC = (amount: bigint) => {
    return (Number(amount) / 1_000_000).toFixed(2);
  };

  const getTotalUSDC = () => {
    return transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);
  };

  if (!isOpen) {
    return null;
  }

  const handleRemoveTransaction = (txId: string) => {
    cartStorage.removeTransactions([txId]);
    loadTransactions();
    onCartUpdate?.();
  };

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
                  {transactions.length} {transactions.length === 1 ? 'transaction' : 'transactions'}
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
                Swipe <span className="text-green-400 font-semibold">right to execute ALL</span> or{' '}
                <span className="text-red-400 font-semibold">left to discard ALL</span>
              </p>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col items-center px-4 pb-20 overflow-hidden">
          {!address ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-blue-600/20 rounded-full flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-blue-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                </div>
                <p className="text-white text-xl mb-2 font-semibold">Sign in Required</p>
                <p className="text-gray-400 text-sm">Please sign in with Base to view and execute your cart</p>
              </div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
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
            </div>
          ) : (
            <>
              {/* Transaction List */}
              <div className="w-full max-w-md mb-4 flex-1 overflow-y-auto">
                <div className="space-y-3">
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-gradient-to-br from-slate-800 via-slate-800/80 to-slate-900 rounded-xl p-4 border border-slate-700/50 shadow-lg"
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Transaction Details */}
                        <div className="flex-1 min-w-0">
                          {/* Market and Side */}
                          {tx.orderDetails && (
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-white font-bold text-lg">
                                {tx.orderDetails.marketId}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-bold ${tx.orderDetails.side === 'YES'
                                    ? 'bg-green-600/20 text-green-400 border border-green-600/30'
                                    : 'bg-red-600/20 text-red-400 border border-red-600/30'
                                  }`}
                              >
                                {tx.orderDetails.side}
                              </span>
                            </div>
                          )}

                          {/* Bet Amount */}
                          {tx.orderDetails && (
                            <div className="text-slate-300 text-sm mb-2">
                              Bet: <span className="font-semibold text-white">${tx.orderDetails.amount}</span>
                            </div>
                          )}

                          {/* Required USDC */}
                          <div className="text-slate-400 text-xs">
                            USDC Required: <span className="text-slate-300 font-medium">${formatUSDC(tx.requiredUSDC || 0n)}</span>
                          </div>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemoveTransaction(tx.id)}
                          disabled={isProcessing || isCheckingAllowance}
                          className="flex-shrink-0 p-2 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 hover:border-red-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                          title="Remove transaction"
                        >
                          <svg
                            className="w-4 h-4 text-red-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
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
                  ))}
                </div>
              </div>

              {/* Batch Execution Card */}
              <div className="w-full max-w-md h-[400px] relative">
                {(isProcessing || isCheckingAllowance) && (
                  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center rounded-3xl">
                    <div className="bg-gray-800 rounded-lg p-6 text-center">
                      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white text-lg font-medium">
                        {isCheckingAllowance ? 'Checking allowance...' : 'Executing batch...'}
                      </p>
                      <p className="text-gray-400 text-sm mt-2">
                        {isCheckingAllowance ? 'Please wait' : 'Please confirm in your wallet'}
                      </p>
                    </div>
                  </div>
                )}
                <CartSwipeableCard
                  onSwipeRight={handleSwipeRight}
                  onSwipeLeft={handleSwipeLeft}
                  onSwipeComplete={handleSwipeComplete}
                  disabled={isProcessing || isCheckingAllowance}
                >
                  <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-black h-full w-full flex flex-col justify-center items-center p-8 relative">
                    {/* Batch Badge */}
                    <div className="absolute top-6 left-1/2 transform -translate-x-1/2">
                      <div className="px-6 py-2 rounded-full text-lg font-bold bg-blue-600 text-white shadow-lg">
                        BATCH
                      </div>
                    </div>

                    {/* Main Content */}
                    <div className="text-center space-y-6 mt-8">
                      {/* Transaction Count */}
                      <div>
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Transactions</p>
                        <h3 className="text-white text-2xl font-bold">
                          {transactions.length} {transactions.length === 1 ? 'Order' : 'Orders'}
                        </h3>
                      </div>

                      {/* Total Amount - Hero */}
                      <div className="py-4">
                        <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Total Amount</p>
                        <div className="flex items-baseline justify-center gap-2">
                          <span className="text-5xl font-bold text-white">
                            ${formatUSDC(getTotalUSDC())}
                          </span>
                        </div>
                        <p className="text-gray-500 text-sm mt-1">USDC</p>
                      </div>

                      {/* Gasless Badge */}
                      <div className="px-4 py-2 bg-purple-900/30 rounded-lg border border-purple-500/20">
                        <div className="flex items-center justify-center gap-2 text-purple-300 text-xs">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13 10V3L4 14h7v7l9-11h-7z"
                            />
                          </svg>
                          <span className="font-medium">Gasless Execution</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CartSwipeableCard>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Approval Modal */}
      {address && (
        <ApprovalModal
          isOpen={showApprovalModal}
          onClose={() => setShowApprovalModal(false)}
          onApprovalComplete={handleApprovalComplete}
          walletAddress={address as Address}
        />
      )}
    </div>
  );
}
