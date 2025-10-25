'use client';

import React from 'react';

interface TopBarProps {
  walletAddress: string | null;
}

const TopBar: React.FC<TopBarProps> = ({ walletAddress: _walletAddress }) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 touch-none pointer-events-auto">
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
        </div>
      </div>
    </div>
  );
};

export default TopBar;
