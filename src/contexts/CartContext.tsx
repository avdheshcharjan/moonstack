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
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Address, Hex } from 'viem';
import { useWallet } from '../hooks/useWallet';
import { getUnderlyingAsset } from '../utils/binaryPairing';

/**
 * LocalStorage key prefix for cart data
 */
const CART_STORAGE_PREFIX = 'optionbook_cart_';

/**
 * Serializable cart item for localStorage
 * BigInt values are converted to strings for JSON serialization
 */
interface SerializableCartItem {
  id: string;
  pairId: string;
  addedAt: number;
  metadata: {
    marketName: string;
    optionType: 'CALL' | 'PUT';
    action: 'yes' | 'no';
    strikePrice: string;
    expiry: string; // BigInt converted to string
    expiryFormatted: string;
    usdcAmount: string; // BigInt converted to string
    usdcAmountFormatted: string;
    numContracts: string; // BigInt converted to string
    pricePerContract: string;
  };
  payload: {
    to: Address;
    data: Hex;
    value: Hex;
    signature: Hex;
    referrer: Address;
    orderParams: {
      maker: Address;
      orderExpiryTimestamp: string; // BigInt converted to string
      collateral: Address;
      isCall: boolean;
      priceFeed: Address;
      implementation: Address;
      isLong: boolean;
      maxCollateralUsable: string; // BigInt converted to string
      strikes: string[]; // BigInt[] converted to string[]
      expiry: string; // BigInt converted to string
      price: string; // BigInt converted to string
      numContracts: string; // BigInt converted to string
      extraOptionData: Hex;
    };
  };
}

/**
 * Converts a CartItem to a serializable format for localStorage
 */
function serializeCartItem(item: CartItem): SerializableCartItem {
  return {
    id: item.id,
    pairId: item.pairId,
    addedAt: item.addedAt,
    metadata: {
      ...item.metadata,
      expiry: item.metadata.expiry.toString(),
      usdcAmount: item.metadata.usdcAmount.toString(),
      numContracts: item.metadata.numContracts.toString(),
    },
    payload: {
      to: item.payload.to,
      data: item.payload.data,
      value: item.payload.value,
      signature: item.payload.signature,
      referrer: item.payload.referrer,
      orderParams: {
        maker: item.payload.orderParams.maker,
        orderExpiryTimestamp: item.payload.orderParams.orderExpiryTimestamp.toString(),
        collateral: item.payload.orderParams.collateral,
        isCall: item.payload.orderParams.isCall,
        priceFeed: item.payload.orderParams.priceFeed,
        implementation: item.payload.orderParams.implementation,
        isLong: item.payload.orderParams.isLong,
        maxCollateralUsable: item.payload.orderParams.maxCollateralUsable.toString(),
        strikes: item.payload.orderParams.strikes.map(s => s.toString()),
        expiry: item.payload.orderParams.expiry.toString(),
        price: item.payload.orderParams.price.toString(),
        numContracts: item.payload.orderParams.numContracts.toString(),
        extraOptionData: item.payload.orderParams.extraOptionData,
      },
    },
  };
}

/**
 * Converts a serializable cart item back to CartItem format
 */
function deserializeCartItem(serialized: SerializableCartItem): CartItem {
  return {
    id: serialized.id,
    pairId: serialized.pairId,
    addedAt: serialized.addedAt,
    metadata: {
      ...serialized.metadata,
      expiry: BigInt(serialized.metadata.expiry),
      usdcAmount: BigInt(serialized.metadata.usdcAmount),
      numContracts: BigInt(serialized.metadata.numContracts),
    },
    payload: {
      to: serialized.payload.to,
      data: serialized.payload.data,
      value: serialized.payload.value,
      signature: serialized.payload.signature,
      referrer: serialized.payload.referrer,
      orderParams: {
        maker: serialized.payload.orderParams.maker,
        orderExpiryTimestamp: BigInt(serialized.payload.orderParams.orderExpiryTimestamp),
        collateral: serialized.payload.orderParams.collateral,
        isCall: serialized.payload.orderParams.isCall,
        priceFeed: serialized.payload.orderParams.priceFeed,
        implementation: serialized.payload.orderParams.implementation,
        isLong: serialized.payload.orderParams.isLong,
        maxCollateralUsable: BigInt(serialized.payload.orderParams.maxCollateralUsable),
        strikes: serialized.payload.orderParams.strikes.map(s => BigInt(s)),
        expiry: BigInt(serialized.payload.orderParams.expiry),
        price: BigInt(serialized.payload.orderParams.price),
        numContracts: BigInt(serialized.payload.orderParams.numContracts),
        extraOptionData: serialized.payload.orderParams.extraOptionData,
      },
    },
  };
}

/**
 * Saves cart items to localStorage for a specific wallet
 */
function saveCartToLocalStorage(walletAddress: string | null, items: CartItem[]): void {
  if (!walletAddress || typeof window === 'undefined') return;

  try {
    const key = `${CART_STORAGE_PREFIX}${walletAddress.toLowerCase()}`;
    const serializedItems = items.map(serializeCartItem);
    localStorage.setItem(key, JSON.stringify(serializedItems));
    console.log(`💾 Cart saved to localStorage for ${walletAddress}`);
  } catch (error) {
    console.error('Failed to save cart to localStorage:', error);
  }
}

/**
 * Loads cart items from localStorage for a specific wallet
 */
function loadCartFromLocalStorage(walletAddress: string | null): CartItem[] {
  if (!walletAddress || typeof window === 'undefined') return [];

  try {
    const key = `${CART_STORAGE_PREFIX}${walletAddress.toLowerCase()}`;
    const stored = localStorage.getItem(key);

    if (!stored) return [];

    const serializedItems: SerializableCartItem[] = JSON.parse(stored);
    const items = serializedItems.map(deserializeCartItem);
    console.log(`📦 Cart loaded from localStorage for ${walletAddress}: ${items.length} items`);
    return items;
  } catch (error) {
    console.error('Failed to load cart from localStorage:', error);
    return [];
  }
}

/**
 * Clears cart data from localStorage for a specific wallet
 */
function clearCartFromLocalStorage(walletAddress: string | null): void {
  if (!walletAddress || typeof window === 'undefined') return;

  try {
    const key = `${CART_STORAGE_PREFIX}${walletAddress.toLowerCase()}`;
    localStorage.removeItem(key);
    console.log(`🗑️ Cart cleared from localStorage for ${walletAddress}`);
  } catch (error) {
    console.error('Failed to clear cart from localStorage:', error);
  }
}

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
  const { walletAddress } = useWallet();

  // State
  const [items, setItems] = useState<CartItem[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionStatus, setExecutionStatus] = useState<CartState['executionStatus']>();
  const [error, setError] = useState<string>();

  // Load cart from localStorage when wallet address changes
  useEffect(() => {
    console.log("Wallet address changed in CartContext:", walletAddress);
    if (walletAddress) {
      const loadedItems = loadCartFromLocalStorage(walletAddress);
      setItems(loadedItems);
    } else {
      setItems([]);
    }
  }, [walletAddress]);

  // Save cart to localStorage whenever items change
  useEffect(() => {
    if (walletAddress) {
      saveCartToLocalStorage(walletAddress, items);
    }
  }, [items, walletAddress]);

  // Computed values
  const totalUsdcRequired = useMemo(
    () => calculateTotalUsdcRequired(items),
    [items]
  );

  /**
   * Adds a new item to the cart
   * Generates a unique ID and timestamp for the item
   */
  const addItem = useCallback((item: Omit<CartItem, 'id' | 'addedAt'>, pairId: string) => {
    console.log('Wallet address ' + walletAddress);
    const newItem: CartItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      addedAt: Date.now(),
      pairId,
    };

    setItems(prev => [...prev, newItem]);
    console.log('✅ Added item to cart:', newItem);
  }, [walletAddress]);

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
    if (walletAddress) {
      clearCartFromLocalStorage(walletAddress);
    }
    console.log('🧹 Cart cleared');
  }, [walletAddress]);

  /**
   * Updates cart items with fresh order data from newly fetched pairs
   * Matches items by pairId and updates order parameters while preserving user's bet size
   * 
   * @param freshPairs - Array of BinaryPair objects with fresh order data
   */
  const updateCartWithFreshOrders = useCallback((freshPairs: any[]) => {
    if (items.length === 0) return;

    console.log(`🔄 Updating ${items.length} cart items with fresh order data...`);

    const updatedItems = items.map(item => {
      // Find matching pair by pairId
      const matchingPair = freshPairs.find(pair => pair.id === item.pairId);

      if (!matchingPair) {
        console.warn(`⚠️ No matching pair found for cart item ${item.pairId}`);
        return item;
      }

      try {
        // Get fresh order data based on action (yes = call, no = put)
        const freshOrder = item.metadata.action === 'yes'
          ? matchingPair.callOption
          : matchingPair.putOption;

        if (!freshOrder?.order) {
          console.warn(`⚠️ No fresh order data available for ${item.pairId}`);
          return item;
        }

        // Preserve user's bet size but use fresh order parameters
        const betSize = Number(item.metadata.usdcAmountFormatted);
        const pricePerContract = Number(freshOrder.order.price) / 1e8;
        const contractsToBuy = betSize / pricePerContract;
        const numContracts = BigInt(Math.floor(contractsToBuy * 1e6));
        const requiredAmount = BigInt(Math.floor(betSize * 1_000_000));

        // Update order parameters with fresh data
        const updatedOrderParams = {
          maker: freshOrder.order.maker as Address,
          orderExpiryTimestamp: BigInt(freshOrder.order.orderExpiryTimestamp),
          collateral: freshOrder.order.collateral as Address,
          isCall: freshOrder.order.isCall,
          priceFeed: freshOrder.order.priceFeed as Address,
          implementation: freshOrder.order.implementation as Address,
          isLong: freshOrder.order.isLong,
          maxCollateralUsable: BigInt(freshOrder.order.maxCollateralUsable),
          strikes: freshOrder.order.strikes.map((s: string) => BigInt(s)),
          expiry: BigInt(freshOrder.order.expiry),
          price: BigInt(freshOrder.order.price),
          numContracts: numContracts,
          extraOptionData: (freshOrder.order.extraOptionData || '0x') as Hex,
        };

        // Rebuild the transaction data with fresh signature
        const { encodeFunctionData } = require('viem');
        const { OPTION_BOOK_ABI, OPTION_BOOK_ADDRESS, REFERRER_ADDRESS } = require('../utils/contracts');

        const fillOrderData = encodeFunctionData({
          abi: OPTION_BOOK_ABI,
          functionName: 'fillOrder',
          args: [
            updatedOrderParams,
            freshOrder.signature as Hex,
            REFERRER_ADDRESS as Address,
          ],
        });

        // Return updated item
        return {
          ...item,
          payload: {
            ...item.payload,
            data: fillOrderData,
            signature: freshOrder.signature as Hex,
            orderParams: updatedOrderParams,
          },
          metadata: {
            ...item.metadata,
            numContracts,
            pricePerContract: pricePerContract.toFixed(4),
          },
        };
      } catch (error) {
        console.error(`Error updating cart item ${item.pairId}:`, error);
        return item;
      }
    });

    setItems(updatedItems);
    console.log('✅ Cart items updated with fresh order data');
  }, [items]);

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
      updateCartWithFreshOrders,
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
      updateCartWithFreshOrders,
      setExecutionStatus,
      setError,
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
