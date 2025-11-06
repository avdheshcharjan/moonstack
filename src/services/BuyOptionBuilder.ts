/**
 * BuyOptionBuilder - Transaction Payload Generator
 *
 * This module handles the generation of transaction payloads for option purchases
 * without immediately executing them. It prepares calldata and metadata that can be
 * queued in a cart for batch execution.
 *
 * @module BuyOptionBuilder
 */

import {
  CartItem,
  CartItemMetadata,
  OrderParams,
  TransactionPayload,
} from '@/src/types/cart';
import type { BinaryPair } from '@/src/types/prediction';
import {
  OPTION_BOOK_ABI,
  OPTION_BOOK_ADDRESS,
  REFERRER_ADDRESS
} from '@/src/utils/contracts';
import { Address, Hex, encodeFunctionData } from 'viem';

/**
 * Result of building a buy option transaction payload
 */
export interface BuildBuyOptionResult {
  /** The complete cart item ready to be added to cart */
  cartItem: Omit<CartItem, 'id' | 'addedAt'>;

  /** USDC amount required for this purchase (in base units) */
  usdcRequired: bigint;

  /** Number of contracts being purchased */
  numContracts: bigint;
}

/**
 * Builds a transaction payload for buying an option without executing it
 *
 * This function prepares all the data needed for a fillOrder transaction:
 * - Encodes the fillOrder calldata
 * - Constructs order parameters with proper BigInt scaling
 * - Generates display metadata for UI
 * - Validates order data and calculations
 *
 * @param pair - The binary pair containing call and put options
 * @param action - User's choice: 'yes' for CALL, 'no' for PUT
 * @param betSize - Amount of USDC to spend (in dollars, e.g., 10.5)
 * @param userAddress - User's wallet address (not used in calldata, for validation)
 * @returns BuildBuyOptionResult containing cart item and required USDC
 * @throws Error if order data is invalid or calculations fail
 */
export async function buildBuyOptionPayload(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  userAddress: Address
): Promise<BuildBuyOptionResult> {
  // Step 1: Select the correct order based on action
  const order = action === 'yes' ? pair.callOption : pair.putOption;

  if (!order?.order) {
    throw new Error(`No ${action === 'yes' ? 'CALL' : 'PUT'} order available for this market`);
  }

  // Step 2: Validate order type matches action
  const expectedIsCall = action === 'yes';
  if (order.order.isCall !== expectedIsCall) {
    throw new Error(
      `Order type mismatch: expected ${expectedIsCall ? 'CALL' : 'PUT'}, got ${order.order.isCall ? 'CALL' : 'PUT'
      }`
    );
  }

  // Step 3: Calculate number of contracts and required USDC
  // Price from API is in 8 decimals (e.g., 50000000 = 0.5 USDC per contract)
  const pricePerContract = Number(order.order.price) / 1e8;

  // Minimum bet size check
  const MIN_BET_SIZE = 0.001; // $1 minimum
  if (betSize < MIN_BET_SIZE) {
    throw new Error(`Bet size must be at least $${MIN_BET_SIZE}`);
  }

  // Calculate contracts to buy
  const contractsToBuy = betSize / pricePerContract;
  const numContracts = BigInt(Math.floor(contractsToBuy * 1e6)); // Scale to 6 decimals

  // Required USDC amount in base units (6 decimals)
  const requiredAmount = BigInt(Math.floor(betSize * 1_000_000));

  // Step 4: Validate against maxCollateralUsable
  const collateralNeeded = (numContracts * BigInt(order.order.price)) / BigInt(1e8);
  const maxCollateral = BigInt(order.order.maxCollateralUsable);

  if (collateralNeeded > maxCollateral) {
    throw new Error(
      `Order does not have enough collateral. Required: ${collateralNeeded.toString()}, Available: ${maxCollateral.toString()}`
    );
  }

  // Step 5: Construct order parameters
  const orderParams: OrderParams = {
    maker: order.order.maker as Address,
    orderExpiryTimestamp: BigInt(order.order.orderExpiryTimestamp),
    collateral: order.order.collateral as Address,
    isCall: order.order.isCall,
    priceFeed: order.order.priceFeed as Address,
    implementation: order.order.implementation as Address,
    isLong: order.order.isLong, // Keep original - signature will fail if modified
    maxCollateralUsable: BigInt(order.order.maxCollateralUsable),
    strikes: order.order.strikes.map((s: string) => BigInt(s)),
    expiry: BigInt(order.order.expiry),
    price: BigInt(order.order.price),
    numContracts: numContracts, // Calculated based on bet size
    extraOptionData: (order.order.extraOptionData || '0x') as Hex,
  };

  // Step 6: Encode fillOrder calldata
  const fillOrderData = encodeFunctionData({
    abi: OPTION_BOOK_ABI,
    functionName: 'fillOrder',
    args: [
      orderParams,
      order.signature as Hex,
      REFERRER_ADDRESS as Address,
    ],
  });

  // Step 7: Create transaction payload
  const payload: TransactionPayload = {
    to: OPTION_BOOK_ADDRESS as Address,
    data: fillOrderData,
    value: '0x0' as Hex, // No ETH value, USDC is ERC-20
    orderParams,
    signature: order.signature as Hex,
    referrer: REFERRER_ADDRESS as Address,
  };

  // Step 8: Create display metadata
  const expiryDate = new Date(Number(orderParams.expiry) * 1000);
  const metadata: CartItemMetadata = {
    marketName: pair.question,
    optionType: order.order.isCall ? 'CALL' : 'PUT',
    action,
    strikePrice: `$${(Number(orderParams.strikes[0]) / 1e8).toLocaleString()}`,
    expiry: orderParams.expiry,
    expiryFormatted: expiryDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    usdcAmount: requiredAmount,
    usdcAmountFormatted: (betSize).toFixed(2),
    numContracts,
    pricePerContract: pricePerContract.toFixed(4),
  };

  // Step 9: Construct cart item (without id and addedAt, those are added by cart manager)
  const cartItem: Omit<CartItem, 'id' | 'addedAt'> = {
    pairId: pair.id,
    payload,
    metadata,
  };

  return {
    cartItem,
    usdcRequired: requiredAmount,
    numContracts,
  };
}

/**
 * Formats a BigInt USDC amount to a human-readable string
 *
 * @param amount - USDC amount in base units (6 decimals)
 * @returns Formatted string (e.g., "10.50")
 */
export function formatUsdcAmount(amount: bigint): string {
  const dollars = Number(amount) / 1_000_000;
  return dollars.toFixed(2);
}

/**
 * Validates that all required fields are present in an order
 *
 * @param order - The order object to validate
 * @throws Error if any required field is missing or invalid
 */
export function validateOrder(order: any): void {
  console.log(order);
  const requiredFields = [
    'maker',
    'orderExpiryTimestamp',
    'collateral',
    'priceFeed',
    'implementation',
    'maxCollateralUsable',
    'strikes',
    'expiry',
    'price',
    // 'signature',
  ];

  for (const field of requiredFields) {
    if (order.order?.[field] === undefined || order.order?.[field] === null) {
      throw new Error(`Missing required order field: ${field}`);
    }
  }

  if (!order.signature) {
    throw new Error('Order signature is missing');
  }

  // Validate strikes array
  if (!Array.isArray(order.order.strikes) || order.order.strikes.length === 0) {
    throw new Error('Order must have at least one strike price');
  }

  // Validate expiry is in the future
  const now = Math.floor(Date.now() / 1000);
  const expiry = Number(order.order.expiry);
  if (expiry <= now) {
    throw new Error('Order has already expired');
  }

  // Validate order expiry timestamp
  const orderExpiry = Number(order.order.orderExpiryTimestamp);
  if (orderExpiry <= now) {
    throw new Error('Order offer has expired');
  }
}

/**
 * Calculates the total USDC required for multiple cart items
 *
 * @param items - Array of cart items
 * @returns Total USDC required in base units (6 decimals)
 */
export function calculateTotalUsdcRequired(items: CartItem[]): bigint {
  return items.reduce((total, item) => total + item.metadata.usdcAmount, 0n);
}

/**
 * Validates that user has sufficient USDC balance for a cart
 *
 * @param userBalance - User's USDC balance in base units
 * @param requiredAmount - Required USDC amount in base units
 * @throws Error if balance is insufficient
 */
export function validateSufficientBalance(
  userBalance: bigint,
  requiredAmount: bigint
): void {
  if (userBalance < requiredAmount) {
    const balanceFormatted = formatUsdcAmount(userBalance);
    const requiredFormatted = formatUsdcAmount(requiredAmount);
    throw new Error(
      `Insufficient USDC balance. Required: $${requiredFormatted}, Available: $${balanceFormatted}`
    );
  }
}
