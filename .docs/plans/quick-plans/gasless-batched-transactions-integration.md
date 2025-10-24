# Gasless and Batched Transactions Integration

Integrate the Base Account SDK patterns from the documentation into the existing project implementation, replacing the current permissionless.js approach with the official @base-org/account SDK for improved gasless and batched transaction support using wallet_sendCalls RPC method.

## Implementation

### Phase 1: SDK Migration Setup

1. **Update Smart Account Client** (`src/lib/smartAccount.ts`)
   - Replace permissionless.js `createSmartAccountClient` with `createBaseAccountSDK`
   - Implement `getCryptoKeyAccount()` for account access
   - Update provider initialization to use Base Account SDK
   - Remove EntryPoint v0.7 references (handled internally by SDK)

2. **Migrate Batch Execution Service** (`src/services/batchExecution.ts`)
   - Replace UserOperation pattern with `wallet_sendCalls` RPC method
   - Update execution flow to use provider.request with EIP-5792 format
   - Implement `wallet_getCapabilities` check for atomic batching support
   - Update call structure to match SDK format: `{ to, data, value }`

### Phase 2: Transaction Encoding Updates

3. **Update USDC Approval Encoding** (`src/utils/usdcApproval.ts`)
   - Ensure approval encoding matches SDK expectations
   - Update to use `encodeFunctionData` from viem
   - Verify encoding format: `data: encodeFunctionData({ abi, functionName, args })`

4. **Update fillOrder Call Encoding** (`src/services/directExecution.ts`, `src/services/immediateExecution.ts`)
   - Verify fillOrder encoding compatibility with wallet_sendCalls
   - Ensure calls array structure: `[{ to, value, data }]`
   - Update value encoding to use `numberToHex` for chainId

### Phase 3: Wallet Provider Integration

5. **Update Wallet Hook** (`src/hooks/useWallet.ts`)
   - Integrate Base Account SDK provider initialization
   - Update connection flow to use SDK's getProvider()
   - Implement proper provider type detection (Base Account vs injected)
   - Add capability checking on connection

6. **Update BaseAccountProvider** (`src/providers/BaseAccountProvider.tsx`)
   - Initialize SDK with correct configuration (appName, appLogoUrl, appChainIds)
   - Export provider instance for use in hooks
   - Add SDK initialization state management

### Phase 4: Batch Execution Enhancement

7. **Implement Atomic Batching** (`src/services/batchExecution.ts`)
   - Add `atomicRequired: true` to wallet_sendCalls params
   - Implement capability check before execution
   - Handle non-atomic batching fallback (atomicRequired: false)
   - Add version field to params: `version: '2.0.0'`

8. **Update Call Structure** (`src/services/batchExecution.ts`)
   - Format calls array with proper structure
   - Add USDC approval as first call if needed
   - Add all fillOrder calls with proper encoding
   - Ensure value is hex string (`numberToHex(parseEther('0'))`)

### Phase 5: Error Handling & Testing

9. **Implement Error Handling** (`src/services/batchExecution.ts`)
   - Add error code handling: 4001 (user rejection), 5740 (batch too large), -32602 (invalid format)
   - Implement paymaster error detection (AA31)
   - Add user-paid fallback for paymaster failures
   - Update error messages with actionable guidance

10. **Update UI Components** (`src/components/cart/CartModal.tsx`, `src/components/market/SwipeView.tsx`)
    - Update transaction status tracking for new execution flow
    - Add capability checking UI feedback
    - Handle new error cases with appropriate messaging
    - Update loading states for wallet_sendCalls flow

### Phase 6: Testing & Validation

11. **Test Batch Transactions**
    - Test single transaction execution
    - Test multiple transactions in batch
    - Test USDC approval + fillOrder in single batch
    - Verify gasless execution via paymaster
    - Test atomic batching (all succeed or all fail)

12. **Test Error Scenarios**
    - Test insufficient balance
    - Test user rejection
    - Test batch too large
    - Test paymaster failure
    - Verify fallback to user-paid

## Key Files

**Files to Create**
- None (all functionality exists, just needs migration)

**Files to Update**
- /Users/avuthegreat/optionbook-demo/src/lib/smartAccount.ts
- /Users/avuthegreat/optionbook-demo/src/services/batchExecution.ts
- /Users/avuthegreat/optionbook-demo/src/services/directExecution.ts
- /Users/avuthegreat/optionbook-demo/src/services/immediateExecution.ts
- /Users/avuthegreat/optionbook-demo/src/hooks/useWallet.ts
- /Users/avuthegreat/optionbook-demo/src/providers/BaseAccountProvider.tsx
- /Users/avuthegreat/optionbook-demo/src/components/cart/CartModal.tsx
- /Users/avuthegreat/optionbook-demo/src/components/market/SwipeView.tsx
- /Users/avuthegreat/optionbook-demo/src/utils/usdcApproval.ts

**Files to Read**
- /Users/avuthegreat/optionbook-demo/.docs/plans/gasless-batched-transactions/batched-txn.md
- /Users/avuthegreat/optionbook-demo/src/types/cart.ts
- /Users/avuthegreat/optionbook-demo/src/types/orders.ts
- /Users/avuthegreat/optionbook-demo/src/utils/contracts.ts
- /Users/avuthegreat/optionbook-demo/src/utils/cartStorage.ts
- /Users/avuthegreat/optionbook-demo/src/hooks/useBatchTransactions.ts
- /Users/avuthegreat/optionbook-demo/package.json
