import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeComplete: () => void;
  disabled: boolean;
}

const SWIPE_THRESHOLD = 100;

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeRight,
  onSwipeLeft,
  onSwipeComplete,
  disabled,
}) => {
  const [exitX, setExitX] = useState<number>(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0, 1, 1, 1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) {
      return;
    }

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset > SWIPE_THRESHOLD || velocity > 500) {
      setExitX(1000);
      onSwipeRight();
      onSwipeComplete();
    } else if (offset < -SWIPE_THRESHOLD || velocity < -500) {
      setExitX(-1000);
      onSwipeLeft();
      onSwipeComplete();
    }
  };

  const currentX = x.get();
  const showYesOverlay = currentX > 0;
  const showNoOverlay = currentX < 0;
  const overlayOpacity = Math.abs(currentX) / SWIPE_THRESHOLD;

  return (
    <motion.div
      className="relative w-full h-full select-none cursor-grab active:cursor-grabbing"
      style={{
        x,
        rotate,
        opacity,
      }}
      drag={disabled ? false : 'x'}
      dragConstraints={{ left: 0, right: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitX !== 0 ? { x: exitX } : {}}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
      }}
    >
      {children}

      {showYesOverlay && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl"
          style={{
            backgroundColor: `rgba(34, 197, 94, ${Math.min(overlayOpacity * 0.3, 0.3)})`,
          }}
        >
          <div
            className="text-6xl font-bold text-green-500 transform rotate-12 border-4 border-green-500 px-8 py-4 rounded-xl"
            style={{
              opacity: Math.min(overlayOpacity, 1),
            }}
          >
            YES
          </div>
        </div>
      )}

      {showNoOverlay && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl"
          style={{
            backgroundColor: `rgba(239, 68, 68, ${Math.min(overlayOpacity * 0.3, 0.3)})`,
          }}
        >
          <div
            className="text-6xl font-bold text-red-500 transform -rotate-12 border-4 border-red-500 px-8 py-4 rounded-xl"
            style={{
              opacity: Math.min(overlayOpacity, 1),
            }}
          >
            NO
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SwipeableCard;
