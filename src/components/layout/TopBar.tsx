import React from 'react';

interface TopBarProps {
  onProfileClick?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ onProfileClick }) => {
  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-b from-[#000d1d] via-slate-900/95 to-transparent backdrop-blur-lg z-40 border-b border-slate-800/50">
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
            <span className="text-white text-2xl font-black tracking-tight">moonstack</span>
          </div>

          {/* Profile */}
          <div className="flex items-center gap-3">
            {/* Profile Button */}
            <button
              onClick={onProfileClick}
              className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center border-2 border-white/20 hover:scale-105 transition-transform"
            >
              <span className="text-white font-bold text-sm">A</span>
              <div className="absolute top-0 right-0 w-3 h-3 bg-purple-500 rounded-full border-2 border-slate-900" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
