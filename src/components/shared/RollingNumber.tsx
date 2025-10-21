import React, { useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RollingNumberProps {
  value: number;
  decimals?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  formatOptions?: Intl.NumberFormatOptions;
}

const RollingNumber: React.FC<RollingNumberProps> = ({
  value,
  decimals = 2,
  className = '',
  prefix = '',
  suffix = '',
  formatOptions,
}) => {
  const prevDigitsRef = useRef<string[]>([]);

  const currentFormatted = useMemo(() => {
    return formatOptions
      ? value.toLocaleString('en-US', formatOptions)
      : value.toLocaleString('en-US', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
  }, [value, decimals, formatOptions]);

  const currentDigits = useMemo(() => {
    return currentFormatted.split('');
  }, [currentFormatted]);

  const prevDigits = prevDigitsRef.current;

  // Update ref for next render
  prevDigitsRef.current = currentDigits;

  const shouldAnimate = (index: number): boolean => {
    if (prevDigits.length === 0) return false;
    return prevDigits[index] !== currentDigits[index];
  };

  return (
    <span className={`inline-flex ${className}`}>
      {prefix && <span className="mr-0.5">{prefix}</span>}
      {currentDigits.map((char, index) => {
        const isDigit = /\d/.test(char);
        const animate = shouldAnimate(index) && isDigit;

        if (!isDigit) {
          // Non-digit characters (commas, periods) don't animate
          return (
            <span key={`${index}-${char}`} className="inline-block">
              {char}
            </span>
          );
        }

        return (
          <span key={index} className="inline-block relative overflow-hidden" style={{ width: '0.6em' }}>
            <AnimatePresence mode="popLayout">
              {animate ? (
                <motion.span
                  key={`${index}-${char}`}
                  initial={{ y: -20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 30,
                  }}
                  className="inline-block"
                >
                  {char}
                </motion.span>
              ) : (
                <span key={`${index}-${char}-static`} className="inline-block">
                  {char}
                </span>
              )}
            </AnimatePresence>
          </span>
        );
      })}
      {suffix && <span className="ml-0.5">{suffix}</span>}
    </span>
  );
};

export default RollingNumber;
