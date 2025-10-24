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
import { getBaseAccountAddress } from '@/src/lib/smartAccount';
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
    const txs = cartStorage.getTransactions(address);
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
    if (!address || transactions.length === 0) {
      console.error('No transactions or address found', { address, txCount: transactions.length });
      addToast('Cannot execute: No wallet connected or cart is empty', 'error');
      return;
    }

    console.log('========== BATCH EXECUTION STARTED ==========');
    console.log('Total transactions:', transactions.length);
    console.log('User address:', address);
    console.log('==========================================');

    setIsProcessing(true);

    try {
      console.log('🚀 Executing batch transactions...');
      const result = await executeBatchTransactions(transactions, address);
      console.log('✅ Batch execution result:', result);

      if (result.success && result.txHash) {
        console.log('✅ Batch execution successful');

        // Clear cart
        cartStorage.clearCart(address);
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
      console.error('❌ Error executing batch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to execute batch';
      addToast(errorMessage, 'error');
      setIsProcessing(false);
    }
  };

  const handleSwipeLeft = () => {
    if (!address) {
      onClose();
      return;
    }

    console.log('Swipe left detected, discarding ALL transactions');

    // Clear entire cart
    cartStorage.clearCart(address);
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
          ) : (
            <div className="w-full max-w-md h-[600px]">
              {(isProcessing || isCheckingAllowance) && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
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
                    <div className="px-6 py-2 rounded-full text-lg font-bold bg-blue-600 text-white">
                      BATCH
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="text-center space-y-8 mt-12">
                    {/* Transaction Count */}
                    <div>
                      <p className="text-gray-500 text-sm uppercase tracking-wider mb-2">Transactions</p>
                      <h3 className="text-white text-3xl font-bold">
                        {transactions.length} {transactions.length === 1 ? 'Order' : 'Orders'}
                      </h3>
                    </div>

                    {/* Description */}
                    <div>
                      <p className="text-gray-400 text-base">
                        Execute all transactions in a single gasless batch
                      </p>
                    </div>

                    {/* Total Amount - Hero */}
                    <div className="py-8">
                      <p className="text-gray-500 text-sm uppercase tracking-wider mb-3">Total Amount</p>
                      <div className="flex items-baseline justify-center gap-2">
                        <span className="text-6xl font-bold text-white">
                          ${formatUSDC(getTotalUSDC())}
                        </span>
                      </div>
                      <p className="text-gray-500 text-lg mt-2">USDC</p>
                    </div>
                  </div>

                  {/* Footer Info */}
                  <div className="absolute bottom-6 left-0 right-0 px-6">
                    <div className="text-center space-y-2">
                      <p className="text-gray-500 text-xs">
                        {transactions.length} transaction{transactions.length !== 1 ? 's' : ''} ready to execute
                      </p>
                    </div>
                  </div>
                </div>
              </CartSwipeableCard>
            </div>
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
