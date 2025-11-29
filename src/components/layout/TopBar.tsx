'use client';

import React from 'react';
import Link from 'next/link';
import PointsDisplay from '@/src/components/points/PointsDisplay';

interface TopBarProps {
  walletAddress: string | null;
}

const TopBar: React.FC<TopBarProps> = ({ walletAddress }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 touch-none pointer-events-auto bg-[#000d1d]/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center">
              <img
                src="/logo.png"
                alt="MOONSTACK"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-white text-2xl font-black tracking-tight">Moonstack</span>
          </div>

          {/* Points Badge */}
          {walletAddress && (
            <Link href="/app/points">
              <PointsDisplay walletAddress={walletAddress} compact={true} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default TopBar;
