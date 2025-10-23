'use client';

import React, { ReactNode } from 'react';
import { createBaseAccountSDK } from '@base-org/account';

interface BaseAccountProviderProps {
  children: ReactNode;
}

// Initialize Base Account SDK
export const baseAccountSDK = createBaseAccountSDK({
  appName: 'Moonstack',
  appLogoUrl: `${process.env.NEXT_PUBLIC_URL}/logo.png` || 'https://moonstack.fun/logo.png',
});

export function BaseAccountProvider({ children }: BaseAccountProviderProps): JSX.Element {
  return <>{children}</>;
}
