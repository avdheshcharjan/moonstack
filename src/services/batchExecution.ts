import type { BatchBet } from '@/src/hooks/useBatchTransactions';
import { checkBatchCapabilities, getBaseAccountProvider, getBaseAccountAddress } from '@/src/lib/smartAccount';
import type { CartTransaction } from '@/src/types/cart';
import { OPTION_BOOK_ADDRESS, USDC_ADDRESS } from '@/src/utils/contracts';
import { encodeUSDCApprove, formatUSDC, getUSDCBalance, needsApproval } from '@/src/utils/usdcApproval';
import { base } from '@base-org/account';
import type { Address, Hex } from 'viem';
import { numberToHex } from 'viem';

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
    console.log('🔧 [batchExecution] Starting batch execution service...');

    if (transactions.length === 0) {
      console.error('❌ [batchExecution] No transactions to execute');
      throw new Error('No transactions to execute');
    }

    console.log('✅ [batchExecution] Batch execution starting...');
    console.log('📊 [batchExecution] Total transactions:', transactions.length);

    // Calculate total USDC needed from cart transactions
    const totalUSDC = transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);
    console.log('💰 [batchExecution] Total USDC needed:', formatUSDC(totalUSDC), 'USDC');

    // Get Base Account provider first
    console.log('🔌 [batchExecution] Getting Base Account provider...');
    let provider;
    try {
      provider = getBaseAccountProvider();
      console.log('✅ [batchExecution] Provider obtained successfully');
    } catch (error) {
      console.error('❌ [batchExecution] Failed to get provider:', error);
      throw new Error('Failed to get Base Account provider. Please try reconnecting.');
    }

    // Get the Base Account address - using same pattern as ApprovalModal
    console.log('🔍 [batchExecution] Getting Base Account address...');
    let baseAccountAddress: Address;
    try {
      baseAccountAddress = await getBaseAccountAddress();
      console.log('✅ [batchExecution] Base Account address:', baseAccountAddress);
    } catch (error) {
      console.error('❌ [batchExecution] Failed to get Base Account address:', error);
      throw new Error('Failed to access Base Account. Please sign in with "Sign in with Base" and try again.');
    }

    // Check wallet capabilities
    console.log('🔍 [batchExecution] Checking wallet capabilities...');
    let capabilities;
    try {
      capabilities = await checkBatchCapabilities(baseAccountAddress);
      console.log('✅ [batchExecution] Wallet capabilities:', JSON.stringify(capabilities, null, 2));
    } catch (error) {
      console.error('❌ [batchExecution] Failed to check capabilities:', error);
      throw new Error('Failed to verify wallet capabilities');
    }

    if (!capabilities.atomicBatchSupported) {
      console.error('❌ [batchExecution] Wallet does not support atomic batching');
      throw new Error('Wallet does not support atomic batching');
    }

    // Check balance on EOA wallet
    console.log('💰 [batchExecution] Checking USDC balance for user:', userAddress);
    let balance;
    try {
      balance = await getUSDCBalance(userAddress);
      console.log('✅ [batchExecution] User USDC balance:', formatUSDC(balance), 'USDC');
    } catch (error) {
      console.error('❌ [batchExecution] Failed to check balance:', error);
      throw new Error('Failed to check USDC balance');
    }

    if (balance < totalUSDC) {
      console.error('❌ [batchExecution] Insufficient balance:', formatUSDC(balance), 'USDC, need:', formatUSDC(totalUSDC), 'USDC');
      throw new Error(`Insufficient USDC balance. Need ${formatUSDC(totalUSDC)} USDC, have ${formatUSDC(balance)} USDC`);
    }

    // Build calls array for wallet_sendCalls
    console.log('🏗️ [batchExecution] Building calls array...');
    const calls: { to: string; value: string; data: string }[] = [];

    // Check if approval needed for Base Account
    console.log('🔍 [batchExecution] Checking if approval needed...');
    let approvalNeeded;
    try {
      approvalNeeded = await needsApproval(
        baseAccountAddress,
        totalUSDC,
        OPTION_BOOK_ADDRESS as Address
      );
      console.log('✅ [batchExecution] Approval needed:', approvalNeeded);
    } catch (error) {
      console.error('❌ [batchExecution] Failed to check approval:', error);
      throw new Error('Failed to check USDC approval status');
    }

    // Add approval call FIRST if needed
    if (approvalNeeded) {
      console.log('➕ [batchExecution] Adding approval call for', formatUSDC(totalUSDC), 'USDC');
      const approveCallData = encodeUSDCApprove(totalUSDC);
      calls.push({
        to: USDC_ADDRESS,
        value: numberToHex(0n),
        data: approveCallData,
      });
    } else {
      console.log('✅ [batchExecution] Approval not needed - sufficient allowance');
    }

    // Add all fillOrder calls
    console.log('➕ [batchExecution] Adding', transactions.length, 'fillOrder calls...');
    for (const tx of transactions) {
      calls.push({
        to: tx.to,
        value: numberToHex(tx.value || 0n),
        data: tx.data,
      });
    }

    console.log('📦 [batchExecution] Total calls in batch:', calls.length);
    console.log('🚀 [batchExecution] Executing batch via wallet_sendCalls (gasless)...');

    // Execute via wallet_sendCalls RPC method (EIP-5792)
    let batchCallId;
    try {
      const requestParams = {
        version: '2.0.0',
        from: baseAccountAddress,
        chainId: numberToHex(base.constants.CHAIN_IDS.base),
        atomicRequired: true, // All calls must succeed or all fail
        calls: calls,
      };

      console.log('📤 [batchExecution] Sending wallet_sendCalls request with params:', JSON.stringify({
        ...requestParams,
        calls: `${calls.length} calls`,
      }));

      batchCallId = await provider.request({
        method: 'wallet_sendCalls',
        params: [requestParams],
      });

      console.log('✅ [batchExecution] Batch call submitted successfully!');
      console.log('📝 [batchExecution] Batch call ID:', batchCallId);
    } catch (error) {
      console.error('❌ [batchExecution] wallet_sendCalls failed:', error);
      console.error('❌ [batchExecution] Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        code: (error as any)?.code,
        data: (error as any)?.data,
      });

      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to submit batch transaction to wallet');
    }

    console.log('✅ [batchExecution] Transaction will be processed by the network...');

    // Note: wallet_sendCalls returns a batch call ID, not a transaction hash
    // The transaction hash is available after the batch is mined
    return {
      success: true,
      txHash: batchCallId as string,
    };
  } catch (error: unknown) {
    console.error('❌ [batchExecution] BATCH EXECUTION FAILED');
    console.error('❌ [batchExecution] Error:', error);
    console.error('❌ [batchExecution] Error type:', typeof error);
    if (error instanceof Error) {
      console.error('❌ [batchExecution] Error message:', error.message);
      console.error('❌ [batchExecution] Error stack:', error.stack);
    }

    // Enhanced error handling
    const errorMessage = handleBatchError(error);
    console.error('❌ [batchExecution] Final error message:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Handle batch execution errors with specific error codes
 */
function handleBatchError(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const errorCode = (error as { code: number }).code;

    switch (errorCode) {
      case 4001:
        return 'User rejected the transaction';
      case 5740:
        return 'Batch too large for wallet to process. Try reducing the number of transactions.';
      case -32602:
        return 'Invalid request format. Please try again.';
      default:
        break;
    }
  }

  if (error instanceof Error) {
    // Check for paymaster errors (AA31)
    if (error.message.includes('AA31') || error.message.includes('paymaster')) {
      return 'Paymaster service unavailable. Please try again or contact support.';
    }

    return error.message;
  }

  return 'Unknown error occurred during batch execution';
}
