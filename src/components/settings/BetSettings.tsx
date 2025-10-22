import React from 'react';
import { useLocalStorage } from '@/src/hooks/useLocalStorage';

interface BetSettingsProps {
  walletAddress: string | null;
}

const BetSettings: React.FC<BetSettingsProps> = ({ walletAddress }) => {
  const defaultBetSize = 5;
  const storageKey = walletAddress ? `betSize_${walletAddress}` : 'betSize_null';

  const [betSize, setBetSize] = useLocalStorage<number>(storageKey, defaultBetSize);

  const betOptions = [1, 5, 10, 25];

  const handleBetSizeChange = (amount: number) => {
    setBetSize(amount);
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
      <h2 className="text-xl font-bold text-white mb-4">Default Bet Size</h2>
      <p className="text-sm text-slate-400 mb-4">
        Set your default bet amount for predictions. This setting is saved per wallet.
      </p>

      <div className="grid grid-cols-4 gap-3">
        {betOptions.map((amount) => (
          <button
            key={amount}
            onClick={() => handleBetSizeChange(amount)}
            className={`p-4 rounded-lg border-2 transition ${
              betSize === amount
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-slate-600 hover:border-purple-400'
            }`}
          >
            <div className="text-xl font-bold text-white">${amount}</div>
            <div className="text-xs text-slate-400 mt-1">USDC</div>
          </button>
        ))}
      </div>

      <div className="mt-4 text-sm text-slate-400">
        Current selection: <span className="font-semibold text-white">${betSize} USDC</span>
      </div>
    </div>
  );
};

export default BetSettings;
