import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BatchedTrade } from '@/src/hooks/useBatchTrading';

interface BatchConfirmationModalProps {
  isOpen: boolean;
  batchedTrades: BatchedTrade[];
  totalCollateral: number;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isExecuting: boolean;
}

const BatchConfirmationModal: React.FC<BatchConfirmationModalProps> = ({
  isOpen,
  batchedTrades,
  totalCollateral,
  onConfirm,
  onCancel,
  isExecuting
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-slate-700">
              {/* Header */}
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6">
                <h2 className="text-2xl font-bold text-white">Confirm Batch Transaction</h2>
                <p className="text-purple-100 text-sm mt-1">
                  Review your {batchedTrades.length} prediction{batchedTrades.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Trades List */}
              <div className="p-6 overflow-y-auto max-h-96">
                <div className="space-y-3">
                  {batchedTrades.map((trade, index) => (
                    <div
                      key={`${trade.pair.id}-${index}`}
                      className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-slate-400 text-sm font-medium">#{index + 1}</span>
                            <span className="text-white font-semibold">
                              {trade.pair.underlying}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-xs font-bold ${
                                trade.action === 'yes'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-red-600 text-white'
                              }`}
                            >
                              {trade.action.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-slate-300 text-sm">
                            {trade.pair.question}
                          </p>
                          <div className="mt-2 text-xs text-slate-400">
                            Expires: {trade.pair.expiry.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-white font-bold">
                            ${trade.collateralAmount.toFixed(2)}
                          </div>
                          <div className="text-slate-400 text-xs mt-1">USDC</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary */}
              <div className="bg-slate-900 p-6 border-t border-slate-700">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="text-slate-400 text-sm">Total Investment</div>
                    <div className="text-white text-3xl font-bold mt-1">
                      ${totalCollateral.toFixed(2)}
                    </div>
                    <div className="text-slate-500 text-xs mt-1">USDC</div>
                  </div>
                  <div className="text-right">
                    <div className="text-slate-400 text-sm">Predictions</div>
                    <div className="text-white text-3xl font-bold mt-1">
                      {batchedTrades.length}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={onCancel}
                    disabled={isExecuting}
                    className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={onConfirm}
                    disabled={isExecuting}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl active:scale-95 disabled:active:scale-100"
                  >
                    {isExecuting ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg
                          className="animate-spin h-5 w-5"
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
                        Processing...
                      </span>
                    ) : (
                      'Confirm & Execute'
                    )}
                  </button>
                </div>

                {/* Info message */}
                <div className="mt-4 p-3 bg-blue-600/10 border border-blue-600/20 rounded-lg">
                  <div className="flex gap-2">
                    <svg
                      className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-blue-300 text-xs">
                      All {batchedTrades.length} trades will be executed in a single transaction.
                      {batchedTrades.length > 1 && ' This saves gas compared to individual transactions.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default BatchConfirmationModal;
