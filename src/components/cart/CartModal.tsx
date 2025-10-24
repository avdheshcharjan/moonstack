'use client';

import { useEffect, useState } from 'react';
import type { CartTransaction } from '@/src/types/cart';
import { cartStorage } from '@/src/utils/cartStorage';
import { executeBatchTransactions } from '@/src/services/batchExecution';
import Image from 'next/image';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCartUpdate?: () => void;
  walletAddress: string | null;
}

export function CartModal({ isOpen, onClose, onCartUpdate, walletAddress }: CartModalProps) {
  const [transactions, setTransactions] = useState<CartTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const address = walletAddress;

  // Debug: Log when cart receives wallet address
  useEffect(() => {
    console.log('🔍 CartModal received wallet address:', { walletAddress, address });
  }, [walletAddress, address]);

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

  const handleApproveAll = async () => {
    console.log('🔍 Cart approval check:', {
      address,
      walletAddress,
      hasAddress: !!address
    });

    if (!address) {
      console.error('❌ No wallet address found in cart');
      alert('Please sign in with Base first. If you just signed in, please try again.');
      return;
    }

    if (transactions.length === 0) {
      alert('No transactions to approve');
      return;
    }

    console.log('========== APPROVE ALL CLICKED ==========');
    console.log('Total transactions:', transactions.length);
    console.log('User address (Base Account):', address);
    console.log('=========================================');

    setIsProcessing(true);

    try {
      console.log('🚀 Starting gasless batch execution...');
      const result = await executeBatchTransactions(transactions, address as `0x${string}`);
      console.log('✅ Batch result:', result);

      if (result.success) {
        console.log('✅ All transactions successful, clearing cart');

        // Remove all transactions from cart
        const txIds = transactions.map(tx => tx.id);
        cartStorage.removeTransactions(txIds);
        onCartUpdate?.();

        alert(`All ${transactions.length} transactions executed successfully! 🎉\n\nTransaction Hash: ${result.txHash?.slice(0, 10)}...`);
        onClose();
      } else {
        console.error('❌ Batch execution failed:', result.error);
        alert(`Batch execution failed: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Error executing batch:', error);
      alert(error instanceof Error ? error.message : 'Failed to execute batch transactions');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDiscardAll = () => {
    if (transactions.length === 0) {
      return;
    }

    const confirmed = confirm(`Are you sure you want to discard all ${transactions.length} transaction(s)?`);

    if (confirmed) {
      console.log('Discarding all transactions');
      cartStorage.clearCart();
      onCartUpdate?.();
      onClose();
    }
  };

  const formatUSDC = (amount: bigint) => {
    return (Number(amount) / 1_000_000).toFixed(2);
  };

  // Extract coin info from market ID
  const getCoinInfo = (marketId?: string) => {
    if (!marketId) return { name: 'Unknown', ticker: 'N/A', icon: '/img/btc.png' };

    const lowerMarket = marketId.toLowerCase();

    if (lowerMarket.includes('btc') || lowerMarket.includes('bitcoin')) {
      return { name: 'Bitcoin', ticker: 'btc', icon: '/img/btc.png' };
    }
    if (lowerMarket.includes('eth') || lowerMarket.includes('ethereum')) {
      return { name: 'Ethereum', ticker: 'ETH', icon: '/img/eth.png' };
    }
    if (lowerMarket.includes('sol') || lowerMarket.includes('solana')) {
      return { name: 'Solana', ticker: 'SOL', icon: '/img/sol.png' };
    }
    if (lowerMarket.includes('bnb')) {
      return { name: 'Bnb', ticker: 'BNB', icon: '/img/bnb.png' };
    }
    if (lowerMarket.includes('xrp')) {
      return { name: 'Xrp', ticker: 'XRP', icon: '/img/xrp.png' };
    }

    return { name: marketId, ticker: marketId.substring(0, 3).toUpperCase(), icon: '/img/btc.png' };
  };

  if (!isOpen) {
    return null;
  }

  const totalUSDC = transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);

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
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">Ongoing</h2>
            <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
              {transactions.length}
            </span>
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

        {/* Main Content - Scrollable List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {transactions.length === 0 ? (
            <div className="text-center py-20">
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
              <p className="text-gray-600 text-sm">Add bets by swiping right on prediction cards</p>
            </div>
          ) : (
            transactions.map((tx, index) => {
              const coinInfo = getCoinInfo(tx.orderDetails?.marketId);
              const isPump = tx.orderDetails?.side === 'YES';
              const borderColor = isPump ? 'border-green-500' : 'border-red-500';

              return (
                <div
                  key={tx.id}
                  className={`bg-gray-900 rounded-2xl border-2 ${borderColor} p-4 transition-all hover:shadow-lg`}
                >
                  <div className="flex items-center gap-4">
                    {/* Coin Icon */}
                    <div className="w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <Image
                        src={coinInfo.icon}
                        alt={coinInfo.name}
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>

                    {/* Coin Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-white text-lg font-bold">{coinInfo.name}</h3>
                        <span className="text-gray-400 text-sm uppercase">{coinInfo.ticker}</span>
                      </div>
                      <p className={`text-sm font-semibold ${isPump ? 'text-green-400' : 'text-red-400'}`}>
                        Predicted {isPump ? 'Pump' : 'Dump'}
                      </p>
                    </div>

                    {/* Price Info */}
                    <div className="flex flex-col items-end gap-1">
                      <div className="text-right">
                        <p className="text-gray-400 text-xs">Entry</p>
                        <p className="text-white text-sm font-semibold">
                          ${formatUSDC(tx.requiredUSDC || 0n)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-xs">Current</p>
                        <p className="text-white text-sm font-semibold">
                          ${formatUSDC(tx.requiredUSDC || 0n)}
                        </p>
                      </div>
                    </div>

                    {/* Timer */}
                    <div className="flex flex-col items-end">
                      <p className="text-gray-400 text-xs mb-1">Ends in</p>
                      <div className="bg-purple-600 px-3 py-1 rounded-lg">
                        <p className="text-white text-xs font-bold">12M:57S</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer with Action Buttons */}
        {transactions.length > 0 && (
          <div className="border-t border-gray-800 p-4 space-y-3">
            {/* Total Amount */}
            <div className="flex items-center justify-between px-2">
              <span className="text-gray-400 text-sm font-medium">Total Amount</span>
              <span className="text-white text-xl font-bold">${formatUSDC(totalUSDC)} USDC</span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleDiscardAll}
                disabled={isProcessing}
                className="flex-1 py-4 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
              >
                Discard All
              </button>
              <button
                onClick={handleApproveAll}
                disabled={isProcessing}
                className="flex-1 py-4 rounded-xl font-bold text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95 relative"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Processing...
                  </span>
                ) : (
                  `Approve All (${transactions.length})`
                )}
              </button>
            </div>

            {/* Gasless Badge */}
            <div className="flex items-center justify-center gap-2 pt-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <p className="text-green-400 text-xs font-semibold">Gasless Transaction • Sponsored by Base Paymaster</p>
            </div>
          </div>
        )}

        {/* Processing Overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="bg-gray-800 rounded-2xl p-8 text-center max-w-sm mx-4">
              <div className="w-20 h-20 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-white text-xl font-bold mb-2">Executing Batch...</p>
              <p className="text-gray-400 text-sm mb-4">
                Processing {transactions.length} transaction(s) gaslessly
              </p>
              <div className="bg-gray-900 rounded-lg p-3 text-left">
                <p className="text-gray-500 text-xs mb-1">Status</p>
                <p className="text-green-400 text-sm font-semibold">⚡ Base Paymaster Active</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
