import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import MoonNFTContract from '@/contracts/MoonNFT.json';

const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS as `0x${string}`;

// Use Alchemy RPC to avoid rate limiting
const RPC_URL =
  process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL ||
  (process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
    ? `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
    : undefined);

/**
 * Check if a wallet address has minted an AURA NFT
 */
export async function hasUserMintedNFT(walletAddress: string): Promise<boolean> {
  if (!NFT_CONTRACT_ADDRESS) {
    console.warn('NFT_CONTRACT_ADDRESS not configured');
    return false;
  }

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });

    // Check the mint count for this address
    const mintCount = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: MoonNFTContract.abi,
      functionName: 'mintCount',
      args: [walletAddress as `0x${string}`],
    });

    return Number(mintCount) > 0;
  } catch (error) {
    console.error('Error checking NFT mint status:', error);
    return false;
  }
}

/**
 * Get the total number of mints for an address
 */
export async function getUserMintCount(walletAddress: string): Promise<number> {
  if (!NFT_CONTRACT_ADDRESS) {
    console.warn('NFT_CONTRACT_ADDRESS not configured');
    return 0;
  }

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });

    const mintCount = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: MoonNFTContract.abi,
      functionName: 'mintCount',
      args: [walletAddress as `0x${string}`],
    });

    return Number(mintCount);
  } catch (error) {
    console.error('Error getting mint count:', error);
    return 0;
  }
}

/**
 * Get total supply of NFTs
 */
export async function getTotalSupply(): Promise<number> {
  if (!NFT_CONTRACT_ADDRESS) {
    console.warn('NFT_CONTRACT_ADDRESS not configured');
    return 0;
  }

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });

    const totalSupply = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: MoonNFTContract.abi,
      functionName: 'totalSupply',
    });

    return Number(totalSupply);
  } catch (error) {
    console.error('Error getting total supply:', error);
    return 0;
  }
}

/**
 * Get NFT token IDs owned by an address
 */
export async function getUserTokenIds(walletAddress: string): Promise<number[]> {
  if (!NFT_CONTRACT_ADDRESS) {
    console.warn('NFT_CONTRACT_ADDRESS not configured');
    return [];
  }

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });

    // Get balance of NFTs
    const balance = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: MoonNFTContract.abi,
      functionName: 'balanceOf',
      args: [walletAddress as `0x${string}`],
    });

    const tokenIds: number[] = [];
    const balanceNum = Number(balance);

    // Get each token ID by index
    for (let i = 0; i < balanceNum; i++) {
      const tokenId = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: MoonNFTContract.abi,
        functionName: 'tokenOfOwnerByIndex',
        args: [walletAddress as `0x${string}`,  BigInt(i)],
      });
      tokenIds.push(Number(tokenId));
    }

    return tokenIds;
  } catch (error) {
    console.error('Error getting user token IDs:', error);
    return [];
  }
}

/**
 * Get NFT metadata URI
 */
export async function getTokenURI(tokenId: number): Promise<string | null> {
  if (!NFT_CONTRACT_ADDRESS) {
    console.warn('NFT_CONTRACT_ADDRESS not configured');
    return null;
  }

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });

    const tokenURI = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: MoonNFTContract.abi,
      functionName: 'tokenURI',
      args: [BigInt(tokenId)],
    });

    return tokenURI as string;
  } catch (error) {
    console.error('Error getting token URI:', error);
    return null;
  }
}

/**
 * Get royalty information for a token
 * @param tokenId The token ID to check
 * @param salePrice The sale price to calculate royalty from
 * @returns Object containing receiver address and royalty amount, or null if error
 */
export async function getRoyaltyInfo(
  tokenId: number, 
  salePrice: bigint
): Promise<{ receiver: string; amount: bigint } | null> {
  if (!NFT_CONTRACT_ADDRESS) {
    console.warn('NFT_CONTRACT_ADDRESS not configured');
    return null;
  }

  try {
    const publicClient = createPublicClient({
      chain: base,
      transport: http(RPC_URL),
    });

    const [receiver, amount] = await publicClient.readContract({
      address: NFT_CONTRACT_ADDRESS,
      abi: MoonNFTContract.abi,
      functionName: 'royaltyInfo',
      args: [BigInt(tokenId), salePrice],
    }) as [string, bigint];

    return { receiver, amount };
  } catch (error) {
    console.error('Error getting royalty info:', error);
    return null;
  }
}
