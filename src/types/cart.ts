/**
 * Cart Types for Batch Transaction System
 *
 * This module defines TypeScript interfaces for the cart-based batching flow
 * that allows users to queue multiple option purchases and execute them
 * in a single batch transaction using the Base SDK.
 */

import { Address, Hex } from 'viem';

/**
 * Order parameters structure matching the OptionBook contract
 * These parameters are required for the fillOrder() function call
 */
export interface OrderParams {
  maker: Address;
  orderExpiryTimestamp: bigint;
  collateral: Address;
  isCall: boolean;
  priceFeed: Address;
  implementation: Address;
  isLong: boolean;
  maxCollateralUsable: bigint;
  strikes: bigint[];
  expiry: bigint;
  price: bigint;
  numContracts: bigint;
  extraOptionData: Hex;
}

/**
 * Display metadata for showing cart items to the user
 * Contains human-readable information about the option purchase
 */
export interface CartItemMetadata {
  /** Market/pair name (e.g., "BTC above $100k") */
  marketName: string;

  /** Option type: CALL for YES, PUT for NO */
  optionType: 'CALL' | 'PUT';

  /** User-friendly action label */
  action: 'yes' | 'no';

  /** Strike price in human-readable format */
  strikePrice: string;

  /** Expiry timestamp (Unix timestamp in seconds) */
  expiry: bigint;

  /** Expiry date formatted as readable string */
  expiryFormatted: string;

  /** Amount of USDC being spent (in USDC base units, 6 decimals) */
  usdcAmount: bigint;

  /** USDC amount formatted as decimal string (e.g., "10.50") */
  usdcAmountFormatted: string;

  /** Number of option contracts being purchased */
  numContracts: bigint;

  /** Price per contract in USDC */
  pricePerContract: string;
}

/**
 * Transaction payload representing a single queued fillOrder call
 * This is what gets stored in the cart before batch execution
 */
export interface TransactionPayload {
  /** Target contract address (OPTION_BOOK_ADDRESS) */
  to: Address;

  /** Encoded calldata for fillOrder(orderParams, signature, referrer) */
  data: Hex;

  /** Transaction value (always '0x0' for ERC-20 interactions) */
  value: Hex;

  /** Order parameters used in this transaction */
  orderParams: OrderParams;

  /** Order signature from the API */
  signature: Hex;

  /** Referrer address for tracking */
  referrer: Address;
}

/**
 * Complete cart item combining transaction payload and display metadata
 * This is the primary data structure stored in the cart state
 */
export interface CartItem {
  /** Unique identifier for this cart item */
  id: string;

  /** Transaction payload ready for batch execution */
  payload: TransactionPayload;

  /** Display metadata for UI rendering */
  metadata: CartItemMetadata;

  /** Timestamp when item was added to cart (milliseconds) */
  addedAt: number;
}

/**
 * Batch execution payload for EIP-5792 wallet_sendCalls
 * Contains all transactions to be executed in a single batch
 */
export interface BatchPayload {
  /** EIP-5792 version identifier */
  version: '2.0.0';

  /** User's wallet address initiating the batch */
  from: Address;

  /** Chain ID in hex format (e.g., '0x2105' for Base) */
  chainId: string;

  /** Array of transaction calls to execute atomically */
  calls: Array<{
    to: Address;
    value: Hex;
    data: Hex;
  }>;

  /** Optional capabilities for enhanced functionality */
  capabilities?: {
    /** Paymaster service for gasless transactions */
    paymasterService?: {
      url: string;
    };
  };
}

/**
 * Result returned after successful batch execution
 */
export interface BatchExecutionResult {
  /** Bundle ID for tracking batch status */
  bundleId: string;

  /** Final transaction hash once confirmed */
  transactionHash?: Hex;

  /** Status of the batch execution */
  status: 'PENDING' | 'CONFIRMED' | 'FAILED';

  /** Array of individual transaction hashes if available */
  receipts?: Hex[];

  /** Error message if execution failed */
  error?: string;
}

/**
 * Cart state interface for managing queued transactions
 */
export interface CartState {
  /** Array of items currently in the cart */
  items: CartItem[];

  /** Total USDC amount required for all cart items */
  totalUsdcRequired: bigint;

  /** Whether a batch execution is currently in progress */
  isExecuting: boolean;

  /** Current execution status */
  executionStatus?: 'preparing' | 'approving' | 'executing' | 'confirming';

  /** Error message if cart operation failed */
  error?: string;
}

/**
 * Cart actions interface for modifying cart state
 */
export interface CartActions {
  /** Add a new item to the cart */
  addItem: (item: Omit<CartItem, 'id' | 'addedAt'>) => void;

  /** Remove an item from the cart by ID */
  removeItem: (itemId: string) => void;

  /** Clear all items from the cart */
  clearCart: () => void;

  /** Execute all cart items in a single batch transaction */
  executeBatch: (userAddress: Address) => Promise<BatchExecutionResult>;

  /** Update execution status */
  setExecutionStatus: (status: CartState['executionStatus']) => void;

  /** Set error message */
  setError: (error: string | undefined) => void;
}

/**
 * Complete cart context combining state and actions
 */
export interface CartContextType extends CartState, CartActions { }

/**
 * Props for cart-related components
 */
export interface CartComponentProps {
  /** Optional CSS class name */
  className?: string;

  /** Whether to show the cart UI */
  isOpen?: boolean;

  /** Callback when cart is closed */
  onClose?: () => void;
}

/**
 * Individual cart item component props
 */
export interface CartItemComponentProps {
  /** The cart item to display */
  item: CartItem;

  /** Callback when remove button is clicked */
  onRemove: (itemId: string) => void;

  /** Optional CSS class name */
  className?: string;
}
