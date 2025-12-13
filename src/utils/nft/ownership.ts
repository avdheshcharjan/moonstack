/**
 * NFT Ownership Utilities
 *
 * Utilities for checking NFT ownership across multiple wallet addresses
 */

import { isHolderOfCollection } from '@/services/nft/alchemy';

export interface OwnershipCheckResult {
  ownsNFT: boolean;
  owningAddress?: string;
  checkedAddresses: string[];
}

/**
 * Check if any of the provided addresses owns an NFT from the specified collection
 *
 * This function checks multiple wallet addresses and returns true if ANY of them
 * owns at least one NFT from the collection. It short-circuits on the first match.
 *
 * @param addresses - Array of wallet addresses to check
 * @param contractAddress - The NFT contract address to check against
 * @returns Promise<OwnershipCheckResult> - Result object with ownership status and details
 */
export async function checkMultiAddressOwnership(
  addresses: string[],
  contractAddress: string
): Promise<OwnershipCheckResult> {
  // Deduplicate addresses (case-insensitive)
  const uniqueAddresses = Array.from(
    new Set(addresses.map(addr => addr.toLowerCase()))
  );

  console.log(`[Ownership] Checking ${uniqueAddresses.length} unique addresses for NFT ownership`);

  // Check each address sequentially (short-circuit on first match)
  for (const address of uniqueAddresses) {
    try {
      const isHolder = await isHolderOfCollection(address, contractAddress);

      if (isHolder) {
        console.log(`[Ownership] Found NFT owner at address: ${address}`);
        return {
          ownsNFT: true,
          owningAddress: address,
          checkedAddresses: uniqueAddresses,
        };
      }
    } catch (error) {
      console.error(`[Ownership] Error checking address ${address}:`, error);
      // Continue checking other addresses even if one fails
      // This ensures we don't miss checking valid addresses due to API errors
    }
  }

  console.log(`[Ownership] No NFT ownership found across all addresses`);

  return {
    ownsNFT: false,
    owningAddress: undefined,
    checkedAddresses: uniqueAddresses,
  };
}
