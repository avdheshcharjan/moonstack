import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SwipeInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SwipeInstructionsModal: React.FC<SwipeInstructionsModalProps> = ({ isOpen, onClose }) => {
  const [progress, setProgress] = useState(100);
  const DURATION = 5000; // 5 seconds

  useEffect(() => {
    if (!isOpen) return;

    // Auto-dismiss timer
    const dismissTimer = setTimeout(() => {
      onClose();
    }, DURATION);

    // Progress bar animation
    const startTime = Date.now();
    const progressInterval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
      setProgress(remaining);
      
      if (remaining === 0) {
        clearInterval(progressInterval);
      }
    }, 50);

    return () => {
      clearTimeout(dismissTimer);
      clearInterval(progressInterval);
    };
  }, [isOpen, onClose]);

  // Reset progress when modal closes
  useEffect(() => {
    if (!isOpen) {
      setProgress(100);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 25,
              mass: 0.8,
            }}
            className="absolute z-50 w-[85%] max-w-[320px]"
            style={{ 
              top: '50%', 
              left: '50%', 
              x: '-50%',
              y: '-50%'
            }}
          >
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden">
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors z-10"
                aria-label="Close"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>

              {/* Content */}
              <div className="p-6 pb-5">
                {/* Title */}
                <div className="text-center mb-6">
                  <motion.h2
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-xl font-bold text-white mb-1.5"
                  >
                    Learn the Swipes! 🚀
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-slate-400 text-xs"
                  >
                    Master the gestures to predict market moves
                  </motion.p>
                </div>

                {/* Instructions Grid */}
                <div className="grid grid-cols-3 gap-2.5 mb-5">
                  {/* NO */}
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                    className="flex flex-col items-center gap-2 p-3 bg-red-500/10 rounded-lg border border-red-500/20"
                  >
                    <motion.div
                      animate={{ x: [-5, 0, -5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-3xl text-red-400"
                    >
                      ←
                    </motion.div>
                    <div className="text-center">
                      <div className="text-red-400 font-bold text-xs">NO</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">Swipe left</div>
                    </div>
                  </motion.div>

                  {/* SKIP */}
                  <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                    className="flex flex-col items-center gap-2 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20"
                  >
                    <motion.div
                      animate={{ y: [-5, 0, -5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-3xl text-purple-400"
                    >
                      ↑
                    </motion.div>
                    <div className="text-center">
                      <div className="text-purple-400 font-bold text-xs">SKIP</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">Swipe up</div>
                    </div>
                  </motion.div>

                  {/* YES */}
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
                    className="flex flex-col items-center gap-2 p-3 bg-green-500/10 rounded-lg border border-green-500/20"
                  >
                    <motion.div
                      animate={{ x: [5, 0, 5] }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                      className="text-3xl text-green-400"
                    >
                      →
                    </motion.div>
                    <div className="text-center">
                      <div className="text-green-400 font-bold text-xs">YES</div>
                      <div className="text-slate-500 text-[10px] mt-0.5">Swipe right</div>
                    </div>
                  </motion.div>
                </div>

                {/* Progress Bar */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="relative"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 text-xs font-medium">Auto-closing</span>
                    <span className="text-slate-400 text-xs font-medium">
                      {Math.ceil((progress / 100) * 5)}s
                    </span>
                  </div>
                  <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-green-500"
                      style={{ width: `${progress}%` }}
                      transition={{ duration: 0.05 }}
                    />
                  </div>
                </motion.div>
              </div>

              {/* Bottom accent */}
              <div className="h-1 bg-gradient-to-r from-red-500 via-purple-500 to-green-500" />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default SwipeInstructionsModal;

