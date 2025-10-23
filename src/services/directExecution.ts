import type { RawOrderData } from '@/src/types/orders';
import type { BinaryPair } from '@/src/types/prediction';
import { ERC20_ABI, OPTION_BOOK_ABI, OPTION_BOOK_ADDRESS, REFERRER_ADDRESS, USDC_ADDRESS } from '@/src/utils/contracts';
import { BrowserProvider, Contract } from 'ethers';
import type { Address, Hex } from 'viem';
import { encodeFunctionData } from 'viem';

export interface DirectExecutionResult {
  success: boolean;
  txHash?: Hex;
  error?: string;
}

/**
 * Execute a single fillOrder transaction directly with the user's wallet
 * Per OptionBook.md section 2.4:
 * 1. Check USDC balance
 * 2. Check USDC allowance and approve if needed
 * 3. Calculate numContracts from betSize
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
    // Validate wallet connection
    if (!window.ethereum) {
      throw new Error('No wallet provider found. Please install MetaMask or another Web3 wallet.');
    }

    // Select the order based on action
    const order: RawOrderData = action === 'yes' ? pair.callOption : pair.putOption;

    // Validate order data
    if (!order || !order.order) {
      throw new Error('Invalid order data');
    }

    // Create ethers provider for transaction execution
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, signer);


    // Step 1: Check USDC balance
    // const balance = await getUSDCBalance(userAddress);
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

    // Step 3: Check USDC allowance and approve if needed (per OptionBook.md section 2.4)
    // const currentAllowance = await checkUSDCAllowance(userAddress, OPTION_BOOK_ADDRESS as Address);
    const currentAllowance = await usdcContract.allowance(userAddress, OPTION_BOOK_ADDRESS);

    if (currentAllowance < requiredAmount) {
      console.log('Approving USDC for OptionBook...');
      console.log('Required:', Number(requiredAmount) / 1_000_000, 'USDC');
      console.log('Current allowance:', Number(currentAllowance) / 1_000_000, 'USDC');

      // Approve USDC spending
      const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);
      console.log('Approval transaction submitted:', approveTx.hash);

      // Wait for approval to be mined
      const approvalReceipt = await approveTx.wait();

      if (!approvalReceipt || approvalReceipt.status !== 1) {
        throw new Error('USDC approval failed');
      }

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

    // Step 5: Execute fillOrder transaction
    const fillOrderData = encodeFunctionData({
      abi: OPTION_BOOK_ABI,
      functionName: 'fillOrder',
      args: [
        orderParams,
        order.signature as Hex,
        REFERRER_ADDRESS as Address, // Use referrer address from contracts
      ],
    });

    console.log('Executing fillOrder...');
    const tx = await signer.sendTransaction({
      to: OPTION_BOOK_ADDRESS,
      data: fillOrderData,
    });

    console.log('Transaction submitted:', tx.hash);

    // Wait for transaction to be mined
    const receipt = await tx.wait();

    if (receipt && receipt.status === 1) {
      const txHash = receipt.hash as Hex;
      console.log('Transaction confirmed:', txHash);

      // Store position in database
      await storePosition(pair, action, order, txHash, userAddress, betSize);

      return {
        success: true,
        txHash,
      };
    } else {
      throw new Error('Transaction failed');
    }
  } catch (error) {
    console.error('Direct execution failed:', error);
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
