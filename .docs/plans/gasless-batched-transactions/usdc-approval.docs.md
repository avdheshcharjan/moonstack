# USDC Approval System Documentation

This document provides a comprehensive overview of the USDC approval system and patterns used in the OptionBook Demo codebase.

---

## Table of Contents

1. [Overview](#overview)
2. [USDC Contract Configuration](#usdc-contract-configuration)
3. [Core Approval Utilities](#core-approval-utilities)
4. [Approval Patterns by Execution Context](#approval-patterns-by-execution-context)
5. [Type Definitions](#type-definitions)
6. [Integration Points](#integration-points)
7. [Best Practices](#best-practices)

---

## Overview

The USDC approval system in this codebase handles ERC-20 token approvals for the OptionBook contract. The system implements adaptive approval logic that:

1. Checks current allowance before requesting new approvals
2. Validates USDC balance before executing trades
3. Calculates exact USDC amounts needed based on bet sizes
4. Encodes approval transactions for both direct wallet and smart account execution
5. Supports batch transaction workflows

The approval system is used across three execution contexts:
- **Direct Execution**: Traditional wallet-based transactions
- **Immediate Execution**: Smart account with paymaster sponsorship
- **Batch Execution**: Multiple transactions in a single batch

---

## USDC Contract Configuration

### Contract Addresses

**File: `/src/utils/contracts.ts`**

```typescript
/**
 * USDC contract address on Base
 * @see https://basescan.org/address/0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
 */
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

/**
 * OptionBook contract address on Base (v2 - r10)
 * @see https://basescan.org/address/0xd58b814C7Ce700f251722b5555e25aE0fa8169A1
 */
export const OPTION_BOOK_ADDRESS = '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1';

/**
 * Base network chain ID
 */
export const BASE_CHAIN_ID = 8453;
```

### ERC20 ABI

**File: `/src/utils/contracts.ts:121-125`**

```typescript
/**
 * ERC20 ABI - approve and allowance functions
 */
export const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function balanceOf(address owner) external view returns (uint256)',
] as const;
```

This minimal ABI includes the three essential functions for USDC approval operations:
- `approve`: Grant spending allowance to the OptionBook contract
- `allowance`: Check current approved amount
- `balanceOf`: Verify user has sufficient USDC

---

## Core Approval Utilities

### File: `/src/utils/usdcApproval.ts`

This file contains all the core utility functions for USDC approval operations.

#### 1. Check USDC Allowance

```typescript
/**
 * Check USDC allowance for a given owner and spender
 * Per OptionBook.md section 2.4: Check allowance before approving
 */
export async function checkUSDCAllowance(
  owner: Address,
  spender: Address = OPTION_BOOK_ADDRESS as Address
): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  // @ts-expect-error - viem v2 type issue with authorizationList
  const allowance = await publicClient.readContract({
    address: USDC_ADDRESS as Address,
    abi: parseAbi(ERC20_ABI),
    functionName: 'allowance',
    args: [owner, spender],
  });

  return allowance;
}
```

**Purpose**: Query the current USDC allowance for an address
**Returns**: Current allowance as bigint (in USDC's 6 decimal format)
**Usage**: Called before approving to avoid unnecessary approval transactions

#### 2. Get USDC Balance

```typescript
/**
 * Get USDC balance for an address
 * Per OptionBook.md section 2.4: Check balance before executing trade
 */
export async function getUSDCBalance(address: Address): Promise<bigint> {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  // @ts-expect-error - viem v2 type issue with authorizationList
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS as Address,
    abi: parseAbi(ERC20_ABI),
    functionName: 'balanceOf',
    args: [address],
  });

  return balance;
}
```

**Purpose**: Check if user has sufficient USDC for the trade
**Returns**: USDC balance as bigint (6 decimals)
**Usage**: Called before executing transactions to validate balance

#### 3. Encode USDC Approve Transaction

```typescript
/**
 * Encode USDC approve call data
 */
export function encodeUSDCApprove(
  amount: bigint,
  spender: Address = OPTION_BOOK_ADDRESS as Address
): `0x${string}` {
  return encodeFunctionData({
    abi: ERC20_ABI,
    functionName: 'approve',
    args: [spender, amount],
  });
}
```

**Purpose**: Generate encoded call data for USDC approval
**Returns**: Hex-encoded transaction data
**Usage**: Used in smart account batched calls and manual transaction construction

#### 4. Check if Approval is Needed

```typescript
/**
 * Check if approval is needed for a batch of bets
 */
export async function needsApproval(
  owner: Address,
  totalAmount: bigint,
  spender: Address = OPTION_BOOK_ADDRESS as Address
): Promise<boolean> {
  const currentAllowance = await checkUSDCAllowance(owner, spender);
  return currentAllowance < totalAmount;
}
```

**Purpose**: Adaptive approval logic - only approve if necessary
**Returns**: Boolean indicating if approval transaction is needed
**Usage**: Used in immediateExecution to conditionally add approval to batch

#### 5. Calculate Total USDC Needed

```typescript
/**
 * Calculate total USDC needed for a batch of bets
 * Each bet requires: betSize * numContracts
 */
export function calculateTotalUSDCNeeded(
  bets: Array<{ betSize: number; numContracts: bigint }>
): bigint {
  return bets.reduce((total, bet) => {
    // Convert betSize from dollars to USDC (6 decimals)
    const betSizeInUSDC = BigInt(Math.floor(bet.betSize * 1_000_000));
    return total + (betSizeInUSDC * bet.numContracts);
  }, 0n);
}
```

**Purpose**: Calculate total USDC required for multiple bets
**Returns**: Total USDC amount as bigint (6 decimals)
**Usage**: Used in batch transaction workflows

#### 6. USDC Formatting Utilities

```typescript
/**
 * Format USDC amount to human-readable string (6 decimals)
 */
export function formatUSDC(amount: bigint): string {
  const dollars = Number(amount) / 1_000_000;
  return dollars.toFixed(2);
}

/**
 * Parse USDC amount from human-readable string to bigint (6 decimals)
 */
export function parseUSDC(amount: string): bigint {
  const dollars = parseFloat(amount);
  return BigInt(Math.floor(dollars * 1_000_000));
}
```

**Purpose**: Convert between bigint and human-readable USDC amounts
**Usage**: Display formatting and user input parsing

---

## Approval Patterns by Execution Context

### 1. Direct Execution (Traditional Wallet)

**File: `/src/services/directExecution.ts`**

Direct execution uses the user's wallet to execute transactions. The approval flow:

```typescript
// Step 1: Create ethers contract instance
const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, signer);

// Step 2: Check USDC balance
const balance = await usdcContract.balanceOf(userAddress);
const requiredAmount = BigInt(Math.floor(betSize * 1_000_000));

if (balance < requiredAmount) {
  throw new Error(`Insufficient USDC balance. Need ${formatUSDC(requiredAmount)}`);
}

// Step 3: Check current allowance
const currentAllowance = await usdcContract.allowance(userAddress, OPTION_BOOK_ADDRESS);

// Step 4: Approve if needed (adaptive approval)
if (currentAllowance < requiredAmount) {
  console.log('Approving USDC for OptionBook...');

  // Request approval from user's wallet
  const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);
  console.log('Approval transaction submitted:', approveTx.hash);

  // Wait for approval to be mined
  const approvalReceipt = await approveTx.wait();

  if (!approvalReceipt || approvalReceipt.status !== 1) {
    throw new Error('USDC approval failed');
  }

  console.log('USDC approval confirmed');
} else {
  console.log('USDC already approved');
}

// Step 5: Execute fillOrder transaction
// (approval is now guaranteed to be sufficient)
```

**Key Points:**
- Uses ethers.js `Contract` interface
- Approval is a separate transaction requiring user confirmation
- Waits for approval to be mined before proceeding
- User pays gas for both approval and fillOrder

**Location**: `/src/services/directExecution.ts:76-99`

---

### 2. Immediate Execution (Smart Account + Paymaster)

**File: `/src/services/immediateExecution.ts`**

Immediate execution uses smart accounts with paymaster sponsorship. Approval is batched with the trade:

```typescript
// Step 1: Create smart account client
const smartAccountClient = await createSmartAccountWithPaymaster(ownerAddress);
const smartAccountAddress = smartAccountClient.account.address;

// Step 2: Calculate required USDC
const betSizeInUSDC = BigInt(Math.floor(betSize * 1_000_000));
const totalNeeded = betSizeInUSDC;

// Step 3: Check balance of owner wallet (not smart account)
const balance = await getUSDCBalance(ownerAddress);
if (balance < totalNeeded) {
  throw new Error(`Insufficient USDC balance`);
}

// Step 4: Check if approval is needed
const approvalNeeded = await needsApproval(
  smartAccountAddress,
  totalNeeded,
  OPTION_BOOK_ADDRESS as Address
);

// Step 5: Prepare calls array (batch)
const calls: { to: Address; data: Hex; value?: bigint }[] = [];

// Step 6: Add approval call if needed (adaptive)
if (approvalNeeded) {
  const approveCallData = encodeUSDCApprove(totalNeeded);
  calls.push({
    to: USDC_ADDRESS as Address,
    data: approveCallData as Hex,
    value: 0n,
  });
}

// Step 7: Add fillOrder call
const fillOrderData = encodeFunctionData({
  abi: OPTION_BOOK_ABI,
  functionName: 'fillOrder',
  args: [typedOrder, order.signature as Hex, REFERRER_ADDRESS as Address],
});

calls.push({
  to: OPTION_BOOK_ADDRESS as Address,
  data: fillOrderData as Hex,
  value: 0n,
});

// Step 8: Execute as atomic batch with paymaster
const txHash: Hex = await smartAccountClient.sendUserOperation({
  calls,
});
```

**Key Points:**
- Uses `needsApproval()` utility for adaptive logic
- Uses `encodeUSDCApprove()` to generate call data
- Approval and fillOrder batched in single user operation
- Paymaster sponsors gas costs
- Atomic execution (all or nothing)

**Location**: `/src/services/immediateExecution.ts:58-116`

---

### 3. Batch Execution (Multiple Transactions)

**File: `/src/services/batchExecution.ts`**

Batch execution handles multiple cart transactions. Approval is done once for the total amount:

```typescript
// Step 1: Create ethers provider
const provider = new BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, signer);

// Step 2: Calculate total USDC for all transactions
const totalUSDC = transactions.reduce(
  (sum, tx) => sum + (tx.requiredUSDC || 0n),
  0n
);

console.log('Total USDC needed:', Number(totalUSDC) / 1_000_000, 'USDC');

// Step 3: Check balance
const balance = await usdcContract.balanceOf(userAddress);
if (balance < totalUSDC) {
  throw new Error(`Insufficient USDC balance`);
}

// Step 4: Check allowance and approve once for total
const currentAllowance = await usdcContract.allowance(userAddress, OPTION_BOOK_ADDRESS);

if (currentAllowance < totalUSDC) {
  console.log('Approving USDC for OptionBook...');
  console.log('Approving amount:', Number(totalUSDC) / 1_000_000, 'USDC');

  // Approve total amount (single approval for all transactions)
  const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, totalUSDC);
  console.log('Approval transaction submitted:', approveTx.hash);

  const approvalReceipt = await approveTx.wait();

  if (!approvalReceipt || approvalReceipt.status !== 1) {
    throw new Error('USDC approval failed');
  }

  console.log('USDC approval confirmed');
} else {
  console.log('USDC already approved');
}

// Step 5: Try batch execution with wallet_sendCalls (EIP-5792)
try {
  const calls = transactions.map((tx) => ({
    to: tx.to,
    value: tx.value ? numberToHex(tx.value) : '0x0',
    data: tx.data,
  }));

  const result = await provider.send('wallet_sendCalls', [
    {
      version: '1.0',
      from: userAddress,
      calls: calls,
    },
  ]);

  return { success: true, txHash: result as string };
} catch (batchError) {
  // Fallback: Execute sequentially
  for (const tx of transactions) {
    const txResponse = await signer.sendTransaction({
      to: tx.to,
      data: tx.data,
      value: tx.value || 0n,
    });
    await txResponse.wait();
  }
}
```

**Key Points:**
- Single approval for total amount across all transactions
- Uses `CartTransaction.requiredUSDC` field to calculate total
- Attempts EIP-5792 `wallet_sendCalls` for native batch support
- Falls back to sequential execution if batch not supported
- More efficient than approving for each transaction

**Location**: `/src/services/batchExecution.ts:74-192`

---

## Type Definitions

### CartTransaction Interface

**File: `/src/types/cart.ts`**

```typescript
export interface CartTransaction {
  id: string;
  to: Address;
  data: Hex;
  value?: bigint;
  description: string;
  timestamp: number;
  requiredUSDC?: bigint;  // ← Used for approval calculation
  orderDetails?: {
    marketId: string;
    side: 'YES' | 'NO';
    amount: string;
  };
}
```

The `requiredUSDC` field is critical for approval calculations in batch execution.

**Usage Example:**

```typescript
// From directExecution.ts:135-148
const cartTransaction: CartTransaction = {
  id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
  to: OPTION_BOOK_ADDRESS as Address,
  data: fillOrderData,
  description: `${action.toUpperCase()} - ${pair.underlying} - $${betSize}`,
  timestamp: Date.now(),
  requiredUSDC: requiredAmount,  // ← Set during transaction creation
  orderDetails: {
    marketId: pair.id || pair.underlying,
    side: action.toUpperCase() as 'YES' | 'NO',
    amount: betSize.toString(),
  },
};
```

---

## Integration Points

### Smart Account Integration

**File: `/src/lib/smartAccount.ts`**

Smart accounts require checking allowance for the smart account address, not the owner:

```typescript
export async function createSmartAccountWithPaymaster(owner: Address) {
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain: base,
    transport: custom(window.ethereum),
    account: owner,
  });

  // Create simple smart account using wallet client as owner
  const simpleAccount = await toSimpleSmartAccount({
    client: publicClient,
    entryPoint: {
      address: ENTRYPOINT_ADDRESS_V07,
      version: '0.7' as const,
    },
    owner: walletClient,
  });

  const smartAccountClient = createSmartAccountClient({
    account: simpleAccount,
    chain: base,
    bundlerTransport: http(BUNDLER_URL),
  });

  return smartAccountClient;
}
```

**Key Point**: When using smart accounts, check allowance for `simpleAccount.address`, not `owner` address.

**Example from immediateExecution.ts:58-63:**

```typescript
const approvalNeeded = await needsApproval(
  smartAccountAddress,  // ← Smart account address, not owner
  totalNeeded,
  OPTION_BOOK_ADDRESS as Address
);
```

---

### NumContracts Calculation

Approval amounts are calculated based on bet size and order price:

```typescript
// From OptionBook.md section 2.4:
// - price is in 8 decimals
// - betSize is in dollars
// - numContracts should be scaled to 6 decimals (USDC)

const pricePerContract = Number(order.order.price) / 1e8; // Convert from 8 decimals
const contractsToBuy = betSize / pricePerContract;
const numContracts = BigInt(Math.floor(contractsToBuy * 1e6)); // Scale to 6 decimals

// Required USDC approval amount
const requiredAmount = BigInt(Math.floor(betSize * 1_000_000)); // 6 decimals
```

**Important**: The `requiredAmount` is based on `betSize`, not `numContracts * price`, to avoid rounding issues.

---

## Best Practices

### 1. Always Check Allowance Before Approving

```typescript
// ✅ GOOD: Check first
const currentAllowance = await checkUSDCAllowance(userAddress, OPTION_BOOK_ADDRESS);
if (currentAllowance < requiredAmount) {
  await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);
}

// ❌ BAD: Approve blindly
await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);
```

**Benefit**: Saves gas and improves UX by avoiding unnecessary approval transactions.

---

### 2. Validate Balance Before Approving

```typescript
// ✅ GOOD: Check balance first
const balance = await getUSDCBalance(userAddress);
if (balance < requiredAmount) {
  throw new Error('Insufficient USDC balance');
}

// Then check/approve
const allowance = await checkUSDCAllowance(userAddress, OPTION_BOOK_ADDRESS);
// ...
```

**Benefit**: Fail fast with clear error messages instead of failing during approval.

---

### 3. Use Exact Required Amount

```typescript
// ✅ GOOD: Approve exact amount needed
const requiredAmount = BigInt(Math.floor(betSize * 1_000_000));
await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);

// ❌ BAD: Approve unlimited (security risk)
await usdcContract.approve(OPTION_BOOK_ADDRESS, ethers.constants.MaxUint256);
```

**Benefit**: Minimizes security risk. Users only approve what's needed.

---

### 4. Batch Approvals When Possible

```typescript
// ✅ GOOD: Single approval for batch
const totalUSDC = transactions.reduce((sum, tx) => sum + tx.requiredUSDC, 0n);
await usdcContract.approve(OPTION_BOOK_ADDRESS, totalUSDC);

// ❌ BAD: Approve for each transaction
for (const tx of transactions) {
  await usdcContract.approve(OPTION_BOOK_ADDRESS, tx.requiredUSDC);
}
```

**Benefit**: Reduces gas costs and improves UX (fewer wallet confirmations).

---

### 5. Wait for Approval Confirmation

```typescript
// ✅ GOOD: Wait for confirmation
const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);
const receipt = await approveTx.wait();

if (!receipt || receipt.status !== 1) {
  throw new Error('USDC approval failed');
}

// Now safe to execute trade
await optionBookContract.fillOrder(...);

// ❌ BAD: Don't wait
await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);
await optionBookContract.fillOrder(...); // May fail if approval not mined yet
```

**Benefit**: Prevents race conditions and transaction failures.

---

### 6. Handle Smart Account vs EOA Addresses

```typescript
// ✅ GOOD: Use correct address based on context
let addressToCheck: Address;

if (useSmartAccount) {
  const smartAccount = await createSmartAccountWithPaymaster(ownerAddress);
  addressToCheck = smartAccount.account.address; // Smart account address
} else {
  addressToCheck = ownerAddress; // EOA address
}

const allowance = await checkUSDCAllowance(addressToCheck, OPTION_BOOK_ADDRESS);
```

**Benefit**: Ensures approval is checked/granted for the actual address that will execute transactions.

---

### 7. Log Approval Operations for Debugging

```typescript
// ✅ GOOD: Log approval details
console.log('Approving USDC for OptionBook...');
console.log('Required:', Number(requiredAmount) / 1_000_000, 'USDC');
console.log('Current allowance:', Number(currentAllowance) / 1_000_000, 'USDC');

const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);
console.log('Approval transaction submitted:', approveTx.hash);

const receipt = await approveTx.wait();
console.log('USDC approval confirmed');
```

**Benefit**: Makes debugging easier and provides visibility into approval flow.

---

## Summary

The USDC approval system in this codebase is well-structured with:

✅ **Reusable utilities** in `/src/utils/usdcApproval.ts`
✅ **Adaptive approval logic** (only approve when needed)
✅ **Balance validation** before approving
✅ **Three execution contexts** (direct, immediate, batch)
✅ **Smart account support** with correct address handling
✅ **Type safety** with TypeScript interfaces
✅ **Clear documentation** referencing OptionBook.md

### Key Files Reference

| File | Purpose |
|------|---------|
| `/src/utils/usdcApproval.ts` | Core approval utilities |
| `/src/utils/contracts.ts` | Contract addresses and ABIs |
| `/src/services/directExecution.ts` | Direct wallet approval flow |
| `/src/services/immediateExecution.ts` | Smart account approval flow |
| `/src/services/batchExecution.ts` | Batch transaction approval flow |
| `/src/lib/smartAccount.ts` | Smart account creation |
| `/src/types/cart.ts` | CartTransaction interface |

### USDC Token Specifications

- **Contract Address**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base Mainnet)
- **Decimals**: 6
- **Spender (OptionBook)**: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
- **Chain**: Base (Chain ID 8453)

---

*Documentation generated: 2025-10-24*
