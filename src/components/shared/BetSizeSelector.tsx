import React from 'react';

interface BetSizeSelectorProps {
  selectedBet: number;
  onSelect: (amount: number) => void;
  pricePerContract: number;
  strikeWidth: number;
}

const BetSizeSelector: React.FC<BetSizeSelectorProps> = ({
  selectedBet,
  onSelect,
  pricePerContract,
  strikeWidth,
}) => {
  const calculateContracts = (betSize: number): number => {
    return betSize / pricePerContract;
  };

  const calculateMaxPayout = (betSize: number): number => {
    const contracts = calculateContracts(betSize);
    return contracts * strikeWidth;
  };

  return (
    <div className="mb-4">
      <div className="text-sm font-semibold text-gray-700 mb-3">Select Bet Size</div>
      <div className="grid grid-cols-4 gap-2">
        {[1, 5, 10, 25].map((amount) => {
          const contracts = calculateContracts(amount);
          const maxPayout = calculateMaxPayout(amount);
          return (
            <button
              key={amount}
              onClick={() => onSelect(amount)}
              className={`p-3 rounded-lg border-2 transition ${
                selectedBet === amount
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-300 hover:border-blue-400'
              }`}
            >
              <div className="text-lg font-bold">${amount}</div>
              <div className="text-xs text-gray-600 mt-1">
                {contracts.toFixed(2)} contracts
              </div>
              <div className="text-xs text-green-600 font-semibold">
                Max: ${maxPayout.toFixed(0)}
              </div>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-xs text-gray-500">
        Premium: ${pricePerContract.toFixed(4)} per contract
      </div>
    </div>
  );
};

export default BetSizeSelector;
