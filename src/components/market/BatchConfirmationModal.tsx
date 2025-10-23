import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Address } from 'viem';
import type { BatchBet, BatchTransactionStatus } from '@/src/hooks/useBatchTransactions';
import { formatUSDC } from '@/src/utils/usdcApproval';
import { getBaseScanTxUrl, formatTxHash } from '@/src/utils/basescan';

interface BatchConfirmationModalProps {
  isOpen: boolean;
  batch: BatchBet[];
  batchStatuses: Record<string, BatchTransactionStatus>;
  totalUSDC: number;
  isExecuting: boolean;
  onExecute: () => Promise<void>;
  onClose: () => void;
  onRemoveBet: (id: string) => void;
}

const BatchConfirmationModal: React.FC<BatchConfirmationModalProps> = ({
  isOpen,
  batch,
  batchStatuses,
  totalUSDC,
  isExecuting,
  onExecute,
  onClose,
  onRemoveBet,
}) => {
  if (!isOpen) return null;

  const getStatusIcon = (status: BatchTransactionStatus['status']) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'submitted':
        return '📤';
      case 'confirmed':
        return '✅';
      case 'failed':
        return '❌';
      default:
        return '⏳';
    }
  };

  const getStatusColor = (status: BatchTransactionStatus['status']) => {
    switch (status) {
      case 'confirmed':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'submitted':
        return 'text-blue-500';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Batch Confirmation</h2>
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="text-slate-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Batch Summary */}
          <div className="px-6 py-4 bg-slate-900 border-b border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-slate-400 text-sm">Total Bets</div>
                <div className="text-white text-2xl font-bold">{batch.length}</div>
              </div>
              <div className="text-right">
                <div className="text-slate-400 text-sm">Total USDC</div>
                <div className="text-white text-2xl font-bold">${totalUSDC.toFixed(2)}</div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-purple-900 bg-opacity-30 rounded-lg border border-purple-500">
              <div className="flex items-center gap-2 text-purple-300 text-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Gas fees sponsored by Base Paymaster</span>
              </div>
            </div>
          </div>

          {/* Batch Items */}
          <div className="overflow-y-auto max-h-96 px-6 py-4">
            <div className="space-y-3">
              {batch.map((bet) => {
                const status = batchStatuses[bet.id];
                return (
                  <motion.div
                    key={bet.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-bold">{bet.pair.underlying}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              bet.action === 'yes'
                                ? 'bg-green-500 bg-opacity-20 text-green-400'
                                : 'bg-red-500 bg-opacity-20 text-red-400'
                            }`}
                          >
                            {bet.action === 'yes' ? 'UP' : 'DOWN'}
                          </span>
                        </div>
                        <div className="text-slate-400 text-sm">
                          {bet.pair.question}
                        </div>
                        <div className="text-slate-300 text-sm mt-1">
                          Bet: ${bet.betSize.toFixed(2)} USDC
                        </div>
                        {status && status.status !== 'pending' && (
                          <div className={`text-sm mt-1 ${getStatusColor(status.status)}`}>
                            <div className="flex items-center gap-2">
                              <span>{getStatusIcon(status.status)} {status.status}</span>
                              {status.txHash && (
                                <a
                                  href={getBaseScanTxUrl(status.txHash)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                                >
                                  {formatTxHash(status.txHash)}
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              )}
                            </div>
                            {status.error && (
                              <div className="text-red-400 text-xs mt-1">{status.error}</div>
                            )}
                          </div>
                        )}
                      </div>
                      {!isExecuting && !status && (
                        <button
                          onClick={() => onRemoveBet(bet.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors ml-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-700 flex gap-3">
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onExecute}
              disabled={isExecuting || batch.length === 0}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isExecuting ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Executing...
                </>
              ) : (
                `Execute All (${batch.length})`
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default BatchConfirmationModal;
