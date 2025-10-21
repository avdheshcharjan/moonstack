# Prediction Market Swipe Implementation Plan

Transform binary options trading into mobile-first Tinder-style swipe interface where users make predictions by swiping right (Yes/Up) or left (No/Down). Extract reusable logic from monolithic component into hooks/utils, create new swipe components with framer-motion gestures, pair CALL/PUT binaries into prediction cards, execute trades on swipe actions. Users see implied probability, current price, potential payout per card. Settings allow customizing default bet size. My Bets shows "Predicted Pump/Dump" instead of options terminology.

## Critically Relevant Files and Documentation

- `/src/components/ThetanutsTradingDemo.tsx` - Main component to extract patterns from
- `/.docs/plans/prediction-market-swipe/shared.md` - Architecture patterns and reusable code
- `/.docs/plans/prediction-market-swipe/requirements.md` - Feature requirements and acceptance criteria
- `/.docs/plans/prediction-market-swipe/component-architecture.docs.md` - Component extraction opportunities
- `/.docs/plans/prediction-market-swipe/web3-integration.docs.md` - Web3 patterns (wallet, trading, USDC approval)
- `/.docs/plans/prediction-market-swipe/api-data-layer.docs.md` - Binary options structure and data transformations
- `/OptionBook.md` - Contract integration, addresses, ABIs
- `/surge.png` - Card design reference (dark theme, probability display)
- `/mybets.png` - My Bets layout reference

## Implementation Plan

### Phase 1: Foundation

#### Task 1.1: Install Animation Library - Depends on [none]
Agent: backend-developer

**READ THESE BEFORE TASK**
- `/package.json`

**Instructions**

Files to Modify
- `/package.json`

Install framer-motion for swipe animations and gesture handling. Run `npm install framer-motion` then verify with `npx tsc --noEmit`.

---

#### Task 1.2: Create Type Definitions - Depends on [none]
Agent: backend-developer

**READ THESE BEFORE TASK**
- `/.docs/plans/prediction-market-swipe/types-interfaces.docs.md`
- `/.docs/plans/prediction-market-swipe/shared.md`
- `/src/components/ThetanutsTradingDemo.tsx` (lines 405-446 for ParsedOrder, lines 52-57 for Toast)

**Instructions**

Files to Create
- `/src/types/orders.ts`
- `/src/types/prediction.ts`

Create type definitions extracted from implicit types in codebase. **NO `any` types allowed per project rules.**

`/src/types/orders.ts`:
- `RawOrderData` (from API response structure documented in api-data-layer.docs.md)
- `ParsedOrder` (from parseOrder return type, lines 433-446)
- `MarketData` (BTC/ETH prices)
- `UserPosition` (localStorage structure, lines 280-287)

`/src/types/prediction.ts`:
- `BinaryPair` (matched CALL+PUT pair with shared expiry/threshold, prediction question, implied probability)
- `SwipeAction` type: `'yes' | 'no' | null`
- `PredictionCard` (card display data)

Document decimal scaling in JSDoc comments (strikes/prices use 1e8, USDC uses 6 decimals, WETH uses 18 decimals).

---

### Phase 2: Utilities

#### Task 2.1: Extract Options Parser - Depends on [1.2]
Agent: backend-developer

**READ THESE BEFORE TASK**
- `/src/components/ThetanutsTradingDemo.tsx` (lines 405-446)
- `/.docs/plans/prediction-market-swipe/shared.md` (parseOrder pattern, decimal conversions)
- `/src/types/orders.ts`

**Instructions**

Files to Create
- `/src/utils/optionsParser.ts`

Extract `parseOrder` function from ThetanutsTradingDemo.tsx:405-446. Use types from `/src/types/orders.ts`. Export function with signature: `parseOrder(orderData: RawOrderData): ParsedOrder`. Include JSDoc comments documenting decimal scaling: strikes ÷ 1e8, price ÷ 1e8, maxCollateral ÷ decimals (6 for USDC, 18 for WETH). Always use Math.floor() for contract calculations.

---

#### Task 2.2: Create Binary Pairing Logic - Depends on [1.2]
Agent: backend-developer

**READ THESE BEFORE TASK**
- `/.docs/plans/prediction-market-swipe/requirements.md` (lines 59-70)
- `/.docs/plans/prediction-market-swipe/api-data-layer.docs.md` (Binary Options Structure section)
- `/src/types/prediction.ts`
- `/src/types/orders.ts`

**Instructions**

Files to Create
- `/src/utils/binaryPairing.ts`

Implement `pairBinaryOptions(orders: RawOrderData[]): BinaryPair[]`. Pairing criteria: same underlying asset (BTC/ETH via priceFeed), same expiry timestamp, same threshold price (middle of strike range), one CALL (isCall=true) + one PUT (isCall=false). Generate prediction question: "Will {ASSET} be above ${PRICE} by {DATE}?". Calculate implied probability: `(premium / maxPayout) * 100`. Skip unpaired binaries. Handle strike ranges that differ (98k/100k vs 100k/102k) but share threshold. Convert Unix expiry to readable date.

---

#### Task 2.3: Create Contracts Utility - Depends on [1.2]
Agent: backend-developer

**READ THESE BEFORE TASK**
- `/src/components/ThetanutsTradingDemo.tsx` (lines 4-50)
- `/OptionBook.md` (lines 39-62 for network config)
- `/.docs/plans/prediction-market-swipe/shared.md` (Smart Contracts section)

**Instructions**

Files to Create
- `/src/utils/contracts.ts`

Extract contract constants from ThetanutsTradingDemo.tsx:4-50. Export typed constants: `OPTION_BOOK_ADDRESS`, `USDC_ADDRESS`, `WETH_ADDRESS`, `REFERRER_ADDRESS`, `BTC_FEED`, `ETH_FEED`, `BASE_CHAIN_ID`, `OPTION_BOOK_ABI` (as const), `ERC20_ABI` (as const). Include JSDoc comments with contract addresses. Use `const` assertions to preserve ABI type inference.

---

### Phase 3: Hooks

#### Task 3.1: Create useWallet Hook - Depends on [1.2, 2.3]
Agent: backend-developer

**READ THESE BEFORE TASK**
- `/src/components/ThetanutsTradingDemo.tsx` (lines 136-194, 336-359)
- `/.docs/plans/prediction-market-swipe/web3-integration.docs.md` (Wallet Connection section)
- `/src/utils/contracts.ts`
- `/src/global.d.ts`

**Instructions**

Files to Create
- `/src/hooks/useWallet.ts`

Extract wallet connection logic. Return: `{ walletAddress: string | null, chainId: number | null, isConnecting: boolean, connectWallet: () => Promise<void>, disconnectWallet: () => void }`. Use ethers v6 `BrowserProvider(window.ethereum)`, handle MetaMask not installed, switch to Base (8453) or add network if missing, event listeners for accountsChanged/chainChanged with cleanup on unmount. Import constants from `/src/utils/contracts.ts`.

---

#### Task 3.2: Create useOrders Hook - Depends on [1.2, 2.1]
Agent: backend-developer

**READ THESE BEFORE TASK**
- `/src/components/ThetanutsTradingDemo.tsx` (lines 91-133, 362-402)
- `/.docs/plans/prediction-market-swipe/api-data-layer.docs.md`
- `/src/utils/optionsParser.ts`
- `/src/types/orders.ts`

**Instructions**

Files to Create
- `/src/hooks/useOrders.ts`

Extract order fetching and filtering. Return: `{ orders: ParsedOrder[], marketData: MarketData | null, loading: boolean, error: string | null, fetchOrders: () => Promise<void>, filterBinaries: () => ParsedOrder[] }`. Fetch from `/api/orders`, parse responses with `parseOrder` from utils, filter binaries by `order.type === 'binaries'`, filter by priceFeed for asset, filter by collateral (USDC/WETH only). Handle errors gracefully. No caching (always fresh data per requirements).

---

#### Task 3.3: Create useTrading Hook - Depends on [1.2, 2.3, 3.1]
Agent: backend-developer

**READ THESE BEFORE TASK**
- `/src/components/ThetanutsTradingDemo.tsx` (lines 212-310)
- `/.docs/plans/prediction-market-swipe/web3-integration.docs.md` (Trading Transaction Flow, USDC Approval sections)
- `/src/utils/contracts.ts`
- `/src/types/orders.ts`

**Instructions**

Files to Create
- `/src/hooks/useTrading.ts`

Extract `buyOption` logic. Export function: `executeTrade(order: RawOrderData, collateralAmount: number, walletAddress: string): Promise<string>` (returns tx hash). Return state: `{ isBuying: boolean }`. Flow: create provider/signer, calculate contracts (Math.floor), check USDC allowance, approve if insufficient (parseUnits with 6 decimals), execute fillOrder with unmodified order params except numContracts, wait for confirmation, return tx hash. Handle errors: user rejection (ACTION_REJECTED), network errors. Never modify order fields except numContracts or signature fails.

---

#### Task 3.4: Create useLocalStorage Hook - Depends on [1.2]
Agent: backend-developer

**READ THESE BEFORE TASK**
- `/src/components/ThetanutsTradingDemo.tsx` (lines 318-334)
- `/.docs/plans/prediction-market-swipe/shared.md` (LocalStorage pattern)

**Instructions**

Files to Create
- `/src/hooks/useLocalStorage.ts`

Generic hook: `useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void]`. Handle JSON serialization/deserialization, reconstruct Date objects if present in data, handle corrupted data errors, handle quota exceeded errors. Pattern from ThetanutsTradingDemo.tsx:318-334.

---

#### Task 4.1: Create Toast Component - Depends on [1.2]
Agent: frontend-ui-developer

**READ THESE BEFORE TASK**
- `/src/components/ThetanutsTradingDemo.tsx` (lines 1179-1216, 52-57, 197-209)
- `/src/types/orders.ts` (Toast interface)

**Instructions**

Files to Create
- `/src/components/shared/Toast.tsx`
- `/src/components/shared/ToastContainer.tsx`

Extract toast UI from ThetanutsTradingDemo.tsx:1179-1216. Props: `{ message: string, type: 'success' | 'error' | 'info', txHash?: string, onClose: () => void }`. Features: auto-dismiss after 10s, BaseScan link if txHash present (https://basescan.org/tx/{hash}), close button, color coding (green/red/blue), fixed bottom-right position, slide-in animation, stack multiple toasts. Use Tailwind classes matching existing design.

---

#### Task 4.2: Create BetSizeSelector Component - Depends on [1.2]
Agent: frontend-ui-developer

**READ THESE BEFORE TASK**
- `/src/components/ThetanutsTradingDemo.tsx` (lines 918-948)
- `/src/types/orders.ts`

**Instructions**

Files to Create
- `/src/components/shared/BetSizeSelector.tsx`

Extract from ThetanutsTradingDemo.tsx:918-948. Props: `{ selectedBet: number, onSelect: (amount: number) => void, pricePerContract: number, strikeWidth: number }`. Display preset amounts ($1, $5, $10, $25 USDC), show contracts per bet (betSize / pricePerContract), show max payout per bet (contracts × strikeWidth). Grid layout, active state styling, Tailwind classes.

---

### Phase 4: Swipe Components

#### Task 5.1: Create PredictionCard Component - Depends on [1.1, 1.2, 2.2]
Agent: frontend-ui-developer

**READ THESE BEFORE TASK**
- `/.docs/plans/prediction-market-swipe/requirements.md` (lines 73-81, Card Information Hierarchy)
- `/surge.png` - Design reference
- `/src/types/prediction.ts`
- `/src/types/orders.ts`

**Instructions**

Files to Create
- `/src/components/market/PredictionCard.tsx`

Props: `{ pair: BinaryPair, marketData: MarketData, betSize: number }`. Display hierarchy (per requirements): 1) Prediction question (largest text): "Will BTC be above $100,000 by Oct 31?", 2) Implied probability (prominent): "95% market confidence", 3) Current spot price with above/below indicator, 4) Time remaining: "7 days left", 5) Your bet: "$5 USDC", 6) Potential payout: "Win $10", 7) Strike range (small text). Dark theme matching surge.png, gradient backgrounds, large percentage for probability, visual price indicator. Mobile-first sizing. Non-interactive (gestures handled by SwipeableCard wrapper).

---

#### Task 5.2: Create SwipeableCard Wrapper - Depends on [1.1, 1.2]
Agent: frontend-ui-developer

**READ THESE BEFORE TASK**
- `/.docs/plans/prediction-market-swipe/requirements.md` (lines 83-92, Card Stack Behavior)
- framer-motion documentation (drag gestures)

**Instructions**

Files to Create
- `/src/components/market/SwipeableCard.tsx`

Use framer-motion drag. Props: `{ children: React.ReactNode, onSwipeRight: () => void, onSwipeLeft: () => void, onSwipeComplete: () => void, disabled: boolean }`. Detect swipe direction: >100px right = Yes, <-100px left = No, spring back if incomplete. Visual feedback: overlay "YES" when dragging right (green), "NO" when dragging left (red), card rotation during drag. Support touch (mobile) and mouse (desktop). Prevent swipe if disabled (transaction in progress). Smooth spring animation on return.

---

#### Task 5.3: Create CardStack Component - Depends on [1.1, 1.2, 5.1, 5.2]
Agent: frontend-ui-developer

**READ THESE BEFORE TASK**
- `/.docs/plans/prediction-market-swipe/requirements.md` (lines 83-92, 89-91)
- `/src/components/market/PredictionCard.tsx`
- `/src/components/market/SwipeableCard.tsx`
- `/src/types/prediction.ts`

**Instructions**

Files to Create
- `/src/components/market/CardStack.tsx`

Props: `{ pairs: BinaryPair[], onSwipe: (pair: BinaryPair, action: 'yes' | 'no') => Promise<void>, betSize: number, marketData: MarketData }`. Show one card at a time, animate next card sliding up after swipe, track current index, progress indicator "3 of 12 predictions", end state when all cards swiped: "You've reviewed all predictions! Check My Bets to track your positions." Desktop support: YES/NO buttons as alternative, keyboard shortcuts (← for No, → for Yes). Preload next 2 cards, disable swiping during transaction, handle empty state.

---

#### Task 5.4: Create SwipeView Container - Depends on [1.2, 2.2, 3.2, 3.3, 4.1, 5.3]
Agent: frontend-ui-developer

**READ THESE BEFORE TASK**
- `/.docs/plans/prediction-market-swipe/requirements.md` (lines 20-42, Core Prediction Flow)
- `/src/hooks/useOrders.ts`
- `/src/hooks/useTrading.ts`
- `/src/utils/binaryPairing.ts`
- `/src/components/market/CardStack.tsx`
- `/src/components/shared/ToastContainer.tsx`

**Instructions**

Files to Create
- `/src/components/market/SwipeView.tsx`

Use `useOrders` for fetching, `useTrading` for execution, toast state for notifications. Require wallet connected before showing cards. Fetch binary options, pair with `binaryPairing.ts`, pass to CardStack. Handle swipe actions: Right → buy CALL, Left → buy PUT (using executeTrade). Show toasts for transaction status (checking allowance, approving, executing, success with tx hash). Error handling: network errors, user rejection, insufficient USDC. Default bet size $5 USDC. Don't proceed to next card until transaction confirms. End state message after all cards.

---

### Phase 5: Settings & Bets

#### Task 6.1: Create BetSettings Component - Depends on [1.2, 3.4]
Agent: frontend-ui-developer

**READ THESE BEFORE TASK**
- `/.docs/plans/prediction-market-swipe/requirements.md` (lines 50-55, Settings Flow)
- `/src/hooks/useLocalStorage.ts`

**Instructions**

Files to Create
- `/src/components/settings/BetSettings.tsx`

Props: `{ walletAddress: string | null }`. Use `useLocalStorage` with key `betSize_${walletAddress}`. Radio buttons for $1, $5, $10, $25 USDC. Default to $5. Persist per wallet. Update immediately (no save button). Display in Profile/Settings view. Tailwind styling matching app design.

---

#### Task 6.2: Create MyBets Component - Depends on [1.2, 3.4]
Agent: frontend-ui-developer

**READ THESE BEFORE TASK**
- `/.docs/plans/prediction-market-swipe/requirements.md` (lines 43-49, Bet Management Flow)
- `/mybets.png` - Layout reference
- `/src/components/ThetanutsTradingDemo.tsx` (lines 1030-1177, existing position display)
- `/src/hooks/useLocalStorage.ts`
- `/src/types/orders.ts` (UserPosition)

**Instructions**

Files to Create
- `/src/components/bets/MyBets.tsx`

Props: `{ walletAddress: string | null, marketData: MarketData | null }`. Use `useLocalStorage` with key `positions_${walletAddress}`. Display per mybets.png: asset icon and name, "Predicted Pump" (CALL) or "Predicted Dump" (PUT) label, entry price, current price, time remaining, green border if winning (current price favorable), red if losing. Calculate winning based on isCall and current price vs strikes. Countdown for time remaining. Link to BaseScan transaction. Empty state if no positions.

---

### Phase 6: Main Integration

#### Task 7.1: Add View Toggle to Main Component - Depends on [3.1, 5.4]
Agent: frontend-ui-developer

**READ THESE BEFORE TASK**
- `/.docs/plans/prediction-market-swipe/requirements.md` (lines 20-24, Entry Flow)
- `/src/components/ThetanutsTradingDemo.tsx`
- `/src/components/market/SwipeView.tsx`
- `/src/hooks/useWallet.ts`

**Instructions**

Files to Modify
- `/src/components/ThetanutsTradingDemo.tsx`

Add state: `viewMode: 'grid' | 'swipe'`. Add toggle buttons in Market tab header: "Grid View" and "Swipe View". Conditional rendering: if grid show existing implementation, if swipe show `<SwipeView />` component. Require wallet connection for Swipe View (show connect button if not connected). Migrate wallet state to use `useWallet` hook for sharing between views. Don't break existing grid view functionality. Settings apply to both views. Wallet state persists across toggle.

---

#### Task 7.2: Integrate Settings and MyBets into Profile - Depends on [6.1, 6.2]
Agent: frontend-ui-developer

**READ THESE BEFORE TASK**
- `/src/components/ThetanutsTradingDemo.tsx` (lines 1030-1177, Profile view)
- `/src/components/settings/BetSettings.tsx`
- `/src/components/bets/MyBets.tsx`

**Instructions**

Files to Modify
- `/src/components/ThetanutsTradingDemo.tsx`

Replace existing position display in Profile view with `<MyBets />` component. Add `<BetSettings />` section at top of Profile view. Layout: BetSettings first, then MyBets below. Share wallet state (pass walletAddress, marketData props). Keep consistent styling with app. Remove duplicate position tracking code if present.

---

### Phase 7: Final Validation

#### Task 8.1: Run Type Validation - Depends on [ALL]
Agent: backend-developer

**READ THESE BEFORE TASK**
- All created/modified files

**Instructions**

Files to Modify
- Any files with type errors

Run `npx tsc --noEmit` to check for TypeScript errors. Fix any type errors found. Ensure no `any` types used (project rule). Verify all imports resolve correctly. Check framer-motion type compatibility. Validate ethers.js v6 types. Ensure all component props are typed. Re-run until no errors.
