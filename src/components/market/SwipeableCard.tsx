import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeUp: () => void;
  onSwipeComplete: () => void;
  disabled: boolean;
}

const SWIPE_THRESHOLD = 100;

const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeRight,
  onSwipeLeft,
  onSwipeUp,
  onSwipeComplete,
  disabled,
}) => {
  const [exitX, setExitX] = useState<number>(0);
  const [exitY, setExitY] = useState<number>(0);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(
    [x, y],
    ([latestX, latestY]) => {
      const absX = Math.abs(latestX as number);
      const absY = Math.abs(latestY as number);
      const maxDistance = 200;
      const distance = Math.sqrt(absX * absX + absY * absY);
      return distance > maxDistance ? 0 : 1;
    }
  );

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) {
      return;
    }

    const offsetX = info.offset.x;
    const offsetY = info.offset.y;
    const velocityX = info.velocity.x;
    const velocityY = info.velocity.y;

    // Check for vertical swipe up first
    if (offsetY < -SWIPE_THRESHOLD || velocityY < -500) {
      setExitY(-1000);
      onSwipeUp();
      onSwipeComplete();
    } else if (offsetX > SWIPE_THRESHOLD || velocityX > 500) {
      setExitX(1000);
      onSwipeRight();
      onSwipeComplete();
    } else if (offsetX < -SWIPE_THRESHOLD || velocityX < -500) {
      setExitX(-1000);
      onSwipeLeft();
      onSwipeComplete();
    }
  };

  const currentX = x.get();
  const currentY = y.get();
  const showYesOverlay = currentX > 0 && Math.abs(currentY) < SWIPE_THRESHOLD / 2;
  const showNoOverlay = currentX < 0 && Math.abs(currentY) < SWIPE_THRESHOLD / 2;
  const showSkipOverlay = currentY < 0 && Math.abs(currentX) < SWIPE_THRESHOLD / 2;
  const overlayOpacityX = Math.abs(currentX) / SWIPE_THRESHOLD;
  const overlayOpacityY = Math.abs(currentY) / SWIPE_THRESHOLD;

  return (
    <motion.div
      className="relative w-full h-full select-none cursor-grab active:cursor-grabbing"
      style={{
        x,
        y,
        rotate,
        opacity,
      }}
      drag={disabled ? false : true}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      onDragEnd={handleDragEnd}
      animate={exitX !== 0 ? { x: exitX } : exitY !== 0 ? { y: exitY } : {}}
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
            backgroundColor: `rgba(34, 197, 94, ${Math.min(overlayOpacityX * 0.3, 0.3)})`,
          }}
        >
          <div
            className="text-6xl font-bold text-green-500 transform rotate-12 border-4 border-green-500 px-8 py-4 rounded-xl"
            style={{
              opacity: Math.min(overlayOpacityX, 1),
            }}
          >
            PUMP
          </div>
        </div>
      )}

      {showNoOverlay && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl"
          style={{
            backgroundColor: `rgba(239, 68, 68, ${Math.min(overlayOpacityX * 0.3, 0.3)})`,
          }}
        >
          <div
            className="text-6xl font-bold text-red-500 transform -rotate-12 border-4 border-red-500 px-8 py-4 rounded-xl"
            style={{
              opacity: Math.min(overlayOpacityX, 1),
            }}
          >
            DUMP
          </div>
        </div>
      )}

      {showSkipOverlay && (
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none rounded-2xl"
          style={{
            backgroundColor: `rgba(168, 85, 247, ${Math.min(overlayOpacityY * 0.3, 0.3)})`,
          }}
        >
          <div
            className="text-6xl font-bold text-purple-500 border-4 border-purple-500 px-8 py-4 rounded-xl"
            style={{
              opacity: Math.min(overlayOpacityY, 1),
            }}
          >
            SKIP
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default SwipeableCard;
