import { useState, useCallback } from 'react';
import { BinaryPair } from '@/src/types/prediction';
import { RawOrderData } from '@/src/types/orders';
import type { Address, Hex } from 'viem';

export interface BatchBet {
  id: string;
  pair: BinaryPair;
  action: 'yes' | 'no';
  betSize: number;
  order: RawOrderData;
  timestamp: number;
}

export interface BatchTransactionStatus {
  id: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  txHash?: Hex;
  error?: string;
}

interface UseBatchTransactionsReturn {
  batch: BatchBet[];
  batchStatuses: Record<string, BatchTransactionStatus>;
  isBatchMode: boolean;
  isExecuting: boolean;
  addToBatch: (pair: BinaryPair, action: 'yes' | 'no', betSize: number) => void;
  removeFromBatch: (id: string) => void;
  clearBatch: () => void;
  toggleBatchMode: () => void;
  executeBatch: (walletAddress: Address) => Promise<void>;
  getTotalUSDCNeeded: () => number;
}

export function useBatchTransactions(): UseBatchTransactionsReturn {
  const [batch, setBatch] = useState<BatchBet[]>([]);
  const [batchStatuses, setBatchStatuses] = useState<Record<string, BatchTransactionStatus>>({});
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const addToBatch = useCallback((pair: BinaryPair, action: 'yes' | 'no', betSize: number) => {
    const order = action === 'yes' ? pair.callOption : pair.putOption;
    const betId = `${pair.id}-${action}-${Date.now()}`;

    const newBet: BatchBet = {
      id: betId,
      pair,
      action,
      betSize,
      order,
      timestamp: Date.now(),
    };

    setBatch(prev => [...prev, newBet]);
    setBatchStatuses(prev => ({
      ...prev,
      [betId]: { id: betId, status: 'pending' },
    }));
  }, []);

  const removeFromBatch = useCallback((id: string) => {
    setBatch(prev => prev.filter(bet => bet.id !== id));
    setBatchStatuses(prev => {
      const { [id]: removed, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearBatch = useCallback(() => {
    setBatch([]);
    setBatchStatuses({});
  }, []);

  const toggleBatchMode = useCallback(() => {
    setIsBatchMode(prev => !prev);
  }, []);

  const getTotalUSDCNeeded = useCallback(() => {
    return batch.reduce((total, bet) => {
      return total + bet.betSize;
    }, 0);
  }, [batch]);

  const executeBatch = useCallback(async (walletAddress: Address) => {
    if (batch.length === 0) {
      throw new Error('No bets in batch');
    }

    setIsExecuting(true);

    try {
      // Import batch execution service dynamically to avoid circular dependencies
      const { executeBatchTransactions } = await import('@/src/services/batchExecution');

      // Execute all transactions in the batch
      const results = await executeBatchTransactions(batch, walletAddress);

      // Update statuses based on results
      const newStatuses: Record<string, BatchTransactionStatus> = {};
      results.forEach((result) => {
        newStatuses[result.id] = result;
      });
      setBatchStatuses(newStatuses);

      // Check if all succeeded
      const allSucceeded = results.every(r => r.status === 'confirmed');
      if (allSucceeded) {
        // Clear batch after successful execution
        setTimeout(() => {
          clearBatch();
        }, 2000);
      }
    } catch (error) {
      console.error('Batch execution failed:', error);
      throw error;
    } finally {
      setIsExecuting(false);
    }
  }, [batch, clearBatch]);

  return {
    batch,
    batchStatuses,
    isBatchMode,
    isExecuting,
    addToBatch,
    removeFromBatch,
    clearBatch,
    toggleBatchMode,
    executeBatch,
    getTotalUSDCNeeded,
  };
}
