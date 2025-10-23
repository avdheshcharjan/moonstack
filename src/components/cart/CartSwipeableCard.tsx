import React, { useState } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';

interface CartSwipeableCardProps {
  children: React.ReactNode;
  onSwipeRight: () => void;
  onSwipeLeft: () => void;
  onSwipeComplete: () => void;
  disabled: boolean;
}

const HORIZONTAL_SWIPE_THRESHOLD = 120;
const VISUAL_FEEDBACK_THRESHOLD = 15;

const CartSwipeableCard: React.FC<CartSwipeableCardProps> = ({
  children,
  onSwipeRight,
  onSwipeLeft,
  onSwipeComplete,
  disabled,
}) => {
  const [exitX, setExitX] = useState<number>(0);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15]);
  const opacity = useTransform(x, (latest) => {
    const absX = Math.abs(latest);
    return absX > 200 ? 0 : 1;
  });

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (disabled) {
      return;
    }

    const offsetX = info.offset.x;
    const velocityX = info.velocity.x;

    if (offsetX > HORIZONTAL_SWIPE_THRESHOLD || velocityX > 500) {
      setExitX(1000);
      onSwipeRight();
      onSwipeComplete();
    } else if (offsetX < -HORIZONTAL_SWIPE_THRESHOLD || velocityX < -500) {
      setExitX(-1000);
      onSwipeLeft();
      onSwipeComplete();
    }
  };

  // Approve (right swipe) overlay opacity
  const approveOpacity = useTransform(x, (latest) => {
    if (latest < VISUAL_FEEDBACK_THRESHOLD) return 0;
    const progressDistance = latest - VISUAL_FEEDBACK_THRESHOLD;
    const maxProgressDistance = HORIZONTAL_SWIPE_THRESHOLD - 20;
    const baseOpacity = Math.min(progressDistance / maxProgressDistance, 1);
    return baseOpacity > 0 ? Math.min(baseOpacity + 0.2, 1) : 0;
  });

  // Discard (left swipe) overlay opacity
  const discardOpacity = useTransform(x, (latest) => {
    if (latest > -VISUAL_FEEDBACK_THRESHOLD) return 0;
    const progressDistance = Math.abs(latest) - VISUAL_FEEDBACK_THRESHOLD;
    const maxProgressDistance = HORIZONTAL_SWIPE_THRESHOLD - 20;
    const baseOpacity = Math.min(progressDistance / maxProgressDistance, 1);
    return baseOpacity > 0 ? Math.min(baseOpacity + 0.2, 1) : 0;
  });

  const approveBgOpacity = useTransform(approveOpacity, (latest) => latest * 0.7);
  const discardBgOpacity = useTransform(discardOpacity, (latest) => latest * 0.7);

  return (
    <motion.div
      className="relative w-full h-full select-none cursor-grab active:cursor-grabbing overflow-hidden touch-auto"
      style={{
        x,
        rotate,
        opacity,
      }}
      drag={disabled ? false : true}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.7}
      dragMomentum={false}
      onDragEnd={handleDragEnd}
      animate={exitX !== 0 ? { x: exitX } : {}}
      transition={{
        type: 'spring',
        stiffness: 150,
        damping: 35,
        mass: 1.5,
      }}
    >
      <div className="relative w-full max-w-md mx-auto h-full rounded-3xl overflow-hidden">
        {children}

        {/* APPROVE Overlay (Swipe Right) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: 'rgba(34, 197, 94, 1)',
            opacity: approveBgOpacity,
          }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: approveOpacity }}
          >
            <div
              className="text-7xl font-black transform rotate-12 border-4 px-10 py-5 rounded-2xl tracking-wider"
              style={{
                color: '#FFFFFF',
                borderColor: '#22C55E',
                textShadow: '0 4px 12px rgba(0,0,0,0.6)',
                backgroundColor: 'rgba(34, 197, 94, 0.2)'
              }}
            >
              APPROVE
            </div>
          </motion.div>
        </motion.div>

        {/* DISCARD Overlay (Swipe Left) */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundColor: 'rgba(239, 68, 68, 1)',
            opacity: discardBgOpacity,
          }}
        >
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ opacity: discardOpacity }}
          >
            <div
              className="text-7xl font-black transform -rotate-12 border-4 px-10 py-5 rounded-2xl tracking-wider"
              style={{
                color: '#FFFFFF',
                borderColor: '#EF4444',
                textShadow: '0 4px 12px rgba(0,0,0,0.6)',
                backgroundColor: 'rgba(239, 68, 68, 0.2)'
              }}
            >
              DISCARD
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default CartSwipeableCard;
