'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { createBaseAccountSDK } from '@base-org/account';

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
      appName: 'Moonstack',
      appLogoUrl: `${process.env.NEXT_PUBLIC_URL}/logo.png` || 'https://moonstack.fun/logo.png',
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

export function BaseAccountProvider({ children }: BaseAccountProviderProps): JSX.Element {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
