import type { RawOrderData } from '@/src/types/orders';
import type { BinaryPair } from '@/src/types/prediction';
import { OPTION_BOOK_ABI, OPTION_BOOK_ADDRESS, REFERRER_ADDRESS } from '@/src/utils/contracts';
import type { Address, Hex } from 'viem';
import { encodeFunctionData } from 'viem';
import { cartStorage } from '@/src/utils/cartStorage';
import type { CartTransaction } from '@/src/types/cart';

export interface AddToCartResult {
  success: boolean;
  error?: string;
}

/**
 * Add a bet to the cart without executing it
 * Execution happens later via batch transaction in CartModal
 */
export async function addToCart(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  userAddress: Address
): Promise<AddToCartResult> {
  try {
    console.log('[cartService] Adding to cart:', { pair: pair.underlying, action, betSize });

    // Select the order based on action
    const order: RawOrderData = action === 'yes' ? pair.callOption : pair.putOption;

    // Validate order data
    if (!order || !order.order) {
      throw new Error('Invalid order data');
    }

    // Check if order has expired
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    const orderExpiry = Number(order.order.orderExpiryTimestamp);
    const timeUntilExpiry = orderExpiry - now;

    console.log('[cartService] Current time:', now);
    console.log('[cartService] Order expiry:', orderExpiry);
    console.log('[cartService] Time until expiry:', timeUntilExpiry, 'seconds');

    if (orderExpiry < now) {
      const expiryDate = new Date(orderExpiry * 1000).toLocaleString();
      throw new Error(`This order expired at ${expiryDate}. Please refresh the market data.`);
    }

    if (timeUntilExpiry < 60) {
      console.warn('[cartService] Warning: Order expires in less than 60 seconds!');
    }

    // Calculate number of contracts based on bet size and price
    const pricePerContract = Number(order.order.price) / 1e8; // Convert from 8 decimals
    const contractsToBuy = betSize / pricePerContract;
    const numContracts = BigInt(Math.floor(contractsToBuy * 1e6)); // Scale to 6 decimals

    // Calculate total USDC needed
    const requiredAmount = BigInt(Math.floor(betSize * 1_000_000)); // Convert to 6 decimals

    // Prepare fillOrder transaction data
    const orderParams = {
      maker: order.order.maker as Address,
      orderExpiryTimestamp: BigInt(order.order.orderExpiryTimestamp),
      collateral: order.order.collateral as Address,
      isCall: order.order.isCall,
      priceFeed: order.order.priceFeed as Address,
      implementation: order.order.implementation as Address,
      isLong: order.order.isLong,
      maxCollateralUsable: BigInt(order.order.maxCollateralUsable),
      strikes: order.order.strikes.map((s: string) => BigInt(s)),
      expiry: BigInt(order.order.expiry),
      price: BigInt(order.order.price),
      numContracts: numContracts,
      extraOptionData: (order.order.extraOptionData || '0x') as Hex,
    };

    console.log('[cartService] Order params:', orderParams);

    // Encode the fillOrder transaction
    const fillOrderData = encodeFunctionData({
      abi: OPTION_BOOK_ABI,
      functionName: 'fillOrder',
      args: [
        orderParams,
        order.signature as Hex,
        REFERRER_ADDRESS as Address,
      ],
    });

    // Create cart transaction
    const cartTransaction: CartTransaction = {
      id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      to: OPTION_BOOK_ADDRESS as Address,
      data: fillOrderData,
      description: `${action.toUpperCase()} - ${pair.underlying} - $${betSize}`,
      timestamp: Date.now(),
      requiredUSDC: requiredAmount,
      orderDetails: {
        marketId: pair.id || pair.underlying,
        side: action.toUpperCase() as 'YES' | 'NO',
        amount: betSize.toString(),
      },
    };

    console.log('[cartService] Adding transaction to cart:', cartTransaction.id);

    // Add to cart storage
    cartStorage.addTransaction(cartTransaction);

    console.log('[cartService] Successfully added to cart');

    return {
      success: true,
    };
  } catch (error) {
    console.error('[cartService] Error adding to cart:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
