import { baseAccountSDK } from '@/src/providers/BaseAccountProvider';
import type { RawOrderData } from '@/src/types/orders';
import type { BinaryPair } from '@/src/types/prediction';
import { ERC20_ABI, OPTION_BOOK_ABI, OPTION_BOOK_ADDRESS, REFERRER_ADDRESS, USDC_ADDRESS } from '@/src/utils/contracts';
import type { Address, Hex } from 'viem';
import { encodeFunctionData } from 'viem';

/**
 * Gas configuration for direct transactions
 * PUT orders tend to use more gas than CALL orders
 * These can be overridden via environment variables
 */
const GAS_CONFIG = {
  // Base gas padding multiplier for CALL orders
  CALL_GAS_PADDING: parseFloat(process.env.NEXT_PUBLIC_CALL_GAS_PADDING || '1.3'),
  // Higher padding for PUT orders which require more gas
  PUT_GAS_PADDING: parseFloat(process.env.NEXT_PUBLIC_PUT_GAS_PADDING || '1.5'),
  // PreVerification gas padding
  PRE_VERIFICATION_PADDING: parseFloat(process.env.NEXT_PUBLIC_PRE_VERIFICATION_PADDING || '1.4'),
};

export interface DirectExecutionResult {
  success: boolean;
  txHash?: Hex;
  error?: string;
}

/**
 * Execute a single fillOrder transaction directly with the user's wallet
 * Per OptionBook.md section 2.4:
 * 1. Check USDC balance
 * 2. Calculate numContracts from betSize
 * 3. Send separate USDC approval transaction if needed (not batched)
 * 4. Call fillOrder with user's wallet
 * 5. Use the referrer address from contracts
 */
export async function executeDirectFillOrder(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  userAddress: Address
): Promise<DirectExecutionResult> {
  try {
    // Select the order based on action
    const order: RawOrderData = action === 'yes' ? pair.callOption : pair.putOption;

    // Validate order data
    if (!order || !order.order) {
      console.error('Order validation failed:', {
        action,
        hasCallOption: !!pair.callOption,
        hasPutOption: !!pair.putOption,
        order: order
      });
      throw new Error(`Invalid order data for ${action.toUpperCase()} bet. ${action === 'no' ? 'Put option' : 'Call option'} not found.`);
    }

    console.log(`\n🎯 Executing ${action.toUpperCase()} bet on ${pair.underlying}`);
    console.log('Expected order type for action:', action === 'yes' ? 'CALL (isCall: true)' : 'PUT (isCall: false)');
    console.log('Actual order type:', order.order.isCall ? 'CALL' : 'PUT');
    console.log('Order isCall:', order.order.isCall);
    console.log('Order isLong:', order.order.isLong);
    console.log('Strike:', order.order.strikes.map(s => Number(s) / 1e8).join(', '));
    console.log('Price:', Number(order.order.price) / 1e8);
    console.log('Max collateral:', Number(order.order.maxCollateralUsable) / 1e6);

    // Validate we selected the correct order type
    if (action === 'yes' && !order.order.isCall) {
      console.error('❌ ERROR: Selected PUT option for YES bet!');
      throw new Error('Wrong order type selected. YES bets should use CALL options.');
    }
    if (action === 'no' && order.order.isCall) {
      console.error('❌ ERROR: Selected CALL option for NO bet!');
      throw new Error('Wrong order type selected. NO bets should use PUT options.');
    }

    // Step 1: Create viem public client for read operations
    const { createPublicClient, http } = await import('viem');
    const { base } = await import('viem/chains');

    const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
    if (!rpcUrl) {
      throw new Error('NEXT_PUBLIC_BASE_RPC_URL not configured in environment variables');
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(rpcUrl),
    });

    // Check USDC balance using viem
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [userAddress],
    }) as bigint;

    // Step 2: Calculate number of contracts based on bet size and price
    // Per OptionBook.md section 2.4:
    // - price is in 8 decimals
    // - betSize is in dollars
    // - numContracts should be scaled to 6 decimals (USDC)
    const pricePerContract = Number(order.order.price) / 1e8; // Convert from 8 decimals to USDC

    // Ensure minimum contract size to avoid smart contract reverts
    // Minimum of 0.001 contracts (1000 in scaled units)
    const minContracts = 0.001;
    const minBetSize = pricePerContract * minContracts;

    let actualBetSize = betSize;
    if (betSize < minBetSize) {
      console.warn(`⚠️ Bet size $${betSize} is too small for this option price.`);
      console.warn(`Minimum bet size: $${minBetSize.toFixed(4)} (${minContracts} contracts)`);
      actualBetSize = minBetSize;
      console.warn(`Automatically adjusting bet size to: $${actualBetSize.toFixed(4)}`);
    }

    const contractsToBuy = actualBetSize / pricePerContract;
    const numContracts = BigInt(Math.floor(contractsToBuy * 1e6)); // Scale to 6 decimals and round down

    console.log('\n💰 Contract Calculation:');
    console.log('Original bet size (USDC):', betSize);
    console.log('Actual bet size (USDC):', actualBetSize);
    console.log('Price per contract (USDC):', pricePerContract);
    console.log('Contracts to buy:', contractsToBuy);
    console.log('Num contracts (scaled):', numContracts.toString());
    console.log('Num contracts (actual):', Number(numContracts) / 1e6);

    // Calculate total USDC needed (use actualBetSize not original betSize)
    const requiredAmount = BigInt(Math.floor(actualBetSize * 1_000_000)); // Convert betSize to USDC (6 decimals)

    console.log('Required amount (raw):', requiredAmount.toString());
    console.log('Required amount (USDC):', Number(requiredAmount) / 1_000_000);
    console.log('Balance (USDC):', Number(balance) / 1_000_000);

    // Validate balance
    if (balance < requiredAmount) {
      throw new Error(
        `Insufficient USDC balance. Need ${Number(requiredAmount) / 1_000_000} USDC, have ${Number(balance) / 1_000_000} USDC`
      );
    }

    // Step 3: Check USDC allowance and approve if needed (separate transaction)
    const currentAllowance = await publicClient.readContract({
      address: USDC_ADDRESS as Address,
      abi: ERC20_ABI,
      functionName: 'allowance',
      args: [userAddress, OPTION_BOOK_ADDRESS as Address],
    }) as bigint;

    if (currentAllowance < requiredAmount) {
      console.log('Approving USDC for OptionBook...');
      console.log('Required:', Number(requiredAmount) / 1_000_000, 'USDC');
      console.log('Current allowance:', Number(currentAllowance) / 1_000_000, 'USDC');

      // Send separate approval transaction with paymaster
      await executeApprovalTransaction(requiredAmount, userAddress);

      console.log('USDC approval confirmed');
    } else {
      console.log('USDC already approved, current allowance:', Number(currentAllowance) / 1_000_000, 'USDC');
    }

    // Check order expiry
    const currentTime = Math.floor(Date.now() / 1000);
    const orderExpiry = Number(order.order.orderExpiryTimestamp);
    const optionExpiry = Number(order.order.expiry);

    console.log('\n⏰ Expiry Check:');
    console.log('Current timestamp:', currentTime);
    console.log('Order expiry timestamp:', orderExpiry);
    console.log('Option expiry timestamp:', optionExpiry);
    console.log('Order expired:', currentTime > orderExpiry);
    console.log('Option expired:', currentTime > optionExpiry);

    if (currentTime > orderExpiry) {
      throw new Error(`Order has expired. Order expiry was ${new Date(orderExpiry * 1000).toLocaleString()}`);
    }

    // Validate numContracts doesn't exceed maxCollateralUsable
    const maxCollateral = BigInt(order.order.maxCollateralUsable);
    const collateralNeeded = (numContracts * BigInt(order.order.price)) / BigInt(1e8);

    console.log('\n🔍 Validation:');
    console.log('Max collateral allowed:', maxCollateral.toString(), `(${Number(maxCollateral) / 1e6} USDC)`);
    console.log('Collateral needed:', collateralNeeded.toString(), `(${Number(collateralNeeded) / 1e6} USDC)`);
    console.log('Within limit:', collateralNeeded <= maxCollateral);

    if (collateralNeeded > maxCollateral) {
      throw new Error(
        `Order size too large. Need ${Number(collateralNeeded) / 1e6} USDC but max allowed is ${Number(maxCollateral) / 1e6} USDC. ` +
        `Try reducing your bet size to ${(betSize * Number(maxCollateral)) / Number(collateralNeeded)} USDC or less.`
      );
    }

    // Step 4: Prepare fillOrder call
    // Per OptionBook.md section 2.4: DO NOT modify order fields except numContracts
    const orderParams = {
      maker: order.order.maker as Address,
      orderExpiryTimestamp: BigInt(order.order.orderExpiryTimestamp),
      collateral: order.order.collateral as Address,
      isCall: order.order.isCall,
      priceFeed: order.order.priceFeed as Address,
      implementation: order.order.implementation as Address,
      isLong: order.order.isLong, // Keep original - signature will fail if modified
      maxCollateralUsable: BigInt(order.order.maxCollateralUsable),
      strikes: order.order.strikes.map((s: string) => BigInt(s)),
      expiry: BigInt(order.order.expiry),
      price: BigInt(order.order.price),
      numContracts: numContracts, // Calculated above based on bet size
      extraOptionData: (order.order.extraOptionData || '0x') as Hex,
    };

    console.log('\n📋 Executing fillOrder...');
    console.log('Order params:', {
      ...orderParams,
      strikes: orderParams.strikes.map(s => s.toString()),
      maxCollateralUsable: orderParams.maxCollateralUsable.toString(),
      price: orderParams.price.toString(),
      numContracts: orderParams.numContracts.toString(),
      orderExpiryTimestamp: orderParams.orderExpiryTimestamp.toString(),
      expiry: orderParams.expiry.toString(),
    });

    // Log gas configuration for this order type
    const isPut = !order.order.isCall;
    const gasPadding = isPut ? GAS_CONFIG.PUT_GAS_PADDING : GAS_CONFIG.CALL_GAS_PADDING;
    console.log(`\n⛽ Gas Configuration for ${isPut ? 'PUT' : 'CALL'} order:`);
    console.log(`  Padding multiplier: ${gasPadding}x`);
    console.log(`  ${isPut ? 'PUT orders use higher gas padding to avoid reverts' : 'CALL orders use standard gas padding'}`);

    // Step 4: Execute fillOrder transaction with paymaster (gasless)
    const fillOrderData = encodeFunctionData({
      abi: OPTION_BOOK_ABI,
      functionName: 'fillOrder',
      args: [
        orderParams,
        order.signature as Hex,
        REFERRER_ADDRESS as Address, // Use referrer address from contracts
      ],
    });

    console.log('Executing fillOrder with paymaster (gasless)...');

    // Execute transaction directly using Base Paymaster for gasless transaction
    const txHash = await executeTransactionWithPaymaster(
      fillOrderData,
      requiredAmount,
      userAddress
    );

    console.log('Transaction executed successfully:', txHash);

    // Store position in database with bet details
    await storePosition(pair, action, order, txHash, userAddress, betSize, numContracts);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('❌ Direct execution failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      action,
      betSize,
      userAddress
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Execute USDC approval transaction separately (not batched)
 */
async function executeApprovalTransaction(
  requiredUSDC: bigint,
  userAddress: Address
): Promise<void> {
  console.log('\n========================================');
  console.log('🔐 USDC APPROVAL TRANSACTION');
  console.log('========================================');

  // Get Base Account SDK provider
  const baseProvider = baseAccountSDK.getProvider();
  if (!baseProvider) {
    throw new Error('Base Account provider not found. Please connect with Base Account.');
  }

  // Import chain
  const { base } = await import('viem/chains');

  // Prepare approval transaction
  const approvalData = encodeFunctionData({
    abi: [{
      name: 'approve',
      type: 'function',
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' }
      ],
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable'
    }],
    functionName: 'approve',
    args: [OPTION_BOOK_ADDRESS as Address, requiredUSDC],
  });

  const calls = [
    {
      to: USDC_ADDRESS,
      value: '0x0',
      data: approvalData,
    }
  ];

  console.log('📦 Sending USDC approval transaction');
  console.log('⚡ Paymaster will sponsor gas fees');

  // Get paymaster URL from environment
  const PAYMASTER_RPC_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';

  // Send approval transaction
  const bundleId = await baseProvider.request({
    method: 'wallet_sendCalls',
    params: [{
      version: '1.0',
      from: userAddress,
      chainId: `0x${base.id.toString(16)}`,
      calls,
      capabilities: PAYMASTER_RPC_URL ? {
        paymasterService: {
          url: PAYMASTER_RPC_URL,
        },
      } : undefined,
    }]
  }) as string;

  console.log('✅ Approval transaction submitted!');
  console.log('🔗 Bundle ID:', bundleId);
  console.log('========================================\n');
}

/**
 * Poll for transaction hash from bundle ID
 */
async function pollForTransactionHash(
  provider: any,
  bundleId: string,
  maxAttempts = 60,
  interval = 1000
): Promise<Hex> {
  console.log('📡 Polling for transaction hash...');

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const status = await provider.request({
        method: 'wallet_getCallsStatus',
        params: [bundleId]
      });

      console.log(`Attempt ${attempt + 1}/${maxAttempts} - Status:`, status?.status);

      // Check if transaction is confirmed and has receipts
      if (status?.status === 'CONFIRMED' && status?.receipts && status.receipts.length > 0) {
        const txHash = status.receipts[0].transactionHash;
        if (txHash) {
          console.log('✅ Found transaction hash:', txHash);
          return txHash as Hex;
        }
      }

      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, interval));
    } catch (error) {
      console.error('Error polling for tx hash:', error);
      // Continue polling even on error
    }
  }

  throw new Error('Timeout waiting for transaction hash');
}

/**
 * Execute a single transaction with Base Paymaster (gasless)
 * Uses EIP-5792 wallet_sendCalls for gasless transaction
 */
async function executeTransactionWithPaymaster(
  fillOrderData: Hex,
  requiredUSDC: bigint,
  userAddress: Address
): Promise<Hex> {
  console.log('\n========================================');
  console.log('🚀 GASLESS TRANSACTION EXECUTION');
  console.log('========================================');
  console.log('👤 User Address:', userAddress);
  console.log('💰 USDC needed:', (Number(requiredUSDC) / 1_000_000).toFixed(2), 'USDC');

  // Get Base Account SDK provider
  const baseProvider = baseAccountSDK.getProvider();
  if (!baseProvider) {
    throw new Error('Base Account provider not found. Please connect with Base Account.');
  }

  console.log('✅ Base Account provider ready');

  // Import chain and create approval data
  const { base } = await import('viem/chains');
  const { createPublicClient, http } = await import('viem');

  // Create public client to check balances
  const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
  if (!rpcUrl) {
    throw new Error('NEXT_PUBLIC_BASE_RPC_URL not configured in environment variables');
  }

  const publicClient = createPublicClient({
    chain: base,
    transport: http(rpcUrl),
  });

  // Check USDC balance
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS as Address,
    abi: [{
      name: 'balanceOf',
      type: 'function',
      inputs: [{ name: 'owner', type: 'address' }],
      outputs: [{ name: '', type: 'uint256' }],
      stateMutability: 'view'
    }] as const,
    functionName: 'balanceOf',
    args: [userAddress],
    authorizationList: undefined,
  }) as bigint;

  console.log('💰 Your USDC balance:', (Number(balance) / 1_000_000).toFixed(2), 'USDC');

  if (balance < requiredUSDC) {
    throw new Error(
      `Insufficient USDC balance. You have ${(Number(balance) / 1_000_000).toFixed(2)} USDC but need ${(Number(requiredUSDC) / 1_000_000).toFixed(2)} USDC`
    );
  }

  console.log('✅ USDC balance sufficient');

  // Build transaction call
  const calls = [
    {
      to: OPTION_BOOK_ADDRESS,
      value: '0x0',
      data: fillOrderData,
    }
  ];

  console.log('\n📡 Sending transaction via EIP-5792 wallet_sendCalls...');
  console.log('📦 Sending fillOrder transaction');
  console.log('⚡ Paymaster will sponsor gas fees');
  console.log('========================================\n');

  // Get paymaster URL from environment
  const PAYMASTER_RPC_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';

  if (!PAYMASTER_RPC_URL) {
    console.warn('⚠️ PAYMASTER_URL not configured - transaction may not be gasless');
  }

  // Send transaction using EIP-5792 wallet_sendCalls
  let bundleId: string;
  try {
    bundleId = await baseProvider.request({
      method: 'wallet_sendCalls',
      params: [{
        version: '1.0',
        from: userAddress,
        chainId: `0x${base.id.toString(16)}`,
        calls,
        capabilities: PAYMASTER_RPC_URL ? {
          paymasterService: {
            url: PAYMASTER_RPC_URL,
          },
        } : undefined,
      }]
    }) as string;
  } catch (sendError) {
    console.error('❌ wallet_sendCalls error:', sendError);
    console.error('Error details:', {
      message: sendError instanceof Error ? sendError.message : 'Unknown',
      name: sendError instanceof Error ? sendError.name : 'Unknown',
      code: (sendError as any)?.code,
      data: (sendError as any)?.data,
    });
    throw sendError;
  }

  console.log('✅ Transaction bundle submitted!');
  console.log('🔗 Bundle ID:', bundleId);

  // Poll for the actual transaction hash
  const txHash = await pollForTransactionHash(baseProvider, bundleId as string);

  console.log('✅ Transaction confirmed!');
  console.log('🔗 Transaction Hash:', txHash);
  console.log('⚡ Gas fees sponsored by Paymaster');
  console.log('========================================\n');

  return txHash as Hex;
}

/**
 * Store position in Supabase database with bet details
 */
async function storePosition(
  pair: BinaryPair,
  action: 'yes' | 'no',
  order: RawOrderData,
  txHash: Hex,
  walletAddress: Address,
  betSize: number,
  numContracts: bigint
): Promise<void> {
  try {
    const parsed = action === 'yes' ? pair.callParsed : pair.putParsed;

    const collateralUsed = BigInt(Math.floor(betSize * 1_000_000));

    const response = await fetch('/api/positions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet_address: walletAddress,
        tx_hash: txHash,
        strategy_type: parsed.strategyType,
        underlying: pair.underlying,
        is_call: order.order.isCall,
        strikes: order.order.strikes.map(s => s.toString()),
        strike_width: parsed.strikeWidth,
        expiry: pair.expiry.toISOString(),
        price_per_contract: order.order.price.toString(),
        max_size: order.order.maxCollateralUsable.toString(),
        collateral_used: collateralUsed.toString(),
        num_contracts: numContracts.toString(),
        raw_order: order,
        // Bet-specific fields
        decision: action.toUpperCase(),
        question: pair.question,
        threshold: pair.threshold,
        betSize: betSize,
      }),
    });

    if (!response.ok) {
      console.error('Failed to store position:', await response.text());
    } else {
      console.log('✅ Position and bet stored successfully');
    }
  } catch (error) {
    console.error('Error storing position:', error);
    // Don't throw - we don't want to fail the transaction if storage fails
  }
}

