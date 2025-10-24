import type { Address, Hex } from 'viem';
import type { CartTransaction } from '@/src/types/cart';
import type { BatchBet } from '@/src/hooks/useBatchTransactions';
import { executeBatchWithPaymaster, isBasePaymasterConfigured } from '@/src/lib/basePaymaster';

export interface BatchExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface BatchTransactionResult {
  id: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  txHash?: Hex;
  error?: string;
}

/**
 * Execute batch transactions for old BatchBet interface (legacy support)
 * This is for backward compatibility with useBatchTransactions hook
 */
export async function executeBatchTransactions(
  bets: BatchBet[],
  ownerAddress: Address
): Promise<BatchTransactionResult[]>;

/**
 * Execute batch transactions for CartTransaction interface (new implementation)
 */
export async function executeBatchTransactions(
  transactions: CartTransaction[],
  userAddress: Address
): Promise<BatchExecutionResult>;

/**
 * Implementation that handles both interfaces
 * Now uses Base Paymaster for gasless batched transactions
 */
export async function executeBatchTransactions(
  items: BatchBet[] | CartTransaction[],
  userAddress: Address
): Promise<BatchTransactionResult[] | BatchExecutionResult> {
  console.log('========================================');
  console.log('🔍 executeBatchTransactions called');
  console.log('User Address:', userAddress);
  console.log('Items count:', items.length);
  console.log('========================================');

  // Check if it's the old BatchBet[] interface
  if (items.length > 0 && 'pair' in items[0]) {
    const bets = items as BatchBet[];
    const results: BatchTransactionResult[] = bets.map(bet => ({
      id: bet.id,
      status: 'failed' as const,
      error: 'Batch transaction logic for BatchBet is deprecated. Please use cart-based transactions.',
    }));
    return results;
  }

  // Otherwise, it's CartTransaction[] - use Base Paymaster for gasless execution
  const transactions = items as CartTransaction[];

  try {
    if (transactions.length === 0) {
      throw new Error('No transactions to execute');
    }

    console.log('🚀 Starting batch execution with Base Paymaster...');
    console.log('📦 Total transactions:', transactions.length);

    // Log each transaction detail
    transactions.forEach((tx, i) => {
      console.log(`\n📝 Transaction ${i + 1}:`, {
        id: tx.id,
        to: tx.to,
        description: tx.description,
        requiredUSDC: tx.requiredUSDC?.toString(),
        data: tx.data.slice(0, 10) + '...',
      });
    });

    // Check if Base Paymaster is configured
    if (!isBasePaymasterConfigured()) {
      throw new Error(
        'Base Paymaster not configured. Please set NEXT_PUBLIC_PAYMASTER_URL in your environment variables.'
      );
    }

    console.log('✅ Base Paymaster is configured');

    // Execute batch transactions gaslessly using Base Paymaster
    const result = await executeBatchWithPaymaster(transactions, userAddress);

    if (result.success) {
      console.log('✅ Batch execution successful!');
      console.log('🔗 Transaction hash:', result.txHash);
    } else {
      console.error('❌ Batch execution failed:', result.error);
    }

    return result;
  } catch (error) {
    console.error('❌ Batch execution error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

