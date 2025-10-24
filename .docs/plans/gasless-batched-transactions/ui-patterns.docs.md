# UI Component Patterns - Optionbook Demo

## Overview
This document details the UI component patterns, modal implementations, toast system, and animation patterns used throughout the Optionbook Demo codebase. These patterns should be followed when implementing the gasless batched transactions feature.

## Table of Contents
1. [Modal Components](#modal-components)
2. [Toast Notification System](#toast-notification-system)
3. [Swipeable Card Patterns](#swipeable-card-patterns)
4. [Loading States and Overlays](#loading-states-and-overlays)
5. [Button and Form Patterns](#button-and-form-patterns)
6. [Animation Patterns](#animation-patterns)
7. [Styling Approach](#styling-approach)

---

## Modal Components

### 1. SwipeInstructionsModal
**Location:** `/src/components/market/SwipeInstructionsModal.tsx`

#### Key Features:
- Auto-dismiss timer (5 seconds)
- Progress bar animation
- Backdrop with blur effect
- Spring-based animations using Framer Motion

#### Structure:
```tsx
<AnimatePresence>
  {isOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal Content */}
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
      >
        {/* Content */}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

#### Animation Pattern:
- **Backdrop:** Fade in/out (0.2s duration)
- **Modal:** Scale + opacity with spring physics
- **Progress Bar:** Linear width animation updated every 50ms

#### Code Snippet - Progress Bar:
```tsx
const [progress, setProgress] = useState(100);
const DURATION = 5000;

useEffect(() => {
  if (!isOpen) return;

  const dismissTimer = setTimeout(() => {
    onClose();
  }, DURATION);

  const startTime = Date.now();
  const progressInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, 100 - (elapsed / DURATION) * 100);
    setProgress(remaining);
  }, 50);

  return () => {
    clearTimeout(dismissTimer);
    clearInterval(progressInterval);
  };
}, [isOpen, onClose]);
```

#### Styling:
- Background: `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`
- Border: `border border-slate-700/50`
- Rounded: `rounded-2xl`
- Shadow: `shadow-2xl`

---

### 2. CartModal
**Location:** `/src/components/cart/CartModal.tsx`

#### Key Features:
- Full-screen overlay (z-index 100, drops to 50 during processing)
- Swipeable cards for transaction approval/discard
- Processing overlay with spinner
- Body scroll lock when open

#### Structure:
```tsx
<div className={`fixed inset-0 bg-black/95 backdrop-blur-xl ${isProcessing ? 'z-[50]' : 'z-[100]'}`}>
  <div className="h-full w-full flex flex-col">
    {/* Header */}
    <div className="flex flex-col items-center p-4 md:p-6 space-y-3">
      {/* Title and counter */}
      {/* Swipe instructions */}
    </div>

    {/* Main Content Area */}
    <div className="flex-1 flex items-center justify-center px-4 pb-20">
      {transactions.length === 0 ? (
        {/* Empty state */}
      ) : (
        {/* Swipeable card with processing overlay */}
      )}
    </div>
  </div>
</div>
```

#### Body Scroll Lock:
```tsx
useEffect(() => {
  if (isOpen) {
    loadTransactions();
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'unset';
  }

  return () => {
    document.body.style.overflow = 'unset';
  };
}, [isOpen]);
```

#### Processing Overlay:
```tsx
{isProcessing && (
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
    <div className="bg-gray-800 rounded-lg p-6 text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-white text-lg font-medium">Processing transaction...</p>
      <p className="text-gray-400 text-sm mt-2">Please confirm in your wallet</p>
    </div>
  </div>
)}
```

---

### 3. BatchConfirmationModal
**Location:** `/src/components/market/BatchConfirmationModal.tsx`

#### Key Features:
- Centered modal with semi-transparent backdrop
- Batch summary with item count and total USDC
- Status tracking per transaction (pending, submitted, confirmed, failed)
- Transaction hash links to BaseScan
- Remove individual items before execution

#### Structure:
```tsx
<AnimatePresence>
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="bg-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl"
    >
      {/* Header */}
      {/* Batch Summary */}
      {/* Batch Items (scrollable) */}
      {/* Footer with Cancel/Execute buttons */}
    </motion.div>
  </div>
</AnimatePresence>
```

#### Status Indicators:
```tsx
const getStatusIcon = (status: BatchTransactionStatus['status']) => {
  switch (status) {
    case 'pending': return '⏳';
    case 'submitted': return '📤';
    case 'confirmed': return '✅';
    case 'failed': return '❌';
    default: return '⏳';
  }
};

const getStatusColor = (status: BatchTransactionStatus['status']) => {
  switch (status) {
    case 'confirmed': return 'text-green-500';
    case 'failed': return 'text-red-500';
    case 'submitted': return 'text-blue-500';
    default: return 'text-slate-400';
  }
};
```

#### Paymaster Badge:
```tsx
<div className="mt-3 p-3 bg-purple-900 bg-opacity-30 rounded-lg border border-purple-500">
  <div className="flex items-center gap-2 text-purple-300 text-sm">
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
    <span>Gas fees sponsored by Base Paymaster</span>
  </div>
</div>
```

---

## Toast Notification System

### Components
**Location:**
- `/src/components/shared/Toast.tsx` (individual toast)
- `/src/components/shared/ToastContainer.tsx` (container + hook)

### useToastManager Hook

#### Usage:
```tsx
const { toasts, addToast, removeToast } = useToastManager();

// Add a toast
addToast('Transaction successful!', 'success', txHash);
addToast('Failed to execute bet', 'error');
addToast('Processing transaction...', 'info');

// Render container
<ToastContainer toasts={toasts} onRemoveToast={removeToast} />
```

#### Implementation:
```tsx
export const useToastManager = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info', txHash?: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, txHash }]);

    // Auto-dismiss after 2 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  return { toasts, addToast, removeToast };
};
```

### Toast Component

#### Features:
- Type-based background colors (green/red/blue)
- Icon indicators (✓, ✗, ℹ)
- Optional transaction hash link
- Slide-in animation
- Manual close button

#### Structure:
```tsx
<div className={`max-w-md rounded-lg shadow-lg p-2 flex items-center gap-2 animate-slide-in ${bgColor} text-white`}>
  <div className="flex-1 flex items-center gap-2">
    <span className="font-semibold">{icon}</span>
    <span className="text-sm">{message}</span>
    {txHash && (
      <a href={`https://basescan.org/tx/${txHash}`} target="_blank" rel="noopener noreferrer">
        View →
      </a>
    )}
  </div>
  <button onClick={onClose}>×</button>
</div>
```

#### Color Mapping:
```tsx
const bgColor = type === 'success'
  ? 'bg-green-500'
  : type === 'error'
  ? 'bg-red-500'
  : 'bg-blue-500';

const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
```

### ToastContainer

#### Positioning:
```tsx
<div className="fixed bottom-4 right-4 z-50 space-y-2">
  {toasts.map((toast) => (
    <Toast key={toast.id} {...toast} onClose={() => onRemoveToast(toast.id)} />
  ))}
</div>
```

---

## Swipeable Card Patterns

### 1. SwipeableCard (Market Cards)
**Location:** `/src/components/market/SwipeableCard.tsx`

#### Key Features:
- Three-directional swipe detection (left, right, up)
- Progressive color overlays based on drag distance
- Visual feedback thresholds
- Spring physics for natural feel
- Velocity-based swipe detection

#### Swipe Thresholds:
```tsx
const HORIZONTAL_SWIPE_THRESHOLD = 120;
const VERTICAL_SWIPE_THRESHOLD = 100;
const VISUAL_FEEDBACK_THRESHOLD = 15; // Instant feedback
```

#### Drag Detection:
```tsx
const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
  if (disabled) return;

  const offsetX = info.offset.x;
  const offsetY = info.offset.y;
  const velocityX = info.velocity.x;
  const velocityY = info.velocity.y;

  // Check vertical swipe up first
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
```

#### Progressive Opacity Transforms:
```tsx
// PUMP (right swipe)
const pumpOpacity = useTransform(x, (latest) => {
  if (latest < VISUAL_FEEDBACK_THRESHOLD) return 0;
  const progressDistance = latest - VISUAL_FEEDBACK_THRESHOLD;
  const maxProgressDistance = HORIZONTAL_SWIPE_THRESHOLD - 20;
  const baseOpacity = Math.min(progressDistance / maxProgressDistance, 1);
  return baseOpacity > 0 ? Math.min(baseOpacity + 0.2, 1) : 0;
});

// Background opacity (70% of overlay opacity)
const pumpBgOpacity = useTransform(pumpOpacity, (latest) => latest * 0.7);
```

#### Overlay Structure:
```tsx
{/* PUMP Overlay (Swipe Right) */}
<motion.div
  className="absolute inset-0 pointer-events-none"
  style={{
    backgroundColor: 'rgba(16, 185, 129, 1)',
    opacity: pumpBgOpacity,
  }}
>
  <motion.div
    className="absolute inset-0 flex items-center justify-center"
    style={{ opacity: pumpOpacity }}
  >
    <div className="text-6xl font-bold transform rotate-12 border-4 px-8 py-4 rounded-xl tracking-wider"
      style={{ color: '#FFFFFF', borderColor: '#10B981' }}>
      PUMP
    </div>
  </motion.div>
</motion.div>
```

#### Motion Configuration:
```tsx
<motion.div
  style={{ x, y, rotate, opacity }}
  drag={disabled ? false : true}
  dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
  dragElastic={0.7}
  dragMomentum={false}
  onDragEnd={handleDragEnd}
  animate={exitX !== 0 ? { x: exitX } : exitY !== 0 ? { y: exitY } : {}}
  transition={{
    type: 'spring',
    stiffness: 150,
    damping: 35,
    mass: 1.5,
  }}
>
```

#### Color Scheme:
- **PUMP (Right):** Green (`rgba(16, 185, 129, 1)` / `#10B981`)
- **DUMP (Left):** Red (`rgba(239, 68, 68, 1)` / `#EF4444`)
- **SKIP (Up):** Purple (`rgba(168, 85, 247, 1)` / `#a855f7`)

---

### 2. CartSwipeableCard
**Location:** `/src/components/cart/CartSwipeableCard.tsx`

#### Key Differences from SwipeableCard:
- Only horizontal swipes (no up swipe)
- Different overlay text: "APPROVE" (green) and "DISCARD" (red)
- No rotation on left swipe overlay

#### Overlay Text Styling:
```tsx
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
```

---

## Loading States and Overlays

### 1. Inline Processing Indicator
**Location:** `/src/components/market/CardStack.tsx`

```tsx
{isProcessing && (
  <div className="mt-4 text-center">
    <div className="inline-flex items-center gap-3 bg-purple-600 text-white px-6 py-3 rounded-full shadow-lg">
      <svg className="animate-spin h-6 w-6 text-white">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <span className="font-semibold">Executing transaction...</span>
    </div>
  </div>
)}
```

### 2. Full-Screen Loading State
**Location:** `/src/components/market/SwipeView.tsx`

```tsx
if (loading) {
  return (
    <div className="flex items-center justify-center min-h-[600px] px-4">
      <div className="text-center">
        <svg className="animate-spin h-12 w-12 mx-auto text-purple-500 mb-4">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <div className="text-white text-xl">Loading predictions...</div>
      </div>
    </div>
  );
}
```

### 3. Modal Processing Overlay
**Location:** `/src/components/cart/CartModal.tsx`

```tsx
{isProcessing && (
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-10 flex items-center justify-center">
    <div className="bg-gray-800 rounded-lg p-6 text-center">
      <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-white text-lg font-medium">Processing transaction...</p>
      <p className="text-gray-400 text-sm mt-2">Please confirm in your wallet</p>
    </div>
  </div>
)}
```

### 4. Button Loading State
**Location:** `/src/components/market/BatchConfirmationModal.tsx`

```tsx
<button
  disabled={isExecuting || batch.length === 0}
  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
>
  {isExecuting ? (
    <>
      <svg className="animate-spin h-5 w-5 text-white">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      Executing...
    </>
  ) : (
    `Execute All (${batch.length})`
  )}
</button>
```

### 5. Empty States

#### No Data:
```tsx
<div className="flex items-center justify-center min-h-[600px] px-4">
  <div className="text-center">
    <div className="w-20 h-20 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center">
      <svg className="w-10 h-10 text-gray-600">
        {/* Icon SVG */}
      </svg>
    </div>
    <p className="text-gray-400 text-xl mb-2">Cart is empty</p>
    <p className="text-gray-600 text-sm">Add items by swiping right</p>
  </div>
</div>
```

#### Error State:
```tsx
<div className="flex items-center justify-center min-h-[600px] px-4">
  <div className="text-center">
    <div className="mb-4">
      <svg className="w-16 h-16 mx-auto text-red-500">
        {/* Error icon */}
      </svg>
    </div>
    <div className="text-white text-2xl font-bold mb-2">Error Loading Data</div>
    <div className="text-slate-400 text-sm mb-4">{error}</div>
    <button onClick={fetchOrders} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-lg">
      Try Again
    </button>
  </div>
</div>
```

---

## Button and Form Patterns

### 1. Primary Action Buttons
**Location:** `/src/components/market/PredictionCard.tsx`

```tsx
{/* DUMP Button */}
<button
  onClick={onDump}
  disabled={isProcessing || !onDump}
  className="flex-1 relative bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:active:scale-100"
>
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-lg tracking-wider">DUMP!</span>
    <span className="text-xs font-normal opacity-90">
      ${downPayout.toFixed(2)} ({downMultiplier}x)
    </span>
  </div>
</button>

{/* PUMP Button */}
<button
  onClick={onPump}
  disabled={isProcessing || !onPump}
  className="flex-1 relative bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:active:scale-100"
>
  <div className="flex flex-col items-center gap-0.5">
    <span className="text-lg tracking-wider">PUMP!</span>
    <span className="text-xs font-normal opacity-90">
      ${upPayout.toFixed(2)} ({upMultiplier}x)
    </span>
  </div>
</button>

{/* SKIP Button */}
<button
  onClick={onSkip}
  disabled={isProcessing || !onSkip}
  className="flex-1 relative bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 disabled:from-slate-700 disabled:to-slate-800 disabled:cursor-not-allowed text-white font-black py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl active:scale-95 disabled:active:scale-100"
>
  <span className="text-lg tracking-wider">SKIP</span>
</button>
```

#### Button States:
- **Normal:** Gradient background with shadow
- **Hover:** Darker gradient + enhanced shadow
- **Active:** Scale down (0.95)
- **Disabled:** Gray gradient + no scale on active

### 2. Secondary Buttons

#### Close Button:
```tsx
<button
  onClick={onClose}
  className="text-gray-400 hover:text-white transition-colors p-2"
>
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
</button>
```

#### Icon Button with Badge:
**Location:** `/src/components/layout/TopBar.tsx`

```tsx
<button
  onClick={() => setIsCartOpen(true)}
  className="relative p-2 text-gray-300 hover:text-white transition-colors"
  aria-label="Shopping cart"
>
  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    {/* Cart icon */}
  </svg>
  {cartCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
      {cartCount}
    </span>
  )}
</button>
```

### 3. Form Inputs

#### Range Slider with Number Input:
**Location:** `/src/components/settings/BetSettings.tsx`

```tsx
<div className="flex items-center gap-4">
  <input
    type="range"
    min={minBet}
    max={maxBet}
    step={0.1}
    value={betSize}
    onChange={handleSliderChange}
    className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
    style={{
      background: `linear-gradient(to right, rgb(168, 85, 247) 0%, rgb(168, 85, 247) ${((betSize - minBet) / (maxBet - minBet)) * 100}%, rgb(51, 65, 85) ${((betSize - minBet) / (maxBet - minBet)) * 100}%, rgb(51, 65, 85) 100%)`
    }}
  />
  <input
    type="number"
    min={minBet}
    max={maxBet}
    step={0.1}
    value={betSize}
    onChange={handleInputChange}
    className="w-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-center focus:outline-none focus:border-purple-500"
  />
</div>
```

#### Button Group (Radio-style):
```tsx
<div className="grid grid-cols-3 gap-3">
  {betOptions.map((amount) => (
    <button
      key={amount}
      onClick={() => handleBetSizeChange(amount)}
      className={`p-4 rounded-lg border-2 transition ${
        betSize === amount
          ? 'border-purple-500 bg-purple-500/20'
          : 'border-slate-600 hover:border-purple-400'
      }`}
    >
      <div className="text-xl font-bold text-white">${amount}</div>
      <div className="text-xs text-slate-400 mt-1">USDC</div>
    </button>
  ))}
</div>
```

---

## Animation Patterns

### 1. Framer Motion Configurations

#### Modal Entry/Exit:
```tsx
initial={{ opacity: 0, scale: 0.8 }}
animate={{ opacity: 1, scale: 1 }}
exit={{ opacity: 0, scale: 0.9 }}
transition={{
  type: 'spring',
  stiffness: 300,
  damping: 25,
  mass: 0.8,
}}
```

#### Card Stack Transitions:
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={currentPair.id}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.9 }}
    transition={{ duration: 0.3 }}
  >
    {/* Card content */}
  </motion.div>
</AnimatePresence>
```

#### Staggered Children:
```tsx
{/* Instruction items */}
<motion.div
  initial={{ opacity: 0, x: -20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
>
  {/* DUMP instruction */}
</motion.div>

<motion.div
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
>
  {/* SKIP instruction */}
</motion.div>

<motion.div
  initial={{ opacity: 0, x: 20 }}
  animate={{ opacity: 1, x: 0 }}
  transition={{ delay: 0.5, type: 'spring', stiffness: 200 }}
>
  {/* PUMP instruction */}
</motion.div>
```

#### Repeating Animations:
```tsx
<motion.div
  animate={{ x: [-5, 0, -5] }}
  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
  className="text-3xl text-red-400"
>
  ←
</motion.div>
```

### 2. RollingNumber Component
**Location:** `/src/components/shared/RollingNumber.tsx`

#### Features:
- Animates individual digit changes
- Preserves non-digit characters (commas, periods)
- Spring-based transitions
- Supports custom formatting

#### Usage:
```tsx
<RollingNumber
  value={currentPrice}
  decimals={2}
  prefix="$"
  formatOptions={{
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }}
/>
```

#### Implementation:
```tsx
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
```

### 3. CSS Animations

#### Slide-in Animation:
**Location:** `/src/app/globals.css`

```css
@keyframes slide-in {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}
```

#### Spin Animation (Built-in Tailwind):
```tsx
className="animate-spin h-6 w-6 text-white"
```

#### Pulse Animation (Built-in Tailwind):
```tsx
className="animate-pulse text-slate-400"
```

---

## Styling Approach

### 1. Tailwind CSS Configuration
**Location:** `/src/tailwind.config.js`

```javascript
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

### 2. Color Palette

#### Background Colors:
- **Primary Dark:** `bg-slate-900`, `bg-slate-800`, `bg-slate-950`
- **Cards:** `bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`
- **Overlays:** `bg-black/95`, `bg-black/60`, `bg-black/50`
- **Secondary:** `bg-slate-700`, `bg-slate-800/50`

#### Accent Colors:
- **Purple (Primary):** `purple-600`, `purple-500`, `purple-700`
- **Green (Positive):** `green-500`, `green-400`, `green-600`
- **Red (Negative):** `red-500`, `red-400`, `red-600`
- **Blue (Info):** `blue-500`, `blue-600`, `blue-400`

#### Text Colors:
- **Primary:** `text-white`
- **Secondary:** `text-slate-400`, `text-slate-300`
- **Muted:** `text-slate-500`, `text-slate-600`, `text-gray-400`

### 3. Common Patterns

#### Card Container:
```tsx
className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden"
```

#### Modal Backdrop:
```tsx
className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
```

#### Button Gradient:
```tsx
className="bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800"
```

#### Border Styles:
```tsx
className="border border-slate-700"
className="border-2 border-purple-500"
className="border border-slate-800/50"
```

#### Rounded Corners:
- **Small:** `rounded-lg` (0.5rem)
- **Medium:** `rounded-xl` (0.75rem)
- **Large:** `rounded-2xl` (1rem)
- **Extra Large:** `rounded-3xl` (1.5rem)
- **Full:** `rounded-full`

#### Shadows:
```tsx
className="shadow-lg"
className="shadow-xl"
className="shadow-2xl"
```

#### Backdrop Blur:
```tsx
className="backdrop-blur-sm"
className="backdrop-blur-xl"
```

### 4. Responsive Patterns

#### Padding:
```tsx
className="p-4 md:p-6"
className="px-4 py-3"
```

#### Flex Layouts:
```tsx
className="flex items-center justify-between"
className="flex flex-col gap-2"
className="inline-flex items-center gap-3"
```

#### Grid Layouts:
```tsx
className="grid grid-cols-3 gap-3"
className="grid grid-cols-2 gap-4"
```

### 5. Z-Index Management

- **Base:** Default stacking
- **Navigation:** `z-50`
- **Modals:** `z-50` to `z-[100]`
- **Processing Overlays:** `z-10` (within modal context)
- **Hidden Elements:** `-z-10`, `-z-20`

### 6. Transition Classes

```tsx
className="transition-colors duration-200"
className="transition-all duration-200"
className="transition duration-300"
```

### 7. Interactive States

#### Hover:
```tsx
className="hover:text-white hover:bg-purple-700 hover:shadow-xl"
```

#### Active:
```tsx
className="active:scale-95"
```

#### Disabled:
```tsx
className="disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
```

#### Focus:
```tsx
className="focus:outline-none focus:border-purple-500"
```

---

## Key Takeaways for Gasless Batched Transactions UI

### 1. Modal Implementation
- Use `AnimatePresence` with backdrop and content layers
- Implement body scroll lock when modal opens
- Use spring-based animations for natural feel
- Include loading overlays that don't block wallet popups

### 2. Transaction Status Display
- Show status icons with color coding
- Link to blockchain explorer for completed transactions
- Display progress indicators during batch processing
- Allow removal of items before execution

### 3. User Feedback
- Toast notifications for success/error states
- Inline loading indicators for processing
- Clear visual feedback for swipe gestures
- Progress bars for time-based operations

### 4. Button Patterns
- Use gradient backgrounds for primary actions
- Include disabled states with visual distinction
- Add loading states with spinners
- Implement active states with scale transforms

### 5. Styling Consistency
- Use Tailwind utility classes exclusively
- Follow the dark theme color palette
- Apply consistent border radius (rounded-2xl for cards)
- Use backdrop blur for overlays

### 6. Animation Guidelines
- Spring physics for modals and cards
- Stagger animations for list items
- Progressive opacity for interactive overlays
- Smooth transitions for all state changes

---

## File Reference Index

### Modal Components
- `/src/components/market/SwipeInstructionsModal.tsx`
- `/src/components/cart/CartModal.tsx`
- `/src/components/market/BatchConfirmationModal.tsx`

### Toast System
- `/src/components/shared/Toast.tsx`
- `/src/components/shared/ToastContainer.tsx` (includes `useToastManager` hook)

### Swipeable Cards
- `/src/components/market/SwipeableCard.tsx` (3-direction swipe)
- `/src/components/cart/CartSwipeableCard.tsx` (2-direction swipe)

### Card Implementations
- `/src/components/market/PredictionCard.tsx`
- `/src/components/market/CardStack.tsx`

### Shared Components
- `/src/components/shared/RollingNumber.tsx`

### Layout Components
- `/src/components/layout/TopBar.tsx`
- `/src/components/layout/BottomNav.tsx`

### Form Components
- `/src/components/settings/BetSettings.tsx`

### Views
- `/src/components/market/SwipeView.tsx`

### Styling
- `/src/app/globals.css`
- `/tailwind.config.js`

---

## End of Document
