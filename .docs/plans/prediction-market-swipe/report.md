---
title: Prediction Market Swipe Interface Implementation
date: 10/21/2025
original-plan: `.docs/plans/prediction-market-swipe/parallel-plan.md`
---

# Overview

Implemented a mobile-first Tinder-style swipe interface for binary options trading, transforming complex options terminology into simple Yes/No predictions. Users swipe right to predict price increases (buy CALL) or left to predict decreases (buy PUT), with automated USDC approval and transaction execution. The implementation extracts reusable patterns from the monolithic ThetanutsTradingDemo component into modular hooks, utilities, and UI components, while adding a view toggle to switch between the original grid view and new swipe view.

## Files Changed

### Modified (1)
- **src/components/ThetanutsTradingDemo.tsx** - Migrated wallet state to useWallet hook, added Grid/Swipe view toggle, integrated SwipeView component, replaced Profile view with BetSettings and MyBets components, fixed 3 type errors (removed `any` types)

### Created (18)

**Type Definitions (2)**
- **src/types/orders.ts** - RawOrderData, ParsedOrder, MarketData, UserPosition, Toast interfaces with JSDoc decimal scaling documentation
- **src/types/prediction.ts** - BinaryPair, SwipeAction, PredictionCard types for swipe functionality

**Utilities (3)**
- **src/utils/optionsParser.ts** - Extracted parseOrder function with decimal conversions (strikes/prices ÷ 1e8, collateral ÷ decimals)
- **src/utils/binaryPairing.ts** - Pairs CALL/PUT binaries by asset/expiry/threshold, generates prediction questions, calculates implied probability
- **src/utils/contracts.ts** - Centralized contract addresses, ABIs, price feeds, network constants

**Hooks (4)**
- **src/hooks/useWallet.ts** - Wallet connection, Base network switching, MetaMask event listeners with cleanup
- **src/hooks/useOrders.ts** - Order fetching from API, binary filtering, market data management
- **src/hooks/useTrading.ts** - Trade execution with USDC approval flow, error handling for user rejection/network errors
- **src/hooks/useLocalStorage.ts** - Generic type-safe localStorage hook with Date reconstruction and SSR safety

**Shared Components (3)**
- **src/components/shared/Toast.tsx** - Individual toast notification with BaseScan links, auto-dismiss, color coding
- **src/components/shared/ToastContainer.tsx** - Toast stack manager with useToastManager hook, 10s auto-dismiss
- **src/components/shared/BetSizeSelector.tsx** - Bet size selector with contracts/payout calculations ($1/$5/$10/$25 USDC)

**Market Components (4)**
- **src/components/market/PredictionCard.tsx** - Card displaying prediction question, implied probability (large %), current price, time remaining, bet amount, potential payout
- **src/components/market/SwipeableCard.tsx** - Framer-motion drag wrapper with 100px swipe threshold, YES/NO overlays, card rotation, spring animations
- **src/components/market/CardStack.tsx** - Manages card stack with progress indicator, YES/NO buttons, keyboard shortcuts (←/→), preloading next 2 cards, end state
- **src/components/market/SwipeView.tsx** - Main swipe container orchestrating useOrders/useTrading hooks, binary pairing, transaction flow, toast notifications

**Feature Components (2)**
- **src/components/settings/BetSettings.tsx** - Default bet size configuration ($1/$5/$10/$25) with per-wallet localStorage persistence
- **src/components/bets/MyBets.tsx** - Position tracking with "Predicted Pump/Dump" labels, win/loss borders (green/red), countdown timers, BaseScan links

**Dependencies**
- **package.json** - Added framer-motion@^12.23.24 for swipe gestures and animations

## New Features

**View Toggle** - Grid/Swipe view toggle buttons in Market tab header allow switching between traditional grid layout and new swipe interface while preserving wallet state across views.

**Swipe Trading Interface** - Users swipe right (or press →) to buy CALL options predicting price increases, left (or press ←) to buy PUT options predicting price decreases, with visual YES/NO overlays and card rotation feedback.

**Binary Option Pairing** - Automatically matches complementary CALL and PUT options by underlying asset, expiry date, and threshold price to create unified prediction cards with questions like "Will BTC be above $100,000 by Oct 31?".

**Prediction Cards** - Mobile-first cards display prediction question (largest), implied probability percentage (prominent with gradient), current spot price with above/below indicator, time remaining countdown, bet amount ($5 default), and potential payout.

**Automated Trading Flow** - Handles complete Web3 transaction flow including USDC allowance check, approval if needed, fillOrder execution, confirmation waiting, and position saving to localStorage, with toast notifications at each step.

**Bet Size Settings** - Per-wallet bet size preferences ($1/$5/$10/$25 USDC) persist to localStorage and apply to both grid and swipe views, with immediate updates (no save button).

**My Bets View** - Refactored position tracking displays "Predicted Pump" (CALL) or "Predicted Dump" (PUT) labels with dynamic win/loss borders (green if current price favorable, red if unfavorable), countdown timers, and BaseScan transaction links.

**Keyboard Navigation** - Arrow key shortcuts (← for No/Down, → for Yes/Up) enable desktop users to make predictions without mouse, with hover tooltips indicating shortcuts.

**Toast Notifications** - Centralized toast system shows transaction status (checking allowance, approving USDC, executing trade, success with tx hash), auto-dismisses after 10 seconds, includes BaseScan links for confirmed transactions.

**Modular Hooks Architecture** - Extracted wallet connection (useWallet), order management (useOrders), trading execution (useTrading), and localStorage persistence (useLocalStorage) into reusable hooks shared between grid and swipe views.

## Additional Notes

**Breaking Changes Acceptable** - Per project requirements, implementation prioritizes clean architecture over backward compatibility since application is in pre-production.

**Type Safety Enforced** - All code follows strict TypeScript with no `any` types (project rule), explicit error types using `unknown` with proper narrowing, comprehensive JSDoc documentation for decimal scaling.

**USDC Decimal Precision Critical** - USDC uses 6 decimals (not 18), strikes/prices scaled by 1e8, always use Math.floor() for contract calculations to avoid exceeding approved amounts - signature validation fails if order parameters modified.

**Wallet State Migration** - Original ThetanutsTradingDemo wallet logic removed and replaced with useWallet hook - any external components relying on internal wallet state will need updates.

**LocalStorage Key Patterns** - Bet size: `betSize_${walletAddress}`, Positions: `positions_${walletAddress}` - per-wallet isolation prevents conflicts when switching wallets.

**Binary Options Only** - Swipe view filters to `order.type === 'binaries'` only - regular spreads/butterflies/condors remain in grid view only.

**Default Bet Size** - Hardcoded to $5 USDC in SwipeView component (line 16) - can be made dynamic by reading from BetSettings localStorage if needed.

**Transaction Blocking** - CardStack prevents advancing to next card until current transaction confirms (success or error) - no queuing of multiple trades.

**Pairing Threshold Tolerance** - Binary pairing uses exact threshold matching (middle of strike range) - strike ranges differing by >$1 won't pair even if conceptually similar.

**Framer Motion Dependency** - Added framer-motion@^12.23.24 for gesture handling - if bundle size becomes concern, could replace with lighter alternative like react-spring.

**MetaMask Required** - Implementation assumes MetaMask installed - no fallback for other wallet providers (WalletConnect, Coinbase Wallet, etc.).

**Base Network Only** - Network switching hardcoded to Base (8453) - multi-chain support would require contract address mapping per network.

**No Undo Functionality** - Once swipe completes and transaction executes, no way to reverse - listed as out-of-scope in requirements but users may expect it.

**Grid View Untouched** - Original grid view implementation preserved exactly as-is to minimize regression risk - no refactoring applied to avoid breaking existing functionality.

## E2E Tests To Perform

**Test 1: View Toggle**
1. Navigate to Market tab
2. Verify "Grid View" and "Swipe View" toggle buttons appear at top
3. Click "Swipe View" - should show wallet connection prompt if not connected
4. Connect MetaMask wallet to Base network
5. Click "Swipe View" again - should load swipe interface
6. Click "Grid View" - should return to original grid layout
7. Verify wallet connection persists across toggle

**Test 2: Swipe Right (Yes/Up Prediction)**
1. Enter Swipe View with wallet connected
2. Verify prediction card displays with BTC/ETH question (e.g., "Will BTC be above $100,000 by Oct 31?")
3. Check implied probability percentage is prominent (large font with gradient)
4. Drag card right >100px (or press → arrow key)
5. Verify green "YES" overlay appears during drag
6. Release - card should fly off right side
7. Check toast notification: "Checking USDC allowance..."
8. If first trade, verify MetaMask prompts for USDC approval
9. Approve in MetaMask, verify toast: "USDC approved!"
10. Verify MetaMask prompts for fillOrder transaction
11. Confirm transaction, verify success toast with tx hash link
12. Click tx hash link - should open BaseScan in new tab
13. Verify next card slides up from bottom
14. Navigate to "My Bets" - verify position appears with "Predicted Pump" label

**Test 3: Swipe Left (No/Down Prediction)**
1. In Swipe View, drag card left >100px (or press ← arrow key)
2. Verify red "NO" overlay appears during drag
3. Release - card should fly off left side
4. Verify transaction flow executes (toasts, MetaMask prompts)
5. Navigate to "My Bets" - verify position appears with "Predicted Dump" label

**Test 4: Incomplete Swipe**
1. In Swipe View, drag card right 50px (less than 100px threshold)
2. Release - card should spring back to center
3. Verify no transaction executes
4. Verify card remains current (not advanced)

**Test 5: Desktop YES/NO Buttons**
1. In Swipe View, locate YES and NO buttons below card
2. Hover over YES button - verify tooltip shows "or press →"
3. Click YES button - verify executes CALL trade (same as swipe right)
4. Verify NO button works similarly for PUT trade

**Test 6: Transaction Blocking**
1. In Swipe View, swipe right to start transaction
2. While transaction pending, attempt to swipe again
3. Verify card does not respond to swipe gestures
4. Verify "Processing transaction..." message appears
5. Wait for transaction to complete
6. Verify next card appears and is swipeable

**Test 7: End State**
1. Swipe through all available binary option pairs
2. Verify progress indicator updates (e.g., "3 of 12 predictions")
3. After last card, verify end state message: "You've reviewed all predictions! Check My Bets to track your positions."
4. Verify checkmark icon appears

**Test 8: Bet Size Settings**
1. Navigate to Profile tab (My Positions view)
2. Verify "Default Bet Size" section appears at top
3. Select different bet sizes ($1, $5, $10, $25)
4. Verify selection persists after page refresh
5. Switch to different wallet - verify bet size resets to $5 default
6. Return to first wallet - verify original bet size selection restored

**Test 9: My Bets Win/Loss Indicators**
1. In Profile tab, view My Bets section
2. For each position, verify:
   - Asset icon (₿ for BTC, Ξ for ETH)
   - "Predicted Pump" (CALL) or "Predicted Dump" (PUT) label
   - Entry price and current price displayed
   - Border color: green if winning (price moved favorably), red if losing
3. Wait for BTC price to cross strike threshold
4. Verify border color updates dynamically
5. Click transaction hash link - verify opens BaseScan

**Test 10: Countdown Timers**
1. In My Bets, verify time remaining shows countdown (e.g., "7 days left")
2. For positions expiring <1 day, verify shows hours
3. For positions expiring <1 hour, verify shows minutes
4. For expired positions, verify shows "Expired" with gray border

**Test 11: Empty States**
1. Disconnect wallet in Swipe View - verify shows "Connect Your Wallet" prompt
2. Connect wallet with no positions - navigate to My Bets - verify shows "No positions yet" with market link
3. In Swipe View with no binary pairs available - verify shows "No predictions available"

**Test 12: Error Handling**
1. In Swipe View, swipe right to initiate trade
2. Reject MetaMask approval - verify toast shows "Transaction rejected"
3. Verify card does not advance (stays on current)
4. Ensure USDC balance < bet size ($5)
5. Swipe right - verify toast shows "Insufficient USDC balance"

**Test 13: Network Switching**
1. Connect MetaMask to Ethereum Mainnet
2. Attempt to access Swipe View
3. Verify MetaMask prompts to switch to Base network
4. Approve network switch
5. If Base not added, verify MetaMask prompts to add network
6. Verify Base network config includes: RPC https://mainnet.base.org, Explorer https://basescan.org

**Test 14: Mobile Responsiveness**
1. Open app on mobile device or resize browser to mobile width
2. Verify prediction cards fit screen without horizontal scroll
3. Test swipe gestures with touch (drag card left/right)
4. Verify YES/NO overlays appear during touch drag
5. Verify all text readable (no overflow, proper sizing)
6. Test My Bets on mobile - verify all info visible

**Test 15: Type Safety Validation**
1. Run `npx tsc --noEmit` in project directory
2. Verify output shows "exit code: 0" (no errors)
3. Check no files use `any` type (grep for `: any` in src/)
4. Verify all imports resolve correctly
