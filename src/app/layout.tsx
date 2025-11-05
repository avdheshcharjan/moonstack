import { CartProvider } from '@/src/contexts/CartContext';
import { WalletProvider } from '@/src/contexts/WalletContext';
import { BaseAccountProvider } from '@/src/providers/BaseAccountProvider';
import type { Metadata } from 'next';
import React from 'react';
import './globals.css';

export const metadata: Metadata = {
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/logo_embedded.png`,
      button: {
        title: 'Launch Moonstack',
        action: {
          type: 'launch_miniapp',
          name: 'Moonstack',
          url: process.env.NEXT_PUBLIC_URL || 'https://moonstack.fun',
          splashImageUrl: `${process.env.NEXT_PUBLIC_URL}/logo_splash.png`,
          splashBackgroundColor: '#000d1d',
        },
      },
    }),
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BaseAccountProvider>
          <WalletProvider>
            <CartProvider>
              {children}
            </CartProvider>
          </WalletProvider>
        </BaseAccountProvider>
      </body>
    </html>
  );
}
