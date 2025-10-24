'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Address } from 'viem';
import { getAdaptiveApprovalAmount, storeApprovalState } from '@/src/utils/approvalTracking';
import { createSmartAccountWithPaymaster, getSmartAccountAddress } from '@/src/lib/smartAccount';
import { encodeUSDCApprove, formatUSDC } from '@/src/utils/usdcApproval';
import { USDC_ADDRESS, OPTION_BOOK_ADDRESS } from '@/src/utils/contracts';
import { useToastManager } from '@/src/components/shared/ToastContainer';

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApprovalComplete: () => void;
  walletAddress: Address;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  onApprovalComplete,
  walletAddress,
}) => {
  const [approvalAmount, setApprovalAmount] = useState<bigint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingBalance, setIsCheckingBalance] = useState(true);
  const { addToast } = useToastManager();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Get adaptive approval amount when modal opens
  useEffect(() => {
    if (isOpen && walletAddress) {
      checkApprovalAmount();
    }
  }, [isOpen, walletAddress]);

  const checkApprovalAmount = async () => {
    setIsCheckingBalance(true);
    setError(null);

    try {
      const amount = await getAdaptiveApprovalAmount(walletAddress);
      setApprovalAmount(amount);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to check balance';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsCheckingBalance(false);
    }
  };

  const handleApprove = async () => {
    if (!approvalAmount) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get smart account address
      const smartAccountAddress = await getSmartAccountAddress(walletAddress);

      // Create smart account client with paymaster
      const smartAccountClient = await createSmartAccountWithPaymaster(walletAddress);

      // Encode approval call
      const approveCallData = encodeUSDCApprove(
        approvalAmount,
        OPTION_BOOK_ADDRESS as Address
      );

      // Execute approval via smart account (gasless)
      const userOpHash = await (smartAccountClient as any).sendUserOperation({
        calls: [
          {
            to: USDC_ADDRESS as Address,
            data: approveCallData,
            value: 0n,
          },
        ],
      });

      // Wait for transaction receipt
      const receipt = await (smartAccountClient as any).waitForUserOperationReceipt({
        hash: userOpHash,
      });

      const txHash = receipt.receipt.transactionHash;

      // Store approval state in localStorage
      storeApprovalState(walletAddress, approvalAmount);

      // Show success toast with transaction link
      addToast('USDC approved successfully!', 'success', txHash);

      // Call completion callback
      onApprovalComplete();

      // Close modal
      onClose();
    } catch (err) {
      console.error('Approval failed:', err);
      const errorMessage = err instanceof Error
        ? err.message
        : 'Approval transaction failed';

      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleCancel}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden max-w-md w-full">
              {/* Header */}
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-full flex items-center justify-center">
                      <svg
                        className="w-6 h-6 text-purple-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Approve USDC</h2>
                      <p className="text-sm text-slate-400">One-time setup required</p>
                    </div>
                  </div>
                  <button
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="text-slate-400 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Close"
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

                {/* Message */}
                {isCheckingBalance ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-slate-400 text-sm">Checking your balance...</p>
                    </div>
                  </div>
                ) : error ? (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-start gap-3">
                      <svg
                        className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <div>
                        <p className="text-red-400 text-sm font-medium">Cannot proceed</p>
                        <p className="text-red-300 text-xs mt-1">{error}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-800/50 rounded-lg p-4 mb-4">
                      <p className="text-white text-base leading-relaxed">
                        You're about to approve{' '}
                        <span className="font-bold text-purple-400">
                          {approvalAmount ? formatUSDC(approvalAmount) : '0.00'} USDC
                        </span>{' '}
                        for playing Moonstack.
                      </p>
                      <p className="text-slate-400 text-sm mt-2">
                        This allows the platform to execute your predictions without requiring
                        approval for each trade.
                      </p>
                    </div>

                    {/* Gasless Badge */}
                    <div className="p-3 bg-purple-900/30 rounded-lg border border-purple-500/20">
                      <div className="flex items-center gap-2 text-purple-300 text-sm">
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
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        <span>Gas fees sponsored - this approval is free!</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 pt-0 flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="flex-1 px-6 py-3 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApprove}
                  disabled={isLoading || isCheckingBalance || error !== null}
                  className="flex-1 px-6 py-3 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-bold rounded-lg transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Approving...</span>
                    </>
                  ) : (
                    'Approve'
                  )}
                </button>
              </div>

              {/* Processing Overlay - Lower z-index to not block wallet popup */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="bg-slate-800 rounded-lg p-6 text-center max-w-xs">
                    <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white text-lg font-medium">Processing approval...</p>
                    <p className="text-slate-400 text-sm mt-2">
                      Please confirm in your wallet
                    </p>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ApprovalModal;
