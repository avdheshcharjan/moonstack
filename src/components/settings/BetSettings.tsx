import React from 'react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

interface BetSettingsProps {
  walletAddress: string | null;
}

const BetSettings: React.FC<BetSettingsProps> = ({ walletAddress }) => {
  const defaultBetSize = 1;
  const minBet = 0.1;
  const maxBet = 100;
  const storageKey = walletAddress ? `betSize_${walletAddress}` : 'betSize_null';

  const [betSize, setBetSize] = useLocalStorage<number>(storageKey, defaultBetSize);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setBetSize(value);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= minBet && value <= maxBet) {
      setBetSize(Math.round(value * 100) / 100);
    }
  };

  const betOptions = [0.5, 1, 5];

  const handleBetSizeChange = (amount: number) => {
    setBetSize(amount);
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700 p-6">
      <h2 className="text-xl font-bold text-white mb-4">Default Bet Size</h2>
      <p className="text-sm text-slate-400 mb-4">
        Set your default bet amount for predictions. This setting is saved per wallet.
      </p>

      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
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

        <div className="flex items-center gap-4">
          <input
            type="range"
            min={minBet}
            max={maxBet}
            step={0.1}
            value={betSize}
            onChange={handleSliderChange}
            className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
            style={{
              background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${((betSize - minBet) / (maxBet - minBet)) * 100}%, rgb(51, 65, 85) ${((betSize - minBet) / (maxBet - minBet)) * 100}%, rgb(51, 65, 85) 100%)`
            }}
          />
          <input
            type="number"
            min={minBet}
            max={maxBet}
            step={0.1}
            value={betSize}
            onChange={handleInputChange}
            className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center focus:outline-none focus:border-purple-500"
          />
        </div>

        <div className="flex justify-between text-xs text-slate-400">
          <span>${minBet.toFixed(1)} USDC</span>
          <span>${maxBet} USDC</span>
        </div>

        <div className="text-center p-4 bg-slate-700/50 rounded-lg">
          <div className="text-sm text-slate-400 mb-1">Current bet amount</div>
          <div className="text-2xl font-bold text-white">${betSize.toFixed(2)} USDC</div>
        </div>
      </div>
    </div>
  );
};

export default BetSettings;
