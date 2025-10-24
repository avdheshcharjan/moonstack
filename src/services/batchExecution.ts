import type { Address, Hex } from 'viem';
import { numberToHex } from 'viem';
import { base } from '@base-org/account';
import { getBaseAccountProvider, checkBatchCapabilities } from '@/src/lib/smartAccount';
import { getCryptoKeyAccount } from '@base-org/account';
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

    // Get Base Account provider and address
    const provider = getBaseAccountProvider();

    // Get the crypto account - this will prompt for connection if needed
    const cryptoAccount = await getCryptoKeyAccount();
    if (!cryptoAccount?.account?.address) {
      throw new Error('Failed to get Base Account. Please try reconnecting your wallet.');
    }

    const baseAccountAddress = cryptoAccount.account.address as Address;
    console.log('Base Account address:', baseAccountAddress);

    // Check wallet capabilities
    const capabilities = await checkBatchCapabilities(baseAccountAddress);
    console.log('Wallet capabilities:', capabilities);

    if (!capabilities.atomicBatchSupported) {
      throw new Error('Wallet does not support atomic batching');
    }

    // Check balance on EOA wallet
    const balance = await getUSDCBalance(userAddress);
    console.log('User USDC balance:', formatUSDC(balance), 'USDC');

    if (balance < totalUSDC) {
      throw new Error(`Insufficient USDC balance. Need ${formatUSDC(totalUSDC)} USDC, have ${formatUSDC(balance)} USDC`);
    }

    // Build calls array for wallet_sendCalls
    const calls: { to: string; value: string; data: string }[] = [];

    // Check if approval needed for Base Account
    const approvalNeeded = await needsApproval(
      baseAccountAddress,
      totalUSDC,
      OPTION_BOOK_ADDRESS as Address
    );

    // Add approval call FIRST if needed
    if (approvalNeeded) {
      console.log('Adding approval call for', formatUSDC(totalUSDC), 'USDC');
      const approveCallData = encodeUSDCApprove(totalUSDC);
      calls.push({
        to: USDC_ADDRESS,
        value: numberToHex(0n),
        data: approveCallData,
      });
    } else {
      console.log('Approval not needed - sufficient allowance');
    }

    // Add all fillOrder calls
    for (const tx of transactions) {
      calls.push({
        to: tx.to,
        value: numberToHex(tx.value || 0n),
        data: tx.data,
      });
    }

    console.log('Executing batch with', calls.length, 'calls via wallet_sendCalls (gasless)');

    // Execute via wallet_sendCalls RPC method (EIP-5792)
    const batchCallId = await provider.request({
      method: 'wallet_sendCalls',
      params: [{
        version: '2.0.0',
        from: baseAccountAddress,
        chainId: numberToHex(base.constants.CHAIN_IDS.base),
        atomicRequired: true, // All calls must succeed or all fail
        calls: calls,
      }],
    });

    console.log('Batch call submitted:', batchCallId);
    console.log('Transaction will be processed by the network...');

    // Note: wallet_sendCalls returns a batch call ID, not a transaction hash
    // The transaction hash is available after the batch is mined
    return {
      success: true,
      txHash: batchCallId as string,
    };
  } catch (error: unknown) {
    console.error('Batch execution failed:', error);

    // Enhanced error handling
    const errorMessage = handleBatchError(error);

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
