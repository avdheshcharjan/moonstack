import type { Address, Hex } from 'viem';
import { createSmartAccountWithPaymaster } from '@/src/lib/smartAccount';
import { needsApproval, encodeUSDCApprove, getUSDCBalance, formatUSDC } from '@/src/utils/usdcApproval';
import { OPTION_BOOK_ADDRESS, USDC_ADDRESS } from '@/src/utils/contracts';
import type { CartTransaction } from '@/src/types/cart';
import type { BatchBet } from '@/src/hooks/useBatchTransactions';

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
 */
export async function executeBatchTransactions(
  items: BatchBet[] | CartTransaction[],
  userAddress: Address
): Promise<BatchTransactionResult[] | BatchExecutionResult> {
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

  // Otherwise, it's CartTransaction[] - call the main implementation
  const transactions = items as CartTransaction[];

  try {
    if (transactions.length === 0) {
      throw new Error('No transactions to execute');
    }

    console.log('Batch execution starting...');
    console.log('Total transactions:', transactions.length);

    // Calculate total USDC needed from cart transactions
    const totalUSDC = transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);
    console.log('Total USDC needed:', formatUSDC(totalUSDC), 'USDC');

    // Create smart account client with paymaster
    const smartAccountClient = await createSmartAccountWithPaymaster(userAddress);
    const smartAccountAddress = smartAccountClient.account.address;
    console.log('Smart account address:', smartAccountAddress);

    // Check balance on EOA wallet (not smart account)
    const balance = await getUSDCBalance(userAddress);
    console.log('User USDC balance:', formatUSDC(balance), 'USDC');

    if (balance < totalUSDC) {
      throw new Error(`Insufficient USDC balance. Need ${formatUSDC(totalUSDC)} USDC`);
    }

    // Build calls array
    const calls: { to: Address; data: Hex; value?: bigint }[] = [];

    // Check if approval needed for smart account (not EOA)
    const approvalNeeded = await needsApproval(
      smartAccountAddress,
      totalUSDC,
      OPTION_BOOK_ADDRESS as Address
    );

    // Add approval call FIRST if needed
    if (approvalNeeded) {
      console.log('Adding approval call for', formatUSDC(totalUSDC), 'USDC');
      const approveCallData = encodeUSDCApprove(totalUSDC);
      calls.push({
        to: USDC_ADDRESS as Address,
        data: approveCallData as Hex,
        value: 0n,
      });
    } else {
      console.log('Approval not needed - sufficient allowance');
    }

    // Add all fillOrder calls
    for (const tx of transactions) {
      calls.push({
        to: tx.to,
        data: tx.data,
        value: tx.value || 0n,
      });
    }

    console.log('Executing batch with', calls.length, 'calls via smart account + paymaster (gasless)');

    // Execute via smart account with paymaster (gasless)
    // Cast to any to avoid permissionless type errors
    const userOpHash: Hex = await (smartAccountClient as any).sendUserOperation({
      calls,
    });

    console.log('UserOperation submitted:', userOpHash);
    console.log('Waiting for transaction receipt...');

    // Wait for receipt to get transaction hash
    const receipt = await (smartAccountClient as any).waitForUserOperationReceipt({
      hash: userOpHash,
    });

    const txHash = receipt.receipt.transactionHash;
    console.log('Transaction confirmed:', txHash);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('Batch execution failed:', error);

    // TODO: Detect paymaster error (AA31) and offer user-paid fallback
    // For now, return error
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

