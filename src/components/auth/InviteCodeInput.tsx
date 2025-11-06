'use client';

import { useState, useEffect } from 'react';
import { isValidReferralCodeFormat, sanitizeReferralCode } from '@/src/utils/referralValidation';

interface InviteCodeInputProps {
  value: string;
  onChange: (value: string) => void;
  onValidChange?: (isValid: boolean) => void;
  disabled?: boolean;
}

export default function InviteCodeInput({ 
  value, 
  onChange, 
  onValidChange,
  disabled = false 
}: InviteCodeInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const isValid = isValidReferralCodeFormat(value);
  const hasValue = value.length > 0;

  useEffect(() => {
    onValidChange?.(isValid);
  }, [isValid, onValidChange]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeReferralCode(e.target.value);
    onChange(sanitized);
  };

  const handleClear = () => {
    onChange('');
  };

  return (
    <div className="relative">
      <div className={`
        relative flex items-center
        border-2 rounded-lg transition-all duration-200
        ${isFocused 
          ? 'border-blue-500 shadow-lg shadow-blue-500/20' 
          : hasValue 
            ? isValid 
              ? 'border-green-500/50' 
              : 'border-yellow-500/50'
            : 'border-slate-700'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}>
        <input
          type="text"
          placeholder="ABC123"
          value={value}
          onChange={handleInput}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          maxLength={6}
          className={`
            w-full px-4 py-3 
            bg-slate-800/50 
            text-white text-center text-lg font-mono tracking-[0.3em]
            uppercase
            placeholder:text-slate-500 placeholder:tracking-normal
            focus:outline-none
            rounded-lg
            ${disabled ? 'cursor-not-allowed' : ''}
          `}
        />
        
        {/* Clear button */}
        {hasValue && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 p-1 hover:bg-slate-700 rounded transition-colors"
            aria-label="Clear invite code"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Validation indicator */}
        {hasValue && isValid && !disabled && (
          <div className="absolute right-3 pointer-events-none">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}
      </div>

      {/* Helper text */}
      <div className="mt-2 text-xs text-slate-400 text-center">
        {hasValue && !isValid && value.length === 6 && (
          <span className="text-yellow-400">Invalid format - use letters and numbers only</span>
        )}
        {hasValue && value.length < 6 && (
          <span className="text-slate-500">{6 - value.length} more character{6 - value.length !== 1 ? 's' : ''}</span>
        )}
      </div>
    </div>
  );
}

