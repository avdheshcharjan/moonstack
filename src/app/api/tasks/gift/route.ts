import { NextRequest, NextResponse } from 'next/server';
import { PointsService } from '@/lib/points-service';
import { hasUserMintedNFT } from '@/utils/nft/contract';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      gifterProfileId,
      gifterWalletAddress,
      recipientProfileId,
      recipientWalletAddress,
      recipientFid,
      recipientUsername,
      recipientDisplayName,
    } = body;

    // Validate required fields
    if (!gifterProfileId) {
      return NextResponse.json(
        { error: 'Gifter profile ID is required' },
        { status: 400 }
      );
    }

    if (!gifterWalletAddress) {
      return NextResponse.json(
        { error: 'Gifter wallet address is required' },
        { status: 400 }
      );
    }

    if (!recipientWalletAddress) {
      return NextResponse.json(
        { error: 'Recipient wallet address is required' },
        { status: 400 }
      );
    }

    // Verify that the recipient has actually received an NFT on-chain
    const hasMinted = await hasUserMintedNFT(recipientWalletAddress);

    if (!hasMinted) {
      return NextResponse.json(
        { error: 'No NFT mint found for recipient wallet address' },
        { status: 400 }
      );
    }

    const results: {
      gifter?: { success: boolean; points?: number; error?: string };
      recipient?: { success: boolean; points?: number; error?: string };
    } = {};

    // Award points to gifter (3000 points for GIFT_AURA)
    console.log('[Gift API] Awarding points to gifter:', {
      profileId: gifterProfileId,
      ruleKey: 'GIFT_AURA',
      recipientWallet: recipientWalletAddress,
    });

    const gifterResult = await PointsService.awardPoints({
      profileId: String(gifterProfileId),
      ruleKey: 'GIFT_AURA',
      sourceId: `${gifterProfileId}:gift_aura:${recipientWalletAddress}:${Date.now()}`,
      evidence: {
        action: 'gift',
        gifterWallet: gifterWalletAddress,
        recipientWallet: recipientWalletAddress,
        recipientFid: recipientFid,
        recipientUsername: recipientUsername,
        recipientDisplayName: recipientDisplayName,
        verificationMethod: 'on-chain',
        verifiedOnChain: true,
        verifiedAt: new Date().toISOString(),
      },
    });

    console.log('[Gift API] Gifter points result:', {
      success: gifterResult.success,
      points: gifterResult.points,
      error: gifterResult.error,
    });

    results.gifter = {
      success: gifterResult.success,
      points: gifterResult.points,
      error: gifterResult.error,
    };

    // Award points to recipient (2000 points for MINT_AURA) if profile exists
    if (recipientProfileId) {
      console.log('[Gift API] Awarding points to recipient:', {
        profileId: recipientProfileId,
        ruleKey: 'MINT_AURA',
        recipientWallet: recipientWalletAddress,
      });

      const recipientResult = await PointsService.awardPoints({
        profileId: String(recipientProfileId),
        ruleKey: 'MINT_AURA',
        sourceId: `recipient:mint_aura:${recipientWalletAddress}:${Date.now()}`,
        evidence: {
          action: 'received_gift',
          gifterProfileId: gifterProfileId,
          gifterWallet: gifterWalletAddress,
          recipientWallet: recipientWalletAddress,
          recipientFid: recipientFid,
          recipientUsername: recipientUsername,
          verificationMethod: 'on-chain',
          verifiedOnChain: true,
          verifiedAt: new Date().toISOString(),
        },
      });

      console.log('[Gift API] Recipient points result:', {
        success: recipientResult.success,
        points: recipientResult.points,
        error: recipientResult.error,
      });

      results.recipient = {
        success: recipientResult.success,
        points: recipientResult.points,
        error: recipientResult.error,
      };
    } else {
      console.log('[Gift API] Recipient profile ID not provided, skipping recipient points');
    }

    // If gifter points failed, return error
    if (!results.gifter.success) {
      return NextResponse.json(
        {
          error: results.gifter.error || 'Failed to award points to gifter',
          results,
        },
        { status: 400 }
      );
    }

    // Return success even if recipient points failed (recipient might not have a profile)
    return NextResponse.json({
      success: true,
      message: 'Points awarded successfully',
      gifterPoints: results.gifter.points,
      recipientPoints: results.recipient?.points || 0,
      recipientAwarded: results.recipient?.success || false,
      results,
    });
  } catch (error) {
    console.error('Error verifying gift:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

