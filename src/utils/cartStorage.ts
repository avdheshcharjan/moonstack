import type { Address } from 'viem';
import type { CartTransaction, CartState } from '@/src/types/cart';

/**
 * Generate wallet-specific storage key
 * @param walletAddress - Optional wallet address for scoping
 * @returns Storage key string
 */
const getCartStorageKey = (walletAddress?: Address | null): string => {
  if (walletAddress) {
    return `optionbook_cart_${walletAddress}`;
  }
  // Fallback for backward compatibility
  return 'optionbook_cart';
};

export const cartStorage = {
  /**
   * Get all transactions from cart
   * @param walletAddress - Optional wallet address for wallet-specific cart
   */
  getTransactions(walletAddress?: Address | null): CartTransaction[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const storageKey = getCartStorageKey(walletAddress);
      const stored = localStorage.getItem(storageKey);
      if (!stored) {
        return [];
      }

      const state: CartState = JSON.parse(stored, (key, value) => {
        // Revive bigint values
        if (key === 'value' || key === 'requiredUSDC') {
          return value ? BigInt(value) : undefined;
        }
        return value;
      });

      return state.transactions;
    } catch (error) {
      console.error('Failed to load cart transactions:', error);
      return [];
    }
  },

  /**
   * Add a transaction to cart
   * @param transaction - Transaction to add
   * @param walletAddress - Optional wallet address for wallet-specific cart
   */
  addTransaction(transaction: CartTransaction, walletAddress?: Address | null): void {
    if (typeof window === 'undefined') {
      throw new Error('Cart storage can only be accessed on client side');
    }

    try {
      const storageKey = getCartStorageKey(walletAddress);
      const transactions = this.getTransactions(walletAddress);
      transactions.push(transaction);

      const state: CartState = {
        transactions,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(storageKey, JSON.stringify(state, (key, value) => {
        // Serialize bigint values
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      }));

      // Dispatch custom event for same-window updates
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Failed to add transaction to cart:', error);
      throw error;
    }
  },

  /**
   * Remove transactions by IDs
   * @param ids - Array of transaction IDs to remove
   * @param walletAddress - Optional wallet address for wallet-specific cart
   */
  removeTransactions(ids: string[], walletAddress?: Address | null): void {
    if (typeof window === 'undefined') {
      throw new Error('Cart storage can only be accessed on client side');
    }

    try {
      const storageKey = getCartStorageKey(walletAddress);
      const transactions = this.getTransactions(walletAddress);
      const filtered = transactions.filter(tx => !ids.includes(tx.id));

      const state: CartState = {
        transactions: filtered,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(storageKey, JSON.stringify(state, (key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      }));

      // Dispatch custom event for same-window updates
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Failed to remove transactions from cart:', error);
      throw error;
    }
  },

  /**
   * Clear all transactions from cart
   * @param walletAddress - Optional wallet address for wallet-specific cart
   */
  clearCart(walletAddress?: Address | null): void {
    if (typeof window === 'undefined') {
      throw new Error('Cart storage can only be accessed on client side');
    }

    try {
      const storageKey = getCartStorageKey(walletAddress);
      localStorage.removeItem(storageKey);

      // Dispatch custom event for same-window updates
      window.dispatchEvent(new Event('cartUpdated'));
    } catch (error) {
      console.error('Failed to clear cart:', error);
      throw error;
    }
  },

  /**
   * Get total USDC required for cart transactions
   * @param walletAddress - Optional wallet address for wallet-specific cart
   */
  getTotalUSDC(walletAddress?: Address | null): bigint {
    const transactions = this.getTransactions(walletAddress);
    return transactions.reduce((total, tx) => {
      return total + (tx.requiredUSDC || 0n);
    }, 0n);
  },

  /**
   * Get cart transaction count
   * @param walletAddress - Optional wallet address for wallet-specific cart
   */
  getCount(walletAddress?: Address | null): number {
    return this.getTransactions(walletAddress).length;
  },
};
