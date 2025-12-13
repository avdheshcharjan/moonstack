import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import MoonNFTABI from '@/contracts/MoonNFT.json';
import { MOON_NFT_ADDRESS } from './contracts';

// Create public client for reading contract state (Base Sepolia testnet)
const alchemyRpcUrl = `https://base-sepolia.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`;

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(alchemyRpcUrl),
});

/**
 * Check if a wallet address has minted an NFT from the MoonNFT contract
 *
 * @param address - Wallet address to check
 * @returns true if the address has minted at least one NFT, false otherwise
 */
export async function hasUserMintedNFT(address: string): Promise<boolean> {
  if (!MOON_NFT_ADDRESS || MOON_NFT_ADDRESS === '') {
    throw new Error('MOON_NFT_ADDRESS not configured. Please set NEXT_PUBLIC_NFT_CONTRACT_ADDRESS in .env.local');
  }

  try {
    const mintCount = await publicClient.readContract({
      address: MOON_NFT_ADDRESS,
      abi: MoonNFTABI.abi,
      functionName: 'mintCount',
      args: [address],
    });

    return (mintCount as bigint) > 0n;
  } catch (error) {
    console.error('Error checking if user has minted:', error);
    throw new Error('Failed to check mint status');
  }
}

/**
 * Get the total supply of NFTs minted
 *
 * @returns Total number of NFTs minted
 */
export async function getTotalSupply(): Promise<number> {
  if (!MOON_NFT_ADDRESS || MOON_NFT_ADDRESS === '') {
    throw new Error('MOON_NFT_ADDRESS not configured');
  }

  try {
    const supply = await publicClient.readContract({
      address: MOON_NFT_ADDRESS,
      abi: MoonNFTABI.abi,
      functionName: 'totalSupply',
    });

    return Number(supply);
  } catch (error) {
    console.error('Error getting total supply:', error);
    throw new Error('Failed to get total supply');
  }
}

/**
 * Get the token IDs owned by a specific address
 *
 * @param address - Wallet address to query
 * @returns Array of token IDs owned by the address
 */
export async function getUserTokenIds(address: string): Promise<bigint[]> {
  if (!MOON_NFT_ADDRESS || MOON_NFT_ADDRESS === '') {
    throw new Error('MOON_NFT_ADDRESS not configured');
  }

  try {
    // Get balance first
    const balance = await publicClient.readContract({
      address: MOON_NFT_ADDRESS,
      abi: MoonNFTABI.abi,
      functionName: 'balanceOf',
      args: [address],
    });

    const balanceNumber = Number(balance);
    const tokenIds: bigint[] = [];

    // Get each token ID by index
    for (let i = 0; i < balanceNumber; i++) {
      const tokenId = await publicClient.readContract({
        address: MOON_NFT_ADDRESS,
        abi: MoonNFTABI.abi,
        functionName: 'tokenOfOwnerByIndex',
        args: [address, i],
      });
      tokenIds.push(tokenId as bigint);
    }

    return tokenIds;
  } catch (error) {
    console.error('Error getting user token IDs:', error);
    throw new Error('Failed to get token IDs');
  }
}

/**
 * Get the metadata URI for a specific token ID
 *
 * @param tokenId - The token ID to query
 * @returns The IPFS metadata URI for the token
 */
export async function getTokenURI(tokenId: bigint): Promise<string> {
  if (!MOON_NFT_ADDRESS || MOON_NFT_ADDRESS === '') {
    throw new Error('MOON_NFT_ADDRESS not configured');
  }

  try {
    const tokenURI = await publicClient.readContract({
      address: MOON_NFT_ADDRESS,
      abi: MoonNFTABI.abi,
      functionName: 'tokenURI',
      args: [tokenId],
    });

    return tokenURI as string;
  } catch (error) {
    console.error('Error getting token URI:', error);
    throw new Error('Failed to get token URI');
  }
}

/**
 * Get the current mint price
 *
 * @returns Mint price in wei as a bigint
 */
export async function getMintPrice(): Promise<bigint> {
  if (!MOON_NFT_ADDRESS || MOON_NFT_ADDRESS === '') {
    throw new Error('MOON_NFT_ADDRESS not configured');
  }

  try {
    const price = await publicClient.readContract({
      address: MOON_NFT_ADDRESS,
      abi: MoonNFTABI.abi,
      functionName: 'mintPrice',
    });

    return price as bigint;
  } catch (error) {
    console.error('Error getting mint price:', error);
    throw new Error('Failed to get mint price');
  }
}

/**
 * Get the maximum supply of NFTs
 *
 * @returns Maximum supply of NFTs
 */
export async function getMaxSupply(): Promise<number> {
  if (!MOON_NFT_ADDRESS || MOON_NFT_ADDRESS === '') {
    throw new Error('MOON_NFT_ADDRESS not configured');
  }

  try {
    const maxSupply = await publicClient.readContract({
      address: MOON_NFT_ADDRESS,
      abi: MoonNFTABI.abi,
      functionName: 'maxSupply',
    });

    return Number(maxSupply);
  } catch (error) {
    console.error('Error getting max supply:', error);
    throw new Error('Failed to get max supply');
  }
}
