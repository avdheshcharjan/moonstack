/**
 * Alchemy Service
 *
 * Service for checking NFT ownership using Alchemy API
 */

const ALCHEMY_API_KEY = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
const ALCHEMY_BASE_URL = `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;

/**
 * Check if an address owns at least one NFT from a specific collection
 *
 * @param address - Wallet address to check
 * @param contractAddress - NFT contract address
 * @returns true if the address owns at least one NFT from the collection
 */
export async function isHolderOfCollection(
  address: string,
  contractAddress: string
): Promise<boolean> {
  if (!ALCHEMY_API_KEY) {
    throw new Error('ALCHEMY_API_KEY is not configured');
  }

  try {
    const response = await fetch(ALCHEMY_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'alchemy_getNFTsForOwner',
        params: [
          address,
          {
            contractAddresses: [contractAddress],
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Alchemy API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Alchemy API error: ${data.error.message}`);
    }

    const ownedNFTs = data.result?.ownedNfts || [];
    return ownedNFTs.length > 0;
  } catch (error) {
    console.error('[Alchemy] Error checking NFT ownership:', error);
    throw error;
  }
}
