import React from 'react';
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  other: {
    'fc:miniapp': JSON.stringify({
      version: 'next',
      imageUrl: `${process.env.NEXT_PUBLIC_URL}/embed-image.png`,
      button: {
        title: 'Launch Thetanuts Trading',
        action: {
          type: 'launch_miniapp',
          name: 'Thetanuts Trading Demo',
          url: process.env.NEXT_PUBLIC_URL || 'https://thetanuts-demo.vercel.app',
          splashImageUrl: `${process.env.NEXT_PUBLIC_URL}/splash.png`,
          splashBackgroundColor: '#000d1d',
        },
      },
    }),
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
