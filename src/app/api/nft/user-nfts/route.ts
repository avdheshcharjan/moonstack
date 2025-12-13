import { NextRequest, NextResponse } from 'next/server';
import { getUserTokenIds, getTokenURI } from '@/utils/nft/contract';

// Helper function to convert IPFS URIs to HTTP gateway URLs
// Using multiple IPFS gateways with fallback for better reliability
function convertIpfsToHttp(uri: string): string {
  if (!uri) return uri;

  // If it's already an HTTP(S) URL, return as is
  if (uri.startsWith('http://') || uri.startsWith('https://')) {
    return uri;
  }

  // Handle ipfs:// protocol
  if (uri.startsWith('ipfs://')) {
    const hash = uri.replace('ipfs://', '');
    return `https://ipfs.io/ipfs/${hash}`;
  }

  // Handle /ipfs/ paths
  if (uri.startsWith('/ipfs/')) {
    return `https://ipfs.io${uri}`;
  }

  // If it looks like a raw IPFS hash (Qm... or baf...)
  if (uri.match(/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|baf[0-9A-Za-z]{50,})/)) {
    return `https://ipfs.io/ipfs/${uri}`;
  }

  return uri;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { walletAddress } = body;

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Get all token IDs owned by this wallet
    const tokenIds = await getUserTokenIds(walletAddress);

    if (tokenIds.length === 0) {
      return NextResponse.json(
        { error: 'No NFTs found for this wallet' },
        { status: 404 }
      );
    }

    // Get the most recent NFT (last in the array)
    const latestTokenId = tokenIds[tokenIds.length - 1];
    const tokenURI = await getTokenURI(latestTokenId);

    // Fetch metadata from IPFS
    let metadata = null;
    if (tokenURI) {
      try {
        // Convert IPFS URI to HTTP gateway URL
        const httpUrl = convertIpfsToHttp(tokenURI);
        console.log('[NFT API] Fetching metadata from:', httpUrl);

        // Add timeout to prevent hanging (15 seconds)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const metadataResponse = await fetch(httpUrl, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!metadataResponse.ok) {
          throw new Error(`HTTP error! status: ${metadataResponse.status}`);
        }
        metadata = await metadataResponse.json();
        console.log('[NFT API] Metadata fetched successfully:', metadata);

        // Convert image URL from IPFS to HTTP if needed
        if (metadata && metadata.image) {
          const originalImage = metadata.image;
          metadata.image = convertIpfsToHttp(metadata.image);
          console.log('[NFT API] Original image URL:', originalImage);
          console.log('[NFT API] Converted image URL:', metadata.image);
        } else {
          console.warn('[NFT API] No image found in metadata');
        }
      } catch (err) {
        console.error('[NFT API] Error fetching metadata:', err);
        console.error('[NFT API] Token URI:', tokenURI);
        // Don't throw, continue to return what we have
      }
    }

    const NFT_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_NFT_CONTRACT_ADDRESS;

    return NextResponse.json({
      success: true,
      tokenId: latestTokenId,
      tokenURI,
      metadata,
      contractAddress: NFT_CONTRACT_ADDRESS,
      openSeaUrl: `https://opensea.io/assets/base/${NFT_CONTRACT_ADDRESS}/${latestTokenId}`,
      baseScanUrl: `https://basescan.org/token/${NFT_CONTRACT_ADDRESS}?a=${latestTokenId}`,
    });
  } catch (error) {
    console.error('Error fetching user NFTs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
