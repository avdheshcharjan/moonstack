import type { Address, Hex } from 'viem';
import { numberToHex } from 'viem';
import { BrowserProvider, Contract } from 'ethers';
import { ERC20_ABI, OPTION_BOOK_ADDRESS, USDC_ADDRESS } from '@/src/utils/contracts';
import type { CartTransaction } from '@/src/types/cart';
import type { BatchBet } from '@/src/hooks/useBatchTransactions';

export interface BatchExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

export interface BatchTransactionResult {
  id: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  txHash?: Hex;
  error?: string;
}

/**
 * Execute batch transactions for old BatchBet interface (legacy support)
 * This is for backward compatibility with useBatchTransactions hook
 */
export async function executeBatchTransactions(
  bets: BatchBet[],
  ownerAddress: Address
): Promise<BatchTransactionResult[]>;

/**
 * Execute batch transactions for CartTransaction interface (new implementation)
 */
export async function executeBatchTransactions(
  transactions: CartTransaction[],
  userAddress: Address
): Promise<BatchExecutionResult>;

/**
 * Implementation that handles both interfaces
 */
export async function executeBatchTransactions(
  items: BatchBet[] | CartTransaction[],
  userAddress: Address
): Promise<BatchTransactionResult[] | BatchExecutionResult> {
  // Check if it's the old BatchBet[] interface
  if (items.length > 0 && 'pair' in items[0]) {
    const bets = items as BatchBet[];
    const results: BatchTransactionResult[] = bets.map(bet => ({
      id: bet.id,
      status: 'failed' as const,
      error: 'Batch transaction logic for BatchBet is deprecated. Please use cart-based transactions.',
    }));
    return results;
  }

  // Otherwise, it's CartTransaction[] - call the main implementation
  const transactions = items as CartTransaction[];

  try {
    if (transactions.length === 0) {
      throw new Error('No transactions to execute');
    }

    // Validate wallet connection
    if (!window.ethereum) {
      throw new Error('No wallet provider found. Please install MetaMask or another Web3 wallet.');
    }

    // Create ethers provider for transactions
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, signer);

    // Calculate total USDC needed
    const totalUSDC = transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);

    console.log('Batch execution starting...');
    console.log('Total transactions:', transactions.length);
    console.log('Total USDC needed:', Number(totalUSDC) / 1_000_000, 'USDC');

    // Step 1: Check USDC balance
    const balance = await usdcContract.balanceOf(userAddress);
    console.log('User USDC balance:', Number(balance) / 1_000_000, 'USDC');

    if (balance < totalUSDC) {
      throw new Error(
        `Insufficient USDC balance. Need ${Number(totalUSDC) / 1_000_000} USDC, have ${Number(balance) / 1_000_000} USDC`
      );
    }

    // Step 2: Check USDC allowance and approve if needed
    const currentAllowance = await usdcContract.allowance(userAddress, OPTION_BOOK_ADDRESS);
    console.log('Current USDC allowance:', Number(currentAllowance) / 1_000_000, 'USDC');

    if (currentAllowance < totalUSDC) {
      console.log('Approving USDC for OptionBook...');
      console.log('Approving amount:', Number(totalUSDC) / 1_000_000, 'USDC');

      const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, totalUSDC);
      console.log('Approval transaction submitted:', approveTx.hash);

      // Wait for approval to be mined
      const approvalReceipt = await approveTx.wait();

      if (!approvalReceipt || approvalReceipt.status !== 1) {
        throw new Error('USDC approval failed');
      }

      console.log('USDC approval confirmed');
    } else {
      console.log('USDC already approved');
    }

    // Step 3: Try to use wallet_sendCalls for batch execution (EIP-5792)
    console.log('Attempting batch execution with wallet_sendCalls...');

    try {
      // Check if wallet supports wallet_sendCalls (EIP-5792)
      const calls = transactions.map((tx) => ({
        to: tx.to,
        value: tx.value ? numberToHex(tx.value) : '0x0',
        data: tx.data,
      }));

      console.log('Prepared batch calls:', calls);
      console.log('Total calls:', calls.length);

      // Try to send as batch using EIP-5792
      const result = await provider.send('wallet_sendCalls', [
        {
          version: '1.0',
          from: userAddress,
          calls: calls,
        },
      ]);

      console.log('Batch transaction sent:', result);

      return {
        success: true,
        txHash: result as string,
      };
    } catch (batchError) {
      console.log('wallet_sendCalls not supported, falling back to sequential execution');

      // Fallback: Execute each transaction sequentially
      console.log('Executing transactions sequentially...');
      const results: string[] = [];

      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        console.log(`Executing transaction ${i + 1}/${transactions.length}...`);

        try {
          const txResponse = await signer.sendTransaction({
            to: tx.to,
            data: tx.data,
            value: tx.value || 0n,
          });

          console.log(`Transaction ${i + 1} submitted:`, txResponse.hash);

          const receipt = await txResponse.wait();

          if (!receipt || receipt.status !== 1) {
            throw new Error(`Transaction ${i + 1} failed`);
          }

          console.log(`Transaction ${i + 1} confirmed`);
          results.push(txResponse.hash);
        } catch (error) {
          console.error(`Transaction ${i + 1} failed:`, error);
          throw error;
        }
      }

      console.log('All transactions completed successfully');
      const result = results[results.length - 1]; // Return last transaction hash

      return {
        success: true,
        txHash: result as string,
      };
    }
  } catch (error) {
    console.error('Batch execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

