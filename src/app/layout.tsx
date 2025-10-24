import React from 'react';
import './globals.css';
import type { Metadata } from 'next';
import { BaseAccountProvider } from '@/src/providers/BaseAccountProvider';

export const metadata: Metadata = {
  other: {
    'fc:miniapp': JSON.stringify({
      version: '1',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/logo.png`,
      button: {
        title: 'Launch Moonstack',
        action: {
          type: 'launch_miniapp',
          name: 'Moonstack',
          url: process.env.NEXT_PUBLIC_URL || 'https://moonstack.fun',
          splashImageUrl: `${process.env.NEXT_PUBLIC_URL}/logo_hero.png`,
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
          {children}
        </BaseAccountProvider>
      </body>
    </html>
  );
}
