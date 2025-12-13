/**
 * IPFS Service
 *
 * Service for uploading NFT images and metadata to IPFS via Pinata
 */

import { Tier, TierTraits } from '@/utils/nft/tier';

const PINATA_JWT = process.env.PINATA_JWT;
const PINATA_API_BASE = 'https://api.pinata.cloud';

export interface IPFSUploadResult {
  imageUrl: string; // IPFS URL for the image
  metadataUrl: string; // IPFS URL for the metadata JSON
}

/**
 * Upload NFT image and metadata to IPFS
 *
 * @param imageDataUrl - Base64 data URL of the generated NFT image
 * @param tier - NFT tier (1-5)
 * @param traits - NFT traits
 * @param fid - Farcaster ID of the user
 * @returns IPFS URLs for image and metadata
 */
export async function uploadToIPFS(params: {
  imageDataUrl: string;
  tier: Tier;
  traits: TierTraits;
  fid: number;
}): Promise<IPFSUploadResult> {
  if (!PINATA_JWT) {
    throw new Error('PINATA_JWT is not configured');
  }

  const { imageDataUrl, tier, traits, fid } = params;

  try {
    // Step 1: Upload image to IPFS
    console.log('[IPFS] Uploading image to Pinata...');

    // Convert data URL to blob
    const imageBlob = dataURLtoBlob(imageDataUrl);

    // Create FormData for image upload
    const imageFormData = new FormData();
    imageFormData.append('file', imageBlob, `aura-nft-${fid}-${Date.now()}.png`);

    const imageMetadata = JSON.stringify({
      name: `AURA NFT #${fid}`,
      keyvalues: {
        tier: tier.toString(),
        fid: fid.toString(),
      },
    });
    imageFormData.append('pinataMetadata', imageMetadata);

    const imageOptions = JSON.stringify({
      cidVersion: 1,
    });
    imageFormData.append('pinataOptions', imageOptions);

    const imageResponse = await fetch(`${PINATA_API_BASE}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: imageFormData,
    });

    if (!imageResponse.ok) {
      const error = await imageResponse.text();
      throw new Error(`Failed to upload image to IPFS: ${error}`);
    }

    const imageResult = await imageResponse.json();
    const imageIPFSHash = imageResult.IpfsHash;
    const imageUrl = `ipfs://${imageIPFSHash}`;

    console.log('[IPFS] Image uploaded:', imageUrl);

    // Step 2: Create and upload metadata JSON
    console.log('[IPFS] Uploading metadata to Pinata...');

    const metadata = {
      name: `AURA #${fid}`,
      description: `A personalized AURA NFT - Tier ${tier} pixelated cyberpunk beagle`,
      image: imageUrl,
      attributes: buildAttributes(tier, traits),
    };

    const metadataBlob = new Blob([JSON.stringify(metadata, null, 2)], {
      type: 'application/json',
    });

    const metadataFormData = new FormData();
    metadataFormData.append('file', metadataBlob, `aura-nft-metadata-${fid}-${Date.now()}.json`);

    const metadataMetadata = JSON.stringify({
      name: `AURA NFT Metadata #${fid}`,
      keyvalues: {
        tier: tier.toString(),
        fid: fid.toString(),
      },
    });
    metadataFormData.append('pinataMetadata', metadataMetadata);
    metadataFormData.append('pinataOptions', imageOptions);

    const metadataResponse = await fetch(`${PINATA_API_BASE}/pinning/pinFileToIPFS`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: metadataFormData,
    });

    if (!metadataResponse.ok) {
      const error = await metadataResponse.text();
      throw new Error(`Failed to upload metadata to IPFS: ${error}`);
    }

    const metadataResult = await metadataResponse.json();
    const metadataIPFSHash = metadataResult.IpfsHash;
    const metadataUrl = `ipfs://${metadataIPFSHash}`;

    console.log('[IPFS] Metadata uploaded:', metadataUrl);

    return {
      imageUrl,
      metadataUrl,
    };
  } catch (error) {
    console.error('[IPFS] Upload error:', error);
    throw error;
  }
}

/**
 * Convert base64 data URL to Blob
 */
function dataURLtoBlob(dataURL: string): Blob {
  const parts = dataURL.split(',');
  const contentType = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const raw = atob(parts[1]);
  const rawLength = raw.length;
  const uInt8Array = new Uint8Array(rawLength);

  for (let i = 0; i < rawLength; i++) {
    uInt8Array[i] = raw.charCodeAt(i);
  }

  return new Blob([uInt8Array], { type: contentType });
}

/**
 * Build NFT attributes array from tier and traits
 */
function buildAttributes(tier: Tier, traits: TierTraits): Array<{ trait_type: string; value: string | number }> {
  const attributes: Array<{ trait_type: string; value: string | number }> = [
    {
      trait_type: 'Tier',
      value: tier,
    },
    {
      trait_type: 'Background',
      value: traits.background,
    },
  ];

  if (traits.furColour) {
    attributes.push({
      trait_type: 'Fur Colour',
      value: traits.furColour,
    });
  }

  if (traits.cape) {
    attributes.push({
      trait_type: 'Cape',
      value: traits.cape,
    });
  }

  if (traits.hat) {
    attributes.push({
      trait_type: 'Hat',
      value: traits.hat,
    });
  }

  if (traits.necklace) {
    attributes.push({
      trait_type: 'Necklace',
      value: traits.necklace,
    });
  }

  if (traits.glasses) {
    attributes.push({
      trait_type: 'Glasses',
      value: traits.glasses,
    });
  }

  if (traits.aura) {
    attributes.push({
      trait_type: 'Aura',
      value: traits.aura,
    });
  }

  if (traits.eyeColour) {
    attributes.push({
      trait_type: 'Eye Colour',
      value: traits.eyeColour,
    });
  }

  return attributes;
}
