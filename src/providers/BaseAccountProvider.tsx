'use client';

import { base, createBaseAccountSDK } from '@base-org/account';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useEffect, useState } from 'react';

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
    console.log('[BaseAccountSDK] Initializing Base Account SDK...');
    baseAccountSDKInstance = createBaseAccountSDK({
      appName: 'Moonstack',
      appLogoUrl: 'https://moonstack.fun/logo.png',
      // Use Base mainnet by default
      // appChainIds: [8453], // Base mainnet chain ID
      appChainIds: [base.constants.CHAIN_IDS.base]
    });
    console.log('[BaseAccountSDK] Base Account SDK initialized successfully');
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
// const wagmiConfig = createConfig({
//   chains: [base],
//   transports: {
//     [base.id]: http(),
//   },
// });

// React Query client
const queryClient = new QueryClient();

export function BaseAccountProvider({ children }: BaseAccountProviderProps): JSX.Element {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Initialize Base Account SDK on mount (client-side only)
    if (typeof window !== 'undefined') {
      try {
        const sdk = getBaseAccountSDK();
        console.log('Base Account SDK initialized:', sdk);
      } catch (error) {
        console.error('Failed to initialize Base Account SDK:', error);
      }
    }
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
