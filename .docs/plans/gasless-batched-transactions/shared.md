# Gasless Batched Transactions - Shared Documentation

This document contains high-level information on files, architectures, patterns, and documentation relevant to implementing gasless batched transactions with Base Paymaster.

## Table of Contents
1. [Feature Overview](#feature-overview)
2. [Key Files by Category](#key-files-by-category)
3. [Architecture Patterns](#architecture-patterns)
4. [Integration Points](#integration-points)
5. [Related Documentation](#related-documentation)

---

## Feature Overview

Implement a gasless, batched transaction system that allows users to:
1. Pre-authorize USDC spending (adaptive 10→5→1 USDC approval)
2. Swipe through cards and add transactions to cart
3. Review all pending transactions in cart modal
4. Execute all transactions in a single gasless batch via Base Paymaster
5. Fallback to user-paid gas if paymaster unavailable

---

## Key Files by Category

### Smart Account & Paymaster (ERC-4337)

**Core Implementation:**
- `/src/lib/smartAccount.ts` - Creates smart account clients with Base Account SDK
  - `createSmartAccountWithPaymaster(owner: Address)` - Main function
  - `getSmartAccountAddress(owner: Address)` - Get deterministic address
  - `ENTRYPOINT_ADDRESS_V07` - EntryPoint v0.7 contract address

- `/src/lib/paymaster.ts` - Paymaster integration for gas sponsorship
  - `getPaymasterStubData()` - Initial gas estimation phase
  - `getPaymasterData()` - Final signature phase
  - `isPaymasterConfigured()` - Check environment setup

**Reference Implementation:**
- `/src/services/immediateExecution.ts` - Working example of smart account + paymaster
  - Shows batched approval + fillOrder in single UserOperation
  - Demonstrates `needsApproval()` adaptive logic
  - Uses `encodeUSDCApprove()` for call data

---

### USDC Approval System

**Core Utilities:**
- `/src/utils/usdcApproval.ts` - All USDC approval functions
  - `checkUSDCAllowance(owner, spender)` - Query current allowance
  - `getUSDCBalance(address)` - Check USDC balance
  - `encodeUSDCApprove(amount, spender)` - Generate approval call data
  - `needsApproval(owner, amount, spender)` - Adaptive approval check
  - `calculateTotalUSDCNeeded(bets)` - Sum USDC for batch
  - `formatUSDC()` / `parseUSDC()` - Display formatting

**Contract Configuration:**
- `/src/utils/contracts.ts` - Contract addresses and ABIs
  - `USDC_ADDRESS` - 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
  - `OPTION_BOOK_ADDRESS` - 0xd58b814C7Ce700f251722b5555e25aE0fa8169A1
  - `ERC20_ABI` - approve, allowance, balanceOf functions
  - `OPTION_BOOK_ABI` - fillOrder function
  - `BASE_CHAIN_ID` - 8453

**Approval Patterns:**
- Direct Execution: Separate approval transaction (user confirms)
- Immediate Execution: Batched approval + trade (adaptive, gasless)
- Batch Execution: Single approval for total amount

---

### Cart Storage & Management

**Core Storage:**
- `/src/utils/cartStorage.ts` - localStorage-based cart API
  - `getTransactions()` - Fetch all cart items
  - `addTransaction(tx)` - Add item to cart
  - `removeTransactions(ids)` - Remove specific items
  - `clearCart()` - Remove all items
  - `getTotalUSDC()` - Calculate total USDC needed
  - `getCount()` - Get transaction count
  - Custom event: `window.dispatchEvent(new Event('cartUpdated'))`

**Type Definitions:**
- `/src/types/cart.ts` - Cart transaction types
  ```typescript
  interface CartTransaction {
    id: string;
    to: Address;
    data: Hex;
    value?: bigint;
    description: string;
    timestamp: number;
    requiredUSDC?: bigint;  // Important for batch approval calculation
    orderDetails?: {
      marketId: string;
      side: 'YES' | 'NO';
      amount: string;
    };
  }
  ```

**Current State:**
- Cart is NOT wallet-specific (single `optionbook_cart` key)
- BigInt serialization handled automatically
- Event-driven updates for UI reactivity

---

### Transaction Execution Services

**Direct Execution (Cart Addition):**
- `/src/services/directExecution.ts` - Adds transactions to cart
  - `executeDirectFillOrder()` - Main entry point
  - Validates balance, checks allowance
  - Encodes fillOrder call data
  - Creates CartTransaction with `requiredUSDC`
  - Adds to cart (does NOT execute immediately)

**Batch Execution (Current):**
- `/src/services/batchExecution.ts` - Executes cart transactions
  - `executeBatchTransactions(transactions, userAddress)` - Main function
  - Calculates total USDC from `CartTransaction.requiredUSDC`
  - Single approval for aggregate amount
  - Attempts EIP-5792 `wallet_sendCalls` (atomic batch)
  - Falls back to sequential execution if unsupported
  - **NOTE:** Currently uses ethers.js, needs smart account integration

**Immediate Execution (Reference):**
- `/src/services/immediateExecution.ts` - Smart account reference
  - Shows how to use `createSmartAccountWithPaymaster()`
  - Demonstrates batched `calls` array pattern
  - Uses `needsApproval()` for adaptive approval
  - **Key pattern to reuse for cart batch execution**

---

### UI Components

**Cart Modal:**
- `/src/components/cart/CartModal.tsx` - Main cart interface
  - Full-screen modal with card stack
  - Swipe right to approve/execute
  - Swipe left to discard
  - Shows transaction count, USDC amount
  - Processing overlay during execution
  - Body scroll lock when open
  - **Needs update:** Execute ALL on single swipe (not one-by-one)

**Swipeable Cards:**
- `/src/components/cart/CartSwipeableCard.tsx` - Cart item swipe component
  - Framer Motion-powered gestures
  - Horizontal swipe only (APPROVE/DISCARD)
  - Threshold: 120px for swipe detection
  - Visual feedback overlays with opacity
  - **Needs update:** Swipe should trigger batch execution

**Modal Patterns:**
- `/src/components/market/SwipeInstructionsModal.tsx` - Tutorial modal
  - Auto-dismiss timer with progress bar
  - Backdrop blur, spring animations
  - **Use as reference for approval modal**

**Toast Notifications:**
- `/src/hooks/useToastManager.ts` - Toast state management
  - `addToast(message, type, txHash)` - Create notification
  - Auto-dismiss after 2 seconds
  - Types: success (green), error (red), info (blue)
- `/src/components/market/ToastContainer.tsx` - Toast UI
  - Fixed bottom-right positioning
  - Slide-in animation
  - Optional BaseScan link

**Top Bar:**
- `/src/components/layout/TopBar.tsx` - Cart icon with badge
  - Listens for `cartUpdated` event
  - Updates count badge automatically
  - Opens CartModal on click

---

### Wallet Connection & State

**Wallet Hook:**
- `/src/hooks/useWallet.ts` - Main wallet interface
  ```typescript
  interface UseWalletReturn {
    walletAddress: string | null;
    chainId: number | null;
    isConnecting: boolean;
    connectWallet: () => Promise<void>;
    disconnectWallet: () => void;
  }
  ```
  - Dual strategy: Base Account SDK → Injected wallet
  - Auto-restores connection on mount
  - Auto-switches to Base network (8453)
  - Listens for `accountsChanged` and `chainChanged` events
  - Persists to localStorage: `moonstack_wallet_address`, `moonstack_chain_id`

**Provider Setup:**
- `/src/providers/BaseAccountProvider.tsx` - App-level provider
  - Wraps app with WagmiProvider + QueryClientProvider
  - Initializes Base Account SDK (client-side only)
  - `baseAccountSDK` proxy for safe access

**localStorage Patterns:**
- Wallet-specific: `${key}_${walletAddress}` (e.g., `betSize_0xabc...`)
- Global: `moonstack_*`, `optionbook_cart`
- Custom hook: `/src/hooks/useLocalStorage.ts` (JSON + Date support)

---

### Swipe & Card Components

**Main Swipe Interface:**
- `/src/components/market/SwipeView.tsx` - Entry point
  - Uses `useWallet()` for wallet address
  - Calls `executeDirectFillOrder()` on swipe
  - Shows toast on success
  - Contains `CardStack` component

**Card Stack:**
- `/src/components/market/CardStack.tsx` - Manages card navigation
  - Displays one card at a time
  - Keyboard support (arrow keys)
  - Processing state during transactions
  - "All cards reviewed" completion screen

**Prediction Card:**
- `/src/components/market/PredictionCard.tsx` - Card content
  - DUMP (red), PUMP (green), SKIP (purple) buttons
  - Displays price, multipliers, bet amounts
  - RollingNumber animation for prices

**Swipeable Card:**
- `/src/components/market/SwipeableCard.tsx` - Gesture handler
  - Three-directional swipe (left/right/up)
  - Progressive opacity overlays
  - Velocity-based swipe detection
  - Spring physics for natural feel
  - Thresholds: 120px horizontal, 100px vertical

---

## Architecture Patterns

### 1. ERC-4337 Smart Account Flow

```
User EOA Wallet (Browser)
    ↓ (signs UserOperation)
Smart Account (ERC-4337)
    ↓ (batched calls)
Bundler Service (CDP)
    ↓ (packages + simulates)
Paymaster Service (CDP)
    ↓ (sponsors gas, adds signature)
EntryPoint Contract v0.7
    ↓ (validates & executes)
Target Contracts (USDC, OptionBook)
```

**Key Concepts:**
- Smart account address is deterministic (based on owner + factory)
- User funds EOA wallet, smart account approves spending
- Batched calls execute atomically in single UserOperation
- Paymaster covers gas costs (if configured properly)

---

### 2. USDC Approval Pattern

**Adaptive Approval Logic:**
```typescript
// 1. Check current allowance
const allowance = await checkUSDCAllowance(smartAccountAddress, OPTION_BOOK_ADDRESS);

// 2. Only approve if needed
if (allowance < requiredAmount) {
  const approveCall = encodeUSDCApprove(requiredAmount);
  calls.push({ to: USDC_ADDRESS, data: approveCall, value: 0n });
}

// 3. Add fillOrder call
calls.push({ to: OPTION_BOOK_ADDRESS, data: fillOrderData, value: 0n });
```

**Pre-Authorization Flow:**
```
User opens app
    ↓
Check USDC balance
    ↓
Try 10 USDC approval → Insufficient? Try 5 USDC → Insufficient? Try 1 USDC
    ↓
Execute approval via paymaster (gasless)
    ↓
Store approval state in localStorage
    ↓
Monitor allowance, prompt re-approval when < 1 USDC
```

---

### 3. Cart-Based Transaction Flow

**Current Flow:**
```
User swipes card
    ↓
executeDirectFillOrder() validates & encodes transaction
    ↓
CartTransaction created with requiredUSDC
    ↓
Added to localStorage via cartStorage.addTransaction()
    ↓
'cartUpdated' event dispatched
    ↓
TopBar badge updates
    ↓
User clicks cart icon
    ↓
CartModal loads transactions
    ↓
User swipes right on cart item
    ↓
executeBatchTransactions() called (per-transaction, NOT batch)
```

**Target Flow (Gasless Batch):**
```
User swipes card
    ↓
CartTransaction added to cart
    ↓
User clicks cart icon
    ↓
CartModal loads transactions + calculates total USDC
    ↓
Check if total USDC > allowance
    ├─ Yes → Show additional approval prompt
    └─ No → Continue
    ↓
User swipes right ONCE
    ↓
Execute ALL transactions in batch via smart account
    ↓
Single UserOperation with:
    - Optional approval call (if needed)
    - All fillOrder calls
    ↓
Gasless execution via paymaster
    ↓
Success → Clear cart, show green toast with BaseScan link, close modal
```

---

### 4. Modal Animation Pattern

**Standard Modal Structure:**
```tsx
<AnimatePresence>
  {isOpen && (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal Content */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className="fixed z-50 ..."
      >
        {/* Content */}
      </motion.div>
    </>
  )}
</AnimatePresence>
```

**Key Patterns:**
- Use `AnimatePresence` for enter/exit animations
- Backdrop blur (`backdrop-blur-sm`)
- Spring-based motion for natural feel
- Z-index: 50 for modals, 10 for internal overlays
- Body scroll lock: `document.body.style.overflow = 'hidden'`

---

### 5. Toast Notification Pattern

**Usage:**
```typescript
const { toasts, addToast, removeToast } = useToastManager();

// Success with transaction hash
addToast('Executed Successfully', 'success', txHash);

// Error
addToast('Transaction failed', 'error');

// Info
addToast('Processing...', 'info');
```

**Display:**
- Fixed bottom-right: `className="fixed bottom-4 right-4 z-50"`
- Auto-dismiss after 2 seconds
- Slide-in animation
- Optional BaseScan link: `https://basescan.org/tx/${txHash}`

---

### 6. Wallet-Specific Storage Pattern

**Implementation:**
```typescript
// Get wallet address
const { walletAddress } = useWallet();

// Create wallet-scoped storage key
const storageKey = walletAddress ? `betSize_${walletAddress}` : 'betSize_null';

// Use wallet-specific storage
const [betSize, setBetSize] = useLocalStorage<number>(storageKey, 5);
```

**For Approval Tracking:**
```typescript
// Store approval state per wallet
const approvalKey = walletAddress ? `approval_${walletAddress}` : null;
const [lastApproval, setLastApproval] = useLocalStorage(approvalKey, {
  amount: 0n,
  timestamp: 0
});
```

---

## Integration Points

### 1. New Approval Modal Component

**Location:** `/src/components/cart/ApprovalModal.tsx` (to be created)

**Requirements:**
- Modal structure similar to `SwipeInstructionsModal`
- Friendly message: "You're about to approve 10 USDC for playing Moonstack"
- Adaptive approval logic (10→5→1 based on balance)
- Approve/Cancel buttons
- Execute approval via smart account + paymaster
- Show loading state during approval
- Store approval state in localStorage
- Error handling for insufficient funds

**Integration:**
- Trigger on first app visit (check localStorage)
- Trigger when allowance < 1 USDC (before opening cart)
- Trigger when cart total > current allowance (in cart modal)

---

### 2. Updated Cart Modal

**Location:** `/src/components/cart/CartModal.tsx`

**Changes Needed:**
1. **Approval Check on Open:**
   - Calculate total USDC needed
   - Check current allowance
   - If insufficient, show ApprovalModal before cart

2. **Batch Execution on Swipe:**
   - Currently: `executeBatchTransactions([currentTx])` (one transaction)
   - Target: `executeBatchTransactions(transactions)` (all transactions)
   - Change behavior: Swipe right executes ALL, swipe left discards ALL

3. **Success Flow:**
   - Green toast: "Executed Successfully"
   - Include BaseScan link
   - Auto-close modal after 2 seconds
   - Clear entire cart
   - Return to Play page

4. **Processing Overlay:**
   - Should not block wallet popups (z-index management)
   - Show message: "Executing batch..."
   - Display progress if possible

---

### 3. Updated Batch Execution Service

**Location:** `/src/services/batchExecution.ts`

**Changes Needed:**
1. **Replace ethers.js with smart account:**
   - Current: Uses `BrowserProvider` and `signer.sendTransaction()`
   - Target: Use `createSmartAccountWithPaymaster()` and `sendUserOperation()`

2. **Batched Calls Array:**
   - Prepare approval call if needed (check `needsApproval()`)
   - Convert all CartTransactions to calls array
   - Execute as single UserOperation

3. **Paymaster Integration:**
   - Automatic via bundler endpoint
   - No manual paymaster calls needed

4. **Fallback Strategy:**
   - Try gasless execution first
   - If paymaster fails (AA31 error), show modal: "Paymaster unavailable. Pay gas yourself?"
   - If user confirms, execute with user-paid gas (existing ethers.js code)

**Reference Code:** See `immediateExecution.ts` for working smart account pattern

---

### 4. Approval State Management

**New Utility:** `/src/utils/approvalTracking.ts` (to be created)

**Functions Needed:**
```typescript
// Check if approval is needed (considering stored state)
function needsInitialApproval(walletAddress: Address): Promise<boolean>

// Store approval state
function storeApprovalState(walletAddress: Address, amount: bigint): void

// Get stored approval state
function getApprovalState(walletAddress: Address): { amount: bigint; timestamp: number } | null

// Check if approval refresh is needed
function needsApprovalRefresh(walletAddress: Address): Promise<boolean>
```

---

### 5. SwipeView Integration

**Location:** `/src/components/market/SwipeView.tsx`

**Changes Needed:**
1. **First-Time Approval Check:**
   - On mount, check if user needs initial approval
   - Show ApprovalModal before allowing swipes
   - Block swiping until approval complete

2. **Approval State Management:**
   - Track approval in component state
   - Re-check on wallet change

**Pattern:**
```typescript
const [showApprovalModal, setShowApprovalModal] = useState(false);
const [approvalComplete, setApprovalComplete] = useState(false);

useEffect(() => {
  if (walletAddress) {
    checkNeedsApproval();
  }
}, [walletAddress]);

const checkNeedsApproval = async () => {
  const needed = await needsInitialApproval(walletAddress);
  if (needed) {
    setShowApprovalModal(true);
  } else {
    setApprovalComplete(true);
  }
};
```

---

## Related Documentation

### Research Documents

All comprehensive technical documentation:

1. **`smart-account-paymaster.docs.md`** (1558 lines)
   - ERC-4337 architecture overview
   - Smart account creation (`createSmartAccountWithPaymaster`)
   - Paymaster integration (stub data + final data)
   - EntryPoint v0.7 usage
   - Bundler configuration
   - UserOperation execution flow
   - Code snippets for batch execution
   - Error handling patterns
   - Best practices & gotchas

2. **`usdc-approval.docs.md`** (743 lines)
   - USDC contract configuration
   - Core approval utilities (`checkUSDCAllowance`, `needsApproval`, etc.)
   - Approval patterns by execution context
   - Integration with smart accounts
   - NumContracts calculation
   - Best practices (adaptive approval, exact amounts)

3. **`cart-storage.docs.md`** (634 lines)
   - Cart storage API (`cartStorage.*`)
   - CartTransaction type definition
   - Adding items to cart flow
   - Cart UI components (CartModal, CartSwipeableCard)
   - Event dispatching (`cartUpdated`)
   - Batch execution current implementation
   - Wallet-specific storage considerations

4. **`ui-patterns.docs.md`** (1082 lines)
   - Modal components (patterns and animations)
   - Toast notification system
   - Swipeable card patterns
   - Loading states and overlays
   - Button and form patterns
   - Animation patterns (Framer Motion configs)
   - Styling approach (Tailwind CSS classes)

5. **`wallet-state.docs.md`** (969 lines)
   - useWallet hook implementation
   - Provider setup (BaseAccountProvider)
   - Wallet connection flow
   - Wallet state access patterns
   - localStorage patterns (wallet-specific vs global)
   - Network configuration (Base chain)
   - Wallet change detection (events)
   - Usage examples

### Requirements Document

**`requirements.md`** - Non-technical feature requirements
- User flows (first-time, swiping, cart execution)
- Technical requirements (approval, gasless execution, batching)
- Edge cases (insufficient balance, paymaster failures, etc.)
- Success criteria
- Out of scope items
- Relevant file listing

---

## Environment Configuration

### Required Environment Variables

```bash
# From .env.example
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID
CDP_PROJECT_ID=your_project_id_here
CDP_API_KEY=your_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_CHAIN_ID=8453
```

### Coinbase Developer Platform Setup

1. Create project at [portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
2. Enable Paymaster (receives 0.25 ETH gas credits)
3. Configure gas policy allowlist:
   - OptionBook: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
   - USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

---

## Key Technical Decisions

### 1. Wallet-Specific Cart Storage

**Decision:** Implement wallet-specific cart storage

**Rationale:**
- Requirements specify wallet-specific cart (Q7b in requirements)
- Prevents cross-wallet transaction confusion
- Better UX for multi-wallet users

**Implementation:**
- Change cart storage key from `optionbook_cart` to `optionbook_cart_${walletAddress}`
- Update `cartStorage.ts` methods to accept wallet address
- Clear cart on wallet change

---

### 2. Single Swipe for All Transactions

**Decision:** Swipe right ONCE executes ALL cart transactions

**Rationale:**
- Requirements specify (Q3a, Q5 in requirements)
- Reduces friction (one action instead of N actions)
- Aligns with batched execution concept

**Implementation:**
- Modify `CartModal` to batch all transactions
- Change swipe handler to call `executeBatchTransactions(transactions)` not `[currentTx]`
- Update UI to show total count and USDC amount

---

### 3. Gasless by Default, Fallback on Error

**Decision:** Always attempt gasless execution first, fallback to user-paid only on paymaster failure

**Rationale:**
- Requirements specify gasless as primary experience (Q4a)
- Fallback ensures transactions can complete (Q4b)
- Better UX than blocking users entirely

**Implementation:**
- Try smart account + paymaster execution
- Catch paymaster errors (AA31, etc.)
- Show confirmation modal for user-paid gas
- Execute with ethers.js if user confirms

---

### 4. Adaptive Approval Amounts

**Decision:** Try 10 USDC → 5 USDC → 1 USDC based on balance

**Rationale:**
- Requirements specify adaptive logic (Q1b)
- Reduces friction for users with low balances
- Still provides security (not unlimited approval)

**Implementation:**
- Check balance before approval
- Attempt highest amount first
- Fall back to lower amounts if insufficient
- Show error if < 1 USDC

---

### 5. Auto-Refresh Approval

**Decision:** Prompt re-approval when allowance < 1 USDC

**Rationale:**
- Requirements specify (Q2a)
- Prevents mid-batch failures due to insufficient allowance
- Proactive UX (prompt before problem occurs)

**Implementation:**
- Check allowance on cart open
- Compare allowance to cart total USDC
- Show ApprovalModal if insufficient
- Store approval state in localStorage per wallet

---

## Dependencies & External Services

### NPM Packages

**Blockchain:**
- `viem@2.38.3` - Type-safe Ethereum library
- `ethers@6.15.0` - Legacy library (to be phased out)
- `permissionless@0.2.57` - ERC-4337 account abstraction
- `@base-org/account@2.4.0` - Base smart wallet SDK
- `wagmi@2.18.2` - React hooks for Ethereum

**UI:**
- `framer-motion@11.15.0` - Animations
- `tailwindcss@4.0.15` - Styling
- `next@15.1.4` - React framework

**State & Data:**
- `@tanstack/react-query@5.90.5` - Async state management
- `@supabase/supabase-js@2.50.0` - Database

---

### External Services

**Base Network (L2):**
- Chain ID: 8453
- RPC: https://mainnet.base.org
- Explorer: https://basescan.org

**Coinbase Developer Platform:**
- Bundler endpoint: `https://api.developer.coinbase.com/rpc/v1/base/{PROJECT_ID}`
- Paymaster endpoint: Same as bundler (combined endpoint)
- Gas sponsorship: 0.25 ETH free credits

**Smart Contracts (Base Mainnet):**
- EntryPoint v0.7: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- OptionBook v2: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- WETH: `0x4200000000000000000000000000000000000006`

---

## Testing Considerations

### Unit Tests Needed

1. **Approval Logic:**
   - `needsApproval()` returns correct boolean
   - `encodeUSDCApprove()` generates valid call data
   - Adaptive approval tries 10→5→1 correctly

2. **Cart Storage:**
   - Wallet-specific storage works correctly
   - BigInt serialization/deserialization
   - Event dispatching triggers listeners

3. **Batch Execution:**
   - Calls array constructed correctly
   - Approval added when needed
   - Error handling for paymaster failures

---

### Integration Tests Needed

1. **End-to-End Flow:**
   - User connects wallet → sees approval modal
   - User approves → can swipe cards
   - User swipes → adds to cart
   - User opens cart → sees all transactions
   - User swipes right → all execute gaslessly
   - Success toast shows with BaseScan link

2. **Edge Cases:**
   - Insufficient USDC balance
   - Insufficient allowance (triggers re-approval)
   - Paymaster failure (fallback to user gas)
   - Wallet disconnection mid-flow
   - Cart total exceeds allowance

---

### Manual Testing Checklist

- [ ] Approval modal shows on first visit
- [ ] Adaptive approval tries 10→5→1 based on balance
- [ ] Approval executes gaslessly via paymaster
- [ ] Approval state persists in localStorage
- [ ] Swipes add to cart (not execute immediately)
- [ ] Cart badge updates on add
- [ ] Cart modal shows all pending transactions
- [ ] Cart total USDC calculated correctly
- [ ] Swipe right executes ALL transactions
- [ ] Swipe left discards ALL transactions
- [ ] Success toast shows with BaseScan link
- [ ] Modal auto-closes after success
- [ ] Cart clears after execution
- [ ] Paymaster fallback works correctly
- [ ] Wallet change clears cart (wallet-specific)
- [ ] Re-approval prompts when allowance < 1 USDC

---

## Common Pitfalls & Gotchas

### 1. Smart Account vs EOA Addresses

**Issue:** Confusion between owner address and smart account address

**Solution:**
- Check USDC balance on **EOA wallet** (`ownerAddress`)
- Check USDC allowance for **smart account** (`smartAccountAddress`)
- Smart account address is deterministic (can calculate before deployment)

```typescript
// ❌ WRONG
const balance = await getUSDCBalance(smartAccountAddress); // Smart account has no USDC

// ✅ RIGHT
const balance = await getUSDCBalance(ownerAddress); // User's EOA wallet has USDC

// ❌ WRONG
const needsApproval = await needsApproval(ownerAddress, amount); // EOA doesn't need approval

// ✅ RIGHT
const needsApproval = await needsApproval(smartAccountAddress, amount); // Smart account needs approval
```

---

### 2. BigInt Serialization

**Issue:** BigInt cannot be serialized to JSON directly

**Solution:** Cart storage handles this automatically with custom replacer/reviver

```typescript
// Serialization (writing)
JSON.stringify(value, (key, value) => {
  if (typeof value === 'bigint') {
    return value.toString(); // Convert to string
  }
  return value;
});

// Deserialization (reading)
JSON.parse(stored, (key, value) => {
  if (key === 'requiredUSDC' || key === 'value') {
    return value ? BigInt(value) : undefined; // Convert back to bigint
  }
  return value;
});
```

---

### 3. Order of Calls in Batch

**Issue:** Approval must come before fillOrder

**Solution:** Always add approval call FIRST in calls array

```typescript
// ❌ WRONG
calls.push({ to: OPTION_BOOK_ADDRESS, data: fillOrderData }); // Will fail - no approval yet!
calls.push({ to: USDC_ADDRESS, data: approveData });

// ✅ RIGHT
calls.push({ to: USDC_ADDRESS, data: approveData }); // Approve first
calls.push({ to: OPTION_BOOK_ADDRESS, data: fillOrderData }); // Then execute
```

---

### 4. Type Casting for Permissionless

**Issue:** Deep type instantiation errors with permissionless library

**Solution:** Use `as any` type casting

```typescript
const smartAccountClient = createSmartAccountClient({
  account: simpleAccount as any, // Type casting needed
  chain: base,
  bundlerTransport: http(BUNDLER_URL),
});

const txHash = await (smartAccountClient as any).sendUserOperation({ calls });
```

---

### 5. UserOperation Hash vs Transaction Hash

**Issue:** `sendUserOperation` returns UserOperation hash, not transaction hash

**Solution:** Wait for receipt to get actual transaction hash

```typescript
const userOpHash = await smartAccountClient.sendUserOperation({ calls });

// To get transaction hash:
const receipt = await smartAccountClient.waitForUserOperationReceipt({
  hash: userOpHash,
});

const txHash = receipt.receipt.transactionHash; // This is the actual transaction hash
```

---

### 6. Z-Index Management

**Issue:** Processing overlay blocks wallet popup

**Solution:** Reduce z-index during processing

```typescript
// Cart modal z-index
<div className={`fixed inset-0 ${isProcessing ? 'z-[50]' : 'z-[100]'}`}>
  {/* Modal content */}

  {isProcessing && (
    <div className="absolute inset-0 bg-black/50 z-10">
      {/* Processing overlay - z-10 is relative to modal */}
    </div>
  )}
</div>
```

---

### 7. Body Scroll Lock

**Issue:** Page scrolls behind modal on mobile

**Solution:** Lock body scroll when modal opens

```typescript
useEffect(() => {
  if (isOpen) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = 'unset';
  }

  return () => {
    document.body.style.overflow = 'unset'; // Cleanup
  };
}, [isOpen]);
```

---

## Performance Considerations

### 1. Batch Size Limits

**Issue:** Very large batches may exceed gas limits or timeout

**Recommendation:** Limit cart to 10-20 transactions

**Implementation:**
```typescript
const MAX_CART_SIZE = 20;

if (cartStorage.getCount() >= MAX_CART_SIZE) {
  addToast('Cart is full. Please execute current batch first.', 'error');
  return;
}
```

---

### 2. localStorage Size

**Issue:** localStorage has 5-10MB limit per domain

**Recommendation:** Clear old transactions, monitor cart size

**Implementation:**
```typescript
const MAX_CART_AGE_DAYS = 7;

function cleanOldTransactions() {
  const transactions = cartStorage.getTransactions();
  const now = Date.now();
  const filtered = transactions.filter(tx =>
    (now - tx.timestamp) < MAX_CART_AGE_DAYS * 24 * 60 * 60 * 1000
  );

  if (filtered.length < transactions.length) {
    // Update storage with filtered list
  }
}
```

---

### 3. Event Listener Cleanup

**Issue:** Memory leaks from event listeners

**Recommendation:** Always clean up in useEffect return

**Implementation:**
```typescript
useEffect(() => {
  const handleCartUpdate = () => { /* ... */ };

  window.addEventListener('cartUpdated', handleCartUpdate);

  return () => {
    window.removeEventListener('cartUpdated', handleCartUpdate); // Cleanup!
  };
}, []);
```

---

## Security Considerations

### 1. Approval Amounts

**Principle:** Never approve unlimited amounts

**Implementation:**
- Use exact required amount (not `MaxUint256`)
- Adaptive approval (10→5→1 USDC)
- Re-approval when exhausted

---

### 2. Transaction Validation

**Principle:** Validate all transactions before execution

**Implementation:**
- Check USDC balance before approval
- Validate cart total ≤ allowance
- Confirm user intent (swipe gesture)

---

### 3. Error Messages

**Principle:** Don't expose sensitive information in errors

**Implementation:**
```typescript
// ❌ BAD
throw new Error(`Paymaster rejected: ${error.message}`); // May expose API keys

// ✅ GOOD
throw new Error('Gas sponsorship unavailable. Please try again.'); // Generic
```

---

## End of Document

This shared documentation provides a comprehensive overview of the gasless batched transactions feature implementation. Refer to individual research documents for deeper technical details on specific aspects.
