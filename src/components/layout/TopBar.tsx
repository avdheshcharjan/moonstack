'use client';

import React from 'react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

interface TopBarProps {
  walletAddress?: string | null;
}

const TopBar: React.FC<TopBarProps> = () => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 border-b border-slate-800/50 touch-none pointer-events-auto bg-white/5 backdrop-blur-xl">
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
          
          {/* Wallet Connect */}
          <div className="flex items-center">
            <Wallet>
              <ConnectWallet>
                <Avatar className="h-6 w-6" />
                <Name />
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar className="w-8 h-8" />
                  <Name />
                  <Address className="text-slate-400" />
                  <EthBalance />
                </Identity>
                <WalletDropdownBasename />
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;
