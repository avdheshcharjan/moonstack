import type { Address, Hex } from 'viem';
import { encodeFunctionData } from 'viem';
import { createSmartAccountWithPaymaster } from '@/src/lib/smartAccount';
import { needsApproval, encodeUSDCApprove, getUSDCBalance } from '@/src/utils/usdcApproval';
import { OPTION_BOOK_ADDRESS, OPTION_BOOK_ABI, REFERRER_ADDRESS, USDC_ADDRESS } from '@/src/utils/contracts';
import type { RawOrderData } from '@/src/types/orders';
import type { BinaryPair } from '@/src/types/prediction';

export interface ImmediateExecutionResult {
  success: boolean;
  txHash?: Hex;
  error?: string;
}

/**
 * Execute a single fillOrder transaction immediately with paymaster sponsorship
 */
export async function executeImmediateFillOrder(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  ownerAddress: Address
): Promise<ImmediateExecutionResult> {
  try {
    // Select the order based on action
    const order: RawOrderData = action === 'yes' ? pair.callOption : pair.putOption;

    // Validate order data
    if (!order || !order.order) {
      throw new Error('Invalid order data');
    }

    // Create smart account client with paymaster support
    const smartAccountClient = await createSmartAccountWithPaymaster(ownerAddress);
    const smartAccountAddress = smartAccountClient.account.address;

    // Calculate number of contracts based on bet size and price
    // Per OptionBook.md section 2.4:
    // - price is in 8 decimals
    // - betSize is in dollars
    // - numContracts should be scaled to 6 decimals (USDC)
    const pricePerContract = Number(order.order.price) / 1e8; // Convert from 8 decimals to USDC
    const contractsToBuy = betSize / pricePerContract;
    const numContracts = BigInt(Math.floor(contractsToBuy * 1e6)); // Scale to 6 decimals and round down

    // Calculate total USDC needed
    const betSizeInUSDC = BigInt(Math.floor(betSize * 1_000_000)); // Convert betSize to USDC (6 decimals)
    const totalNeeded = betSizeInUSDC;

    // Check USDC balance
    const balance = await getUSDCBalance(smartAccountAddress);
    if (balance < totalNeeded) {
      throw new Error(
        `Insufficient USDC balance. Need ${Number(totalNeeded) / 1_000_000} USDC, have ${Number(balance) / 1_000_000} USDC`
      );
    }

    // Check if we need approval
    const approvalNeeded = await needsApproval(
      smartAccountAddress,
      totalNeeded,
      OPTION_BOOK_ADDRESS as Address
    );

    // Prepare calls array
    const calls: Array<{ to: Address; data: Hex }> = [];

    // Add approval call if needed
    if (approvalNeeded) {
      const approveCallData = encodeUSDCApprove(totalNeeded);
      calls.push({
        to: USDC_ADDRESS as Address,
        data: approveCallData as Hex,
      });
    }

    // Prepare fillOrder call - validate and convert all fields
    // Per OptionBook.md section 2.4: DO NOT modify order fields except numContracts
    const typedOrder = {
      maker: order.order.maker as Address,
      orderExpiryTimestamp: BigInt(order.order.orderExpiryTimestamp),
      collateral: order.order.collateral as Address,
      isCall: order.order.isCall,
      priceFeed: order.order.priceFeed as Address,
      implementation: order.order.implementation as Address,
      isLong: order.order.isLong, // Keep original - signature will fail if modified
      maxCollateralUsable: BigInt(order.order.maxCollateralUsable),
      strikes: order.order.strikes.map((s: string | bigint) => BigInt(s)),
      expiry: BigInt(order.order.expiry),
      price: BigInt(order.order.price),
      numContracts: numContracts, // Calculated above based on bet size
      extraOptionData: (order.order.extraOptionData || '0x') as Hex,
    };

    const fillOrderData = encodeFunctionData({
      abi: OPTION_BOOK_ABI,
      functionName: 'fillOrder',
      args: [
        typedOrder,
        order.signature as Hex,
        REFERRER_ADDRESS as Address,
      ],
    });

    calls.push({
      to: OPTION_BOOK_ADDRESS as Address,
      data: fillOrderData as Hex,
    });

    // Execute transaction using sendUserOperation
    const txHash = await smartAccountClient.sendUserOperation({
      calls: calls as any,
    });

    console.log('Transaction submitted:', txHash);

    // Store position in database
    await storePosition(pair, action, order, txHash, ownerAddress);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('Immediate execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Store position in Supabase database
 */
async function storePosition(
  pair: BinaryPair,
  action: 'yes' | 'no',
  order: RawOrderData,
  txHash: Hex,
  walletAddress: Address
): Promise<void> {
  try {
    const parsed = action === 'yes' ? pair.callParsed : pair.putParsed;

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
        collateral_used: (BigInt(order.order.price) * BigInt(order.order.numContracts)).toString(),
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
