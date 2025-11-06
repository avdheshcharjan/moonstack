'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function ReferralLandingPage() {
  const params = useParams();
  const router = useRouter();
  const code = params.code as string;

  // Immediately redirect to home with query parameter
  useEffect(() => {
    if (code) {
      console.log('🔄 Redirecting /ref/' + code + ' to /?ref=' + code);
      router.replace(`/?ref=${code}`);
    } else {
      // No code, just go home
      router.replace('/');
    }
  }, [code, router]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#000d1d] to-[#001a33] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white text-lg">Redirecting...</p>
        <p className="text-slate-400 text-sm mt-2">Taking you to Moonstack with your invite code</p>
      </div>
    </div>
  );
}

