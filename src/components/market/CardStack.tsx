import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BinaryPair } from '@/src/types/prediction';
import { MarketData } from '@/src/types/orders';
import PredictionCard from './PredictionCard';
import SwipeableCard from './SwipeableCard';

interface CardStackProps {
  pairs: BinaryPair[];
  onSwipe: (pair: BinaryPair, action: 'yes' | 'no') => Promise<void>;
  betSize: number;
  marketData: MarketData;
  onRefresh: () => Promise<void>;
}

const CardStack: React.FC<CardStackProps> = ({
  pairs,
  onSwipe,
  betSize,
  marketData,
  onRefresh,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preloadedIndices, setPreloadedIndices] = useState<Set<number>>(new Set([0, 1, 2]));
  const currentPairIdRef = React.useRef<string | null>(null);

  const currentPair = pairs[currentIndex];
  const hasMoreCards = currentIndex < pairs.length;
  const allCardsReviewed = currentIndex >= pairs.length;

  // Maintain current card position when pairs refresh
  useEffect(() => {
    if (currentPair && currentPairIdRef.current !== currentPair.id) {
      currentPairIdRef.current = currentPair.id;
    }
  }, [currentPair]);

  // If pairs update but current pair ID exists in new pairs, maintain position
  useEffect(() => {
    if (currentPairIdRef.current && pairs.length > 0) {
      const newIndex = pairs.findIndex(p => p.id === currentPairIdRef.current);
      if (newIndex !== -1 && newIndex !== currentIndex) {
        setCurrentIndex(newIndex);
      }
    }
  }, [pairs, currentIndex]);

  useEffect(() => {
    const indicesToPreload = new Set<number>();
    for (let i = currentIndex; i < Math.min(currentIndex + 3, pairs.length); i++) {
      indicesToPreload.add(i);
    }
    setPreloadedIndices(indicesToPreload);
  }, [currentIndex, pairs.length]);

  const handleSwipe = useCallback(async (action: 'yes' | 'no') => {
    if (isProcessing || !currentPair) {
      return;
    }

    setIsProcessing(true);
    try {
      await onSwipe(currentPair, action);
      // Move to next card after successful execution
      setCurrentIndex(prev => prev + 1);
    } catch (error) {
      console.error('Swipe action failed:', error);
      // Don't move to next card on error - let user retry or skip
    } finally {
      setIsProcessing(false);
    }
  }, [currentPair, isProcessing, onSwipe]);

  const handleSwipeRight = useCallback(() => {
    handleSwipe('yes');
  }, [handleSwipe]);

  const handleSwipeLeft = useCallback(() => {
    handleSwipe('no');
  }, [handleSwipe]);

  const handleSwipeUp = useCallback(() => {
    if (isProcessing || !currentPair) {
      return;
    }
    // Skip without making a bet
    setCurrentIndex(prev => prev + 1);
  }, [isProcessing, currentPair]);

  const handleSwipeComplete = useCallback(() => {
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isProcessing || allCardsReviewed) {
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      handleSwipe('yes');
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      handleSwipe('no');
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      handleSwipeUp();
    }
  }, [isProcessing, allCardsReviewed, handleSwipe, handleSwipeUp]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (pairs.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[600px] px-4">
        <div className="text-center">
          <div className="text-slate-400 text-xl mb-2">No predictions available</div>
          <div className="text-slate-500 text-sm mb-4">Check back later for new trading opportunities</div>
          <button
            onClick={onRefresh}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            🔄 Refresh
          </button>
        </div>
      </div>
    );
  }

  if (allCardsReviewed) {
    return (
      <div className="flex items-center justify-center min-h-[600px] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="mb-6">
            <svg
              className="w-24 h-24 mx-auto text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h2 className="text-white text-3xl font-bold mb-4">Great Job!</h2>
          <p className="text-slate-400 text-lg mb-6">
            You&apos;ve exhausted all the cards. Come tomorrow :)
          </p>
          <button
            onClick={onRefresh}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            🔄 Refresh for New Predictions
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-2 py-2">
      <div className="relative" style={{ height: 'calc(100vh - 180px)', maxHeight: '600px' }}>
        <AnimatePresence mode="wait">
          {hasMoreCards && currentPair && (
            <motion.div
              key={currentPair.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0"
            >
              <SwipeableCard
                onSwipeRight={handleSwipeRight}
                onSwipeLeft={handleSwipeLeft}
                onSwipeUp={handleSwipeUp}
                onSwipeComplete={handleSwipeComplete}
                disabled={isProcessing}
              >
                <PredictionCard
                  pair={currentPair}
                  marketData={marketData}
                  betSize={betSize}
                  onDump={handleSwipeLeft}
                  onPump={handleSwipeRight}
                  onSkip={handleSwipeUp}
                  isProcessing={isProcessing}
                  currentIndex={currentIndex}
                  totalCards={pairs.length}
                />
              </SwipeableCard>
            </motion.div>
          )}
        </AnimatePresence>

        {preloadedIndices.has(currentIndex + 1) && currentIndex + 1 < pairs.length && (
          <div className="absolute inset-0 -z-10 opacity-0 pointer-events-none">
            <PredictionCard
              pair={pairs[currentIndex + 1]}
              marketData={marketData}
              betSize={betSize}
            />
          </div>
        )}

        {preloadedIndices.has(currentIndex + 2) && currentIndex + 2 < pairs.length && (
          <div className="absolute inset-0 -z-20 opacity-0 pointer-events-none">
            <PredictionCard
              pair={pairs[currentIndex + 2]}
              marketData={marketData}
              betSize={betSize}
            />
          </div>
        )}
      </div>

      {isProcessing && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 text-center"
        >
          <div className="inline-flex items-center gap-3 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg">
            <svg
              className="animate-spin h-6 w-6 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="font-semibold">Executing transaction...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default CardStack;
