import { CartButton, CartDrawer } from '@/src/components/cart';
import { useCart } from '@/src/contexts/CartContext';
import { useLocalStorage } from '@/src/hooks/useLocalStorage';
import { useOrders } from '@/src/hooks/useOrders';
import { buildBuyOptionForCart } from '@/src/services/cartService';
import { BinaryPair, ExpiryFilter as ExpiryFilterType } from '@/src/types/prediction';
import { pairBinaryOptions } from '@/src/utils/binaryPairing';
import { countPairsByExpiry, filterPairsByExpiry, sortPairsByExpiry } from '@/src/utils/expiryFiltering';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Address } from 'viem';
import ToastContainer, { useToastManager } from '../shared/ToastContainer';
import CardStack from './CardStack';
import ExpiryFilter from './ExpiryFilter';

interface SwipeViewProps {
  walletAddress: string | null;
}

const SwipeView: React.FC<SwipeViewProps> = ({ walletAddress }) => {
  const { orders, marketData, loading, error, fetchOrders, filterBinaries } = useOrders();
  const { toasts, addToast, removeToast } = useToastManager();
  const [expiryFilter, setExpiryFilter] = useState<ExpiryFilterType>('all');
  const [filterKey, setFilterKey] = useState(0);

  const storageKey = walletAddress ? `betSize_${walletAddress}` : 'betSize_null';
  const [betSize] = useLocalStorage<number>(storageKey, 1);

  // Cart state
  const { addItem } = useCart();
  // const [isCartMode, setIsCartMode] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleFilterChange = useCallback((newFilter: ExpiryFilterType) => {
    setExpiryFilter(newFilter);
    setFilterKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (walletAddress) {
      fetchOrders();
    }
  }, [walletAddress, fetchOrders]);

  // State for pairs, so we can update them in place
  const [allPairs, setAllPairs] = useState<BinaryPair[]>([]);

  // Initial load and on wallet change
  useEffect(() => {
    if (walletAddress) {
      fetchOrders();
    }
  }, [walletAddress, fetchOrders]);

  // Update allPairs whenever orders change
  useEffect(() => {
    const binaries = filterBinaries();
    const rawBinaries = binaries.map(parsed => parsed.rawOrder);
    const newPairs = sortPairsByExpiry(pairBinaryOptions(rawBinaries));
    setAllPairs(newPairs);
  }, [filterBinaries, orders]);

  // Periodically refresh orders every 30s and update pairs in place
  useEffect(() => {
    const interval = setInterval(async () => {
      await fetchOrders();
      // After fetchOrders, orders will update and allPairs will update via above effect
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Count pairs by expiry category
  const expiryCounts = useMemo(() => countPairsByExpiry(allPairs), [allPairs]);

  // Filter pairs based on selected expiry filter
  const pairs = useMemo(() => filterPairsByExpiry(allPairs, expiryFilter), [allPairs, expiryFilter]);

  const handleSwipe = useCallback(async (pair: BinaryPair, action: 'yes' | 'no') => {
    if (!walletAddress) {
      addToast('Wallet not connected', 'error');
      throw new Error('Wallet not connected');
    }

    try {
      const cartItem = await buildBuyOptionForCart(pair, action, betSize, walletAddress as Address);
      addItem(cartItem);
      addToast(
        `Added ${action === 'yes' ? 'UP' : 'DOWN'} bet on ${pair.underlying} to cart!`,
        'success'
      );
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : 'Failed to add to cart',
        'error'
      );
    }
  }, [walletAddress, betSize, addToast, addItem]);


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
        onAllCardsReviewed={async () => {
          addToast("You're all caught up!", 'success');
          await fetchOrders();
        }}
      />

      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />

      {/* Floating cart button */}
      <CartButton onClick={() => setIsCartOpen(true)} />

      {/* Cart drawer */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        onSuccess={(txHash) => {
          addToast('Batch executed successfully!', 'success', txHash);
          setIsCartOpen(false);
        }}
        walletAddress={walletAddress}
      />
    </>
  );
};

export default SwipeView;
