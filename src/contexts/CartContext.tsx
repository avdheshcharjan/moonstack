/**
 * CartContext - State Management for Transaction Batching
 *
 * This context provides cart functionality for queuing option purchases
 * and executing them in batches using the Base SDK.
 *
 * Features:
 * - Add/remove items from cart
 * - Calculate total USDC required
 * - Execute batch transactions
 * - Track execution status
 * - Error handling
 *
 * @module CartContext
 */

'use client';

import {
  executeBatchTransactions,
  validateBatchReadiness,
  type StatusUpdateCallback,
} from '@/src/services/BatchExecutor';
import { calculateTotalUsdcRequired } from '@/src/services/BuyOptionBuilder';
import type {
  BatchExecutionResult,
  CartContextType,
  CartItem,
  CartState,
} from '@/src/types/cart';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Address, Hex } from 'viem';
import { getUnderlyingAsset } from '../utils/binaryPairing';

/**
 * Stores positions for all items in a batch transaction
 * 
 * @param items - Array of cart items that were executed
 * @param txHash - Transaction hash from the batch execution
 * @param walletAddress - User's wallet address
 */
async function storeBatchPositions(
  items: CartItem[],
  txHash: Hex,
  walletAddress: Address
): Promise<void> {
  try {
    console.log(`📝 Storing ${items.length} positions for batch transaction ${txHash}`);

    // Store each position
    const storePromises = items.map(async (item) => {
      try {
        const { payload, metadata } = item;
        const orderParams = payload.orderParams;

        const response = await fetch('/api/positions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet_address: walletAddress,
            tx_hash: txHash,
            strategy_type: 'BINARY', // Binary option
            underlying: getUnderlyingAsset(orderParams.priceFeed),
            is_call: orderParams.isCall,
            strikes: orderParams.strikes.map(s => s.toString()),
            strike_width: '0', // Binary options have no strike width
            expiry: new Date(Number(orderParams.expiry) * 1000).toISOString(),
            price_per_contract: orderParams.price.toString(),
            max_size: orderParams.maxCollateralUsable.toString(),
            collateral_used: metadata.usdcAmount.toString(),
            num_contracts: metadata.numContracts.toString(),
            raw_order: {
              order: {
                maker: orderParams.maker,
                orderExpiryTimestamp: orderParams.orderExpiryTimestamp.toString(),
                collateral: orderParams.collateral,
                isCall: orderParams.isCall,
                priceFeed: orderParams.priceFeed,
                implementation: orderParams.implementation,
                isLong: orderParams.isLong,
                maxCollateralUsable: orderParams.maxCollateralUsable.toString(),
                strikes: orderParams.strikes.map(s => s.toString()),
                expiry: orderParams.expiry.toString(),
                price: orderParams.price.toString(),
              },
              signature: payload.signature,
            },
            // Bet-specific fields
            decision: metadata.action.toUpperCase(),
            question: metadata.marketName,
            threshold: Number(orderParams.strikes[0]) / 1e8, // Strike price is the threshold
            betSize: Number(metadata.usdcAmountFormatted),
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Failed to store position for ${metadata.marketName}:`, errorText);
        } else {
          console.log(`✅ Position stored for ${metadata.marketName}`);
        }
      } catch (error) {
        console.error(`Error storing position for item:`, error);
        // Don't throw - we don't want to fail the entire batch if one position storage fails
      }
    });

    await Promise.all(storePromises);
    console.log('✅ All positions stored successfully');
  } catch (error) {
    console.error('Error storing batch positions:', error);
    // Don't throw - we don't want to fail the transaction if storage fails
  }
}

/**
 * Cart Context
 */
const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * Props for CartProvider component
 */
interface CartProviderProps {
  children: ReactNode;
}

/**
 * CartProvider - Provides cart state and actions to the app
 *
 * Wrap your app with this provider to enable cart functionality:
 *
 * @example
 * ```tsx
 * <CartProvider>
 *   <App />
 * </CartProvider>
 * ```
 */
export function CartProvider({ children }: CartProviderProps): JSX.Element {
  // State
  const [items, setItems] = useState<CartItem[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<CartState['executionStatus']>();
  const [error, setError] = useState<string>();

  // Computed values
  const totalUsdcRequired = useMemo(
    () => calculateTotalUsdcRequired(items),
    [items]
  );

  /**
   * Adds a new item to the cart
   * Generates a unique ID and timestamp for the item
   */
  const addItem = useCallback((item: Omit<CartItem, 'id' | 'addedAt'>) => {
    const newItem: CartItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      addedAt: Date.now(),
    };

    setItems((prev) => [...prev, newItem]);
    console.log('✅ Added item to cart:', newItem.metadata.marketName);
  }, []);

  /**
   * Removes an item from the cart by ID
   */
  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === itemId);
      if (item) {
        console.log('🗑️ Removed item from cart:', item.metadata.marketName);
      }
      return prev.filter((i) => i.id !== itemId);
    });
  }, []);

  /**
   * Clears all items from the cart
   */
  const clearCart = useCallback(() => {
    setItems([]);
    setError(undefined);
    setExecutionStatus(undefined);
    console.log('🧹 Cart cleared');
  }, []);

  /**
   * Executes all cart items in a single batch transaction
   *
   * Flow:
   * 1. Validate cart readiness (balance, expiries, etc.)
   * 2. Execute batch via BatchExecutor
   * 3. Clear cart on success
   * 4. Handle errors appropriately
   */
  const executeBatch = useCallback(
    async (userAddress: Address): Promise<BatchExecutionResult> => {
      try {
        // Reset state
        setError(undefined);
        setIsExecuting(true);
        setExecutionStatus('preparing');

        console.log(`🚀 Starting batch execution for ${items.length} items...`);

        // Validate batch is ready
        await validateBatchReadiness(items, userAddress);

        // Status update callback
        const onStatusUpdate: StatusUpdateCallback = (status, message) => {
          setExecutionStatus(status);
          console.log(`📊 Status: ${status}`, message || '');
        };

        // Execute batch
        const result = await executeBatchTransactions(
          items,
          userAddress,
          onStatusUpdate
        );

        // console.log(result)

        if (result && result.status === 'CONFIRMED') {
          const txnHash = result.transactionHash;
          console.log('✅ Batch execution successful!', txnHash);

          if (txnHash) {
            await storeBatchPositions(items, txnHash, userAddress);
          }

          clearCart();

          return result;
        } else {
          // Handle failure
          const errorMsg = result.error || 'Batch execution failed';
          setError(errorMsg);
          console.error('❌ Batch execution failed:', errorMsg);

          return result;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        console.error('❌ Batch execution error:', err);

        return {
          bundleId: '',
          status: 'FAILED',
          error: errorMsg,
        };
      } finally {
        setIsExecuting(false);
        setExecutionStatus(undefined);
      }
    },
    [items, clearCart]
  );

  // Context value
  const value: CartContextType = useMemo(
    () => ({
      // State
      items,
      totalUsdcRequired,
      isExecuting,
      executionStatus,
      error,

      // Actions
      addItem,
      removeItem,
      clearCart,
      executeBatch,
      setExecutionStatus,
      setError,
    }),
    [
      items,
      totalUsdcRequired,
      isExecuting,
      executionStatus,
      error,
      addItem,
      removeItem,
      clearCart,
      executeBatch,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

/**
 * useCart - Hook to access cart context
 *
 * Must be used within a CartProvider
 *
 * @example
 * ```tsx
 * const { items, addItem, executeBatch } = useCart();
 * ```
 *
 * @throws Error if used outside CartProvider
 */
export function useCart(): CartContextType {
  const context = useContext(CartContext);

  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }

  return context;
}

/**
 * Hook to get cart item count
 * Useful for displaying badge on cart icon
 */
export function useCartItemCount(): number {
  const { items } = useCart();
  return items.length;
}

/**
 * Hook to get formatted total USDC amount
 * Returns string like "$10.50"
 */
export function useCartTotal(): string {
  const { totalUsdcRequired } = useCart();
  const dollars = Number(totalUsdcRequired) / 1_000_000;
  return `$${dollars.toFixed(2)}`;
}

/**
 * Hook to check if cart is empty
 */
export function useIsCartEmpty(): boolean {
  const { items } = useCart();
  return items.length === 0;
}
