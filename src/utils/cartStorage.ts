import type { CartTransaction, CartState } from '@/src/types/cart';

const CART_STORAGE_KEY = 'optionbook_cart';
const CART_EXPIRY_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export const cartStorage = {
  /**
   * Remove expired transactions (older than 24 hours)
   */
  removeExpiredTransactions(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const transactions = this.getTransactions();
      const now = Date.now();
      const filtered = transactions.filter(tx => {
        const age = now - tx.timestamp;
        return age < CART_EXPIRY_TIME;
      });

      // Only update if some transactions were removed
      if (filtered.length !== transactions.length) {
        console.log(`Removed ${transactions.length - filtered.length} expired cart items`);
        const state: CartState = {
          transactions: filtered,
          lastUpdated: Date.now(),
        };

        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state, (key, value) => {
          if (typeof value === 'bigint') {
            return value.toString();
          }
          return value;
        }));

        // Dispatch custom event for same-window updates
        window.dispatchEvent(new Event('cartUpdated'));
      }
    } catch (error) {
      console.error('Failed to remove expired transactions:', error);
    }
  },

  /**
   * Get all transactions from cart (automatically removes expired ones)
   */
  getTransactions(): CartTransaction[] {
    if (typeof window === 'undefined') {
      return [];
    }

    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
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

      // Filter out expired transactions
      const now = Date.now();
      const validTransactions = state.transactions.filter(tx => {
        const age = now - tx.timestamp;
        return age < CART_EXPIRY_TIME;
      });

      // If some were expired, update storage
      if (validTransactions.length !== state.transactions.length) {
        console.log(`Auto-removed ${state.transactions.length - validTransactions.length} expired cart items`);
        const newState: CartState = {
          transactions: validTransactions,
          lastUpdated: Date.now(),
        };
        localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(newState, (key, value) => {
          if (typeof value === 'bigint') {
            return value.toString();
          }
          return value;
        }));
      }

      return validTransactions;
    } catch (error) {
      console.error('Failed to load cart transactions:', error);
      return [];
    }
  },

  /**
   * Add a transaction to cart
   */
  addTransaction(transaction: CartTransaction): void {
    if (typeof window === 'undefined') {
      throw new Error('Cart storage can only be accessed on client side');
    }

    try {
      const transactions = this.getTransactions();
      transactions.push(transaction);

      const state: CartState = {
        transactions,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state, (key, value) => {
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
   */
  removeTransactions(ids: string[]): void {
    if (typeof window === 'undefined') {
      throw new Error('Cart storage can only be accessed on client side');
    }

    try {
      const transactions = this.getTransactions();
      const filtered = transactions.filter(tx => !ids.includes(tx.id));

      const state: CartState = {
        transactions: filtered,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state, (key, value) => {
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
      localStorage.removeItem(CART_STORAGE_KEY);

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
    return transactions.reduce((total, tx) => {
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
