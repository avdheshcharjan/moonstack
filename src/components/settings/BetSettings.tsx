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
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold mb-4">Default Bet Size</h2>
      <p className="text-sm text-gray-600 mb-4">
        Set your default bet amount for predictions. This setting is saved per wallet.
      </p>

      <div className="grid grid-cols-4 gap-3">
        {betOptions.map((amount) => (
          <button
            key={amount}
            onClick={() => handleBetSizeChange(amount)}
            className={`p-4 rounded-lg border-2 transition ${
              betSize === amount
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400'
            }`}
          >
            <div className="text-xl font-bold">${amount}</div>
            <div className="text-xs text-gray-600 mt-1">USDC</div>
          </button>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Current selection: <span className="font-semibold text-gray-700">${betSize} USDC</span>
      </div>
    </div>
  );
};

export default BetSettings;
