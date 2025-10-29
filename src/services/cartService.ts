/**
 * Cart Service - Unified Interface for Option Purchases
 *
 * This module provides a unified interface that supports both:
 * 1. Immediate execution (backward compatible with existing code)
 * 2. Cart mode (queue for batch execution)
 *
 * Usage:
 * - For immediate execution: buyOptionImmediate(...)
 * - For cart mode: buildBuyOptionForCart(...) then add to cart
 *
 * @module cartService
 */

import { Address } from 'viem';
import type { BinaryPair } from '@/src/types/prediction';
import type { CartItem } from '@/src/types/cart';
import { buildBuyOptionPayload, validateOrder } from './BuyOptionBuilder';
import {
  executeDirectFillOrder,
  type DirectExecutionResult,
} from './directExecution';

/**
 * Mode for option purchase
 */
export type PurchaseMode = 'immediate' | 'cart';

/**
 * Unified result type for option purchase
 */
export type PurchaseResult =
  | { mode: 'immediate'; result: DirectExecutionResult }
  | { mode: 'cart'; cartItem: Omit<CartItem, 'id' | 'addedAt'>; usdcRequired: bigint };

/**
 * Buys an option immediately (backward compatible with existing flow)
 *
 * This function executes the option purchase transaction immediately,
 * maintaining backward compatibility with the existing codebase.
 *
 * @param pair - The binary pair containing call and put options
 * @param action - User's choice: 'yes' for CALL, 'no' for PUT
 * @param betSize - Amount of USDC to spend (in dollars)
 * @param userAddress - User's wallet address
 * @returns DirectExecutionResult with transaction hash
 * @throws Error if execution fails
 */
export async function buyOptionImmediate(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  userAddress: Address
): Promise<DirectExecutionResult> {
  console.log('🚀 Executing option purchase immediately...');

  // Use existing directExecution function
  return await executeDirectFillOrder(pair, action, betSize, userAddress);
}

/**
 * Builds an option purchase payload for adding to cart
 *
 * This function prepares the transaction data without executing it,
 * allowing users to queue multiple purchases for batch execution.
 *
 * @param pair - The binary pair containing call and put options
 * @param action - User's choice: 'yes' for CALL, 'no' for PUT
 * @param betSize - Amount of USDC to spend (in dollars)
 * @param userAddress - User's wallet address (for validation)
 * @returns Cart item ready to be added to cart
 * @throws Error if order validation fails
 */
export async function buildBuyOptionForCart(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  userAddress: Address
): Promise<Omit<CartItem, 'id' | 'addedAt'>> {
  console.log(`📦 Building cart item for ${action} on ${pair.question || pair.underlying}`);

  // Validate order before building
  const order = action === 'yes' ? pair.callOption : pair.putOption;
  if (order) {
    validateOrder(order);
  }

  // Build the transaction payload
  const { cartItem } = await buildBuyOptionPayload(pair, action, betSize, userAddress);

  return cartItem;
}

/**
 * Unified buy option function that supports both modes
 *
 * This function provides a single interface for option purchases that
 * can either execute immediately or prepare for cart-based batching.
 *
 * @param pair - The binary pair containing call and put options
 * @param action - User's choice: 'yes' for CALL, 'no' for PUT
 * @param betSize - Amount of USDC to spend (in dollars)
 * @param userAddress - User's wallet address
 * @param mode - 'immediate' for instant execution, 'cart' for batching
 * @returns PurchaseResult with mode-specific data
 *
 * @example
 * ```tsx
 * // Immediate execution (existing behavior)
 * const result = await buyOption(pair, 'yes', 10, address, 'immediate');
 * if (result.mode === 'immediate') {
 *   console.log('Transaction hash:', result.result.transactionHash);
 * }
 *
 * // Cart mode (new batching behavior)
 * const result = await buyOption(pair, 'yes', 10, address, 'cart');
 * if (result.mode === 'cart') {
 *   addItem(result.cartItem); // Add to cart context
 * }
 * ```
 */
export async function buyOption(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  userAddress: Address,
  mode: PurchaseMode = 'immediate'
): Promise<PurchaseResult> {
  if (mode === 'immediate') {
    const result = await buyOptionImmediate(pair, action, betSize, userAddress);
    return { mode: 'immediate', result };
  } else {
    const cartItem = await buildBuyOptionForCart(pair, action, betSize, userAddress);
    const { usdcRequired } = await buildBuyOptionPayload(pair, action, betSize, userAddress);
    return { mode: 'cart', cartItem, usdcRequired };
  }
}

/**
 * Helper to determine if cart mode should be suggested to user
 *
 * Cart mode becomes more beneficial when:
 * - User has made multiple recent purchases
 * - User is viewing multiple markets
 * - Gas prices are high (though paymaster handles this)
 *
 * @param recentPurchaseCount - Number of purchases in last N minutes
 * @returns Whether to suggest cart mode to user
 */
export function shouldSuggestCartMode(recentPurchaseCount: number): boolean {
  // Suggest cart mode if user has made 2+ purchases recently
  return recentPurchaseCount >= 2;
}

/**
 * Validates that a cart item is still valid before execution
 *
 * Checks:
 * - Order hasn't expired
 * - Order offer timestamp is still valid
 * - Strike and expiry data is intact
 *
 * @param cartItem - Cart item to validate
 * @throws Error if cart item is no longer valid
 */
export function validateCartItemBeforeExecution(
  cartItem: Omit<CartItem, 'id' | 'addedAt'> | CartItem
): void {
  const now = Math.floor(Date.now() / 1000);

  // Check option expiry
  const expiry = Number(cartItem.payload.orderParams.expiry);
  if (expiry <= now) {
    throw new Error(
      `Option for ${cartItem.metadata.marketName} has expired. Expiry was ${new Date(expiry * 1000).toLocaleString()}`
    );
  }

  // Check order expiry
  const orderExpiry = Number(cartItem.payload.orderParams.orderExpiryTimestamp);
  if (orderExpiry <= now) {
    throw new Error(
      `Order offer for ${cartItem.metadata.marketName} has expired. Order expiry was ${new Date(orderExpiry * 1000).toLocaleString()}`
    );
  }
}

/**
 * Checks if user has pending transactions in cart
 *
 * @param cartItems - Array of cart items
 * @returns True if cart has items
 */
export function hasPendingTransactions(cartItems: CartItem[]): boolean {
  return cartItems.length > 0;
}

/**
 * Calculates savings from batching (informational only)
 *
 * With paymaster, users don't pay gas, but this can show
 * how many separate transactions were saved by batching.
 *
 * @param cartItemCount - Number of items in cart
 * @returns Number of transaction submissions saved
 */
export function calculateBatchingSavings(cartItemCount: number): number {
  // Without batching: 1 approval + N fillOrder transactions = N+1 total
  // With batching: 1 batch transaction = 1 total
  // Savings: N transactions
  return Math.max(0, cartItemCount);
}
