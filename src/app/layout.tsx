'use client';

import React, { useEffect } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
