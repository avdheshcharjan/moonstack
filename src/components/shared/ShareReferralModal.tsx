'use client';

import { useState } from 'react';

interface ShareReferralModalProps {
  referralCode: string;
  referralLink: string;
  onClose: () => void;
}

export default function ShareReferralModal({
  referralCode,
  referralLink,
  onClose,
}: ShareReferralModalProps) {
  const [copied, setCopied] = useState(false);

  const shareMessage = `Join me on Moonstack and start trading crypto options! Use my referral code: ${referralCode}\n\n${referralLink}`;

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      `🚀 Join me on @MoonstackFun and start predicting crypto prices!\n\nUse code: ${referralCode}\n\n${referralLink}`
    )}`;
    window.open(twitterUrl, '_blank');
  };

  const shareOnTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(
      referralLink
    )}&text=${encodeURIComponent(
      `Join me on Moonstack! Use code: ${referralCode}`
    )}`;
    window.open(telegramUrl, '_blank');
  };

  const shareNative = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join Moonstack',
          text: shareMessage,
          url: referralLink,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white text-xl font-bold">Share Referral</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Referral Code Display */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-4 mb-6">
          <p className="text-white/80 text-sm text-center mb-2">Your Code</p>
          <p className="text-white text-2xl font-bold text-center tracking-widest">
            {referralCode}
          </p>
        </div>

        {/* Link with Copy */}
        <div className="bg-gray-800 rounded-lg p-3 mb-6 flex items-center gap-2">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="flex-1 bg-transparent text-gray-300 text-sm outline-none"
          />
          <button
            onClick={copyLink}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg 
                     transition-colors duration-200 min-w-[80px]"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Share Buttons */}
        <div className="space-y-3">
          {/* Native Share (mobile) */}
          {navigator.share && (
            <button
              onClick={shareNative}
              className="w-full bg-gray-800 hover:bg-gray-700 text-white py-3 px-4 rounded-lg 
                       flex items-center justify-center gap-3 transition-colors duration-200"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share
            </button>
          )}

          {/* Twitter */}
          <button
            onClick={shareOnTwitter}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white py-3 px-4 rounded-lg 
                     flex items-center justify-center gap-3 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
            </svg>
            Share on Twitter
          </button>

          {/* Telegram */}
          <button
            onClick={shareOnTelegram}
            className="w-full bg-blue-400 hover:bg-blue-500 text-white py-3 px-4 rounded-lg 
                     flex items-center justify-center gap-3 transition-colors duration-200"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.831-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
            </svg>
            Share on Telegram
          </button>
        </div>
      </div>
    </div>
  );
}

