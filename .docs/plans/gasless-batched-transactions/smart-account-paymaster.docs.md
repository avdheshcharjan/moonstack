# Smart Account & Paymaster Integration Architecture

## Overview

This document provides comprehensive technical documentation for the ERC-4337 smart account and paymaster integration in the Optionbook Demo codebase. The implementation enables gasless transactions using Coinbase's Base Paymaster service.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Smart Account Creation](#smart-account-creation)
3. [Paymaster Integration](#paymaster-integration)
4. [EntryPoint Contract](#entrypoint-contract)
5. [Bundler Configuration](#bundler-configuration)
6. [Executing UserOperations](#executing-useroperations)
7. [Current Implementation Analysis](#current-implementation-analysis)
8. [Environment Configuration](#environment-configuration)
9. [Type Definitions](#type-definitions)
10. [Error Handling Patterns](#error-handling-patterns)
11. [Adapting for Batched Transactions](#adapting-for-batched-transactions)

---

## Architecture Overview

### Technology Stack

- **ERC-4337**: Account Abstraction standard for smart contract wallets
- **permissionless.js v0.2.57**: Library for building ERC-4337 integrations
- **viem v2.38.3**: Ethereum interaction library
- **Coinbase Developer Platform (CDP)**: Provides bundler and paymaster services
- **Base Network**: L2 blockchain (Chain ID: 8453)

### High-Level Flow

```
User EOA (Browser Wallet)
    ↓
Smart Account (ERC-4337)
    ↓ (signs UserOperation)
    ↓
Bundler Service (CDP)
    ↓ (packages UserOperation)
    ↓
Paymaster Service (CDP)
    ↓ (sponsors gas, adds signature)
    ↓
EntryPoint Contract v0.7
    ↓ (validates & executes)
    ↓
Target Contracts (OptionBook, USDC)
```

### Key Contracts

| Contract | Address | Purpose |
|----------|---------|---------|
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` | ERC-4337 singleton contract |
| OptionBook v2 | `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1` | Options trading contract |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | Payment token |

---

## Smart Account Creation

### File: `/src/lib/smartAccount.ts`

### Core Function: `createSmartAccountWithPaymaster`

Creates a smart account client with paymaster support for gasless transactions.

```typescript
import { createPublicClient, createWalletClient, custom, http, type Address } from 'viem';
import { base } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';
import { toSimpleSmartAccount } from 'permissionless/accounts';

const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || '';
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';

export const ENTRYPOINT_ADDRESS_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;

export async function createSmartAccountWithPaymaster(
  owner: Address
) {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Ethereum provider not found');
  }

  // Step 1: Create public client for reading blockchain state
  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  // Step 2: Create wallet client from browser provider (MetaMask, etc.)
  const walletClient = createWalletClient({
    chain: base,
    transport: custom(window.ethereum),
    account: owner,
  });

  // Step 3: Create simple smart account using wallet client as owner
  const simpleAccount = await (toSimpleSmartAccount as any)({
    client: publicClient,
    entryPoint: {
      address: ENTRYPOINT_ADDRESS_V07,
      version: '0.7' as const,
    },
    owner: walletClient,
  });

  // Step 4: Create smart account client with bundler
  // Paymaster integration is handled via the bundler endpoint
  const smartAccountClient = createSmartAccountClient({
    account: simpleAccount as any,
    chain: base,
    bundlerTransport: http(BUNDLER_URL),
  });

  return smartAccountClient;
}
```

### Key Pattern Insights

1. **Browser Check**: Validates `window.ethereum` exists (client-side only)
2. **Dual Clients**:
   - `publicClient`: Reads blockchain state (RPC calls)
   - `walletClient`: Signs transactions using browser wallet
3. **Smart Account Type**: Uses `SimpleSmartAccount` (basic ERC-4337 implementation)
4. **Ownership**: EOA wallet signs for smart account operations
5. **Type Casting**: Uses `as any` to work around deep type instantiation issues in permissionless library

### Smart Account Address Derivation

```typescript
export async function getSmartAccountAddress(owner: Address): Promise<Address> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Ethereum provider not found');
  }

  const publicClient = createPublicClient({
    chain: base,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain: base,
    transport: custom(window.ethereum),
    account: owner,
  });

  const simpleAccount = await (toSimpleSmartAccount as any)({
    client: publicClient,
    entryPoint: {
      address: ENTRYPOINT_ADDRESS_V07,
      version: '0.7' as const,
    },
    owner: walletClient,
  });

  return simpleAccount.address as Address;
}
```

**Note**: Smart account address is deterministic based on:
- Owner address
- EntryPoint version
- Account implementation factory

---

## Paymaster Integration

### File: `/src/lib/paymaster.ts`

### Overview

The paymaster handles gas sponsorship by providing signatures that authorize the EntryPoint to pull gas funds from the paymaster contract instead of the user.

### Two-Phase Paymaster Flow

1. **Stub Data Phase** (`pm_getPaymasterStubData`): Get initial gas estimates
2. **Final Data Phase** (`pm_getPaymasterData`): Get signed paymaster authorization

### Type Definitions

```typescript
import type { Address, Hex } from 'viem';

export interface PaymasterStubDataResponse {
  paymaster: Address;                    // Paymaster contract address
  paymasterData: Hex;                   // Initial data (unsigned)
  paymasterVerificationGasLimit: bigint; // Gas for paymaster validation
  paymasterPostOpGasLimit: bigint;      // Gas for post-op hook
  isFinal: boolean;                      // Whether this is final data
}

export interface PaymasterDataResponse {
  paymaster: Address;      // Paymaster contract address
  paymasterData: Hex;     // Final signed data
}

export interface UserOperationRequest {
  sender: Address;
  nonce: bigint;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}
```

### Function: `getPaymasterStubData`

Called during gas estimation to get initial paymaster parameters.

```typescript
export async function getPaymasterStubData(
  userOp: UserOperationRequest,
  entryPoint: Address
): Promise<PaymasterStubDataResponse> {
  const response = await fetch(PAYMASTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_getPaymasterStubData',
      params: [
        {
          sender: userOp.sender,
          nonce: `0x${userOp.nonce.toString(16)}`,
          callData: userOp.callData,
          callGasLimit: `0x${userOp.callGasLimit.toString(16)}`,
          verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}`,
          preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
          maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
          maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
        },
        entryPoint,
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Paymaster request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Paymaster error: ${data.error.message}`);
  }

  return {
    paymaster: data.result.paymaster,
    paymasterData: data.result.paymasterData,
    paymasterVerificationGasLimit: BigInt(data.result.paymasterVerificationGasLimit),
    paymasterPostOpGasLimit: BigInt(data.result.paymasterPostOpGasLimit),
    isFinal: data.result.isFinal || false,
  };
}
```

**Usage Pattern:**
- Called first to get rough gas estimates
- Paymaster checks if it will sponsor the operation
- Returns unsigned data for simulation

### Function: `getPaymasterData`

Called after gas estimation to get final signed paymaster authorization.

```typescript
export async function getPaymasterData(
  userOp: UserOperationRequest,
  entryPoint: Address
): Promise<PaymasterDataResponse> {
  const response = await fetch(PAYMASTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'pm_getPaymasterData',
      params: [
        {
          sender: userOp.sender,
          nonce: `0x${userOp.nonce.toString(16)}`,
          callData: userOp.callData,
          callGasLimit: `0x${userOp.callGasLimit.toString(16)}`,
          verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}`,
          preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
          maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
          maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
        },
        entryPoint,
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Paymaster request failed: ${response.statusText}`);
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(`Paymaster error: ${data.error.message}`);
  }

  return {
    paymaster: data.result.paymaster,
    paymasterData: data.result.paymasterData,
  };
}
```

**Usage Pattern:**
- Called after accurate gas estimation
- Paymaster signs commitment to sponsor gas
- Signature included in `paymasterData`

### Configuration Check

```typescript
export function isPaymasterConfigured(): boolean {
  return Boolean(PAYMASTER_URL && PAYMASTER_URL.length > 0);
}
```

---

## EntryPoint Contract

### Address & Version

```typescript
// From /src/lib/smartAccount.ts
export const ENTRYPOINT_ADDRESS_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;

// From /src/utils/contracts.ts
export const ENTRYPOINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
```

**Version**: `0.7` (latest ERC-4337 standard)

### Purpose

The EntryPoint contract is the singleton contract that:
1. Validates UserOperations
2. Executes smart account calls
3. Handles paymaster gas sponsorship
4. Manages nonces
5. Emits events for indexing

### Integration

The EntryPoint is specified when creating the smart account:

```typescript
const simpleAccount = await toSimpleSmartAccount({
  client: publicClient,
  entryPoint: {
    address: ENTRYPOINT_ADDRESS_V07,
    version: '0.7' as const,
  },
  owner: walletClient,
});
```

**Note**: All smart accounts must use the same EntryPoint version for compatibility.

---

## Bundler Configuration

### Environment Variable

```bash
# From .env.example
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID
```

### Purpose

The bundler service:
1. Accepts UserOperations from clients
2. Simulates UserOperations to check validity
3. Batches multiple UserOperations (from different users)
4. Submits bundled operations to EntryPoint on-chain
5. Monitors for successful execution

### Configuration in Smart Account

```typescript
const smartAccountClient = createSmartAccountClient({
  account: simpleAccount,
  chain: base,
  bundlerTransport: http(BUNDLER_URL),
});
```

### Coinbase's Combined Endpoint

Coinbase CDP provides a **combined bundler + paymaster endpoint**:

```
https://api.developer.coinbase.com/rpc/v1/base/{PROJECT_ID}
```

This endpoint handles both:
- Bundler RPC methods (`eth_sendUserOperation`, `eth_getUserOperationReceipt`, etc.)
- Paymaster RPC methods (`pm_getPaymasterStubData`, `pm_getPaymasterData`)

**Benefit**: Single endpoint simplifies configuration and ensures paymaster integration is automatic.

---

## Executing UserOperations

### Current Pattern in `immediateExecution.ts`

```typescript
// Step 1: Prepare transaction calls
const calls: { to: Address; data: Hex; value?: bigint }[] = [];

// Add approval call if needed
if (approvalNeeded) {
  const approveCallData = encodeUSDCApprove(totalNeeded);
  calls.push({
    to: USDC_ADDRESS as Address,
    data: approveCallData as Hex,
    value: 0n,
  });
}

// Add fillOrder call
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

// Step 2: Execute via smart account
const txHash: Hex = await (smartAccountClient as any).sendUserOperation({
  calls,
});

console.log('Transaction submitted:', txHash);
```

### Key Points

1. **Batching Built-In**: The `calls` array allows multiple operations in one UserOperation
2. **Automatic Paymaster**: Bundler endpoint handles paymaster integration automatically
3. **Type Casting**: Uses `as any` to avoid type errors
4. **Return Value**: Returns transaction hash (actually UserOperation hash initially)

### Under the Hood

When `sendUserOperation` is called:

1. **Gas Estimation**:
   - Client calls bundler to estimate gas
   - Bundler simulates UserOperation
   - Returns `callGasLimit`, `verificationGasLimit`, `preVerificationGas`

2. **Paymaster Stub** (if bundler supports):
   - Client may call `pm_getPaymasterStubData` for initial paymaster params
   - Used in simulation

3. **User Signature**:
   - Smart account owner signs the UserOperation hash
   - Signature proves authorization from EOA

4. **Paymaster Signature**:
   - Client calls `pm_getPaymasterData` with accurate gas values
   - Paymaster signs commitment to sponsor gas
   - Signature added to UserOperation

5. **Submission**:
   - Client sends complete UserOperation to bundler via `eth_sendUserOperation`
   - Bundler validates and queues operation

6. **On-Chain Execution**:
   - Bundler submits to EntryPoint contract
   - EntryPoint validates paymaster signature
   - EntryPoint executes calls in smart account context
   - Gas pulled from paymaster contract

---

## Current Implementation Analysis

### File: `/src/services/immediateExecution.ts`

This file demonstrates the current single-transaction pattern using smart accounts and paymaster.

#### Flow Breakdown

```typescript
export async function executeImmediateFillOrder(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  ownerAddress: Address
): Promise<ImmediateExecutionResult>
```

**Step 1: Order Validation**
```typescript
const order: RawOrderData = action === 'yes' ? pair.callOption : pair.putOption;

if (!order || !order.order) {
  throw new Error('Invalid order data');
}
```

**Step 2: Create Smart Account**
```typescript
const smartAccountClient = await createSmartAccountWithPaymaster(ownerAddress);
const smartAccountAddress = smartAccountClient.account.address;
```

**Step 3: Calculate Contract Amounts**
```typescript
// Price is 8 decimals, USDC is 6 decimals
const pricePerContract = Number(order.order.price) / 1e8;
const contractsToBuy = betSize / pricePerContract;
const numContracts = BigInt(Math.floor(contractsToBuy * 1e6));

// Total USDC needed
const betSizeInUSDC = BigInt(Math.floor(betSize * 1_000_000));
const totalNeeded = betSizeInUSDC;
```

**Step 4: Balance & Approval Check**
```typescript
// Check USDC balance of owner wallet (NOT smart account)
const balance = await getUSDCBalance(ownerAddress);
if (balance < totalNeeded) {
  throw new Error(`Insufficient USDC balance...`);
}

// Check if smart account needs approval for OptionBook
const approvalNeeded = await needsApproval(
  smartAccountAddress,
  totalNeeded,
  OPTION_BOOK_ADDRESS as Address
);
```

**Key Insight**: Balance is checked on EOA wallet, but approval is for smart account!

**Step 5: Prepare Calls Array**
```typescript
const calls: { to: Address; data: Hex; value?: bigint }[] = [];

// Conditional approval
if (approvalNeeded) {
  const approveCallData = encodeUSDCApprove(totalNeeded);
  calls.push({
    to: USDC_ADDRESS as Address,
    data: approveCallData as Hex,
    value: 0n,
  });
}

// Prepare order with exact values (do not modify signed fields)
const typedOrder = {
  maker: order.order.maker as Address,
  orderExpiryTimestamp: BigInt(order.order.orderExpiryTimestamp),
  collateral: order.order.collateral as Address,
  isCall: order.order.isCall,
  priceFeed: order.order.priceFeed as Address,
  implementation: order.order.implementation as Address,
  isLong: order.order.isLong, // Keep original - signature will fail if modified
  maxCollateralUsable: BigInt(order.order.maxCollateralUsable),
  strikes: order.order.strikes.map((s: string | bigint) => BigInt(s)),
  expiry: BigInt(order.order.expiry),
  price: BigInt(order.order.price),
  numContracts: numContracts, // Only field we modify
  extraOptionData: (order.order.extraOptionData || '0x') as Hex,
};

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
```

**Step 6: Execute UserOperation**
```typescript
const txHash: Hex = await (smartAccountClient as any).sendUserOperation({
  calls,
});

console.log('Transaction submitted:', txHash);
```

**Step 7: Store Position**
```typescript
await storePosition(pair, action, order, txHash, ownerAddress);

return {
  success: true,
  txHash,
};
```

### Key Patterns to Reuse

1. **Smart Account per Owner**: Create once, reuse address
2. **Balance on EOA**: Users fund EOA wallet, not smart account
3. **Approval for Smart Account**: Approve OptionBook to spend from smart account
4. **Batched Calls**: Use `calls` array for multiple operations
5. **Type Conversion**: Careful conversion between string/bigint for order fields
6. **Error Handling**: Wrap in try-catch, return structured result

---

## Environment Configuration

### File: `.env.example`

```bash
# Coinbase Developer Platform - Paymaster Configuration
# Get your credentials from https://portal.cdp.coinbase.com

# Paymaster API endpoint (Base network)
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID

# Bundler API endpoint (Base network)
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID

# CDP Project credentials (keep these secret - server-side only)
CDP_PROJECT_ID=your_project_id_here
CDP_API_KEY=your_api_key_here

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Network configuration
NEXT_PUBLIC_CHAIN_ID=8453
```

### Setup Instructions

1. **Create CDP Project**:
   - Visit [Coinbase Developer Platform](https://portal.cdp.coinbase.com)
   - Create new project
   - Copy Project ID

2. **Enable Paymaster**:
   - Navigate to Paymaster section
   - Activate paymaster (receives 0.25 ETH in gas credits automatically)

3. **Configure Gas Policy**:
   - Allowlist contracts that can receive sponsored gas:
     - OptionBook: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
     - USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
   - Set spending limits (optional)

4. **Update Environment**:
   - Copy `.env.example` to `.env.local`
   - Replace `YOUR_PROJECT_ID` with actual Project ID
   - URLs should be: `https://api.developer.coinbase.com/rpc/v1/base/{PROJECT_ID}`

### Environment Access Pattern

```typescript
// In client-side code
const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || '';
const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';

// Validation
if (!BUNDLER_URL || !PAYMASTER_URL) {
  throw new Error('Bundler/Paymaster URLs not configured');
}
```

**Note**: `NEXT_PUBLIC_` prefix makes variables available in browser (Next.js convention).

---

## Type Definitions

### Smart Account Types

```typescript
import type { Address } from 'viem';
import type { SmartAccountClient } from 'permissionless';

// Smart account client type (from permissionless library)
type SmartAccountClientType = SmartAccountClient<any, any>;

// Return type of createSmartAccountWithPaymaster
type CreateSmartAccountResult = SmartAccountClientType;
```

### UserOperation Types

```typescript
import type { Hex } from 'viem';

// Individual call within a UserOperation
interface Call {
  to: Address;
  data: Hex;
  value?: bigint;
}

// UserOperation request (subset of fields)
interface UserOperationRequest {
  sender: Address;
  nonce: bigint;
  callData: Hex;
  callGasLimit: bigint;
  verificationGasLimit: bigint;
  preVerificationGas: bigint;
  maxFeePerGas: bigint;
  maxPriorityFeePerGas: bigint;
}

// Complete UserOperation (includes signatures)
interface UserOperation extends UserOperationRequest {
  signature: Hex;
  paymasterAndData?: Hex; // Optional paymaster data
}
```

### Transaction Result Types

```typescript
interface ImmediateExecutionResult {
  success: boolean;
  txHash?: Hex;
  error?: string;
}

interface BatchExecutionResult {
  success: boolean;
  txHash?: string;
  error?: string;
}

interface BatchTransactionResult {
  id: string;
  status: 'pending' | 'submitted' | 'confirmed' | 'failed';
  txHash?: Hex;
  error?: string;
}
```

---

## Error Handling Patterns

### Paymaster Errors

```typescript
try {
  const paymasterData = await getPaymasterData(userOp, entryPoint);
} catch (error) {
  if (error.message.includes('gas policy')) {
    // Contract not allowlisted in paymaster policy
    throw new Error('Gas sponsorship not available for this contract');
  } else if (error.message.includes('insufficient funds')) {
    // Paymaster has no gas credits left
    throw new Error('Paymaster service temporarily unavailable');
  } else {
    // Generic paymaster error
    throw new Error(`Paymaster error: ${error.message}`);
  }
}
```

### Smart Account Creation Errors

```typescript
try {
  const smartAccountClient = await createSmartAccountWithPaymaster(ownerAddress);
} catch (error) {
  if (error.message.includes('Ethereum provider not found')) {
    // No wallet installed
    throw new Error('Please install MetaMask or another Web3 wallet');
  } else if (error.message.includes('User rejected')) {
    // User denied signature request
    throw new Error('Wallet connection rejected');
  } else {
    // Generic creation error
    throw new Error(`Failed to create smart account: ${error.message}`);
  }
}
```

### UserOperation Execution Errors

```typescript
try {
  const txHash = await smartAccountClient.sendUserOperation({ calls });
} catch (error) {
  if (error.message.includes('insufficient funds')) {
    // Not enough USDC in EOA wallet
    throw new Error('Insufficient USDC balance');
  } else if (error.message.includes('AA25')) {
    // Invalid signature (ERC-4337 error code)
    throw new Error('Transaction signature invalid');
  } else if (error.message.includes('AA31')) {
    // Paymaster validation failed
    throw new Error('Paymaster rejected transaction');
  } else if (error.message.includes('AA40')) {
    // Verification gas limit too low
    throw new Error('Gas limit too low');
  } else {
    // Generic execution error
    throw new Error(`Transaction failed: ${error.message}`);
  }
}
```

### ERC-4337 Error Codes Reference

| Code | Meaning | Common Cause |
|------|---------|--------------|
| AA10 | Sender not deployed | Smart account not initialized |
| AA13 | initCode failed | Smart account creation failed |
| AA21 | Insufficient verification gas | Gas limit too low |
| AA22 | Expired or not due | UserOperation expired |
| AA23 | Reverted | Smart account validation reverted |
| AA24 | Signature error | Invalid EOA signature |
| AA25 | Invalid signature | Signature doesn't match |
| AA30 | Paymaster not deployed | Paymaster contract missing |
| AA31 | Paymaster reverted | Paymaster rejected sponsorship |
| AA32 | Paymaster expired | Paymaster validity time exceeded |
| AA33 | Verification gas limit | Paymaster gas too low |
| AA34 | Paymaster signature error | Invalid paymaster signature |
| AA40 | Over verification gas limit | Too much gas requested |
| AA41 | Too little verification gas | Not enough gas provided |

---

## Adapting for Batched Transactions

### Current vs. Target Architecture

**Current (Immediate Execution)**:
```
User swipes → Execute immediately → Single UserOperation → On-chain
```

**Target (Batched Execution)**:
```
User swipes → Add to cart → Review batch → Execute batch → Single UserOperation → On-chain
```

### Key Adaptations Needed

#### 1. Cart to Calls Conversion

```typescript
import type { CartTransaction } from '@/src/types/cart';

function convertCartToCalls(
  transactions: CartTransaction[]
): { to: Address; data: Hex; value?: bigint }[] {
  const calls: { to: Address; data: Hex; value?: bigint }[] = [];

  // Add each transaction's data to calls array
  for (const tx of transactions) {
    calls.push({
      to: tx.to,
      data: tx.data,
      value: tx.value || 0n,
    });
  }

  return calls;
}
```

#### 2. Batch Approval Calculation

```typescript
import { calculateTotalUSDCNeeded } from '@/src/utils/usdcApproval';

async function prepareBatchWithApproval(
  transactions: CartTransaction[],
  smartAccountAddress: Address
): Promise<{ to: Address; data: Hex; value?: bigint }[]> {
  const calls: { to: Address; data: Hex; value?: bigint }[] = [];

  // Calculate total USDC needed across all transactions
  const totalUSDC = transactions.reduce(
    (sum, tx) => sum + (tx.requiredUSDC || 0n),
    0n
  );

  // Check if approval needed
  const approvalNeeded = await needsApproval(
    smartAccountAddress,
    totalUSDC,
    OPTION_BOOK_ADDRESS as Address
  );

  // Add approval call FIRST if needed
  if (approvalNeeded) {
    const approveCallData = encodeUSDCApprove(totalUSDC);
    calls.push({
      to: USDC_ADDRESS as Address,
      data: approveCallData as Hex,
      value: 0n,
    });
  }

  // Add all transaction calls
  for (const tx of transactions) {
    calls.push({
      to: tx.to,
      data: tx.data,
      value: tx.value || 0n,
    });
  }

  return calls;
}
```

#### 3. Batch Execution Function

```typescript
import { createSmartAccountWithPaymaster } from '@/src/lib/smartAccount';
import type { CartTransaction } from '@/src/types/cart';

export async function executeBatchedUserOperation(
  transactions: CartTransaction[],
  userAddress: Address
): Promise<BatchExecutionResult> {
  try {
    if (transactions.length === 0) {
      throw new Error('No transactions to execute');
    }

    // Step 1: Create smart account
    const smartAccountClient = await createSmartAccountWithPaymaster(userAddress);
    const smartAccountAddress = smartAccountClient.account.address;

    // Step 2: Prepare calls with approval
    const calls = await prepareBatchWithApproval(
      transactions,
      smartAccountAddress
    );

    console.log(`Executing batch with ${calls.length} calls`);

    // Step 3: Execute as single UserOperation
    const txHash: Hex = await (smartAccountClient as any).sendUserOperation({
      calls,
    });

    console.log('Batch transaction submitted:', txHash);

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('Batch execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

#### 4. Progress Tracking (Optional)

```typescript
import type { CartTransaction } from '@/src/types/cart';

interface BatchProgress {
  totalCalls: number;
  currentCall: number;
  status: 'estimating' | 'signing' | 'submitting' | 'confirming' | 'complete';
  txHash?: Hex;
}

export async function executeBatchWithProgress(
  transactions: CartTransaction[],
  userAddress: Address,
  onProgress?: (progress: BatchProgress) => void
): Promise<BatchExecutionResult> {
  try {
    const totalCalls = transactions.length;

    // Notify: Estimating
    onProgress?.({
      totalCalls,
      currentCall: 0,
      status: 'estimating',
    });

    const smartAccountClient = await createSmartAccountWithPaymaster(userAddress);
    const smartAccountAddress = smartAccountClient.account.address;

    const calls = await prepareBatchWithApproval(
      transactions,
      smartAccountAddress
    );

    // Notify: Signing
    onProgress?.({
      totalCalls,
      currentCall: 0,
      status: 'signing',
    });

    // This will trigger wallet signature prompt
    const txHash: Hex = await (smartAccountClient as any).sendUserOperation({
      calls,
    });

    // Notify: Submitting
    onProgress?.({
      totalCalls,
      currentCall: totalCalls,
      status: 'submitting',
      txHash,
    });

    // Notify: Confirming
    onProgress?.({
      totalCalls,
      currentCall: totalCalls,
      status: 'confirming',
      txHash,
    });

    // Note: Actual confirmation tracking would require
    // polling the bundler for UserOperation receipt

    return {
      success: true,
      txHash,
    };
  } catch (error) {
    console.error('Batch execution failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

#### 5. Paymaster Fallback Strategy

```typescript
export async function executeBatchWithFallback(
  transactions: CartTransaction[],
  userAddress: Address
): Promise<BatchExecutionResult> {
  try {
    // First attempt: With paymaster (gasless)
    const result = await executeBatchedUserOperation(transactions, userAddress);

    if (result.success) {
      return result;
    }

    // Check if error is paymaster-related
    if (result.error?.includes('AA31') || result.error?.includes('paymaster')) {
      console.warn('Paymaster failed, attempting fallback to user-paid gas');

      // Fallback: Execute without paymaster (user pays gas)
      // This would require a different implementation using regular wallet
      return await executeBatchWithUserGas(transactions, userAddress);
    }

    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function executeBatchWithUserGas(
  transactions: CartTransaction[],
  userAddress: Address
): Promise<BatchExecutionResult> {
  // Implementation using regular wallet (not smart account)
  // This is a fallback when paymaster is unavailable
  // See /src/services/batchExecution.ts for reference
  throw new Error('User-paid gas fallback not implemented');
}
```

### Integration Points

#### Update `batchExecution.ts`

Replace the existing `executeBatchTransactions` with smart account version:

```typescript
// Before
export async function executeBatchTransactions(
  transactions: CartTransaction[],
  userAddress: Address
): Promise<BatchExecutionResult> {
  // Old implementation using ethers.js
}

// After
export async function executeBatchTransactions(
  transactions: CartTransaction[],
  userAddress: Address
): Promise<BatchExecutionResult> {
  return executeBatchedUserOperation(transactions, userAddress);
}
```

#### Update Cart Modal

```typescript
import { executeBatchTransactions } from '@/src/services/batchExecution';

// In cart confirmation handler
const handleExecuteBatch = async () => {
  setExecuting(true);

  const result = await executeBatchTransactions(
    cartTransactions,
    userAddress
  );

  if (result.success) {
    // Show success toast with BaseScan link
    showToast({
      type: 'success',
      message: 'Batch executed successfully!',
      txHash: result.txHash,
    });

    // Clear cart
    clearCart();

    // Close modal
    onClose();
  } else {
    // Show error toast
    showToast({
      type: 'error',
      message: result.error || 'Batch execution failed',
    });
  }

  setExecuting(false);
};
```

---

## Relevant Files Summary

### Core Implementation Files

| File | Purpose | Key Exports |
|------|---------|-------------|
| `/src/lib/smartAccount.ts` | Smart account creation | `createSmartAccountWithPaymaster()`, `getSmartAccountAddress()`, `ENTRYPOINT_ADDRESS_V07` |
| `/src/lib/paymaster.ts` | Paymaster integration | `getPaymasterStubData()`, `getPaymasterData()`, `isPaymasterConfigured()` |
| `/src/services/immediateExecution.ts` | Single transaction execution | `executeImmediateFillOrder()` |
| `/src/services/batchExecution.ts` | Batch transaction execution | `executeBatchTransactions()` (needs update) |
| `/src/utils/usdcApproval.ts` | USDC approval utilities | `needsApproval()`, `encodeUSDCApprove()`, `getUSDCBalance()`, `calculateTotalUSDCNeeded()` |
| `/src/utils/contracts.ts` | Contract addresses & ABIs | `ENTRYPOINT_ADDRESS`, `OPTION_BOOK_ADDRESS`, `USDC_ADDRESS`, `OPTION_BOOK_ABI`, `ERC20_ABI` |

### Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Environment variable template |
| `.env.local` | Local environment configuration (gitignored) |

### Type Definition Files

| File | Purpose |
|------|---------|
| `/src/types/cart.ts` | Cart transaction types |
| `/src/types/orders.ts` | Order data types |

### UI Components

| File | Purpose |
|------|---------|
| `/src/components/cart/CartModal.tsx` | Cart review UI |
| `/src/components/cart/CartSwipeableCard.tsx` | Individual cart items |
| `/src/components/market/SwipeView.tsx` | Main swipe interface |

---

## Code Snippets: Complete Examples

### Example 1: Creating Smart Account and Getting Address

```typescript
import { createSmartAccountWithPaymaster, getSmartAccountAddress } from '@/src/lib/smartAccount';
import type { Address } from 'viem';

async function setupSmartAccount(userAddress: Address) {
  try {
    // Get the deterministic smart account address
    const smartAccountAddress = await getSmartAccountAddress(userAddress);
    console.log('Smart account address:', smartAccountAddress);

    // Create the smart account client
    const smartAccountClient = await createSmartAccountWithPaymaster(userAddress);
    console.log('Smart account client created');

    return { smartAccountClient, smartAccountAddress };
  } catch (error) {
    console.error('Failed to setup smart account:', error);
    throw error;
  }
}
```

### Example 2: Checking Balances and Approvals

```typescript
import { getUSDCBalance, needsApproval, encodeUSDCApprove } from '@/src/utils/usdcApproval';
import { OPTION_BOOK_ADDRESS, USDC_ADDRESS } from '@/src/utils/contracts';
import type { Address } from 'viem';

async function checkUSDCSetup(
  userAddress: Address,
  smartAccountAddress: Address,
  amountNeeded: bigint
) {
  // Check user's USDC balance (on their EOA wallet)
  const balance = await getUSDCBalance(userAddress);
  console.log(`User USDC balance: ${Number(balance) / 1e6} USDC`);

  if (balance < amountNeeded) {
    throw new Error(
      `Insufficient balance. Need ${Number(amountNeeded) / 1e6} USDC, have ${Number(balance) / 1e6} USDC`
    );
  }

  // Check if smart account needs approval for OptionBook
  const needsApprovalCheck = await needsApproval(
    smartAccountAddress,
    amountNeeded,
    OPTION_BOOK_ADDRESS as Address
  );

  if (needsApprovalCheck) {
    console.log('Approval needed - will include in batch');
    return {
      needsApproval: true,
      approvalCallData: encodeUSDCApprove(amountNeeded),
    };
  }

  console.log('Already approved');
  return {
    needsApproval: false,
  };
}
```

### Example 3: Executing Batched UserOperation with Progress

```typescript
import { createSmartAccountWithPaymaster } from '@/src/lib/smartAccount';
import type { CartTransaction } from '@/src/types/cart';
import type { Address, Hex } from 'viem';

async function executeBatchWithDetailedProgress(
  transactions: CartTransaction[],
  userAddress: Address,
  onProgress: (message: string) => void
) {
  onProgress('Creating smart account...');
  const smartAccountClient = await createSmartAccountWithPaymaster(userAddress);
  const smartAccountAddress = smartAccountClient.account.address;

  onProgress('Checking USDC approval...');
  const totalUSDC = transactions.reduce((sum, tx) => sum + (tx.requiredUSDC || 0n), 0n);
  const approvalNeeded = await needsApproval(smartAccountAddress, totalUSDC);

  const calls: { to: Address; data: Hex; value?: bigint }[] = [];

  if (approvalNeeded) {
    onProgress('Adding USDC approval to batch...');
    calls.push({
      to: USDC_ADDRESS as Address,
      data: encodeUSDCApprove(totalUSDC),
      value: 0n,
    });
  }

  onProgress('Adding transactions to batch...');
  for (const tx of transactions) {
    calls.push({
      to: tx.to,
      data: tx.data,
      value: tx.value || 0n,
    });
  }

  onProgress(`Preparing batch with ${calls.length} operations...`);

  onProgress('Requesting wallet signature...');
  const txHash: Hex = await (smartAccountClient as any).sendUserOperation({ calls });

  onProgress(`Transaction submitted: ${txHash}`);

  return txHash;
}
```

### Example 4: Error Handling with User-Friendly Messages

```typescript
import { executeBatchedUserOperation } from '@/src/services/batchExecution';
import type { CartTransaction } from '@/src/types/cart';
import type { Address } from 'viem';

async function executeBatchWithErrorHandling(
  transactions: CartTransaction[],
  userAddress: Address
): Promise<{ success: boolean; message: string; txHash?: string }> {
  try {
    const result = await executeBatchedUserOperation(transactions, userAddress);

    if (result.success) {
      return {
        success: true,
        message: 'All transactions executed successfully!',
        txHash: result.txHash,
      };
    } else {
      // Parse error for user-friendly message
      const errorMessage = result.error || 'Unknown error';

      if (errorMessage.includes('insufficient funds')) {
        return {
          success: false,
          message: 'You don\'t have enough USDC. Please add funds to your wallet.',
        };
      } else if (errorMessage.includes('AA31')) {
        return {
          success: false,
          message: 'Gas sponsorship failed. The paymaster service may be temporarily unavailable.',
        };
      } else if (errorMessage.includes('User rejected')) {
        return {
          success: false,
          message: 'You rejected the transaction in your wallet.',
        };
      } else if (errorMessage.includes('Ethereum provider not found')) {
        return {
          success: false,
          message: 'Please install MetaMask or another Web3 wallet.',
        };
      } else {
        return {
          success: false,
          message: `Transaction failed: ${errorMessage}`,
        };
      }
    }
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unexpected error occurred',
    };
  }
}
```

---

## Best Practices & Gotchas

### 1. Smart Account Address is Deterministic

The smart account address is derived from the owner address and doesn't change. You can calculate it without deploying:

```typescript
const smartAccountAddress = await getSmartAccountAddress(ownerAddress);
// This address will always be the same for this owner
```

### 2. Fund the EOA, Approve from Smart Account

- **USDC Balance**: Check on user's EOA wallet
- **USDC Approval**: Approve OptionBook to spend from smart account

```typescript
// Wrong
const balance = await getUSDCBalance(smartAccountAddress); // Smart account might be empty

// Right
const balance = await getUSDCBalance(ownerAddress); // EOA wallet has the USDC

// Wrong
const needsApproval = await needsApproval(ownerAddress, amount); // EOA doesn't interact with OptionBook

// Right
const needsApproval = await needsApproval(smartAccountAddress, amount); // Smart account needs approval
```

### 3. Type Casting for Deep Type Instantiation

Permissionless library has complex generic types that can cause TypeScript errors:

```typescript
// Use type casting to avoid errors
const smartAccountClient = createSmartAccountClient({
  account: simpleAccount as any,
  // ...
});

const txHash = await (smartAccountClient as any).sendUserOperation({ calls });
```

### 4. Paymaster Integration is Automatic

When using Coinbase's combined bundler/paymaster endpoint, you don't need to manually call `getPaymasterStubData` or `getPaymasterData`. The bundler handles it automatically.

### 5. Gas Estimation Happens Implicitly

When you call `sendUserOperation`, the library:
1. Estimates gas
2. Gets paymaster data
3. Signs UserOperation
4. Submits to bundler

You don't need to manually estimate gas unless you want to show it to the user beforehand.

### 6. UserOperation Hash vs Transaction Hash

The return value from `sendUserOperation` is the **UserOperation hash**, not the transaction hash:

```typescript
const userOpHash = await smartAccountClient.sendUserOperation({ calls });

// To get the transaction hash, you need to wait for receipt:
const receipt = await smartAccountClient.waitForUserOperationReceipt({
  hash: userOpHash,
});

const transactionHash = receipt.receipt.transactionHash;
```

### 7. Batching Limit

There's no strict limit on the number of calls in a UserOperation, but practical limits exist:

- **Gas Block Limit**: All calls must fit within the block gas limit
- **Paymaster Limits**: CDP may have per-operation spending limits
- **Simulation Costs**: Very large batches may timeout during simulation

Recommended: Keep batches under 10-20 operations for optimal reliability.

### 8. Order of Operations Matters

In a batched UserOperation, calls execute sequentially. Put approval FIRST:

```typescript
// Correct order
calls.push({ to: USDC_ADDRESS, data: approveCallData }); // Approval first
calls.push({ to: OPTION_BOOK_ADDRESS, data: fillOrderData }); // Trade second

// Wrong order (will fail)
calls.push({ to: OPTION_BOOK_ADDRESS, data: fillOrderData }); // Trade needs approval!
calls.push({ to: USDC_ADDRESS, data: approveCallData }); // Too late
```

### 9. Nonce Management is Automatic

The smart account client manages nonces automatically. You don't need to track or increment them.

### 10. Network Must Match

All clients (public, wallet, smart account) must use the same chain:

```typescript
// All must use 'base' chain
const publicClient = createPublicClient({ chain: base, ... });
const walletClient = createWalletClient({ chain: base, ... });
const smartAccountClient = createSmartAccountClient({ chain: base, ... });
```

---

## Additional Resources

### Documentation Links

- [ERC-4337 Specification](https://eips.ethereum.org/EIPS/eip-4337)
- [Coinbase Paymaster Docs](https://docs.cdp.coinbase.com/paymaster/introduction/welcome)
- [Permissionless.js Docs](https://docs.pimlico.io/permissionless)
- [Viem Docs](https://viem.sh/docs/getting-started)
- [Base Network Docs](https://docs.base.org/)

### Support Channels

- [CDP Discord](https://discord.com/channels/1220414409550336183/1233164126251909190) - #paymaster channel
- [Permissionless GitHub](https://github.com/pimlicolabs/permissionless.js)

### Useful Tools

- [BaseScan](https://basescan.org/) - Block explorer for Base
- [Tenderly](https://tenderly.co/) - Transaction debugging
- [Coinbase CDP Portal](https://portal.cdp.coinbase.com) - Paymaster dashboard

---

## Conclusion

This documentation provides a comprehensive guide to the smart account and paymaster integration architecture in the Optionbook Demo codebase. Key takeaways:

1. **Smart accounts enable gasless transactions** via ERC-4337 and paymaster sponsorship
2. **Batching is built-in** - multiple operations can execute in one UserOperation
3. **Coinbase CDP simplifies integration** with combined bundler/paymaster endpoints
4. **Implementation is straightforward** - see `immediateExecution.ts` for working example
5. **Adapting for cart batching** requires minimal changes to the execution flow

Use this documentation as a reference when implementing the gasless batched transactions feature described in the requirements.
