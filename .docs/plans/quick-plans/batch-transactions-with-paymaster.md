# Batch Transactions with USDC and Base Paymaster Gas Sponsorship

Implement batch transaction functionality for the swipe-to-bet interface, allowing users to place multiple bets using USDC as the betting asset with gas fees sponsored by Coinbase's Base Paymaster via ERC-4337 Account Abstraction.

## Implementation

### 1. Setup Smart Account Infrastructure

**Install dependencies:**
- Install `permissionless` and `viem` for ERC-4337 integration
- Install `@coinbase/onchainkit` dependencies (already present)
- Configure Coinbase Developer Platform project with Paymaster access

**Create smart account configuration:**
- Create `src/lib/smartAccount.ts` to configure smart account client
- Integrate with Coinbase Paymaster using pm_getPaymasterStubData and pm_getPaymasterData endpoints
- Set up EntryPoint contract (0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789)
- Configure gas policy allowlist for OptionBook contract (0xd58b814C7Ce700f251722b5555e25aE0fa8169A1)

### 2. Create Batch Transaction Hook

**Build useBatchTransactions hook:**
- Create `src/hooks/useBatchTransactions.ts` to manage batch transaction state
- Implement queue system for accumulating swipe actions (yes/no decisions)
- Add state management for:
  - Pending transactions queue
  - Batch confirmation modal state
  - Transaction execution status
  - Success/failure tracking per transaction

**Batch operations:**
- Accumulate multiple bet decisions before execution
- Generate UserOperation for each bet (approve USDC + fillOrder)
- Combine UserOperations into single batch using MultiSend pattern
- Handle USDC approval for each bet in the batch

### 3. Implement USDC Token Approval

**Create ERC20 approval utilities:**
- Add `src/utils/usdcApproval.ts` with approval checking logic
- Implement `checkAllowance()` to verify current USDC approval
- Implement `approveUSDC()` to approve OptionBook contract to spend USDC
- Calculate total USDC needed for batch (sum of all bet sizes)
- Include approval transaction in batch if needed

### 4. Integrate Paymaster for Gas Sponsorship

**Paymaster integration:**
- Create `src/lib/paymaster.ts` to interact with Coinbase Paymaster API
- Implement pm_getPaymasterStubData for gas estimation
- Implement pm_getPaymasterData to get paymaster signature
- Configure gas policy in Coinbase Developer Platform:
  - Allowlist OptionBook contract (0xd58b814C7Ce700f251722b5555e25aE0fa8169A1)
  - Allowlist USDC contract (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- Handle paymasterAndData field in UserOperation

### 5. Update UI Components

**Modify SwipeView component:**
- Update `src/components/market/SwipeView.tsx` to use batch mode
- Add toggle to switch between immediate execution and batch mode
- Show pending batch count indicator
- Add "Review Batch" button when batch has pending transactions

**Create BatchConfirmationModal:**
- Create `src/components/market/BatchConfirmationModal.tsx`
- Display list of pending bets with details (asset, direction, amount)
- Show total USDC required
- Show estimated gas savings with paymaster sponsorship
- Add "Execute All" and "Clear Batch" actions
- Show real-time execution progress for each transaction

**Update CardStack component:**
- Modify `src/components/market/CardStack.tsx` to queue swipes instead of immediate execution
- Add visual feedback for queued bets
- Display batch count in UI

### 6. Create Batch Execution Logic

**Build execution service:**
- Create `src/services/batchExecution.ts` for transaction execution
- Implement sequential execution with proper error handling
- For each bet in batch:
  - Encode fillOrder call data
  - Create UserOperation with paymaster data
  - Submit to bundler endpoint
  - Wait for transaction confirmation
  - Update UI with success/failure status
- Handle partial failures gracefully (continue with remaining transactions)

### 7. Add Transaction Monitoring

**Transaction status tracking:**
- Create `src/hooks/useTransactionStatus.ts` for monitoring UserOps
- Poll bundler for transaction status
- Update UI with real-time status (pending, submitted, confirmed, failed)
- Show transaction receipts with links to BaseScan

### 8. Environment Configuration

**Add environment variables:**
- Add `NEXT_PUBLIC_PAYMASTER_URL` for Coinbase Paymaster endpoint
- Add `NEXT_PUBLIC_BUNDLER_URL` for Bundler endpoint
- Add `CDP_PROJECT_ID` and `CDP_API_KEY` for authentication
- Add `NEXT_PUBLIC_ENTRY_POINT` for EntryPoint contract address

### 9. Error Handling and Edge Cases

**Implement robust error handling:**
- Handle insufficient USDC balance
- Handle paymaster rejection (gas policy violations)
- Handle bundler errors (simulation failures)
- Add retry logic for network failures
- Show user-friendly error messages
- Implement transaction rollback on critical failures

### 10. Testing and Validation

**Test batch flows:**
- Test single bet execution with paymaster
- Test batch of 3-5 bets
- Test batch with insufficient USDC
- Test paymaster gas sponsorship
- Verify USDC approvals are correct
- Test partial batch failures
- Validate transaction receipts on BaseScan

## Key Files

**Files to Create**
- /Users/avuthegreat/thetanuts-demo/src/lib/smartAccount.ts
- /Users/avuthegreat/thetanuts-demo/src/lib/paymaster.ts
- /Users/avuthegreat/thetanuts-demo/src/hooks/useBatchTransactions.ts
- /Users/avuthegreat/thetanuts-demo/src/hooks/useTransactionStatus.ts
- /Users/avuthegreat/thetanuts-demo/src/components/market/BatchConfirmationModal.tsx
- /Users/avuthegreat/thetanuts-demo/src/utils/usdcApproval.ts
- /Users/avuthegreat/thetanuts-demo/src/services/batchExecution.ts
- /Users/avuthegreat/thetanuts-demo/.env.local

**Files to Update**
- /Users/avuthegreat/thetanuts-demo/package.json
- /Users/avuthegreat/thetanuts-demo/src/components/market/SwipeView.tsx
- /Users/avuthegreat/thetanuts-demo/src/components/market/CardStack.tsx
- /Users/avuthegreat/thetanuts-demo/src/utils/contracts.ts
- /Users/avuthegreat/thetanuts-demo/src/hooks/useWallet.ts

**Files to Read**
- /Users/avuthegreat/thetanuts-demo/src/hooks/useOrders.ts
- /Users/avuthegreat/thetanuts-demo/src/types/prediction.ts
- /Users/avuthegreat/thetanuts-demo/src/types/orders.ts
- /Users/avuthegreat/thetanuts-demo/src/utils/optionsParser.ts
