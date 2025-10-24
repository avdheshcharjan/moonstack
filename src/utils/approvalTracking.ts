import type { Address } from 'viem';
import { checkUSDCAllowance, getUSDCBalance } from './usdcApproval';
import { OPTION_BOOK_ADDRESS } from './contracts';

// USDC approval thresholds (6 decimals)
const ONE_USDC = 1_000_000n;
const FIVE_USDC = 5_000_000n;
const TEN_USDC = 10_000_000n;

interface ApprovalState {
  amount: string; // Stored as string for JSON compatibility
  timestamp: number;
}

/**
 * Generate wallet-specific approval storage key
 */
function getApprovalStorageKey(walletAddress: Address): string {
  return `usdc_approval_${walletAddress}`;
}

/**
 * Check if initial approval needed (first visit or allowance < 1 USDC)
 * @param walletAddress - EOA wallet address (where user funds are)
 * @param smartAccountAddress - Smart account address (what needs approval)
 */
export async function needsInitialApproval(
  walletAddress: Address,
  smartAccountAddress: Address
): Promise<boolean> {
  if (typeof window === 'undefined') {
    return false;
  }

  // Check if we have stored approval state
  const storedApproval = getApprovalState(walletAddress);

  // Check current allowance for smart account
  const currentAllowance = await checkUSDCAllowance(
    smartAccountAddress,
    OPTION_BOOK_ADDRESS as Address
  );

  // Need approval if: no stored approval OR allowance < 1 USDC
  if (!storedApproval || currentAllowance < ONE_USDC) {
    return true;
  }

  return false;
}

/**
 * Store approval state after successful approval
 * @param walletAddress - EOA wallet address
 * @param amount - Approved amount in USDC (6 decimals)
 */
export function storeApprovalState(
  walletAddress: Address,
  amount: bigint
): void {
  if (typeof window === 'undefined') {
    throw new Error('Approval storage can only be accessed on client side');
  }

  const storageKey = getApprovalStorageKey(walletAddress);
  const state: ApprovalState = {
    amount: amount.toString(), // Convert bigint to string for JSON
    timestamp: Date.now(),
  };

  try {
    localStorage.setItem(storageKey, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to store approval state:', error);
    throw error;
  }
}

/**
 * Get stored approval state
 * @param walletAddress - EOA wallet address
 * @returns Approval state or null if not found
 */
export function getApprovalState(
  walletAddress: Address
): { amount: bigint; timestamp: number } | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const storageKey = getApprovalStorageKey(walletAddress);

  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) {
      return null;
    }

    const state: ApprovalState = JSON.parse(stored);
    return {
      amount: BigInt(state.amount), // Convert string back to bigint
      timestamp: state.timestamp,
    };
  } catch (error) {
    console.error('Failed to load approval state:', error);
    return null;
  }
}

/**
 * Check if approval refresh needed (allowance < 1 USDC threshold)
 * @param walletAddress - EOA wallet address (where user funds are)
 * @param smartAccountAddress - Smart account address (what needs approval)
 */
export async function needsApprovalRefresh(
  walletAddress: Address,
  smartAccountAddress: Address
): Promise<boolean> {
  // Check current allowance for smart account
  const currentAllowance = await checkUSDCAllowance(
    smartAccountAddress,
    OPTION_BOOK_ADDRESS as Address
  );

  // Need refresh if allowance < 1 USDC
  return currentAllowance < ONE_USDC;
}

/**
 * Adaptive approval logic: try 10 → 5 → 1 USDC based on EOA wallet balance
 * @param walletAddress - EOA wallet address (where user funds are)
 * @returns Approved amount to use
 * @throws Error if balance < 1 USDC
 */
export async function getAdaptiveApprovalAmount(
  walletAddress: Address
): Promise<bigint> {
  // Check balance on EOA wallet (not smart account)
  const balance = await getUSDCBalance(walletAddress);

  // Try 10 USDC first
  if (balance >= TEN_USDC) {
    return TEN_USDC;
  }

  // Fall back to 5 USDC
  if (balance >= FIVE_USDC) {
    return FIVE_USDC;
  }

  // Fall back to 1 USDC
  if (balance >= ONE_USDC) {
    return ONE_USDC;
  }

  // Insufficient balance
  throw new Error(
    'You need at least 1 USDC to play. Please add funds to your wallet.'
  );
}
