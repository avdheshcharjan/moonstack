'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { createBaseAccountSDK } from '@base-org/account';

interface BaseAccountProviderProps {
  children: ReactNode;
}

// SDK instance will be initialized on client side only
let baseAccountSDKInstance: ReturnType<typeof createBaseAccountSDK> | null = null;

// Initialize Base Account SDK (client-side only)
// This is the ONLY wallet provider - no MetaMask, no other extensions
export const getBaseAccountSDK = () => {
  if (typeof window === 'undefined') {
    throw new Error('Base Account SDK can only be accessed on client side');
  }

  if (!baseAccountSDKInstance) {
    console.log('🔵 Initializing Base Account SDK (ONLY wallet provider)');
    baseAccountSDKInstance = createBaseAccountSDK({
      appName: 'Moonstack',
      appLogoUrl: `${process.env.NEXT_PUBLIC_URL}/logo.png` || 'https://moonstack.fun/logo.png',
    });
    console.log('✅ Base Account SDK initialized');
  }

  return baseAccountSDKInstance;
};

// Proxy for accessing Base Account SDK
export const baseAccountSDK = new Proxy({} as ReturnType<typeof createBaseAccountSDK>, {
  get(_target, prop) {
    return getBaseAccountSDK()[prop as keyof ReturnType<typeof createBaseAccountSDK>];
  }
});

// Clean provider - no wagmi, no other wallet connectors
export function BaseAccountProvider({ children }: BaseAccountProviderProps): JSX.Element {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    console.log('✅ BaseAccountProvider mounted - Base Account ONLY');
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
