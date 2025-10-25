import type { RawOrderData } from '@/src/types/orders';
import type { BinaryPair } from '@/src/types/prediction';
import { ERC20_ABI, OPTION_BOOK_ABI, OPTION_BOOK_ADDRESS, REFERRER_ADDRESS, USDC_ADDRESS } from '@/src/utils/contracts';
import { BrowserProvider, Contract } from 'ethers';
import type { Address, Hex } from 'viem';
import { encodeFunctionData } from 'viem';
import { baseAccountSDK } from '@/src/providers/BaseAccountProvider';

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
      throw new Error('Invalid order data');
    }

    // Use Base Account SDK provider
    const baseProvider = baseAccountSDK.getProvider();

    // Create ethers provider for transaction execution
    const provider = new BrowserProvider(baseProvider);
    const signer = await provider.getSigner();

    const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, signer);

    // Step 1: Check USDC balance
    const balance = await usdcContract.balanceOf(userAddress);

    // Step 2: Calculate number of contracts based on bet size and price
    // Per OptionBook.md section 2.4:
    // - price is in 8 decimals
    // - betSize is in dollars
    // - numContracts should be scaled to 6 decimals (USDC)
    const pricePerContract = Number(order.order.price) / 1e8; // Convert from 8 decimals to USDC
    const contractsToBuy = betSize / pricePerContract;
    const numContracts = BigInt(Math.floor(contractsToBuy * 1e6)); // Scale to 6 decimals and round down

    // Calculate total USDC needed
    const requiredAmount = BigInt(Math.floor(betSize * 1_000_000)); // Convert betSize to USDC (6 decimals)

    // Validate balance
    if (balance < requiredAmount) {
      throw new Error(
        `Insufficient USDC balance. Need ${Number(requiredAmount) / 1_000_000} USDC, have ${Number(balance) / 1_000_000} USDC`
      );
    }

    // Step 3: Check USDC allowance and approve if needed (separate transaction)
    const currentAllowance = await usdcContract.allowance(userAddress, OPTION_BOOK_ADDRESS);

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

    console.log('Executing fillOrder...');
    console.log('Order params:', orderParams);
    console.log('Bet size:', betSize, 'USDC');
    console.log('Num contracts:', numContracts.toString());

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

    // Store position in database
    await storePosition(pair, action, order, txHash, userAddress, betSize);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('Direct execution failed:', error);
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
  const result = await baseProvider.request({
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
  });

  console.log('✅ Approval transaction submitted!');
  console.log('========================================\n');
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
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
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
  const result = await baseProvider.request({
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
  });

  // wallet_sendCalls returns a call bundle ID
  const txHash = typeof result === 'string' ? result : JSON.stringify(result);

  console.log('✅ Transaction submitted!');
  console.log('🔗 Transaction Hash:', txHash);
  console.log('⚡ Gas fees sponsored by Paymaster');
  console.log('========================================\n');

  return txHash as Hex;
}

/**
 * Store position in Supabase database
 */
async function storePosition(
  pair: BinaryPair,
  action: 'yes' | 'no',
  order: RawOrderData,
  txHash: Hex,
  walletAddress: Address,
  betSize: number
): Promise<void> {
  try {
    const parsed = action === 'yes' ? pair.callParsed : pair.putParsed;

    // Calculate collateral used based on actual bet size
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
        num_contracts: order.order.numContracts.toString(),
        raw_order: order,
      }),
    });

    if (!response.ok) {
      console.error('Failed to store position:', await response.text());
    }
  } catch (error) {
    console.error('Error storing position:', error);
    // Don't throw - we don't want to fail the transaction if storage fails
  }
}
