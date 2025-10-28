/**
 * BatchExecutor - Batch Transaction Execution via Base SDK
 *
 * This module handles the execution of multiple option purchase transactions
 * in a single batch using the Base Account SDK's EIP-5792 wallet_sendCalls method.
 *
 * Flow:
 * 1. Check user's USDC balance
 * 2. Check/handle USDC approval for total amount
 * 3. Batch all fillOrder transactions together
 * 4. Execute via wallet_sendCalls with paymaster support
 * 5. Poll for confirmation and return transaction hash
 *
 * @module BatchExecutor
 */

import { baseAccountSDK, getBaseAccountSDK } from '@/src/providers/BaseAccountProvider';
import type {
  BatchExecutionResult,
  BatchPayload,
  CartItem,
} from '@/src/types/cart';
import {
  BASE_CHAIN_ID,
  ERC20_ABI,
  OPTION_BOOK_ADDRESS,
  USDC_ADDRESS,
} from '@/src/utils/contracts';
import { BrowserProvider, ethers } from 'ethers';
import { Address, Hex, createPublicClient, encodeFunctionData, http } from 'viem';
import { base } from 'viem/chains';
import { calculateTotalUsdcRequired } from './BuyOptionBuilder';

/**
 * Paymaster configuration for gasless transactions
 */
const PAYMASTER_RPC_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';

/**
 * Status update callback type for progress tracking
 */
export type StatusUpdateCallback = (
  status: 'preparing' | 'checking_balance' | 'approving' | 'executing' | 'confirming',
  message?: string
) => void;

/**
 * Executes a batch of option purchase transactions
 *
 * This function orchestrates the complete batch execution flow:
 * - Validates user balance
 * - Handles USDC approval if needed (included in batch)
 * - Sends all transactions via EIP-5792 wallet_sendCalls
 * - Polls for confirmation and retrieves transaction hash
 *
 * @param cartItems - Array of cart items to execute
 * @param userAddress - User's wallet address
 * @param onStatusUpdate - Optional callback for status updates
 * @returns BatchExecutionResult with transaction hash and status
 * @throws Error if execution fails at any step
 */
export async function executeBatchTransactions(
  cartItems: CartItem[],
  userAddress: Address,
  onStatusUpdate?: StatusUpdateCallback
): Promise<BatchExecutionResult> {
  try {
    // Validate input
    if (cartItems.length === 0) {
      throw new Error('Cart is empty. Add items before executing batch.');
    }

    onStatusUpdate?.('preparing', 'Preparing batch transaction...');

    // Get Base Account SDK provider
    const baseAccountSDK = getBaseAccountSDK();
    const baseProvider = baseAccountSDK.getProvider();

    // Create public client for reading blockchain state
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Step 1: Calculate total USDC required
    const totalUsdcRequired = calculateTotalUsdcRequired(cartItems);

    onStatusUpdate?.('checking_balance', 'Checking USDC balance...');

    // Step 2: Check user's USDC balance
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    }) as bigint;

    if (balance < totalUsdcRequired) {
      const balanceFormatted = (Number(balance) / 1_000_000).toFixed(2);
      const requiredFormatted = (Number(totalUsdcRequired) / 1_000_000).toFixed(2);
      throw new Error(
        `Insufficient USDC balance. Required: $${requiredFormatted}, Available: $${balanceFormatted}`
      );
    }

    // Step 3: Check USDC allowance for OptionBook contract
    const currentAllowance = await publicClient.readContract({
      address: USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, OPTION_BOOK_ADDRESS as Address],
    }) as bigint;

    // Step 4: Build batch calls array
    const calls: Array<{ to: Address; value: Hex; data: Hex }> = [];

    // If approval is needed, add it as the first transaction in the batch
    if (currentAllowance < totalUsdcRequired) {
      onStatusUpdate?.('approving', `Approving $${(Number(totalUsdcRequired) / 1_000_000).toFixed(2)} USDC...`);

      const approvalData = encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [OPTION_BOOK_ADDRESS as Address, totalUsdcRequired],
      });

      calls.push({
        to: USDC_ADDRESS as Address,
        value: '0x0' as Hex,
        data: approvalData,
      });

      console.log(`📝 Added USDC approval to batch: ${totalUsdcRequired.toString()} units`);
    } else {
      console.log('✅ USDC already approved, skipping approval transaction');
    }

    // Step 5: Add all fillOrder transactions to the batch
    for (const item of cartItems) {
      calls.push({
        to: item.payload.to,
        value: item.payload.value,
        data: item.payload.data,
      });
    }

    console.log(`📦 Batch prepared with ${calls.length} transactions (${calls.length - (currentAllowance < totalUsdcRequired ? 1 : 0)} fillOrder calls)`);

    onStatusUpdate?.('executing', `Executing batch of ${cartItems.length} option purchases...`);

    // Step 6: Construct EIP-5792 batch payload
    const batchPayload: BatchPayload = {
      version: '2.0.0',
      from: userAddress,
      chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
      // chainId: numberToHex(base.constants.CHAIN_IDS.base),
      calls,
      // atomicRequired: true,
      capabilities: PAYMASTER_RPC_URL ? {
        paymasterService: {
          url: PAYMASTER_RPC_URL,
        },
      } : undefined,
    };

    // Step 7: Send batch via wallet_sendCalls
    console.log('🚀 Sending batch transaction via wallet_sendCalls...');
    const result = await baseProvider.request({
      method: 'wallet_sendCalls',
      params: [batchPayload],
    });

    //     const result = await provider.request({
    //   method: 'wallet_sendCalls',
    //   params: [{
    //     version: '2.0.0',
    //     from: fromAddress,
    //     chainId: numberToHex(base.constants.CHAIN_IDS.base),
    //     atomicRequired: true,
    //     calls: calls
    //   }]
    // });

    const bundleId = result as string;
    console.log(`📋 Batch submitted with bundle ID: ${bundleId}`);

    onStatusUpdate?.('confirming', 'Waiting for confirmation...');

    // Step 8: Poll for transaction hash
    const transactionHash = await pollForTransactionHash(
      baseProvider,
      bundleId,
      60, // max attempts
      2000 // 2 second interval
    );

    console.log(`✅ Batch confirmed! Transaction hash: ${transactionHash}`);

    return {
      bundleId,
      transactionHash,
      status: 'CONFIRMED',
      receipts: [transactionHash],
    };
  } catch (error) {
    console.error('❌ Batch execution failed:', error);

    // Provide user-friendly error messages
    let errorMessage = 'Batch execution failed';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      bundleId: '',
      status: 'FAILED',
      error: errorMessage,
    };
  }
}

/**
 * Polls wallet_getCallsStatus until transaction is confirmed
 *
 * This function repeatedly checks the status of a batch transaction
 * until it's confirmed or the maximum attempts are reached.
 *
 * @param provider - EIP-1193 provider from Base Account SDK
 * @param bundleId - Bundle ID returned from wallet_sendCalls
 * @param maxAttempts - Maximum number of polling attempts (default 60)
 * @param interval - Milliseconds between polls (default 2000)
 * @returns Transaction hash once confirmed
 * @throws Error if timeout or transaction fails
 */
async function pollForTransactionHash(
  provider: any,
  bundleId: string,
  maxAttempts = 60,
  interval = 2000
): Promise<Hex> {
  console.log(`🔄 Polling for transaction confirmation (max ${maxAttempts} attempts)...`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const status = await provider.request({
        method: 'wallet_getCallsStatus',
        params: [bundleId],
      });

      console.log(`📊 Attempt ${attempt + 1}/${maxAttempts} - Status:`, status?.status);

      if (status?.status === 'CONFIRMED' && status?.receipts?.length > 0) {
        // Return the last receipt's transaction hash (the final fillOrder transaction)
        const lastReceipt = status.receipts[status.receipts.length - 1];
        return lastReceipt.transactionHash as Hex;
      }

      if (status?.status === 'FAILED') {
        throw new Error('Batch transaction failed on-chain');
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.error(`⚠️ Error polling status (attempt ${attempt + 1}):`, error);

      // If we're not at max attempts, continue polling
      if (attempt < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
        continue;
      }

      throw error;
    }
  }

  throw new Error('Timeout waiting for transaction confirmation. Please check your wallet.');
}

/**
 * Estimates gas for a batch transaction (optional, for display purposes)
 *
 * Note: With paymaster, users don't pay gas, but this can be useful
 * for showing estimated cost or debugging.
 *
 * @param cartItems - Array of cart items
 * @param userAddress - User's wallet address
 * @returns Estimated gas cost in wei
 */
export async function estimateBatchGas(
  cartItems: CartItem[],
  userAddress: Address
): Promise<bigint> {
  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    // Estimate gas for each transaction
    let totalGas = 0n;

    for (const item of cartItems) {
      const gas = await publicClient.estimateGas({
        account: userAddress,
        to: item.payload.to,
        data: item.payload.data,
        value: BigInt(item.payload.value),
      });

      totalGas += gas;
    }

    // Add approval gas if needed (approx 50k gas)
    const totalUsdcRequired = calculateTotalUsdcRequired(cartItems);
    const currentAllowance = await publicClient.readContract({
      address: USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, OPTION_BOOK_ADDRESS as Address],
    }) as bigint;

    if (currentAllowance < totalUsdcRequired) {
      totalGas += 50000n; // Approximate gas for approval
    }

    return totalGas;
  } catch (error) {
    console.error('Error estimating gas:', error);
    return 0n;
  }
}

/**
 * Validates that a batch is ready for execution
 *
 * Performs pre-flight checks to ensure the batch can be executed successfully:
 * - Cart not empty
 * - User has sufficient USDC balance
 * - All orders haven't expired
 *
 * @param cartItems - Array of cart items
 * @param userAddress - User's wallet address
 * @throws Error if validation fails
 */
export async function validateBatchReadiness(
  cartItems: CartItem[],
  userAddress: Address
): Promise<void> {
  if (cartItems.length === 0) {
    throw new Error('Cart is empty');
  }

  // Check USDC balance
  // const publicClient = createPublicClient({
  //   chain: base,
  //   transport: http(),
  // });
  const baseProvider = baseAccountSDK.getProvider();

  // Create ethers provider for transaction execution
  const provider = new BrowserProvider(baseProvider);
  const signer = await provider.getSigner();

  const usdcContract = new ethers.Contract(USDC_ADDRESS, ERC20_ABI, signer);
  const totalUsdcRequired = calculateTotalUsdcRequired(cartItems);

  const balance = await usdcContract.balanceOf(userAddress);

  if (balance < totalUsdcRequired) {
    const balanceFormatted = (Number(balance) / 1_000_000).toFixed(2);
    const requiredFormatted = (Number(totalUsdcRequired) / 1_000_000).toFixed(2);
    throw new Error(
      `Insufficient USDC balance. Required: $${requiredFormatted}, Available: $${balanceFormatted}`
    );
  }

  // Check order expiries
  const now = Math.floor(Date.now() / 1000);
  for (const item of cartItems) {
    const expiry = Number(item.payload.orderParams.expiry);
    if (expiry <= now) {
      throw new Error(
        `Order for ${item.metadata.marketName} has expired. Please remove it from cart.`
      );
    }

    const orderExpiry = Number(item.payload.orderParams.orderExpiryTimestamp);
    if (orderExpiry <= now) {
      throw new Error(
        `Order offer for ${item.metadata.marketName} has expired. Please remove it from cart.`
      );
    }
  }
}
