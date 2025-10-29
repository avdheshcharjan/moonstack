import { createPublicClient, http, type Address, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { USDC_ADDRESS, OPTION_BOOK_ADDRESS, ERC20_ABI } from './contracts';

/**
 * Check USDC allowance for a given owner and spender
 * Per OptionBook.md section 2.4: Check allowance before approving
 */
export async function checkUSDCAllowance(
  owner: Address,
  spender: Address = OPTION_BOOK_ADDRESS as Address
): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: [owner, spender],
    authorizationList: undefined,
  }) as bigint;

  return allowance;
}

/**
 * Calculate total USDC needed for a batch of bets
 * Each bet requires: betSize * numContracts
 */
export function calculateTotalUSDCNeeded(bets: Array<{ betSize: number; numContracts: bigint }>): bigint {
  return bets.reduce((total, bet) => {
    // Convert betSize from dollars to USDC (6 decimals)
    const betSizeInUSDC = BigInt(Math.floor(bet.betSize * 1_000_000));
    return total + (betSizeInUSDC * bet.numContracts);
  }, 0n);
}

/**
 * Encode USDC approve call data
 */
export function encodeUSDCApprove(amount: bigint, spender: Address = OPTION_BOOK_ADDRESS as Address): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount],
  });
}

/**
 * Check if approval is needed for a batch of bets
 */
export async function needsApproval(
  owner: Address,
  totalAmount: bigint,
  spender: Address = OPTION_BOOK_ADDRESS as Address
): Promise<boolean> {
  const currentAllowance = await checkUSDCAllowance(owner, spender);
  return currentAllowance < totalAmount;
}

/**
 * Get USDC balance for an address
 * Per OptionBook.md section 2.4: Check balance before executing trade
 */
export async function getUSDCBalance(address: Address): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  const balance = await publicClient.readContract({
    address: USDC_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [address],
    authorizationList: undefined,
  }) as bigint;

  return balance;
}

/**
 * Format USDC amount to human-readable string (6 decimals)
 */
export function formatUSDC(amount: bigint): string {
  const dollars = Number(amount) / 1_000_000;
  return dollars.toFixed(2);
}

/**
 * Parse USDC amount from human-readable string to bigint (6 decimals)
 */
export function parseUSDC(amount: string): bigint {
  const dollars = parseFloat(amount);
  return BigInt(Math.floor(dollars * 1_000_000));
}
