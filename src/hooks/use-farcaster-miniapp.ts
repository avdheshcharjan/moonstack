'use client';

import { useMiniKit, useIsInMiniApp } from '@coinbase/onchainkit/minikit';
import type { Context } from '@farcaster/miniapp-core';

export interface UseFarcasterMiniAppReturn {
  isInFarcaster: boolean;
  farcasterFid: number | null;
  username?: string;
  displayName?: string;
  pfpUrl?: string;
  isLoading: boolean;
  context: Context.MiniAppContext | null;
}

/**
 * Hook to access Farcaster MiniApp context via OnchainKit's MiniKit.
 *
 * Provides easy access to the user's Farcaster ID and profile information
 * when the app is opened in Farcaster.
 *
 * @returns {UseFarcasterMiniAppReturn} Farcaster context with FID and user info
 *
 * @example
 * ```tsx
 * const { farcasterFid, isInFarcaster, displayName } = useFarcasterMiniApp();
 *
 * if (isInFarcaster && farcasterFid) {
 *   console.log(`User FID: ${farcasterFid}, Name: ${displayName}`);
 * }
 * ```
 */
export function useFarcasterMiniApp(): UseFarcasterMiniAppReturn {
  const { context } = useMiniKit();
  const { isInMiniApp, isPending } = useIsInMiniApp();

  return {
    isInFarcaster: isInMiniApp || false,
    farcasterFid: context?.user?.fid || null,
    username: context?.user?.username,
    displayName: context?.user?.displayName,
    pfpUrl: context?.user?.pfpUrl,
    isLoading: isPending,
    context,
  };
}
