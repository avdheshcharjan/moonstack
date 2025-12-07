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
import { Address, Hex, createPublicClient, encodeFunctionData, http } from 'viem';
import { base } from 'viem/chains';
import { calculateTotalUsdcRequired } from './BuyOptionBuilder';

/**
 * Paymaster configuration for gasless transactions
 */
const PAYMASTER_RPC_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';

/**
 * Gas configuration for batch transactions
 * Increase padding for PUT orders which may require more gas than CALL orders
 * These can be overridden via environment variables
 */
const GAS_CONFIG = {
  // Base gas padding multiplier (e.g., 1.3 = 30% extra gas)
  CALL_GAS_PADDING: parseFloat(process.env.NEXT_PUBLIC_CALL_GAS_PADDING || '1.3'),
  // Higher padding for PUT orders which tend to use more gas
  PUT_GAS_PADDING: parseFloat(process.env.NEXT_PUBLIC_PUT_GAS_PADDING || '1.5'),
  // PreVerification gas padding
  PRE_VERIFICATION_PADDING: parseFloat(process.env.NEXT_PUBLIC_PRE_VERIFICATION_PADDING || '1.4'),
};

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

    console.log("Cart items to execute:", cartItems);

    onStatusUpdate?.('preparing', 'Preparing batch transaction...');

    // Get Base Account SDK provider
    const baseAccountSDK = getBaseAccountSDK();
    const baseProvider = baseAccountSDK.getProvider();

    // Create public client for reading blockchain state
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
    if (!rpcUrl) {
      throw new Error('NEXT_PUBLIC_BASE_RPC_URL not configured in environment variables');
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
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
      authorizationList: undefined,
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
      authorizationList: undefined,
    }) as bigint;

    // Step 4: Validate all orders before execution
    console.log('\n🔍 Validating orders before execution...');
    const now = Math.floor(Date.now() / 1000);

    for (const item of cartItems) {
      const orderExpiry = Number(item.payload.orderParams.expiry);
      const orderExpiryTimestamp = Number(item.payload.orderParams.orderExpiryTimestamp);

      // Check expiries
      if (orderExpiryTimestamp <= now) {
        throw new Error(
          `Order for ${item.metadata.marketName} has expired. Order expiry: ${new Date(orderExpiryTimestamp * 1000).toLocaleString()}`
        );
      }

      if (orderExpiry <= now) {
        throw new Error(
          `Option for ${item.metadata.marketName} has expired. Option expiry: ${new Date(orderExpiry * 1000).toLocaleString()}`
        );
      }

      // Validate numContracts is positive and reasonable
      if (item.metadata.numContracts <= 0n) {
        throw new Error(
          `Invalid number of contracts (${item.metadata.numContracts}) for ${item.metadata.marketName}`
        );
      }

      // Validate strikes array
      if (!item.payload.orderParams.strikes || item.payload.orderParams.strikes.length === 0) {
        throw new Error(`Missing strikes for ${item.metadata.marketName}`);
      }

      console.log(`✅ ${item.metadata.optionType} order validated: ${item.metadata.marketName}`);
    }

    // Step 5: Build batch calls array
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

    // Step 6: Add all fillOrder transactions to the batch
    for (const item of cartItems) {
      calls.push({
        to: item.payload.to,
        value: item.payload.value,
        data: item.payload.data,
      });
    }

    console.log(`📦 Batch prepared with ${calls.length} transactions (${calls.length - (currentAllowance < totalUsdcRequired ? 1 : 0)} fillOrder calls)`);

    // Step 7: Estimate gas with padding before execution (optional)
    // Note: We don't block execution if gas estimation fails, as the paymaster
    // and bundler will determine the actual gas needed
    onStatusUpdate?.('preparing', 'Estimating gas requirements...');

    let hasProblematicOrders = false;
    try {
      const estimatedGas = await estimateBatchGas(cartItems, userAddress);
      console.log(`✅ Gas estimation complete: ${estimatedGas.toString()} gas units`);
      console.log(`💡 PUT orders use ${GAS_CONFIG.PUT_GAS_PADDING}x padding, CALL orders use ${GAS_CONFIG.CALL_GAS_PADDING}x padding`);
    } catch (gasError) {
      const errorMsg = gasError instanceof Error ? gasError.message : String(gasError);

      // Check if we have arithmetic underflow errors (indicates problematic orders)
      if (errorMsg.includes('arithmetic underflow or overflow')) {
        hasProblematicOrders = true;
        console.error('⚠️ CRITICAL: Detected arithmetic underflow in one or more orders');
        console.error('⚠️ This typically indicates an issue with PUT option order data from the API');
        console.error('⚠️ The transaction may fail during execution');
        console.error('📝 Recommendation: Try removing PUT orders from cart and execute only CALL orders');
      }

      console.warn('⚠️ Gas estimation failed - will use paymaster defaults');
      console.warn('This may indicate an issue with the order data. Continuing with execution...');
      // Continue even if gas estimation fails - the paymaster will determine actual gas
      // If the transaction truly has issues, it will fail during execution
    }

    // Warn user if problematic orders detected
    if (hasProblematicOrders) {
      const putOrderCount = cartItems.filter(item => item.metadata.optionType === 'PUT').length;
      console.warn(`\n⚠️⚠️⚠️ WARNING ⚠️⚠️⚠️`);
      console.warn(`Found ${putOrderCount} PUT order(s) with potential execution issues`);
      console.warn(`CALL orders should work, but PUT orders may fail`);
      console.warn(`Consider executing CALL and PUT orders separately`);
      console.warn(`⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️\n`);
    }

    onStatusUpdate?.('executing', `Executing batch of ${cartItems.length} option purchases...`);

    // Step 8: Construct EIP-5792 batch payload
    const batchPayload: BatchPayload = {
      version: '2.0.0',
      from: userAddress,
      chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
      // chainId: numberToHex(base.constants.CHAIN_IDS.base),
      calls,
      // Require all calls to succeed (prevents wallet from executing only the first call)
      atomicRequired: true,
      capabilities: PAYMASTER_RPC_URL ? {
        paymasterService: {
          url: PAYMASTER_RPC_URL,
        },
      } : undefined,
    };

    // Step 7: Send batch via wallet_sendCalls
    // console.log('🚀 Sending batch transaction via wallet_sendCalls...');
    console.log('🚀 Sending batch transaction via wallet_sendCalls with payload:', batchPayload);
    // return;
    const result: any = await baseProvider.request({
      method: 'wallet_sendCalls',
      params: [batchPayload],
    });

    if (result && result.code) {
      return result.message;
    }

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

    const bundleId = result.id;

    onStatusUpdate?.('confirming', 'Waiting for confirmation...');

    const transactionHash = await pollForTransactionHash(
      baseProvider,
      bundleId,
      10,
      2000
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
  maxAttempts = 10,
  interval = 2000
): Promise<Hex> {
  console.log(`🔄 Polling for transaction confirmation (max ${maxAttempts} attempts)...`);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const status = await provider.request({
        method: 'wallet_getCallsStatus',
        params: [bundleId],
      });

      console.log('Status response:', status);

      console.log(`📊 Attempt ${attempt + 1}/${maxAttempts} - Status:`, status?.status);

      if (status?.status === 200 && status?.receipts?.length > 0) {
        const lastReceipt = status.receipts[status.receipts.length - 1];
        return lastReceipt.transactionHash as Hex;
      }

      if (status?.status !== 200) {
        throw new Error('Batch transaction failed on-chain');
      }

      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.error(`⚠️ Error polling status (attempt ${attempt + 1}):`, error);

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
 * Estimates gas for a batch transaction with proper padding
 *
 * This function estimates gas for each transaction and applies padding multipliers
 * based on order type (CALL vs PUT). PUT orders tend to use more gas and need
 * higher padding to avoid execution reverts.
 *
 * @param cartItems - Array of cart items
 * @param userAddress - User's wallet address
 * @returns Estimated gas cost with padding applied
 */
export async function estimateBatchGas(
  cartItems: CartItem[],
  userAddress: Address
): Promise<bigint> {
  try {
    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
    if (!rpcUrl) {
      throw new Error('NEXT_PUBLIC_BASE_RPC_URL not configured in environment variables');
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    let totalGas = 0n;
    let callOrderCount = 0;
    let putOrderCount = 0;

    // Estimate gas for each transaction with appropriate padding
    for (const item of cartItems) {
      try {
        const baseGasEstimate = await publicClient.estimateGas({
          account: userAddress,
          to: item.payload.to,
          data: item.payload.data,
          value: BigInt(item.payload.value),
        });

        // Apply different padding based on option type
        const isPut = item.metadata.optionType === 'PUT';
        const padding = isPut ? GAS_CONFIG.PUT_GAS_PADDING : GAS_CONFIG.CALL_GAS_PADDING;
        const paddedGas = BigInt(Math.ceil(Number(baseGasEstimate) * padding));

        console.log(`⛽ Gas estimate for ${item.metadata.optionType} order:`, {
          base: baseGasEstimate.toString(),
          padding: `${padding}x`,
          padded: paddedGas.toString(),
          market: item.metadata.marketName,
        });

        totalGas += paddedGas;

        if (isPut) {
          putOrderCount++;
        } else {
          callOrderCount++;
        }
      } catch (estimateError) {
        const errorMessage = estimateError instanceof Error ? estimateError.message : String(estimateError || 'Unknown error');

        // Non-fatal: fall back to conservative gas so batch can continue.
        console.warn(`⚠️ Gas estimate unavailable for ${item.metadata.optionType} order, using fallback.`, {
          market: item.metadata.marketName,
          optionType: item.metadata.optionType,
          action: item.metadata.action,
          usdcAmount: item.metadata.usdcAmountFormatted,
          error: errorMessage,
        });

        // If arithmetic error, surface a clear warning (still proceed with fallback)
        if (errorMessage.includes('arithmetic underflow or overflow')) {
          console.warn('⚠️ CRITICAL: Order has arithmetic under/overflow; execution may fail.');
          console.warn('📋 Order metadata:', {
            to: item.payload.to,
            strikePrice: item.metadata.strikePrice,
            expiry: item.metadata.expiryFormatted,
            numContracts: item.metadata.numContracts.toString(),
            pricePerContract: item.metadata.pricePerContract,
          });
          console.warn('📋 Raw order params:', {
            price: item.payload.orderParams.price.toString(),
            numContracts: item.payload.orderParams.numContracts.toString(),
            strikes: item.payload.orderParams.strikes.map(s => s.toString()),
            maxCollateralUsable: item.payload.orderParams.maxCollateralUsable.toString(),
            isCall: item.payload.orderParams.isCall,
            isLong: item.payload.orderParams.isLong,
          });
        }

        // Use conservative fallback estimates with higher padding
        const fallbackGas = item.metadata.optionType === 'PUT' ? 400000n : 300000n;
        console.warn(`Using fallback gas estimate: ${fallbackGas.toString()}`);
        totalGas += fallbackGas;
      }
    }

    // Add approval gas with padding if needed
    const totalUsdcRequired = calculateTotalUsdcRequired(cartItems);
    const currentAllowance = await publicClient.readContract({
      address: USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, OPTION_BOOK_ADDRESS as Address],
      authorizationList: undefined,
    }) as bigint;

    if (currentAllowance < totalUsdcRequired) {
      const approvalGas = BigInt(Math.ceil(50000 * GAS_CONFIG.PRE_VERIFICATION_PADDING));
      console.log(`⛽ Approval gas estimate with padding: ${approvalGas.toString()}`);
      totalGas += approvalGas;
    }

    console.log(`\n📊 Total Gas Estimate Summary:`);
    console.log(`  CALL orders: ${callOrderCount}`);
    console.log(`  PUT orders: ${putOrderCount}`);
    console.log(`  Total padded gas: ${totalGas.toString()}`);
    console.log(`  PUT order padding: ${GAS_CONFIG.PUT_GAS_PADDING}x`);
    console.log(`  CALL order padding: ${GAS_CONFIG.CALL_GAS_PADDING}x\n`);

    return totalGas;
  } catch (error) {
    console.error('Error estimating gas:', error);
    // Return conservative estimate
    return 500000n * BigInt(cartItems.length);
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

  // Check USDC balance using viem public client
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
  if (!rpcUrl) {
    throw new Error('NEXT_PUBLIC_BASE_RPC_URL not configured in environment variables');
  }

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  const totalUsdcRequired = calculateTotalUsdcRequired(cartItems);

  const balance = await publicClient.readContract({
    address: USDC_ADDRESS as Address,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: [userAddress],
    authorizationList: undefined,
  }) as bigint;

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
