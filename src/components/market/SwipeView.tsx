import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOrders } from '@/src/hooks/useOrders';
import { pairBinaryOptions } from '@/src/utils/binaryPairing';
import { useLocalStorage } from '@/src/hooks/useLocalStorage';
import { filterPairsByExpiry, sortPairsByExpiry, countPairsByExpiry } from '@/src/utils/expiryFiltering';
import CardStack from './CardStack';
import ToastContainer, { useToastManager } from '../shared/ToastContainer';
import ExpiryFilter from './ExpiryFilter';
import BatchConfirmationModal from './BatchConfirmationModal';
import { BinaryPair, ExpiryFilter as ExpiryFilterType } from '@/src/types/prediction';
import { useBatchTransactions } from '@/src/hooks/useBatchTransactions';
import type { Address } from 'viem';

interface SwipeViewProps {
  walletAddress: string | null;
}

const SwipeView: React.FC<SwipeViewProps> = ({ walletAddress }) => {
  const { orders, marketData, loading, error, fetchOrders, filterBinaries } = useOrders();
  const { toasts, addToast, removeToast } = useToastManager();
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilterType>('all');
  const [filterKey, setFilterKey] = useState(0);
  const [showBatchModal, setShowBatchModal] = useState(false);

  const storageKey = walletAddress ? `betSize_${walletAddress}` : 'betSize_null';
  const [betSize] = useLocalStorage<number>(storageKey, 5);

  // Batch transactions
  const {
    batch,
    batchStatuses,
    isBatchMode,
    isExecuting,
    addToBatch,
    removeFromBatch,
    clearBatch,
    toggleBatchMode,
    executeBatch,
    getTotalUSDCNeeded,
  } = useBatchTransactions();

  const handleFilterChange = useCallback((newFilter: ExpiryFilterType) => {
    setExpiryFilter(newFilter);
    setFilterKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchOrders();
    }
  }, [walletAddress, fetchOrders]);

  // Memoize all pairs (before filtering) for counting
  const allPairs = useMemo(() => {
    const binaries = filterBinaries();
    const rawBinaries = binaries.map(parsed => parsed.rawOrder);
    const newPairs = pairBinaryOptions(rawBinaries);
    return sortPairsByExpiry(newPairs);
  }, [filterBinaries, orders]);

  // Count pairs by expiry category
  const expiryCounts = useMemo(() => {
    return countPairsByExpiry(allPairs);
  }, [allPairs]);

  // Filter pairs based on selected expiry filter
  const pairs = useMemo(() => {
    return filterPairsByExpiry(allPairs, expiryFilter);
  }, [allPairs, expiryFilter]);

  const handleSwipe = useCallback(async (pair: BinaryPair, action: 'yes' | 'no') => {
    if (!walletAddress) {
      addToast('Wallet not connected', 'error');
      throw new Error('Wallet not connected');
    }

    if (isBatchMode) {
      // Add to batch instead of executing immediately
      addToBatch(pair, action, betSize);
      addToast(
        `Added ${action === 'yes' ? 'UP' : 'DOWN'} bet on ${pair.underlying} to batch`,
        'success'
      );
    } else {
      // Execute immediately with paymaster
      addToast(
        `Executing ${action === 'yes' ? 'UP' : 'DOWN'} bet on ${pair.underlying}...`,
        'info'
      );

      try {
        const { executeImmediateFillOrder } = await import('@/src/services/immediateExecution');
        const result = await executeImmediateFillOrder(pair, action, betSize, walletAddress as Address);

        if (result.success) {
          addToast(
            `Successfully executed ${action === 'yes' ? 'UP' : 'DOWN'} bet on ${pair.underlying}!`,
            'success'
          );
        } else {
          addToast(
            result.error || 'Failed to execute bet',
            'error'
          );
        }
      } catch (error) {
        addToast(
          error instanceof Error ? error.message : 'Failed to execute bet',
          'error'
        );
      }
    }
  }, [walletAddress, isBatchMode, addToBatch, betSize, addToast]);

  const handleExecuteBatch = useCallback(async () => {
    if (!walletAddress) {
      addToast('Wallet not connected', 'error');
      return;
    }

    try {
      await executeBatch(walletAddress as Address);
      addToast(`Successfully executed ${batch.length} bets!`, 'success');
      setShowBatchModal(false);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Failed to execute batch',
        'error'
      );
    }
  }, [walletAddress, executeBatch, batch.length, addToast]);


  if (!walletAddress) {
    return (
      <div className="flex items-center justify-center min-h-[600px] px-4">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-slate-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <div className="text-white text-2xl font-bold mb-2">Connect Your Wallet</div>
          <div className="text-slate-400 text-sm">
            Please connect your wallet to start making predictions
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[600px] px-4">
        <div className="text-center">
          <svg
            className="animate-spin h-12 w-12 mx-auto text-purple-500 mb-4"
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
          <div className="text-white text-xl">Loading predictions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[600px] px-4">
        <div className="text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 mx-auto text-red-500"
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
          </div>
          <div className="text-white text-2xl font-bold mb-2">Error Loading Data</div>
          <div className="text-slate-400 text-sm mb-4">{error}</div>
          <button
            onClick={fetchOrders}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!marketData) {
    return (
      <div className="flex items-center justify-center min-h-[600px] px-4">
        <div className="text-center">
          <div className="text-slate-400 text-xl mb-2">No market data available</div>
          <div className="text-slate-500 text-sm">Unable to fetch current prices</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <ExpiryFilter
        selectedFilter={expiryFilter}
        onFilterChange={handleFilterChange}
        counts={expiryCounts}
      />

      {/* Batch Mode Controls */}
      {batch.length > 0 && (
        <div className="flex items-center justify-center gap-2 mb-2">
          <button
            onClick={() => setShowBatchModal(true)}
            className="px-3 py-1.5 text-sm rounded-lg font-bold bg-green-600 hover:bg-green-700 text-white transition-colors flex items-center gap-1"
          >
            Review Batch ({batch.length})
          </button>

          <button
            onClick={clearBatch}
            className="px-3 py-1.5 text-sm rounded-lg font-bold bg-red-600 hover:bg-red-700 text-white transition-colors"
          >
            Clear All
          </button>
        </div>
      )}

      <CardStack
        key={filterKey}
        pairs={pairs}
        onSwipe={handleSwipe}
        betSize={betSize}
        marketData={marketData}
        onRefresh={fetchOrders}
      />

      <BatchConfirmationModal
        isOpen={showBatchModal}
        batch={batch}
        batchStatuses={batchStatuses}
        totalUSDC={getTotalUSDCNeeded()}
        isExecuting={isExecuting}
        onExecute={handleExecuteBatch}
        onClose={() => setShowBatchModal(false)}
        onRemoveBet={removeFromBatch}
      />

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </>
  );
};

export default SwipeView;
