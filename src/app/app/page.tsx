'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/contexts/WalletContext';
import Moonstack from '@/components/Moonstack';

export default function MoonstackAppPage() {
  const router = useRouter();
  const { walletAddress } = useWallet();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!walletAddress) {
        router.push('/betanft');
        return;
      }

      try {
        const response = await fetch(`/api/access/check?wallet=${walletAddress}`);
        const data = await response.json();

        if (!data.hasAccess) {
          router.push('/betanft');
          return;
        }

        setHasAccess(true);
      } catch (error) {
        console.error('Access check failed:', error);
        router.push('/betanft');
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [walletAddress, router]);

  if (isChecking || hasAccess === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-black">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Verifying access...</p>
        </div>
      </div>
    );
  }

  return <Moonstack />;
}

