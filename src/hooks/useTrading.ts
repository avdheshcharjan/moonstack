import { useState } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { RawOrderData } from '../types/orders';
import {
  OPTION_BOOK_ADDRESS,
  USDC_ADDRESS,
  REFERRER_ADDRESS,
  OPTION_BOOK_ABI,
  ERC20_ABI
} from '../utils/contracts';

interface UseTradingReturn {
  isBuying: boolean;
  executeTrade: (order: RawOrderData, collateralAmount: number, walletAddress: string) => Promise<string>;
}

export function useTrading(): UseTradingReturn {
  const [isBuying, setIsBuying] = useState(false);

  const executeTrade = async (
    order: RawOrderData,
    collateralAmount: number,
    walletAddress: string
  ): Promise<string> => {
    try {
      setIsBuying(true);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const optionBookContract = new Contract(OPTION_BOOK_ADDRESS, OPTION_BOOK_ABI, signer);

      const pricePerContract = Number(order.order.price) / 1e8;
      const contractsToBuy = collateralAmount / pricePerContract;

      const numContracts = Math.floor(contractsToBuy * 1e6);
      const requiredAmount = parseUnits(collateralAmount.toString(), 6);

      const allowance = await usdcContract.allowance(walletAddress, OPTION_BOOK_ADDRESS);

      if (allowance < requiredAmount) {
        const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);
        await approveTx.wait();
      }

      const rawOrder = order.order;
      const orderParams = {
        maker: rawOrder.maker,
        orderExpiryTimestamp: rawOrder.orderExpiryTimestamp,
        collateral: rawOrder.collateral,
        isCall: rawOrder.isCall,
        priceFeed: rawOrder.priceFeed,
        implementation: rawOrder.implementation,
        isLong: rawOrder.isLong,
        maxCollateralUsable: rawOrder.maxCollateralUsable,
        strikes: rawOrder.strikes,
        expiry: rawOrder.expiry,
        price: rawOrder.price,
        numContracts: numContracts.toString(),
        extraOptionData: rawOrder.extraOptionData || "0x"
      };

      const tx = await optionBookContract.fillOrder(
        orderParams,
        order.signature,
        REFERRER_ADDRESS
      );

      const receipt = await tx.wait();

      return receipt.hash;
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const ethersError = error as { code: string; message?: string };
        if (ethersError.code === 'ACTION_REJECTED') {
          throw new Error('Transaction rejected by user');
        }
      }

      if (error instanceof Error) {
        throw new Error(error.message.slice(0, 100));
      }

      throw new Error('Failed to execute trade');
    } finally {
      setIsBuying(false);
    }
  };

  return {
    isBuying,
    executeTrade
  };
}
