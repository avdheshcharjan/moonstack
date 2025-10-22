import React from 'react';
import { motion } from 'framer-motion';

interface BearishBullishSpectrumProps {
  bearishPercentage: number;
  bullishPercentage: number;
  showLabels?: boolean;
}

const BearishBullishSpectrum: React.FC<BearishBullishSpectrumProps> = ({
  bearishPercentage,
  bullishPercentage,
  showLabels = true,
}) => {
  const total = bearishPercentage + bullishPercentage;
  const bearishWidth = total > 0 ? (bearishPercentage / total) * 100 : 50;
  const bullishWidth = total > 0 ? (bullishPercentage / total) * 100 : 50;

  return (
    <div className="w-full space-y-2">
      {/* Labels */}
      {showLabels && (
        <div className="flex items-center justify-between text-sm font-medium">
          <span className="text-red-400">Bearish</span>
          <span className="text-green-400">Bullish</span>
        </div>
      )}

      {/* Spectrum Bar */}
      <div className="relative w-full h-8 bg-slate-800/50 rounded-full overflow-hidden border border-slate-700">
        <div className="absolute inset-0 flex">
          {/* Bearish Section */}
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${bearishWidth}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 flex items-center justify-start px-4"
          >
            {bearishWidth > 20 && (
              <span className="text-white font-bold text-sm">
                {bearishPercentage.toFixed(0)}%
              </span>
            )}
          </motion.div>

          {/* Bullish Section */}
          <motion.div
            initial={{ width: '50%' }}
            animate={{ width: `${bullishWidth}%` }}
            transition={{ type: 'spring', stiffness: 100, damping: 20 }}
            className="bg-gradient-to-l from-green-500 via-emerald-500 to-green-600 flex items-center justify-end px-4"
          >
            {bullishWidth > 20 && (
              <span className="text-white font-bold text-sm">
                {bullishPercentage.toFixed(0)}%
              </span>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BearishBullishSpectrum;
