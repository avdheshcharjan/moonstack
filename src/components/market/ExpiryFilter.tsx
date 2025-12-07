import React from 'react';
import { ExpiryFilter as ExpiryFilterType } from '@/src/types/prediction';

interface ExpiryFilterProps {
  selectedFilter: ExpiryFilterType;
  onFilterChange: (filter: ExpiryFilterType) => void;
  counts: Record<ExpiryFilterType, number>;
}

const ExpiryFilter: React.FC<ExpiryFilterProps> = ({ selectedFilter, onFilterChange, counts }) => {
  const filters: Array<{ value: ExpiryFilterType; label: string }> = [
    { value: 'all', label: 'All' },
    { value: '1H', label: '1H' },
    { value: '1D', label: '1D' },
    { value: '2D', label: '2D' },
    { value: '3D', label: '3D' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-2 mb-2">
      <div className="flex flex-wrap gap-1.5 justify-center">
        {filters.map((filter) => {
          const count = counts[filter.value];
          const isSelected = selectedFilter === filter.value;
          const isDisabled = count === 0;

          return (
            <button
              key={filter.value}
              onClick={() => !isDisabled && onFilterChange(filter.value)}
              disabled={isDisabled}
              className={`
                px-2.5 py-1 rounded-lg text-xs font-semibold transition-all
                ${isSelected
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg scale-105'
                  : isDisabled
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white'
                }
              `}
            >
              <span>{filter.label}</span>
              <span className={`ml-1 text-xs ${isSelected ? 'text-white/80' : 'text-slate-500'}`}>
                ({count})
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ExpiryFilter;
