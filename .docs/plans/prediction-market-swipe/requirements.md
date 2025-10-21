# Prediction Market Swipe Interface

## Overview

Transform the binary options trading interface into a mobile-first prediction market using a Tinder-style swipeable card interface. Users should interact with simple Yes/No predictions about crypto prices without seeing the underlying options complexity.

## Goals

- **Simplify UX**: Hide options terminology (strikes, calls, puts) behind intuitive prediction questions
- **Mobile-first**: Create engaging, gamified experience optimized for mobile interaction
- **Increase accessibility**: Lower barrier to entry for users unfamiliar with options trading
- **Batch trading**: Enable users to quickly express multiple market views through swipe gestures

## User Personas

**Target User**: Crypto enthusiasts who want to express price predictions but find traditional options trading intimidating or complex.

## User Flow

### Entry Flow
1. User lands on the app and sees Market view
2. User connects MetaMask wallet (required before viewing predictions)
3. User sees toggle: "Grid View" (current) vs "Swipe View" (new)
4. User selects "Swipe View"

### Core Prediction Flow
1. User sees a single card with prediction question:
   - **"Will BTC be above $100,000 by Oct 31?"**
   - Card shows: implied probability, current BTC price, time remaining, bet amount ($5 USDC default), potential payout
   - Visual reference: surge.png design language

2. User makes decision:
   - **Swipe RIGHT (Yes)**: Executes CALL binary option ("Monthly 100k Up")
   - **Swipe LEFT (No)**: Executes PUT binary option ("Monthly 100k Down")
   - **Alternative**: Tap "YES" or "NO" buttons for desktop/accessibility

3. Card animates away (fly off screen)
4. Next card slides up from stack
5. Repeat until no more cards

6. End state: "You've reviewed all predictions! Check My Bets to track your positions."

### Bet Management Flow
1. User navigates to "My Bets" tab
2. Sees ongoing predictions with:
   - Asset icon and name
   - "Predicted Pump" or "Predicted Dump"
   - Entry price, current price, time remaining
   - Visual indicator: green border (winning) or red border (losing)
3. Reference: mybets.png layout

### Settings Flow
1. User navigates to Profile/Settings
2. Can adjust default bet size ($1, $5, $10, $25 USDC)
3. Setting persists across sessions

## Key Features

### 1. Binary Option Pairing
- Pair complementary CALL and PUT binaries into single prediction cards
- Match by: expiry date, underlying asset (BTC), threshold price ($100k)
- Example pairing:
  - "Monthly 100k Up" (CALL) + "Monthly 100k Down" (PUT)
  - Even if strike ranges differ (98k/100k vs 100k/102k), they share the same $100k threshold
  - Question: "Will BTC be above $100,000 by Oct 31?"

### 2. Implied Probability Display
- Calculate live: `(premium / maxPayout) * 100`
- Display prominently: "95% market confidence" or "5% market confidence"
- Visual indicator (progress bar or large percentage)

### 3. Card Information Hierarchy
Display on each card (in order of prominence):
1. **Prediction question**: "Will [ASSET] be above/below $[PRICE] by [DATE]?"
2. **Implied probability**: "95% chance" (most prominent)
3. **Current spot price**: "$110,847" with visual indicator vs threshold
4. **Time remaining**: "7 days left" or "Expires Oct 31"
5. **Your bet**: "$5 USDC" (adjustable in settings)
6. **Potential payout**: "Win $10" (2x example)
7. **Strike range** (small text): "Range: $98k-$100k"

### 4. Card Stack Behavior
- Show **1 card at a time** (no peeking cards behind)
- Smooth animations: drag to swipe, spring back if incomplete
- After swipe completes, next card animates from behind
- Cards render in order from API (no sorting initially)

### 5. Desktop Support
- Swipe gestures work with mouse drag
- "YES" / "NO" buttons as alternative to swiping
- Keyboard shortcuts: ← (No), → (Yes), Escape (back to grid)

## Acceptance Criteria

### Must Have
- [ ] Toggle between Grid View and Swipe View in Market tab
- [ ] Wallet connection required before viewing Swipe View
- [ ] Binary options paired by expiry + threshold price
- [ ] Card displays prediction question in plain language
- [ ] Implied probability calculated and displayed prominently
- [ ] Swipe RIGHT executes CALL option purchase ($5 USDC default)
- [ ] Swipe LEFT executes PUT option purchase ($5 USDC default)
- [ ] Transaction toast notifications (approving USDC, executing trade)
- [ ] "My Bets" section shows predictions with "Predicted Pump/Dump" language
- [ ] Default bet size adjustable in Profile/Settings
- [ ] End state when all cards reviewed
- [ ] Mobile-responsive, touch-optimized

### Should Have
- [ ] YES/NO buttons for desktop users
- [ ] Smooth card animations (fly off, spring back)
- [ ] Visual progress indicator (e.g., "3 of 12 predictions")
- [ ] Current price vs threshold visual (above/below indicator)
- [ ] Time remaining countdown
- [ ] Filter options (before entering swipe mode)

### Nice to Have
- [ ] Keyboard navigation (arrow keys)
- [ ] Haptic feedback on mobile
- [ ] Animated probability visualization (arc/gauge)
- [ ] Sound effects (optional, muted by default)
- [ ] Tutorial overlay on first use

## Non-Goals (Out of Scope)

- Undo last swipe (batch transactions planned for future)
- Multi-asset predictions in single card (one asset per card)
- Custom bet amounts per card (uses default from settings)
- Social features (sharing predictions, leaderboards)
- Historical performance tracking
- Advanced filtering/sorting

## Assumptions & Constraints

### Assumptions
- Only BTC binary options available from API (per snowflake-9c31.devops-118.workers.dev)
- Binary options always have matching CALL/PUT pairs for same expiry + threshold
- Users understand basic crypto price predictions
- Mobile devices support touch gestures (swipe)
- MetaMask wallet already installed

### Constraints
- Must maintain existing wallet connection flow
- Must use existing USDC approval and OptionBook contract integration
- Must work on Base network (Chain ID 8453)
- Breaking changes to current UI are acceptable
- No backend changes needed (API already provides binary options data)

### Technical Constraints
- React 18 + Next.js 14 App Router
- Tailwind CSS for styling
- ethers.js 6.15.0 for Web3 interactions
- No TypeScript `any` types allowed
- Mobile-first responsive design

## Open Questions

None - all questions resolved during planning phase.

## Success Metrics

- **User engagement**: % of connected wallets that enter Swipe View
- **Completion rate**: % of users who swipe through all cards
- **Trade volume**: Number of binary options purchased via swipe interface
- **Mobile usage**: % of swipe interactions from mobile vs desktop
- **Setting adoption**: % of users who customize default bet size

## Design References

- **surge.png**: Main card UI design language, dark theme, probability indicators
- **mybets.png**: "My Bets" section layout with Predicted Pump/Dump labels

---

## Relevant Files

### Core Component
- `/src/components/ThetanutsTradingDemo.tsx` - Main trading component (current grid view)

### Data & API
- `/Pricing.txt` - Example binary options data with implied probabilities
- `/src/app/api/orders/route.ts` - API route fetching binary options data

### Types & Contracts
- Contract addresses and ABIs in `ThetanutsTradingDemo.tsx` (lines 5-45)
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- OptionBook: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
- BTC Price Feed: `0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F`

### Dependencies
- `/package.json` - Current libraries (React, Next.js, ethers, Tailwind)

### New Files to Create
- `/src/components/market/SwipeView.tsx` - Swipeable card container
- `/src/components/market/PredictionCard.tsx` - Individual prediction card
- `/src/components/market/SwipeableCard.tsx` - Gesture handling wrapper
- `/src/components/bets/MyBets.tsx` - "My Bets" section (refactor from Profile)
- `/src/components/settings/BetSettings.tsx` - Default bet size configuration
- `/src/types/prediction.ts` - TypeScript types for predictions
- `/src/utils/binaryPairing.ts` - Logic to pair CALL/PUT binaries

### Styling
- Tailwind CSS utility classes (existing setup)
- Consider Framer Motion for animations (new dependency to add)
