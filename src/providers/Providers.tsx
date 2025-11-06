'use client';

import React, { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { BaseAccountProvider } from '@/src/providers/BaseAccountProvider';
import { CartProvider } from '@/src/contexts/CartContext';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps): React.ReactElement {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
    >
      <BaseAccountProvider>
        <CartProvider>
          {children}
        </CartProvider>
      </BaseAccountProvider>
    </OnchainKitProvider>
  );
}
