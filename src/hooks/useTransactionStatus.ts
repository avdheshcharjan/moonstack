import { useState, useEffect, useCallback } from 'react';
import type { Hex } from 'viem';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';

export type TransactionStatus = 'pending' | 'confirming' | 'confirmed' | 'failed';

export interface TransactionInfo {
  hash: Hex;
  status: TransactionStatus;
  confirmations: number;
  blockNumber?: bigint;
  error?: string;
}

interface UseTransactionStatusReturn {
  transactions: Record<Hex, TransactionInfo>;
  addTransaction: (hash: Hex) => void;
  removeTransaction: (hash: Hex) => void;
  getTransactionStatus: (hash: Hex) => TransactionInfo | undefined;
}

const REQUIRED_CONFIRMATIONS = 1;
const POLLING_INTERVAL = 2000; // 2 seconds

export function useTransactionStatus(): UseTransactionStatusReturn {
  const [transactions, setTransactions] = useState<Record<Hex, TransactionInfo>>({});

  const addTransaction = useCallback((hash: Hex) => {
    setTransactions(prev => ({
      ...prev,
      [hash]: {
        hash,
        status: 'pending',
        confirmations: 0,
      },
    }));
  }, []);

  const removeTransaction = useCallback((hash: Hex) => {
    setTransactions(prev => {
      const { [hash]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const getTransactionStatus = useCallback((hash: Hex): TransactionInfo | undefined => {
    return transactions[hash];
  }, [transactions]);

  // Poll for transaction status updates
  useEffect(() => {
    const pendingTxHashes = Object.keys(transactions).filter(
      hash => transactions[hash as Hex].status === 'pending' || transactions[hash as Hex].status === 'confirming'
    ) as Hex[];

    if (pendingTxHashes.length === 0) {
      return;
    }

    const publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });

    const pollStatuses = async () => {
      for (const hash of pendingTxHashes) {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash });

          if (receipt) {
            const currentBlock = await publicClient.getBlockNumber();
            const confirmations = Number(currentBlock - receipt.blockNumber) + 1;

            setTransactions(prev => ({
              ...prev,
              [hash]: {
                hash,
                status: confirmations >= REQUIRED_CONFIRMATIONS ? 'confirmed' : 'confirming',
                confirmations,
                blockNumber: receipt.blockNumber,
              },
            }));
          }
        } catch (error) {
          // Transaction might still be pending or failed
          try {
            const tx = await publicClient.getTransaction({ hash });
            if (!tx) {
              // Transaction not found - might have failed
              setTransactions(prev => ({
                ...prev,
                [hash]: {
                  hash,
                  status: 'failed',
                  confirmations: 0,
                  error: 'Transaction not found',
                },
              }));
            }
          } catch {
            // Keep as pending
          }
        }
      }
    };

    // Initial poll
    pollStatuses();

    // Set up polling interval
    const interval = setInterval(pollStatuses, POLLING_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [transactions]);

  return {
    transactions,
    addTransaction,
    removeTransaction,
    getTransactionStatus,
  };
}
