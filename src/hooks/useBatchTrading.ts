import { useState, useCallback } from 'react';
import { BrowserProvider, Contract, parseUnits, Interface, ContractRunner } from 'ethers';
import { RawOrderData } from '../types/orders';
import { BinaryPair } from '../types/prediction';
import {
  OPTION_BOOK_ADDRESS,
  USDC_ADDRESS,
  REFERRER_ADDRESS,
  OPTION_BOOK_ABI,
  ERC20_ABI,
  BASE_CHAIN_ID
} from '../utils/contracts';

export interface BatchedTrade {
  pair: BinaryPair;
  order: RawOrderData;
  action: 'yes' | 'no';
  collateralAmount: number;
  numContracts: string;
  requiredAmount: bigint;
}

interface UseBatchTradingReturn {
  batchedTrades: BatchedTrade[];
  addToBatch: (pair: BinaryPair, action: 'yes' | 'no', collateralAmount: number) => void;
  clearBatch: () => void;
  executeBatch: (walletAddress: string) => Promise<string>;
  isExecuting: boolean;
  totalCollateralNeeded: number;
}

export function useBatchTrading(): UseBatchTradingReturn {
  const [batchedTrades, setBatchedTrades] = useState<BatchedTrade[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);

  const addToBatch = useCallback((pair: BinaryPair, action: 'yes' | 'no', collateralAmount: number) => {
    const order = action === 'yes' ? pair.callOption : pair.putOption;
    const pricePerContract = Number(order.order.price) / 1e8;
    const contractsToBuy = collateralAmount / pricePerContract;

    // Multiply by 1e6 before flooring to preserve precision
    const numContracts = Math.floor(contractsToBuy * 1e6).toString();

    const requiredAmount = parseUnits(collateralAmount.toString(), 6);

    const trade: BatchedTrade = {
      pair,
      order,
      action,
      collateralAmount,
      numContracts,
      requiredAmount
    };

    setBatchedTrades(prev => [...prev, trade]);
  }, []);

  const clearBatch = useCallback(() => {
    setBatchedTrades([]);
  }, []);

  const totalCollateralNeeded = batchedTrades.reduce((sum, trade) => sum + trade.collateralAmount, 0);

  const executeBatch = useCallback(async (walletAddress: string): Promise<string> => {
    if (batchedTrades.length === 0) {
      throw new Error('No trades to execute');
    }

    try {
      setIsExecuting(true);

      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Check if wallet supports EIP-5792 batching
      const hasWalletSendCalls = typeof (provider.provider as { request?: (args: { method: string }) => Promise<unknown> }).request === 'function';

      if (hasWalletSendCalls) {
        // Use batched transaction via wallet_sendCalls
        return await executeBatchedCalls(batchedTrades, walletAddress, provider);
      } else {
        // Fallback: execute sequentially
        return await executeSequential(batchedTrades, walletAddress, signer);
      }
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

      throw new Error('Failed to execute batch');
    } finally {
      setIsExecuting(false);
    }
  }, [batchedTrades]);

  return {
    batchedTrades,
    addToBatch,
    clearBatch,
    executeBatch,
    isExecuting,
    totalCollateralNeeded
  };
}

/**
 * Execute batch using wallet_sendCalls (EIP-5792)
 */
async function executeBatchedCalls(
  trades: BatchedTrade[],
  walletAddress: string,
  provider: BrowserProvider
): Promise<string> {
  const usdcInterface = new Interface(ERC20_ABI);
  const optionBookInterface = new Interface(OPTION_BOOK_ABI);

  const calls: Array<{ to: string; value: string; data: string }> = [];

  // Calculate total collateral needed
  const totalRequired = trades.reduce((sum, trade) => sum + trade.requiredAmount, 0n);

  // Add single USDC approval for total amount
  const approveData = usdcInterface.encodeFunctionData('approve', [
    OPTION_BOOK_ADDRESS,
    totalRequired
  ]);

  calls.push({
    to: USDC_ADDRESS,
    value: '0x0',
    data: approveData
  });

  // Add fillOrder calls for each trade
  for (const trade of trades) {
    const rawOrder = trade.order.order;
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
      numContracts: trade.numContracts,
      extraOptionData: rawOrder.extraOptionData || "0x"
    };

    const fillOrderData = optionBookInterface.encodeFunctionData('fillOrder', [
      orderParams,
      trade.order.signature,
      REFERRER_ADDRESS
    ]);

    calls.push({
      to: OPTION_BOOK_ADDRESS,
      value: '0x0',
      data: fillOrderData
    });
  }

  // Execute batch via wallet_sendCalls
  const chainIdHex = `0x${BASE_CHAIN_ID.toString(16)}`;

  const ethProvider = provider.provider as {
    request?: (args: {
      method: string;
      params: Array<{
        version: string;
        from: string;
        chainId: string;
        atomicRequired: boolean;
        calls: Array<{ to: string; value: string; data: string }>;
      }>;
    }) => Promise<string>;
  };

  if (!ethProvider.request) {
    throw new Error('Provider does not support wallet_sendCalls');
  }

  const result = await ethProvider.request({
    method: 'wallet_sendCalls',
    params: [{
      version: '1.0',
      from: walletAddress,
      chainId: chainIdHex,
      atomicRequired: true,
      calls
    }]
  });

  return result;
}

/**
 * Fallback: execute trades sequentially
 */
async function executeSequential(
  trades: BatchedTrade[],
  walletAddress: string,
  signer: ContractRunner
): Promise<string> {
  const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
  const optionBookContract = new Contract(OPTION_BOOK_ADDRESS, OPTION_BOOK_ABI, signer);

  // Calculate total collateral needed
  const totalRequired = trades.reduce((sum, trade) => sum + trade.requiredAmount, 0n);

  // Check and approve if needed
  const allowance = await usdcContract.allowance(walletAddress, OPTION_BOOK_ADDRESS);

  if (allowance < totalRequired) {
    const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, totalRequired);
    await approveTx.wait();
  }

  // Execute each trade
  let lastTxHash = '';
  for (const trade of trades) {
    const rawOrder = trade.order.order;
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
      numContracts: trade.numContracts,
      extraOptionData: rawOrder.extraOptionData || "0x"
    };

    const tx = await optionBookContract.fillOrder(
      orderParams,
      trade.order.signature,
      REFERRER_ADDRESS
    );

    const receipt = await tx.wait();
    lastTxHash = receipt.hash;
  }

  return lastTxHash;
}
