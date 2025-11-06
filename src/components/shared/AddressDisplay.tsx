'use client';

import { Identity, Avatar, Name, Address } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

interface AddressDisplayProps {
  address: string;
  showAvatar?: boolean;
  className?: string;
}

/**
 * Component to display basename if available, otherwise shows formatted wallet address
 * Uses OnchainKit's Identity component for basename resolution
 */
export function AddressDisplay({ address, showAvatar = false, className = '' }: AddressDisplayProps): React.ReactElement {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Identity
        address={address as `0x${string}`}
        chain={base}
      >
        {showAvatar && <Avatar />}
        <Name>
          <Address className="font-mono text-white" />
        </Name>
      </Identity>
    </div>
  );
}
