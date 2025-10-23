import type { Hex } from 'viem';

/**
 * Get BaseScan transaction URL
 */
export function getBaseScanTxUrl(txHash: Hex): string {
  return `https://basescan.org/tx/${txHash}`;
}

/**
 * Get BaseScan address URL
 */
export function getBaseScanAddressUrl(address: string): string {
  return `https://basescan.org/address/${address}`;
}

/**
 * Format transaction hash for display (truncated)
 */
export function formatTxHash(txHash: Hex): string {
  return `${txHash.slice(0, 6)}...${txHash.slice(-4)}`;
}
