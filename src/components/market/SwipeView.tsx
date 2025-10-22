import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOrders } from '@/src/hooks/useOrders';
import { useBatchTrading } from '@/src/hooks/useBatchTrading';
import { pairBinaryOptions } from '@/src/utils/binaryPairing';
import { useLocalStorage } from '@/src/hooks/useLocalStorage';
import { filterPairsByExpiry, sortPairsByExpiry, countPairsByExpiry } from '@/src/utils/expiryFiltering';
import CardStack from './CardStack';
import BatchConfirmationModal from './BatchConfirmationModal';
import ToastContainer, { useToastManager } from '../shared/ToastContainer';
import ExpiryFilter from './ExpiryFilter';
import { BinaryPair, ExpiryFilter as ExpiryFilterType } from '@/src/types/prediction';

interface SwipeViewProps {
  walletAddress: string | null;
}

const SwipeView: React.FC<SwipeViewProps> = ({ walletAddress }) => {
  const { orders, marketData, loading, error, fetchOrders, filterBinaries } = useOrders();
  const { batchedTrades, addToBatch, clearBatch, executeBatch, isExecuting, totalCollateralNeeded } = useBatchTrading();
  const { toasts, addToast, removeToast } = useToastManager();
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilterType>('all');
  const [filterKey, setFilterKey] = useState(0);

  const storageKey = walletAddress ? `betSize_${walletAddress}` : 'betSize_null';
  const [betSize] = useLocalStorage<number>(storageKey, 5);

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

    // Add trade to batch instead of executing immediately
    addToBatch(pair, action, betSize);
    addToast(
      `Added ${action === 'yes' ? 'UP' : 'DOWN'} bet on ${pair.underlying} to batch`,
      'info'
    );
  }, [walletAddress, addToBatch, addToast, betSize]);

  const handleBatchConfirm = useCallback(async () => {
    if (!walletAddress || batchedTrades.length === 0) {
      return;
    }

    try {
      const txHash = await executeBatch(walletAddress);

      addToast(
        `Successfully executed ${batchedTrades.length} prediction${batchedTrades.length !== 1 ? 's' : ''}`,
        'success',
        txHash
      );

      clearBatch();
      setShowBatchModal(false);
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message === 'Transaction rejected by user') {
          addToast('Transaction rejected', 'error');
        } else if (err.message.toLowerCase().includes('insufficient')) {
          addToast('Insufficient USDC balance', 'error');
        } else if (err.message.toLowerCase().includes('network')) {
          addToast('Network error. Please try again.', 'error');
        } else {
          addToast(`Transaction failed: ${err.message}`, 'error');
        }
      } else {
        addToast('Unknown error occurred', 'error');
      }
    }
  }, [walletAddress, batchedTrades, executeBatch, clearBatch, addToast]);

  const handleBatchCancel = useCallback(() => {
    setShowBatchModal(false);
  }, []);

  const handleShowBatch = useCallback(() => {
    if (batchedTrades.length > 0) {
      setShowBatchModal(true);
    }
  }, [batchedTrades]);

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
      <CardStack
        key={filterKey}
        pairs={pairs}
        onSwipe={handleSwipe}
        betSize={betSize}
        marketData={marketData}
        onRefresh={fetchOrders}
        batchedCount={batchedTrades.length}
        onShowBatch={handleShowBatch}
      />
      <BatchConfirmationModal
        isOpen={showBatchModal}
        batchedTrades={batchedTrades}
        totalCollateral={totalCollateralNeeded}
        onConfirm={handleBatchConfirm}
        onCancel={handleBatchCancel}
        isExecuting={isExecuting}
      />
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </>
  );
};

export default SwipeView;
