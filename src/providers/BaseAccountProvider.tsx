'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getBaseAccountSDK } from '@/src/lib/smartAccount';

interface BaseAccountProviderProps {
  children: ReactNode;
}

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
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
