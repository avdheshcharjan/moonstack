'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { createBaseAccountSDK, base as baseAccount } from '@base-org/account';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

interface BaseAccountProviderProps {
  children: ReactNode;
}

// SDK instance will be initialized on client side only
let baseAccountSDKInstance: ReturnType<typeof createBaseAccountSDK> | null = null;

// Initialize Base Account SDK (client-side only)
export const getBaseAccountSDK = () => {
  if (typeof window === 'undefined') {
    throw new Error('Base Account SDK can only be accessed on client side');
  }

  if (!baseAccountSDKInstance) {
    baseAccountSDKInstance = createBaseAccountSDK({
      appName: 'OptionBook',
      appLogoUrl: 'https://optionbook.xyz/logo.png',
      appChainIds: [baseAccount.constants.CHAIN_IDS.base], // Chain ID 8453 for Base mainnet
    });
  }

  return baseAccountSDKInstance;
};

// For backwards compatibility
export const baseAccountSDK = new Proxy({} as ReturnType<typeof createBaseAccountSDK>, {
  get(_target, prop) {
    return getBaseAccountSDK()[prop as keyof ReturnType<typeof createBaseAccountSDK>];
  }
});

// Wagmi configuration
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});

// React Query client
const queryClient = new QueryClient();

export function BaseAccountProvider({ children }: BaseAccountProviderProps): JSX.Element {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
