'use client';

import React, { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { base } from 'wagmi/chains';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/wagmi';

interface ProvidersProps {
  children: ReactNode;
}

const queryClient = new QueryClient();

export function Providers({ children }: ProvidersProps): React.ReactElement {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
          config={{
            appearance: {
              mode: 'auto',
              theme: 'default',
            },
          }}
          miniKit={{
            enabled: true,
            autoConnect: true,
            notificationProxyUrl: '/api/notify',
          }}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
