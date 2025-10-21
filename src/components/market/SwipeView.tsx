import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useOrders } from '@/src/hooks/useOrders';
import { useTrading } from '@/src/hooks/useTrading';
import { pairBinaryOptions } from '@/src/utils/binaryPairing';
import CardStack from './CardStack';
import ToastContainer, { useToastManager } from '../shared/ToastContainer';
import { BinaryPair } from '@/src/types/prediction';

interface SwipeViewProps {
  walletAddress: string | null;
}

const DEFAULT_BET_SIZE = 0.1;

const SwipeView: React.FC<SwipeViewProps> = ({ walletAddress }) => {
  const { orders, marketData, loading, error, fetchOrders, filterBinaries } = useOrders();
  const { executeTrade } = useTrading();
  const { toasts, addToast, removeToast } = useToastManager();

  useEffect(() => {
    if (walletAddress) {
      fetchOrders();
    }
  }, [walletAddress, fetchOrders]);

  // Memoize pairs with deep comparison by IDs to prevent unnecessary re-renders
  const pairs = useMemo(() => {
    const binaries = filterBinaries();
    const rawBinaries = binaries.map(parsed => parsed.rawOrder);
    const newPairs = pairBinaryOptions(rawBinaries);

    // Return new pairs array but preserve identity if IDs match
    // This ensures React.memo and key matching work correctly
    return newPairs;
  }, [filterBinaries, orders]);

  const handleSwipe = useCallback(async (pair: BinaryPair, action: 'yes' | 'no') => {
    if (!walletAddress) {
      addToast('Wallet not connected', 'error');
      throw new Error('Wallet not connected');
    }

    const selectedOrder = action === 'yes' ? pair.callOption : pair.putOption;

    try {
      addToast('Checking USDC allowance...', 'info');

      const txHash = await executeTrade(selectedOrder, DEFAULT_BET_SIZE, walletAddress);

      addToast(
        `Successfully ${action === 'yes' ? 'bought CALL' : 'bought PUT'} for ${pair.underlying}`,
        'success',
        txHash
      );
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
      throw err;
    }
  }, [walletAddress, executeTrade, addToast]);

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
      <CardStack
        pairs={pairs}
        onSwipe={handleSwipe}
        betSize={DEFAULT_BET_SIZE}
        marketData={marketData}
        onRefresh={fetchOrders}
      />
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </>
  );
};

export default SwipeView;
