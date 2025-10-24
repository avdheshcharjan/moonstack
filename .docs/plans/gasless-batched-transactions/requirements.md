# Gasless Batched Transactions with Base Paymaster

## Overview
Enable users to play Moonstack with a seamless, gasless experience by pre-authorizing USDC spending, batching swipe decisions into a cart, and executing all transactions at once using Base Paymaster for gas sponsorship.

## Problem Statement
Currently, users must approve USDC and pay gas for each transaction individually, creating friction in the gameplay experience. This feature streamlines the flow by:
- Pre-authorizing USDC spending upfront
- Allowing users to batch multiple swipe decisions
- Executing all transactions gaslessly in a single batch
- Reducing cognitive load and transaction friction

## Goals
1. Provide a smooth onboarding experience with smart USDC pre-authorization
2. Enable gasless transactions for all operations using Base Paymaster
3. Batch multiple card swipes into a single execution flow
4. Maintain wallet-specific cart state and approval tracking
5. Gracefully handle edge cases (insufficient balance, paymaster failures)

---

## User Flow

### 1. First-Time User Experience
**Trigger:** User opens the app for the first time (or after exhausting previous approval)

**Flow:**
1. User connects wallet
2. **Pre-authorization modal appears** with friendly message:
   - "You're about to approve 10 USDC for playing Moonstack"
   - Clear explanation that this is for convenience
   - Approve/Cancel buttons
3. System attempts adaptive approval:
   - **First attempt:** 10 USDC
   - **If insufficient balance:** Fallback to 5 USDC
   - **If still insufficient:** Fallback to 1 USDC
   - **If less than 1 USDC:** Show error message directing user to add funds
4. User approves → Transaction sent (gasless via paymaster)
5. After approval confirmation → User proceeds to swiping

**Persistence:**
- Modal shown once per wallet
- Reappears when allowance exhausted or drops below 1 USDC threshold

---

### 2. Swiping & Cart Building
**Trigger:** User swipes on prediction cards

**Flow:**
1. User swipes right (YES) or left (NO) on cards
2. Each swipe **adds transaction to cart** (no execution yet)
3. Visual feedback confirms addition (toast: "Added to cart")
4. Cart icon in TopBar shows badge with count
5. User continues swiping through cards, building up cart

**Behavior:**
- Swipes are instant and non-blocking
- No gas required at this stage
- All swipes accumulate in wallet-specific cart

---

### 3. Cart Review & Execution
**Trigger:** User clicks cart icon in TopBar

**Flow:**
1. **Cart modal opens** showing all pending transactions
2. User sees list/cards of all swiped bets with details:
   - Asset (BTC, ETH, etc.)
   - Direction (YES/NO)
   - Bet size
   - Total USDC required displayed at bottom
3. **Additional approval check:**
   - If total USDC needed > current allowance → Prompt for additional approval
   - Use same adaptive logic (try 10 → 5 → 1 USDC)
4. **User decides:**
   - **Swipe right:** Execute ALL transactions in batch (gasless)
   - **Swipe left:** Discard ALL transactions
5. **Execution process:**
   - Show loading overlay: "Executing batch..."
   - Bundle all transactions into single ERC-4337 userOp
   - Submit via paymaster (gasless)
   - If paymaster fails → Fallback to user-paid gas with confirmation prompt
6. **Success:**
   - Green toast appears: "Executed Successfully" with BaseScan link
   - Toast auto-dismisses after 5 seconds
   - Cart modal auto-closes
   - User returned to Play page
   - Cart cleared
7. **Failure:**
   - Red toast with error message
   - Cart remains open for retry
   - Transactions stay in cart

---

### 4. Auto-Refresh Approval
**Trigger:** User's USDC allowance drops below 1 USDC threshold

**Flow:**
1. System detects low allowance when opening cart or attempting execution
2. Pre-authorization modal reappears automatically
3. Same adaptive approval logic (10 → 5 → 1 USDC)
4. User approves → Can proceed with cart execution

---

## Technical Requirements

### Approval Management
- Track current USDC allowance for connected wallet
- Check allowance before:
  - Adding first item to cart (trigger initial approval if needed)
  - Opening cart modal (trigger refresh if below 1 USDC)
  - Executing batch (ensure sufficient allowance)
- Adaptive approval amounts: 10 USDC → 5 USDC → 1 USDC based on balance
- Store approval state per wallet in localStorage

### Gasless Transaction Execution
- Integrate ERC-4337 smart account with Base Paymaster
- Bundle all cart transactions into single `UserOperation`
- Include USDC approval (if needed) + all `fillOrder` calls in batch
- Use paymaster for gas sponsorship on all operations
- Fallback to user-paid gas if paymaster fails:
  - Show confirmation modal: "Paymaster unavailable. Pay gas yourself?"
  - Proceed with standard transaction if user confirms

### Cart Management
- Wallet-specific cart storage (localStorage keyed by address)
- Cart persists across sessions
- Calculate total USDC required across all items
- Clear cart after successful execution
- Remove individual items on discard

### Transaction Batching
- Use ERC-4337 userOp batching via `executeBatch` on smart account
- Group all `fillOrder` transactions into single atomic operation
- Handle partial failures (if atomic batch not supported, execute sequentially)
- Return transaction hash for entire batch

### Error Handling
- Insufficient USDC balance → Show error, direct to add funds
- Insufficient allowance → Trigger approval modal
- Paymaster failure → Fallback to user-paid gas
- Transaction rejection → Keep cart intact, show retry option
- Network errors → Show friendly error message with retry button

---

## Edge Cases

### Scenario 1: User has less than 1 USDC
**Behavior:** Show error message in pre-authorization modal
- "You need at least 1 USDC to play. Please add funds to your wallet."
- Provide link/button to purchase USDC on Base
- Block gameplay until funded

### Scenario 2: User switches wallets mid-session
**Behavior:** Cart and approval state are wallet-specific
- Load cart for newly connected wallet (may be empty)
- Check approval for new wallet
- Previous wallet's cart remains in localStorage (restored if reconnected)

### Scenario 3: Cart total exceeds current allowance
**Behavior:** Prompt additional approval when opening cart
- "Your cart needs 15 USDC but you've only approved 10 USDC. Approve more?"
- Use adaptive approval logic
- Block execution until sufficient allowance

### Scenario 4: User exits cart without executing
**Behavior:** Cart persists
- Transactions remain in cart
- User can return later to execute or discard
- Cart badge shows count until cleared

### Scenario 5: Paymaster runs out of funds
**Behavior:** Graceful fallback
- Detect paymaster rejection (specific error code)
- Show modal: "Gas sponsorship unavailable. Would you like to pay gas yourself?"
- If user confirms → Execute with user-paid gas
- If user cancels → Return to cart, transactions remain pending

### Scenario 6: User exhausts pre-approved USDC mid-batch
**Behavior:** Should not happen (we check allowance before execution)
- Pre-execution validation ensures total needed ≤ allowance
- If somehow occurs → Transaction fails, show error, prompt re-approval

---

## Success Criteria

### User Experience
- Users can swipe through cards rapidly without transaction delays
- No gas fees visible to users (unless paymaster fails)
- Single approval covers multiple transactions
- Clear feedback at every step (toasts, loading states)
- Cart provides easy review of pending decisions

### Technical
- 100% of transactions sponsored by paymaster (under normal conditions)
- Batch execution reduces transaction count from N to 1
- Approval only required 1-2 times per ~10 USDC spent
- No loss of cart data on page refresh
- Graceful fallback when paymaster unavailable

### Business
- Reduced friction increases user engagement
- Lower barrier to entry for new users
- Competitive advantage over gas-heavy competitors

---

## Out of Scope
- Editing bet sizes within cart (approve/discard only)
- Partial batch execution (select specific items to execute)
- Approval balance display in UI
- Transaction status tracking beyond success/failure
- Multi-wallet cart sharing
- Cart expiration or time limits

---

## Assumptions
- Base Paymaster has sufficient funds to sponsor transactions
- Users have at least 1 USDC to participate
- ERC-4337 infrastructure (EntryPoint, Bundler) is operational
- USDC contract supports standard `approve()` function
- Users understand swipe gestures (existing pattern)

---

## Constraints
- Must work on Base mainnet only (chain ID 8453)
- Smart account must be compatible with existing OptionBook contract
- Cart stored in localStorage (size limits apply)
- Paymaster has per-user or per-transaction limits (handle gracefully)
- Approval modal cannot be dismissed without user action

---

## Dependencies
- Base Paymaster service availability
- Coinbase Developer Platform (CDP) for bundler/paymaster
- ERC-4337 EntryPoint v0.7 contract
- Existing wallet connection infrastructure
- USDC token contract on Base

---

## Relevant Files

### Smart Contract Interactions
- `/src/utils/contracts.ts` - Contract addresses, ABIs
- `/src/utils/usdcApproval.ts` - USDC approval utilities

### Execution Services
- `/src/services/directExecution.ts` - Cart addition logic
- `/src/services/batchExecution.ts` - Batch execution (needs paymaster integration)
- `/src/services/immediateExecution.ts` - Smart account execution (reference)

### UI Components
- `/src/components/market/SwipeView.tsx` - Main swipe interface
- `/src/components/market/CardStack.tsx` - Card management
- `/src/components/cart/CartModal.tsx` - Cart UI (needs updates)
- `/src/components/cart/CartSwipeableCard.tsx` - Cart item cards
- `/src/components/market/SwipeInstructionsModal.tsx` - Tutorial modal (reference for approval modal)

### Wallet & Account Abstraction
- `/src/hooks/useWallet.ts` - Wallet connection
- `/src/lib/smartAccount.ts` - Smart account creation
- `/src/lib/paymaster.ts` - Paymaster integration
- `/src/providers/BaseAccountProvider.tsx` - Provider setup

### Storage & State
- `/src/utils/cartStorage.ts` - Cart localStorage management
- `/src/types/cart.ts` - Cart transaction types

### Toast Notifications
- `/src/hooks/useToastManager.ts` - Toast state management
- `/src/components/market/ToastContainer.tsx` - Toast UI

### Top-Level
- `/src/app/page.tsx` - App entry point
- `/src/components/Moonstack.tsx` - Main layout with TopBar
