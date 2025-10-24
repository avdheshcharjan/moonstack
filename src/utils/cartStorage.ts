import type { CartTransaction, CartState } from '@/src/types/cart';

/**
 * Generate global storage key (no wallet-specific scoping)
 * @returns Storage key string
 */
const getCartStorageKey = (): string => {
  return 'optionbook_cart';
};

export const cartStorage = {
  /**
   * Get all transactions from cart
   */
  getTransactions(): CartTransaction[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const storageKey = getCartStorageKey();
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
   */
  addTransaction(transaction: CartTransaction): void {
    if (typeof window === 'undefined') {
      throw new Error('Cart storage can only be accessed on client side');
    }

    try {
      const storageKey = getCartStorageKey();
      const transactions = this.getTransactions();
      transactions.push(transaction);

      const state: CartState = {
        transactions,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(storageKey, JSON.stringify(state, (_key, value) => {
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
   */
  removeTransactions(ids: string[]): void {
    if (typeof window === 'undefined') {
      throw new Error('Cart storage can only be accessed on client side');
    }

    try {
      const storageKey = getCartStorageKey();
      const transactions = this.getTransactions();
      const filtered = transactions.filter((tx: CartTransaction) => !ids.includes(tx.id));

      const state: CartState = {
        transactions: filtered,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(storageKey, JSON.stringify(state, (_key, value) => {
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
   */
  clearCart(): void {
    if (typeof window === 'undefined') {
      throw new Error('Cart storage can only be accessed on client side');
    }

    try {
      const storageKey = getCartStorageKey();
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
   */
  getTotalUSDC(): bigint {
    const transactions = this.getTransactions();
    return transactions.reduce((total: bigint, tx: CartTransaction) => {
      return total + (tx.requiredUSDC || 0n);
    }, 0n);
  },

  /**
   * Get cart transaction count
   */
  getCount(): number {
    return this.getTransactions().length;
  },
};
