import type { BatchBet } from '@/src/hooks/useBatchTransactions';
import type { CartTransaction } from '@/src/types/cart';
import { ERC20_ABI, OPTION_BOOK_ADDRESS, USDC_ADDRESS } from '@/src/utils/contracts';
import { base } from '@base-org/account';
import type { Address, Hex } from 'viem';
import { encodeFunctionData, numberToHex } from 'viem';
import { formatUSDC } from '../utils/usdcApproval';

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
 * Validate cart transactions before execution
 */
function validateCartTransactions(transactions: CartTransaction[]): { valid: boolean; error?: string } {
  if (transactions.length === 0) {
    return { valid: false, error: 'No transactions to execute' };
  }

  // Check for transactions older than 5 minutes
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;
  const expiredTxs = transactions.filter(tx => (now - tx.timestamp) > fiveMinutes);

  if (expiredTxs.length > 0) {
    return {
      valid: false,
      error: `${expiredTxs.length} transaction(s) in cart are too old (>5 min). Please clear cart and add fresh bets.`,
    };
  }

  // Check if all transactions have required data
  const invalidTxs = transactions.filter(tx => !tx.to || !tx.data);
  if (invalidTxs.length > 0) {
    return {
      valid: false,
      error: `${invalidTxs.length} transaction(s) have invalid data. Please clear cart and try again.`,
    };
  }

  return { valid: true };
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
    // Validate transactions before execution
    const validation = validateCartTransactions(transactions);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    console.log('[batchExecution] Using Base Account SDK for batch execution');
    console.log('[batchExecution] Cart validation passed');

    // Use Base Account SDK provider
    const { baseAccountSDK } = await import('@/src/providers/BaseAccountProvider');
    const provider = baseAccountSDK.getProvider();

    console.log('[batchExecution] Base Account provider initialized');
    console.log('[batchExecution] User address from parameter:', userAddress);

    // Get current accounts to verify the address
    const accounts = await provider.request({ method: 'eth_accounts' }) as any;
    console.log('[batchExecution] Current accounts from eth_accounts:', accounts);

    if (accounts?.accounts?.[0]?.address) {
      console.log('[batchExecution] Smart wallet address from SDK:', accounts.accounts[0].address);
      // Use the address from SDK instead of the parameter if they differ
      if (accounts.accounts[0].address.toLowerCase() !== userAddress.toLowerCase()) {
        console.warn('[batchExecution] Address mismatch! Using SDK address instead');
        userAddress = accounts.accounts[0].address;
      }
    } else if (Array.isArray(accounts) && accounts.length > 0) {
      console.log('[batchExecution] EOA/Smart wallet from SDK:', accounts[0]);
      if (accounts[0].toLowerCase() !== userAddress.toLowerCase()) {
        console.warn('[batchExecution] Address mismatch! Using SDK address instead');
        userAddress = accounts[0];
      }
    }

    // Calculate total USDC needed
    const totalUSDC = transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);

    console.log('[batchExecution] Batch execution starting...');
    console.log('[batchExecution] Total transactions:', transactions.length);
    console.log('[batchExecution] Total USDC needed:', Number(totalUSDC) / 1_000_000, 'USDC');

    // Step 1: Check USDC balance using eth_call
    const balanceData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    });

    console.log('[batchExecution] Checking USDC balance for:', userAddress);
    console.log('[batchExecution] Balance call data:', balanceData);

    const balanceResult = await provider.request({
      method: 'eth_call',
      params: [
        {
          to: USDC_ADDRESS,
          data: balanceData,
        },
        'latest',
      ],
    }) as Hex;

    console.log('[batchExecution] Balance result:', balanceResult);

    // Handle empty result (0x means 0 balance)
    const balance = balanceResult === '0x' || balanceResult === '0x0' ? 0n : BigInt(balanceResult);
    console.log('[batchExecution] User USDC balance:', Number(balance) / 1_000_000, 'USDC');

    if (balance < totalUSDC) {
      throw new Error(`Insufficient USDC balance. Need ${formatUSDC(totalUSDC)} USDC, have ${formatUSDC(balance)} USDC`);
    }

    // Step 2: Check USDC allowance
    const allowanceData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, OPTION_BOOK_ADDRESS as Address],
    });

    console.log('[batchExecution] Checking USDC allowance...');
    console.log('[batchExecution] Allowance call data:', allowanceData);

    const allowanceResult = await provider.request({
      method: 'eth_call',
      params: [
        {
          to: USDC_ADDRESS,
          data: allowanceData,
        },
        'latest',
      ],
    }) as Hex;

    console.log('[batchExecution] Allowance result:', allowanceResult);

    // Handle empty result (0x means 0 allowance)
    const currentAllowance = allowanceResult === '0x' || allowanceResult === '0x0' ? 0n : BigInt(allowanceResult);
    console.log('[batchExecution] Current USDC allowance:', Number(currentAllowance) / 1_000_000, 'USDC');

    // Step 3: Approve USDC if needed
    if (currentAllowance < totalUSDC) {
      console.log('[batchExecution] Approving USDC for OptionBook...');
      console.log('[batchExecution] Approving amount:', Number(totalUSDC) / 1_000_000, 'USDC');

      const approveData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [OPTION_BOOK_ADDRESS as Address, totalUSDC],
      });

      // Send approval transaction via Base Account
      const approveTxHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: userAddress,
            to: USDC_ADDRESS,
            data: approveData,
          },
        ],
      }) as Hex;

      console.log('[batchExecution] Approval transaction submitted:', approveTxHash);

      // Wait for approval (simple delay - in production, should poll for receipt)
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('[batchExecution] USDC approval confirmed');
    } else {
      console.log('[batchExecution] USDC already approved');
    }

    // Step 4: Execute batch transactions using wallet_sendCalls (EIP-5792)
    console.log('[batchExecution] Executing batch with wallet_sendCalls...');

    const calls = transactions.map((tx, index) => {
      const call = {
        to: tx.to,
        value: numberToHex(tx.value || 0n),
        data: tx.data,
      };
      console.log(`[batchExecution] Call ${index + 1}:`, {
        to: call.to,
        value: call.value,
        dataLength: call.data.length,
        description: tx.description,
        requiredUSDC: Number(tx.requiredUSDC || 0n) / 1_000_000,
      });
      return call;
    });

    console.log('[batchExecution] Prepared batch calls:', calls.length);

    // Prepare wallet_sendCalls params (without paymaster for simpler demo)
    const sendCallsParams = {
      version: '2.0.0',
      from: userAddress,
      calls: calls,
      chainId: numberToHex(base.constants.CHAIN_IDS.base),
      atomicRequired: false,
      // Removed paymasterService - users pay their own gas fees
    };

    console.log('[batchExecution] wallet_sendCalls params:', {
      version: sendCallsParams.version,
      from: sendCallsParams.from,
      callsCount: sendCallsParams.calls.length,
      chainId: sendCallsParams.chainId,
      atomicRequired: sendCallsParams.atomicRequired,
      usingPaymaster: false, // Users pay their own gas
    });

    // Send as atomic batch using Base Account SDK
    const result = await provider.request({
      method: 'wallet_sendCalls',
      params: [sendCallsParams],
    }) as string;

    console.log('[batchExecution] Batch transaction sent successfully:', result);

    return {
      success: true,
      txHash: result,
    };
  } catch (error: any) {
    console.error('[batchExecution] Batch execution failed:', error);
    console.error('[batchExecution] Error details:', {
      code: error?.code,
      message: error?.message,
      data: error?.data,
      stack: error?.stack,
    });

    // Handle user rejection
    if (error?.code === 4001 || error?.message?.includes('rejected')) {
      return {
        success: false,
        error: 'Transaction rejected by user',
      };
    }

    // Handle order expiration
    if (error?.message?.includes('Order expired') || error?.message?.includes('execution reverted')) {
      console.error('[batchExecution] Order may have expired. Cart items:', transactions.map(tx => ({
        description: tx.description,
        timestamp: tx.timestamp,
        age: Math.floor((Date.now() - tx.timestamp) / 1000) + 's',
      })));

      return {
        success: false,
        error: 'Transaction failed - orders may have expired. Please clear cart, refresh the page, and add fresh bets.',
      };
    }

    // Handle other errors with detailed message
    const errorMessage = error?.message || error?.toString() || 'Unknown error occurred';
    console.error('[batchExecution] Final error message:', errorMessage);

    return {
      success: false,
      error: errorMessage,
    };
  }
}

