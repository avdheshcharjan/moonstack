# Wallet Connection & State Management Documentation

## Overview

This document details the wallet connection system and state management patterns in the Optionbook demo application. The app supports both traditional wallet connections (MetaMask, etc.) and Base Account SDK for smart wallet functionality.

---

## Table of Contents

1. [Core Files](#core-files)
2. [Wallet Hook (useWallet)](#wallet-hook-usewallet)
3. [Provider Setup](#provider-setup)
4. [Wallet Connection Flow](#wallet-connection-flow)
5. [Wallet State Access Patterns](#wallet-state-access-patterns)
6. [localStorage Patterns](#localstorage-patterns)
7. [Network Configuration](#network-configuration)
8. [Wallet Change Detection](#wallet-change-detection)
9. [Usage Examples](#usage-examples)

---

## Core Files

### Main Wallet System Files

```
/src/hooks/useWallet.ts              # Main wallet hook - connection, state, events
/src/providers/BaseAccountProvider.tsx # Provider wrapper for Base Account SDK & Wagmi
/src/hooks/useLocalStorage.ts         # Generic localStorage hook with JSON support
/src/utils/contracts.ts               # Contract addresses and Base chain config
/src/global.d.ts                      # Window.ethereum type definitions
/src/lib/smartAccount.ts              # Smart account creation utilities
```

### Components Using Wallet State

```
/src/components/Moonstack.tsx         # Main app component (wallet connection UI)
/src/components/market/SwipeView.tsx  # Trading interface (uses walletAddress)
/src/components/bets/MyBets.tsx       # User positions (filters by wallet)
/src/components/settings/BetSettings.tsx # User settings (wallet-specific)
```

### Services Using Wallet State

```
/src/services/directExecution.ts      # Direct transaction execution
/src/services/batchExecution.ts       # Batch transaction execution
/src/utils/cartStorage.ts             # Cart state (global, not wallet-specific)
```

---

## Wallet Hook (useWallet)

### File: `/src/hooks/useWallet.ts`

The `useWallet` hook is the **primary interface** for all wallet operations in the application.

### Interface

```typescript
interface UseWalletReturn {
  walletAddress: string | null;      // Current connected wallet address
  chainId: number | null;             // Current chain ID
  isConnecting: boolean;              // Loading state during connection
  connectWallet: () => Promise<void>; // Initiate wallet connection
  disconnectWallet: () => void;       // Disconnect and clear state
}
```

### Storage Keys

```typescript
const WALLET_STORAGE_KEY = 'moonstack_wallet_address';  // Stores wallet address
const CHAIN_STORAGE_KEY = 'moonstack_chain_id';         // Stores chain ID
```

### Connection Strategy

The hook implements a **fallback strategy** for wallet connection:

1. **Try Base Account SDK first** (smart wallet)
2. **Fallback to injected wallet** (MetaMask, etc.) if Base Account unavailable

### Code Snippets

#### Getting Current Wallet Address

```typescript
import { useWallet } from '@/src/hooks/useWallet';

function MyComponent() {
  const { walletAddress, chainId, isConnecting } = useWallet();

  if (!walletAddress) {
    return <div>Please connect wallet</div>;
  }

  return <div>Connected: {walletAddress}</div>;
}
```

#### Connecting Wallet

```typescript
import { useWallet } from '@/src/hooks/useWallet';

function ConnectButton() {
  const { connectWallet, isConnecting } = useWallet();

  return (
    <button
      onClick={connectWallet}
      disabled={isConnecting}
    >
      {isConnecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}
```

#### Disconnecting Wallet

```typescript
import { useWallet } from '@/src/hooks/useWallet';

function DisconnectButton() {
  const { disconnectWallet, walletAddress } = useWallet();

  if (!walletAddress) return null;

  return (
    <button onClick={disconnectWallet}>
      Disconnect
    </button>
  );
}
```

### Connection Flow Details

#### Base Account SDK Connection

```typescript
// From useWallet.ts lines 28-38
try {
  const provider = baseAccountSDK.getProvider();
  const accounts = await provider.request({ method: 'wallet_connect' }) as string[];

  if (accounts && accounts.length > 0) {
    setWalletAddress(accounts[0]);
    setChainId(BASE_CHAIN_ID);
    localStorage.setItem(WALLET_STORAGE_KEY, accounts[0]);
    localStorage.setItem(CHAIN_STORAGE_KEY, BASE_CHAIN_ID.toString());
    return;
  }
} catch (baseAccountError) {
  // Falls back to injected wallet
}
```

#### Injected Wallet Connection

```typescript
// From useWallet.ts lines 44-56
if (!window.ethereum) {
  alert('Please install a Web3 wallet to continue.');
  return;
}

const provider = new BrowserProvider(window.ethereum);
const accounts = await provider.send('eth_requestAccounts', []);
const network = await provider.getNetwork();

setWalletAddress(accounts[0]);
setChainId(Number(network.chainId));
localStorage.setItem(WALLET_STORAGE_KEY, accounts[0]);
localStorage.setItem(CHAIN_STORAGE_KEY, Number(network.chainId).toString());
```

#### Auto-Switch to Base Network

```typescript
// From useWallet.ts lines 58-90
if (Number(network.chainId) !== BASE_CHAIN_ID) {
  try {
    // Try to switch to Base network
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: '0x2105' }], // Base mainnet
    });
    setChainId(BASE_CHAIN_ID);
  } catch (switchError: unknown) {
    const error = switchError as { code?: number };
    // If network doesn't exist (error 4902), add it
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x2105',
          chainName: 'Base',
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org']
        }]
      });
    }
  }
}
```

### Auto-Restore Connection

The hook automatically restores wallet connection on mount:

```typescript
// From useWallet.ts lines 106-153
useEffect(() => {
  const restoreConnection = async (): Promise<void> => {
    if (typeof window === 'undefined') return;

    const savedAddress = localStorage.getItem(WALLET_STORAGE_KEY);
    const savedChainId = localStorage.getItem(CHAIN_STORAGE_KEY);

    if (!savedAddress) return;

    try {
      // Try Base Account SDK first
      try {
        const provider = baseAccountSDK.getProvider();
        const accounts = await provider.request({ method: 'eth_accounts' }) as string[];

        if (accounts && accounts.length > 0 &&
            accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
          setWalletAddress(accounts[0]);
          setChainId(savedChainId ? parseInt(savedChainId) : BASE_CHAIN_ID);
          return;
        }
      } catch (baseError) {
        console.log('Base Account not available for auto-connect');
      }

      // Fallback to injected wallet
      if (window.ethereum) {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);

        if (accounts && accounts.length > 0 &&
            accounts[0].toLowerCase() === savedAddress.toLowerCase()) {
          const network = await provider.getNetwork();
          setWalletAddress(accounts[0]);
          setChainId(Number(network.chainId));
        } else {
          // Clear storage if wallet is no longer connected
          localStorage.removeItem(WALLET_STORAGE_KEY);
          localStorage.removeItem(CHAIN_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Error restoring wallet connection:', error);
      localStorage.removeItem(WALLET_STORAGE_KEY);
      localStorage.removeItem(CHAIN_STORAGE_KEY);
    }
  };

  restoreConnection();
}, []);
```

---

## Provider Setup

### File: `/src/providers/BaseAccountProvider.tsx`

The provider wraps the app with Base Account SDK, Wagmi, and React Query.

### Architecture

```
BaseAccountProvider
  ├── WagmiProvider (Wagmi configuration)
  │   └── QueryClientProvider (React Query)
  │       └── {children}
```

### Base Account SDK Initialization

```typescript
// From BaseAccountProvider.tsx lines 17-30
export const getBaseAccountSDK = () => {
  if (typeof window === 'undefined') {
    throw new Error('Base Account SDK can only be accessed on client side');
  }

  if (!baseAccountSDKInstance) {
    baseAccountSDKInstance = createBaseAccountSDK({
      appName: 'Moonstack',
      appLogoUrl: `${process.env.NEXT_PUBLIC_URL}/logo.png` || 'https://moonstack.fun/logo.png',
    });
  }

  return baseAccountSDKInstance;
};
```

### Backwards Compatibility Proxy

```typescript
// From BaseAccountProvider.tsx lines 33-37
export const baseAccountSDK = new Proxy({} as ReturnType<typeof createBaseAccountSDK>, {
  get(_target, prop) {
    return getBaseAccountSDK()[prop as keyof ReturnType<typeof createBaseAccountSDK>];
  }
});
```

This allows importing `baseAccountSDK` directly while ensuring it's only accessed client-side.

### Wagmi Configuration

```typescript
// From BaseAccountProvider.tsx lines 40-45
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
});
```

### Provider Component

```typescript
// From BaseAccountProvider.tsx lines 50-68
export function BaseAccountProvider({ children }: BaseAccountProviderProps): JSX.Element {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent hydration mismatch - return children during SSR
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
}
```

### Usage in App

```typescript
// From /src/app/layout.tsx lines 25-35
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <BaseAccountProvider>
          {children}
        </BaseAccountProvider>
      </body>
    </html>
  );
}
```

---

## Wallet Connection Flow

### Visual Flow Diagram

```
User Clicks "Connect Wallet"
         ↓
    useWallet.connectWallet()
         ↓
    Try Base Account SDK
         ├─ Success → Set wallet & chain → Store in localStorage → Done
         └─ Fail ↓
    Try window.ethereum (MetaMask, etc.)
         ├─ Not Found → Alert user → Done
         └─ Found ↓
    Request Accounts
         ↓
    Get Network
         ↓
    Check if Base Network
         ├─ Yes → Done
         └─ No ↓
    Switch to Base (0x2105)
         ├─ Success → Done
         └─ Network Not Found (4902) ↓
    Add Base Network → Done
```

### Connection State Flow

```typescript
// State transitions:
isConnecting: false → true (on connect start)
walletAddress: null → "0x..." (on success)
chainId: null → 8453 (on success)
isConnecting: true → false (on complete/error)
```

---

## Wallet State Access Patterns

### Pattern 1: Component-Level Access

```typescript
// Components receive walletAddress as prop
function MyBets({ walletAddress }: { walletAddress: string | null }) {
  if (!walletAddress) {
    return <div>Please connect wallet</div>;
  }

  // Use walletAddress to fetch user-specific data
  const positions = await fetch(`/api/positions?wallet=${walletAddress}`);
}
```

### Pattern 2: Hook-Level Access

```typescript
// Components use useWallet directly
function SwipeView() {
  const { walletAddress } = useWallet();

  const handleBet = async () => {
    if (!walletAddress) {
      throw new Error('Wallet not connected');
    }

    await executeTransaction(walletAddress);
  };
}
```

### Pattern 3: Service-Level Access

```typescript
// Services receive walletAddress as parameter
export async function executeDirectFillOrder(
  pair: BinaryPair,
  action: 'yes' | 'no',
  betSize: number,
  userAddress: Address  // ← Passed explicitly
): Promise<DirectExecutionResult> {
  // Validate wallet connection
  if (!window.ethereum) {
    throw new Error('No wallet provider found');
  }

  // Use userAddress for transactions
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  // ...
}
```

### Pattern 4: Direct window.ethereum Access

```typescript
// For low-level operations
if (window.ethereum) {
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Execute transaction
  const tx = await signer.sendTransaction({...});
}
```

---

## localStorage Patterns

### Generic localStorage Hook

File: `/src/hooks/useLocalStorage.ts`

```typescript
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T) => void]
```

Features:
- JSON serialization/deserialization
- Automatic Date object reconstruction
- Error handling for corrupted data
- QuotaExceededError detection
- SSR-safe (checks `typeof window`)

### Wallet-Specific Storage Keys

#### Pattern: Scoped by Wallet Address

```typescript
// From SwipeView.tsx line 24
const storageKey = walletAddress ? `betSize_${walletAddress}` : 'betSize_null';
const [betSize, setBetSize] = useLocalStorage<number>(storageKey, 5);
```

This pattern ensures each wallet has its own settings.

### Global Storage Keys

#### Wallet Connection State

```typescript
// From useWallet.ts lines 15-16
const WALLET_STORAGE_KEY = 'moonstack_wallet_address';
const CHAIN_STORAGE_KEY = 'moonstack_chain_id';

// Usage
localStorage.setItem(WALLET_STORAGE_KEY, accounts[0]);
localStorage.setItem(CHAIN_STORAGE_KEY, BASE_CHAIN_ID.toString());
```

#### Cart Storage (Wallet-Agnostic)

```typescript
// From cartStorage.ts line 3
const CART_STORAGE_KEY = 'optionbook_cart';

// Cart is NOT scoped by wallet - transactions persist across wallet changes
```

### Cart Storage Implementation

File: `/src/utils/cartStorage.ts`

```typescript
export const cartStorage = {
  getTransactions(): CartTransaction[] {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];

    // Revive bigint values
    const state: CartState = JSON.parse(stored, (key, value) => {
      if (key === 'value' || key === 'requiredUSDC') {
        return value ? BigInt(value) : undefined;
      }
      return value;
    });

    return state.transactions;
  },

  addTransaction(transaction: CartTransaction): void {
    const transactions = this.getTransactions();
    transactions.push(transaction);

    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify({
      transactions,
      lastUpdated: Date.now(),
    }, (key, value) => {
      // Serialize bigint values
      if (typeof value === 'bigint') {
        return value.toString();
      }
      return value;
    }));

    // Dispatch event for reactivity
    window.dispatchEvent(new Event('cartUpdated'));
  },

  clearCart(): void {
    localStorage.removeItem(CART_STORAGE_KEY);
    window.dispatchEvent(new Event('cartUpdated'));
  }
};
```

### Storage Event Pattern

Cart storage dispatches custom events for cross-component updates:

```typescript
// Dispatch event
window.dispatchEvent(new Event('cartUpdated'));

// Listen in components
useEffect(() => {
  const handleCartUpdate = () => {
    // Refresh cart state
  };

  window.addEventListener('cartUpdated', handleCartUpdate);
  return () => window.removeEventListener('cartUpdated', handleCartUpdate);
}, []);
```

---

## Network Configuration

### Base Chain Configuration

File: `/src/utils/contracts.ts`

```typescript
// Base network chain ID
export const BASE_CHAIN_ID = 8453;

// Base chain configuration (for wallet_addEthereumChain)
const baseNetworkConfig = {
  chainId: '0x2105',              // Hex for 8453
  chainName: 'Base',
  nativeCurrency: {
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18
  },
  rpcUrls: ['https://mainnet.base.org'],
  blockExplorerUrls: ['https://basescan.org']
};
```

### Contract Addresses

```typescript
// From contracts.ts
export const OPTION_BOOK_ADDRESS = '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1';
export const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
export const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
export const REFERRER_ADDRESS = '0x0000000000000000000000000000000000000001';
```

### EntryPoint Configuration (ERC-4337)

```typescript
// From contracts.ts
export const ENTRYPOINT_ADDRESS = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

// Environment variables
export const BUNDLER_URL = process.env.NEXT_PUBLIC_BUNDLER_URL || '';
export const PAYMASTER_URL = process.env.NEXT_PUBLIC_PAYMASTER_URL || '';
```

---

## Wallet Change Detection

### Ethereum Provider Events

The `useWallet` hook listens for wallet changes via `window.ethereum` events.

```typescript
// From useWallet.ts lines 155-180
useEffect(() => {
  if (!window.ethereum) return;

  // Handle account changes (user switches accounts)
  const handleAccountsChanged = (accounts: string[]): void => {
    if (accounts.length === 0) {
      // User disconnected wallet
      disconnectWallet();
    } else {
      // User switched to different account
      setWalletAddress(accounts[0]);
      localStorage.setItem(WALLET_STORAGE_KEY, accounts[0]);
    }
  };

  // Handle chain changes (user switches networks)
  const handleChainChanged = (chainIdHex: string): void => {
    const newChainId = parseInt(chainIdHex, 16);
    setChainId(newChainId);
    localStorage.setItem(CHAIN_STORAGE_KEY, newChainId.toString());
  };

  // Register event listeners
  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', handleChainChanged);

  // Cleanup on unmount
  return () => {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);
  };
}, []);
```

### Event Handling Behavior

#### Account Changed Event

```
accountsChanged([])              → Disconnect wallet
accountsChanged(['0xabc...'])    → Switch to new account
```

#### Chain Changed Event

```
chainChanged('0x2105')           → Update chainId to 8453 (Base)
chainChanged('0x1')              → Update chainId to 1 (Ethereum)
```

**Note**: When chain changes, the app does NOT automatically switch back to Base. The user must manually switch networks.

### Type Definitions

File: `/src/global.d.ts`

```typescript
interface Window {
  ethereum?: any;
}
```

**Important**: `window.ethereum` is typed as `any` to support various wallet providers (MetaMask, Coinbase Wallet, etc.) which may have slightly different interfaces.

---

## Usage Examples

### Example 1: Wallet-Gated Feature

```typescript
import { useWallet } from '@/src/hooks/useWallet';

function TradingInterface() {
  const { walletAddress, connectWallet } = useWallet();

  if (!walletAddress) {
    return (
      <div>
        <h1>Connect to Trade</h1>
        <button onClick={connectWallet}>Connect Wallet</button>
      </div>
    );
  }

  return (
    <div>
      <h1>Welcome {walletAddress}</h1>
      <TradingPanel walletAddress={walletAddress} />
    </div>
  );
}
```

### Example 2: Wallet-Specific Settings

```typescript
import { useWallet } from '@/src/hooks/useWallet';
import { useLocalStorage } from '@/src/hooks/useLocalStorage';

function BetSettings() {
  const { walletAddress } = useWallet();

  // Each wallet has its own bet size setting
  const storageKey = walletAddress
    ? `betSize_${walletAddress}`
    : 'betSize_null';
  const [betSize, setBetSize] = useLocalStorage<number>(storageKey, 5);

  return (
    <div>
      <label>Bet Size: ${betSize}</label>
      <input
        type="range"
        min="1"
        max="100"
        value={betSize}
        onChange={(e) => setBetSize(Number(e.target.value))}
      />
    </div>
  );
}
```

### Example 3: Fetching Wallet-Specific Data

```typescript
import { useWallet } from '@/src/hooks/useWallet';
import { useEffect, useState } from 'react';

function MyPositions() {
  const { walletAddress } = useWallet();
  const [positions, setPositions] = useState([]);

  useEffect(() => {
    if (!walletAddress) {
      setPositions([]);
      return;
    }

    async function fetchPositions() {
      const response = await fetch(`/api/positions?wallet=${walletAddress}`);
      const data = await response.json();
      setPositions(data.positions);
    }

    fetchPositions();
  }, [walletAddress]); // Re-fetch when wallet changes

  if (!walletAddress) {
    return <div>Connect wallet to view positions</div>;
  }

  return (
    <div>
      <h1>My Positions</h1>
      {positions.map(pos => (
        <div key={pos.id}>{pos.description}</div>
      ))}
    </div>
  );
}
```

### Example 4: Direct Transaction Execution

```typescript
import { useWallet } from '@/src/hooks/useWallet';
import { BrowserProvider } from 'ethers';

function SendTransaction() {
  const { walletAddress } = useWallet();

  async function handleSend() {
    if (!walletAddress || !window.ethereum) {
      throw new Error('Wallet not connected');
    }

    // Create provider and signer
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Send transaction
    const tx = await signer.sendTransaction({
      to: '0x...',
      value: 1000000n,
      data: '0x...',
    });

    // Wait for confirmation
    const receipt = await tx.wait();
    console.log('Transaction confirmed:', receipt.hash);
  }

  return <button onClick={handleSend}>Send Transaction</button>;
}
```

### Example 5: Batch Transaction Execution

```typescript
import { executeBatchTransactions } from '@/src/services/batchExecution';
import type { CartTransaction } from '@/src/types/cart';
import type { Address } from 'viem';

async function executeBatchedBets(
  walletAddress: Address,
  transactions: CartTransaction[]
) {
  // Execute all transactions in batch
  const result = await executeBatchTransactions(transactions, walletAddress);

  if (result.success) {
    console.log('Batch executed successfully:', result.txHash);
  } else {
    console.error('Batch execution failed:', result.error);
  }
}
```

### Example 6: Smart Account Integration

```typescript
import { createSmartAccountWithPaymaster } from '@/src/lib/smartAccount';
import type { Address } from 'viem';

async function createUserSmartAccount(ownerAddress: Address) {
  // Create smart account client with paymaster support
  const smartAccountClient = await createSmartAccountWithPaymaster(ownerAddress);

  // Get smart account address
  const smartAccountAddress = smartAccountClient.account.address;

  console.log('Smart account created:', smartAccountAddress);

  return smartAccountClient;
}
```

---

## Key Patterns Summary

### 1. Wallet State Management
- **Centralized in `useWallet` hook**
- State persisted to localStorage
- Auto-restoration on page load
- Event-driven updates via ethereum provider events

### 2. Wallet-Specific Data
- **Pattern**: `${key}_${walletAddress}`
- Example: `betSize_0xabc123...`
- Each wallet has isolated settings

### 3. Global Data (Not Wallet-Specific)
- Cart transactions (shared across wallets)
- Uses single storage key
- Custom events for reactivity

### 4. Dual Provider Support
- Base Account SDK (smart wallet) - **preferred**
- Injected wallet (MetaMask, etc.) - **fallback**
- Seamless switching between providers

### 5. Network Handling
- Auto-switch to Base network on connect
- Auto-add Base network if not in wallet
- Persist chain ID to localStorage

### 6. Transaction Execution
- Direct execution via `window.ethereum`
- Batch execution via `wallet_sendCalls` (EIP-5792)
- Fallback to sequential execution if batch not supported

---

## Integration Checklist for Gasless Batched Transactions

When implementing gasless batched transactions, consider:

- [ ] **Wallet Address**: Use `walletAddress` from `useWallet()` as the owner address for smart account creation
- [ ] **Provider Access**: Access Base Account SDK via `baseAccountSDK.getProvider()`
- [ ] **Network**: Ensure transactions are on Base network (chain ID 8453)
- [ ] **State Persistence**: Determine if transaction state should be wallet-specific or global
- [ ] **Event Handling**: Listen for `accountsChanged` to handle wallet switches mid-session
- [ ] **Error Handling**: Handle cases where wallet is disconnected during transaction
- [ ] **localStorage**: Consider using `useLocalStorage` for persisting transaction state
- [ ] **Cart Integration**: Leverage existing `cartStorage` for transaction queuing
- [ ] **Batch Execution**: Use `executeBatchTransactions` service as reference for batch patterns

---

## Related Documentation

- See `requirements.md` for gasless batched transaction requirements
- See `/src/lib/smartAccount.ts` for smart account creation utilities
- See `/src/services/batchExecution.ts` for batch transaction patterns
- See Base Account SDK docs: https://docs.base.org/building-with-base/guides/account-abstraction
