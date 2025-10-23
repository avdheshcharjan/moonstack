import type { Address, Hex } from 'viem';
import { encodeFunctionData } from 'viem';
import { createSmartAccountWithPaymaster } from '@/src/lib/smartAccount';
import { needsApproval, encodeUSDCApprove, calculateTotalUSDCNeeded, getUSDCBalance } from '@/src/utils/usdcApproval';
import { OPTION_BOOK_ADDRESS, OPTION_BOOK_ABI, REFERRER_ADDRESS, USDC_ADDRESS } from '@/src/utils/contracts';
import type { BatchBet } from '@/src/hooks/useBatchTransactions';

export interface BatchTransactionResult {
  id: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  txHash?: Hex;
  error?: string;
}

/**
 * Execute a batch of betting transactions with paymaster sponsorship
 * All fillOrder calls are bundled into a single batch transaction
 */
export async function executeBatchTransactions(
  bets: BatchBet[],
  ownerAddress: Address
): Promise<BatchTransactionResult[]> {
  const results: BatchTransactionResult[] = bets.map(bet => ({
    id: bet.id,
    status: 'pending' as const,
  }));

  try {
    // COMMENTED OUT: Batch transaction and paymaster logic
    /*
    // Create smart account client with paymaster support
    const smartAccountClient = await createSmartAccountWithPaymaster(ownerAddress);
    const smartAccountAddress = smartAccountClient.account.address;

    // Check USDC balance
    const balance = await getUSDCBalance(smartAccountAddress);
    const totalNeeded = calculateTotalUSDCNeeded(
      bets.map(bet => ({
        betSize: bet.betSize,
        numContracts: BigInt(bet.order.order.numContracts),
      }))
    );

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

    // Prepare batch calls
    const calls: Array<{ to: Address; data: Hex }> = [];

    // Add approval call if needed
    if (approvalNeeded) {
      const approveCallData = encodeUSDCApprove(totalNeeded);
      calls.push({
        to: USDC_ADDRESS as Address,
        data: approveCallData as Hex,
      });
    }

    // Add all fillOrder calls to the batch
    for (const bet of bets) {
      const typedOrder = {
        ...bet.order.order,
        maker: bet.order.order.maker as Address,
        orderExpiryTimestamp: BigInt(bet.order.order.orderExpiryTimestamp),
        collateral: bet.order.order.collateral as Address,
        priceFeed: bet.order.order.priceFeed as Address,
        implementation: bet.order.order.implementation as Address,
        maxCollateralUsable: BigInt(bet.order.order.maxCollateralUsable),
        strikes: bet.order.order.strikes.map((s: string | bigint) => BigInt(s)),
        expiry: BigInt(bet.order.order.expiry),
        price: BigInt(bet.order.order.price),
        numContracts: BigInt(bet.order.order.numContracts),
        extraOptionData: bet.order.order.extraOptionData as Hex,
      };

      const fillOrderData = encodeFunctionData({
        abi: OPTION_BOOK_ABI,
        functionName: 'fillOrder',
        args: [
          typedOrder,
          bet.order.signature as Hex,
          REFERRER_ADDRESS as Address,
        ],
      });

      calls.push({
        to: OPTION_BOOK_ADDRESS as Address,
        data: fillOrderData as Hex,
      });
    }

    // Execute all calls in a single batch transaction using sendUserOperation
    const txHash = await smartAccountClient.sendUserOperation({
      calls: calls as any,
    });

    console.log('Batch transaction submitted:', txHash);

    // Update all results to submitted
    results.forEach((result, index) => {
      results[index] = {
        id: result.id,
        status: 'submitted',
        txHash,
      };
    });

    // Mark all as confirmed (skip waiting for receipt for now)
    results.forEach((result, index) => {
      results[index] = {
        id: result.id,
        status: 'confirmed',
        txHash,
      };
    });

    // Store all positions in Supabase
    await Promise.all(
      bets.map(bet => storePosition(bet, txHash, ownerAddress))
    );
    */

    // Temporary: Return all as failed until batch logic is fixed
    throw new Error('Batch transaction logic is currently disabled');

    return results;
  } catch (error) {
    // If batch-level error occurs, mark all as failed
    return bets.map(bet => ({
      id: bet.id,
      status: 'failed' as const,
      error: error instanceof Error ? error.message : 'Unknown error',
    }));
  }
}

/**
 * Store position in Supabase database
 */
async function storePosition(bet: BatchBet, txHash: Hex, walletAddress: Address): Promise<void> {
  try {
    const order = bet.order.order;
    const parsed = bet.action === 'yes' ? bet.pair.callParsed : bet.pair.putParsed;

    const response = await fetch('/api/positions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet_address: walletAddress,
        tx_hash: txHash,
        strategy_type: parsed.strategyType,
        underlying: bet.pair.underlying,
        is_call: order.isCall,
        strikes: order.strikes.map(s => s.toString()),
        strike_width: parsed.strikeWidth,
        expiry: bet.pair.expiry.toISOString(),
        price_per_contract: order.price.toString(),
        max_size: order.maxCollateralUsable.toString(),
        collateral_used: (BigInt(order.price) * BigInt(order.numContracts)).toString(),
        num_contracts: order.numContracts.toString(),
        raw_order: bet.order,
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
