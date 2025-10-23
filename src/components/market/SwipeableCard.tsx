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

const HORIZONTAL_SWIPE_THRESHOLD = 120;
const VERTICAL_SWIPE_THRESHOLD = 100;
const VISUAL_FEEDBACK_THRESHOLD = 15; // Reduced from 50 for instant feedback

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
    if (offsetY < -VERTICAL_SWIPE_THRESHOLD || velocityY < -500) {
      setExitY(-1000);
      onSwipeUp();
      onSwipeComplete();
    } else if (offsetX > HORIZONTAL_SWIPE_THRESHOLD || velocityX > 500) {
      setExitX(1000);
      onSwipeRight();
      onSwipeComplete();
    } else if (offsetX < -HORIZONTAL_SWIPE_THRESHOLD || velocityX < -500) {
      setExitX(-1000);
      onSwipeLeft();
      onSwipeComplete();
    }
  };

  // Create reactive opacity transforms for progressive color intensity
  // These will update in real-time as the user drags
  const pumpOpacity = useTransform(x, (latest) => {
    if (latest < VISUAL_FEEDBACK_THRESHOLD) return 0;
    const progressDistance = latest - VISUAL_FEEDBACK_THRESHOLD;
    const maxProgressDistance = HORIZONTAL_SWIPE_THRESHOLD - 20; // Changed from +30 to -20 for faster ramp
    const baseOpacity = Math.min(progressDistance / maxProgressDistance, 1);
    // Add instant 0.2 opacity boost when threshold crossed
    return baseOpacity > 0 ? Math.min(baseOpacity + 0.2, 1) : 0;
  });

  const dumpOpacity = useTransform(x, (latest) => {
    if (latest > -VISUAL_FEEDBACK_THRESHOLD) return 0;
    const progressDistance = Math.abs(latest) - VISUAL_FEEDBACK_THRESHOLD;
    const maxProgressDistance = HORIZONTAL_SWIPE_THRESHOLD - 20; // Changed from +30 to -20 for faster ramp
    const baseOpacity = Math.min(progressDistance / maxProgressDistance, 1);
    // Add instant 0.2 opacity boost when threshold crossed
    return baseOpacity > 0 ? Math.min(baseOpacity + 0.2, 1) : 0;
  });

  const skipOpacity = useTransform(y, (latest) => {
    if (latest > -VISUAL_FEEDBACK_THRESHOLD) return 0;
    const progressDistance = Math.abs(latest) - VISUAL_FEEDBACK_THRESHOLD;
    const maxProgressDistance = VERTICAL_SWIPE_THRESHOLD - 20; // Changed from +30 to -20 for faster ramp
    const baseOpacity = Math.min(progressDistance / maxProgressDistance, 1);
    // Add instant 0.2 opacity boost when threshold crossed
    return baseOpacity > 0 ? Math.min(baseOpacity + 0.2, 1) : 0;
  });

  // Background opacity for overlay (scales with drag distance) - increased intensity
  const pumpBgOpacity = useTransform(pumpOpacity, (latest) => latest * 0.7); // Increased from 0.5 to 0.7
  const dumpBgOpacity = useTransform(dumpOpacity, (latest) => latest * 0.7); // Increased from 0.5 to 0.7
  const skipBgOpacity = useTransform(skipOpacity, (latest) => latest * 0.7); // Increased from 0.5 to 0.7

  return (
    <motion.div
      className="relative w-full h-full select-none cursor-grab active:cursor-grabbing overflow-hidden"
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
        stiffness: 800,  // Increased from 500 for faster animation
        damping: 25,     // Increased from 20 to prevent bounce
        mass: 0.5,       // Added for quicker acceleration
      }}
    >
      <div className="relative w-full max-w-md mx-auto h-full rounded-3xl overflow-hidden">
        {children}

        {/* PUMP Overlay (Swipe Right) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: 'rgba(16, 185, 129, 1)',
            opacity: pumpBgOpacity,
          }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: pumpOpacity }}
          >
            <div
              className="text-6xl font-bold transform rotate-12 border-4 px-8 py-4 rounded-xl tracking-wider"
              style={{ color: '#FFFFFF', borderColor: '#10B981', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              PUMP
            </div>
          </motion.div>
        </motion.div>

        {/* DUMP Overlay (Swipe Left) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 1)',
            opacity: dumpBgOpacity,
          }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: dumpOpacity }}
          >
            <div
              className="text-6xl font-bold transform -rotate-12 border-4 px-8 py-4 rounded-xl tracking-wider"
              style={{ color: '#FFFFFF', borderColor: '#EF4444', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              DUMP
            </div>
          </motion.div>
        </motion.div>

        {/* SKIP Overlay (Swipe Up) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: 'rgba(168, 85, 247, 1)',
            opacity: skipBgOpacity,
          }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: skipOpacity }}
          >
            <div
              className="text-6xl font-bold border-4 px-8 py-4 rounded-xl tracking-wider"
              style={{ color: '#FFFFFF', borderColor: '#a855f7', textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}
            >
              SKIP
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SwipeableCard;
