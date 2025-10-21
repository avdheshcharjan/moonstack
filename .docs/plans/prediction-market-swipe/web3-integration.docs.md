# Web3 Integration Patterns - Thetanuts Demo

**Research Date:** 2025-10-21
**Purpose:** Document Web3 integration patterns for prediction market swipe feature implementation

---

## Overview

The codebase implements Web3 integration for decentralized options trading on Base L2 using ethers.js v6. All wallet interactions are handled through MetaMask, with USDC as the primary collateral token for trading on the OptionBook smart contract.

---

## 1. Wallet Connection Logic (MetaMask)

### Primary File
**`/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx`** (Lines 136-194)

### Connection Pattern

```typescript
// Dependencies (Line 2)
import { BrowserProvider, Contract, parseUnits } from 'ethers';

// Window interface definition
// File: /Users/avuthegreat/thetanuts-demo/src/global.d.ts (Lines 1-3)
interface Window {
  ethereum?: any;
}

// Connection Function (Lines 136-189)
const connectWallet = async () => {
  // 1. Check for MetaMask
  if (!window.ethereum) {
    alert('MetaMask is not installed. Please install it to continue.');
    return;
  }

  try {
    setIsConnecting(true);

    // 2. Create BrowserProvider (ethers v6)
    const provider = new BrowserProvider(window.ethereum);

    // 3. Request accounts
    const accounts = await provider.send('eth_requestAccounts', []);
    const network = await provider.getNetwork();

    setWalletAddress(accounts[0]);
    setChainId(Number(network.chainId));

    // 4. Network switching to Base (Chain ID: 8453)
    if (Number(network.chainId) !== 8453) {
      try {
        // Try to switch
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }], // 8453 in hex
        });
        setChainId(8453);
      } catch (switchError: any) {
        // Chain not added - add Base network
        if (switchError.code === 4902) {
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
          setChainId(8453);
        }
      }
    }
  } catch (error) {
    console.error('Error connecting wallet:', error);
  } finally {
    setIsConnecting(false);
  }
};
```

### State Management (Lines 73-75)

```typescript
const [walletAddress, setWalletAddress] = useState(null);
const [chainId, setChainId] = useState(null);
const [isConnecting, setIsConnecting] = useState(false);
```

### Event Listeners for Account/Network Changes (Lines 337-359)

```typescript
useEffect(() => {
  if (!window.ethereum) return;

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setWalletAddress(accounts[0]);
    }
  };

  const handleChainChanged = (chainIdHex: string) => {
    setChainId(parseInt(chainIdHex, 16));
  };

  window.ethereum.on('accountsChanged', handleAccountsChanged);
  window.ethereum.on('chainChanged', handleChainChanged);

  return () => {
    window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
    window.ethereum.removeListener('chainChanged', handleChainChanged);
  };
}, []);
```

### Disconnect Pattern (Lines 191-194)

```typescript
const disconnectWallet = () => {
  setWalletAddress(null);
  setChainId(null);
};
```

---

## 2. Contract Interaction Patterns

### Contract Addresses (Lines 4-11)

```typescript
// OptionBook contract address on Base (v2 - r10)
const OPTION_BOOK_ADDRESS = '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1';

// USDC contract address on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Referrer address for tracking positions
const REFERRER_ADDRESS = '0x0000000000000000000000000000000000000001';
```

### Network Configuration
Reference: **`/Users/avuthegreat/thetanuts-demo/OptionBook.md`** (Lines 39-62)

```json
{
  "chain_id": 8453,
  "option_book": "0xd58b814C7Ce700f251722b5555e25aE0fa8169A1",
  "deployment_block": 36596854,
  "tokens": {
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "WETH": "0x4200000000000000000000000000000000000006",
    "CBBTC": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf"
  },
  "price_feeds": {
    "BTC": "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F",
    "ETH": "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"
  }
}
```

---

## 3. ABI Definitions

### OptionBook ABI (v2) (Lines 14-45)

```typescript
const OPTION_BOOK_ABI = [
  {
    "inputs": [
      {
        "components": [
          {"internalType": "address", "name": "maker", "type": "address"},
          {"internalType": "uint256", "name": "orderExpiryTimestamp", "type": "uint256"},
          {"internalType": "address", "name": "collateral", "type": "address"},
          {"internalType": "bool", "name": "isCall", "type": "bool"},
          {"internalType": "address", "name": "priceFeed", "type": "address"},
          {"internalType": "address", "name": "implementation", "type": "address"},
          {"internalType": "bool", "name": "isLong", "type": "bool"},
          {"internalType": "uint256", "name": "maxCollateralUsable", "type": "uint256"},
          {"internalType": "uint256[]", "name": "strikes", "type": "uint256[]"},
          {"internalType": "uint256", "name": "expiry", "type": "uint256"},
          {"internalType": "uint256", "name": "price", "type": "uint256"},
          {"internalType": "uint256", "name": "numContracts", "type": "uint256"},
          {"internalType": "bytes", "name": "extraOptionData", "type": "bytes"}
        ],
        "internalType": "struct OptionBook.Order",
        "name": "order",
        "type": "tuple"
      },
      {"internalType": "bytes", "name": "signature", "type": "bytes"},
      {"internalType": "address", "name": "referrer", "type": "address"}
    ],
    "name": "fillOrder",
    "outputs": [{"internalType": "address", "name": "optionAddress", "type": "address"}],
    "stateMutability": "nonpayable",
    "type": "function"
  }
];
```

### ERC20 ABI for USDC (Lines 47-50)

```typescript
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];
```

---

## 4. USDC Approval Pattern

### Implementation (Lines 232-244)

```typescript
// 1. Check allowance first
const allowance = await usdcContract.allowance(walletAddress, OPTION_BOOK_ADDRESS);

// 2. Only approve if insufficient
if (allowance < requiredAmount) {
  addToast('Approving USDC...', 'info');
  const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);

  addToast('Waiting for approval confirmation...', 'info');
  await approveTx.wait();

  addToast('USDC approved!', 'success');
}
```

### Key Pattern: Check-Then-Approve
- Always check `allowance()` before calling `approve()`
- Avoids unnecessary approval transactions
- Saves gas and improves UX

---

## 5. Option Trading Transaction Flow

### Complete buyOption Function (Lines 212-310)

```typescript
const buyOption = async (collateralAmount: number) => {
  if (!selectedOrder || !walletAddress) return;

  try {
    setIsBuying(true);

    // Step 1: Setup provider and signer
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // Step 2: Create contract instances
    const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
    const optionBookContract = new Contract(OPTION_BOOK_ADDRESS, OPTION_BOOK_ABI, signer);

    // Step 3: Calculate contracts and required USDC
    const pricePerContract = Number(selectedOrder.rawOrder.order.price) / 1e8;
    const contractsToBuy = collateralAmount / pricePerContract;
    const numContracts = Math.floor(contractsToBuy * 1e6); // Round down!
    const requiredAmount = parseUnits(collateralAmount.toString(), 6); // USDC = 6 decimals

    // Step 4: USDC Approval (see section 4)
    addToast('Checking USDC allowance...', 'info');
    const allowance = await usdcContract.allowance(walletAddress, OPTION_BOOK_ADDRESS);
    if (allowance < requiredAmount) {
      // Approval flow...
    }

    // Step 5: Prepare order parameters
    // CRITICAL: Do NOT modify order fields - signature will fail!
    const rawOrder = selectedOrder.rawOrder.order;
    const orderParams = {
      maker: rawOrder.maker,
      orderExpiryTimestamp: rawOrder.orderExpiryTimestamp,
      collateral: rawOrder.collateral,
      isCall: rawOrder.isCall,
      priceFeed: rawOrder.priceFeed,
      implementation: rawOrder.implementation,
      isLong: rawOrder.isLong, // Keep original!
      maxCollateralUsable: rawOrder.maxCollateralUsable,
      strikes: rawOrder.strikes,
      expiry: rawOrder.expiry,
      price: rawOrder.price,
      numContracts: numContracts.toString(), // Only field that changes
      extraOptionData: rawOrder.extraOptionData || "0x"
    };

    // Step 6: Execute fillOrder transaction
    addToast('Executing fillOrder...', 'info');
    const tx = await optionBookContract.fillOrder(
      orderParams,
      selectedOrder.rawOrder.signature,
      REFERRER_ADDRESS
    );

    addToast('Transaction submitted! Waiting for confirmation...', 'info');
    const receipt = await tx.wait();

    addToast('Option purchased successfully!', 'success', receipt.hash);

    // Step 7: Save position to localStorage
    const newPosition = {
      id: receipt.hash,
      timestamp: Date.now(),
      order: selectedOrder,
      collateralUsed: collateralAmount,
      txHash: receipt.hash,
      status: 'active'
    };

    const updatedPositions = [...userPositions, newPosition];
    setUserPositions(updatedPositions);
    localStorage.setItem(`positions_${walletAddress}`, JSON.stringify(updatedPositions));

    // Step 8: Refresh orders
    setTimeout(() => fetchOrders(), 2000);

  } catch (error: any) {
    // Error handling (see section 6)
  } finally {
    setIsBuying(false);
  }
};
```

### Critical Notes

1. **Decimal Handling**
   - USDC: 6 decimals → `parseUnits(amount, 6)`
   - Strikes/Prices: 8 decimals → `value / 1e8`
   - Always round DOWN: `Math.floor(contractsToBuy * 1e6)`

2. **Order Integrity**
   - Never modify order fields from API
   - Only `numContracts` can be changed
   - Signature will fail if any other field is modified

3. **Transaction Sequencing**
   - Check allowance → Approve (if needed) → fillOrder
   - Wait for each transaction: `await tx.wait()`
   - UI updates via toast notifications

---

## 6. Error Handling Patterns

### Transaction Error Types (Lines 296-310)

```typescript
catch (error: any) {
  console.error('Error buying option:', error);

  let errorMessage = 'Failed to buy option';

  // 1. User rejection
  if (error.code === 'ACTION_REJECTED') {
    errorMessage = 'Transaction rejected by user';
  }
  // 2. Other errors
  else if (error.message) {
    errorMessage = error.message.slice(0, 100); // Truncate long errors
  }

  addToast(errorMessage, 'error');
}
```

### Network Switch Error Handling (Lines 159-181)

```typescript
catch (switchError: any) {
  // Error code 4902: Chain not added to MetaMask
  if (switchError.code === 4902) {
    try {
      // Add Base network configuration
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{ /* Base config */ }]
      });
    } catch (addError) {
      console.error('Error adding Base network:', addError);
    }
  }
}
```

### Common Error Scenarios

Reference: **`/Users/avuthegreat/thetanuts-demo/OptionBook.md`** (Lines 835-885)

1. **"Signer Not Authorized"** → Stale order data, fetch fresh data
2. **"Signature Mismatch"** → Modified order parameters
3. **"Insufficient Allowance"** → Missing or insufficient USDC approval
4. **"Transfer Amount Exceeds Balance"** → Rounding error (use `Math.floor`)
5. **User rejection** → `error.code === 'ACTION_REJECTED'`

---

## 7. Toast Notification System

### Toast Management (Lines 78, 197-209)

```typescript
// State
const [toasts, setToasts] = useState<Toast[]>([]);

// Interface
interface Toast {
  id: number;
  message: string;
  txHash?: string;
  type: 'success' | 'error' | 'info';
}

// Add toast with auto-remove
const addToast = (message: string, type: 'success' | 'error' | 'info', txHash?: string) => {
  const id = Date.now();
  setToasts(prev => [...prev, { id, message, type, txHash }]);

  // Auto-remove after 10 seconds
  setTimeout(() => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, 10000);
};

const removeToast = (id: number) => {
  setToasts(prev => prev.filter(t => t.id !== id));
};
```

### Toast Usage Pattern

```typescript
// Info notifications during flow
addToast('Checking USDC allowance...', 'info');
addToast('Approving USDC...', 'info');
addToast('Executing fillOrder...', 'info');

// Success with transaction hash
addToast('Option purchased successfully!', 'success', receipt.hash);

// Error handling
addToast('Transaction rejected by user', 'error');
```

---

## 8. ethers.js v6 Usage Patterns

### Version Information
**Package:** `ethers@6.15.0` (from `/Users/avuthegreat/thetanuts-demo/package.json`)

### Key Imports

```typescript
import { BrowserProvider, Contract, parseUnits } from 'ethers';
```

### Common Patterns

1. **Provider Creation**
```typescript
const provider = new BrowserProvider(window.ethereum);
```

2. **Signer Access**
```typescript
const signer = await provider.getSigner();
```

3. **Contract Instantiation**
```typescript
const contract = new Contract(address, abi, signer);
```

4. **Unit Parsing (USDC)**
```typescript
const amount = parseUnits(value.toString(), 6); // 6 decimals for USDC
```

5. **Transaction Execution**
```typescript
const tx = await contract.method(...args);
const receipt = await tx.wait();
```

6. **Network Information**
```typescript
const network = await provider.getNetwork();
const chainId = Number(network.chainId);
```

7. **Direct RPC Calls**
```typescript
const accounts = await provider.send('eth_requestAccounts', []);
```

### Migration Notes from v5

- `Web3Provider` → `BrowserProvider`
- `ethers.utils.parseUnits()` → `parseUnits()` (direct import)
- `provider.getNetwork()` returns object with `chainId` property (not direct number)

---

## 9. Data Fetching & API Integration

### API Route (Next.js)
**File:** `/Users/avuthegreat/thetanuts-demo/src/app/api/orders/route.ts`

```typescript
import { NextResponse } from 'next/server';

const API_URL = process.env.API_URL || 'https://round-snowflake-9c31.devops-118.workers.dev/';

export async function GET() {
  try {
    const response = await fetch(API_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store' // Always fetch fresh data
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch data', message: errorMessage },
      { status: 500 }
    );
  }
}
```

### Client-Side Fetching (Lines 91-133)

```typescript
const fetchOrders = async () => {
  setLoading(true);
  setFetchStatus('Fetching live data...');

  try {
    const response = await fetch('/api/orders', {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data && data.data) {
      setOrders(data.data.orders || []);
      setMarketData(data.data.market_data || {});
      setFetchStatus(`✅ Live data loaded! (${data.data.orders?.length || 0} orders)`);
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    setFetchStatus(`❌ Failed to load data: ${errorMessage}`);
    setOrders([]);
    setMarketData(null);
  } finally {
    setLoading(false);
  }
};
```

### Recommended Polling Strategy

Reference: **`/Users/avuthegreat/thetanuts-demo/OptionBook.md`** (Lines 112-156)

- **Refresh interval:** 30 seconds
- **Why:** Order prices/availability change, market prices update
- **Implementation:** `setInterval(fetchOrders, 30000)`
- **Critical:** Always fetch fresh data before executing trade

---

## 10. Position Tracking & LocalStorage

### LocalStorage Pattern (Lines 279-334)

```typescript
// Save position after successful trade
const newPosition = {
  id: receipt.hash,
  timestamp: Date.now(),
  order: selectedOrder,
  collateralUsed: collateralAmount,
  txHash: receipt.hash,
  status: 'active'
};

const updatedPositions = [...userPositions, newPosition];
setUserPositions(updatedPositions);
localStorage.setItem(`positions_${walletAddress}`, JSON.stringify(updatedPositions));

// Load positions on wallet connect
useEffect(() => {
  if (walletAddress) {
    const stored = localStorage.getItem(`positions_${walletAddress}`);
    if (stored) {
      const positions = JSON.parse(stored);
      // Reconstruct Date objects
      const reconstructed = positions.map((pos: any) => ({
        ...pos,
        order: {
          ...pos.order,
          expiry: new Date(pos.order.expiry)
        }
      }));
      setUserPositions(reconstructed);
    }
  }
}, [walletAddress]);
```

### Key Pattern: Per-Wallet Storage
- Storage key: `positions_${walletAddress}`
- Allows multiple wallets on same browser
- Reconstruct Date objects after JSON.parse
- Positions persist across page refreshes

---

## 11. UI Integration Patterns

### Conditional Rendering Based on Wallet State (Lines 485-513, 951-978)

```typescript
// Connect button
{!walletAddress ? (
  <button onClick={connectWallet} disabled={isConnecting}>
    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
  </button>
) : (
  <div>
    <div>{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</div>
    {chainId === 8453 ? (
      <div>✓ Base Network</div>
    ) : (
      <div>⚠ Wrong Network</div>
    )}
    <button onClick={disconnectWallet}>Disconnect</button>
  </div>
)}

// Trading button states
{!walletAddress ? (
  <button onClick={connectWallet}>Connect Wallet to Trade</button>
) : chainId !== 8453 ? (
  <button onClick={connectWallet}>Switch to Base Network</button>
) : (
  <button onClick={() => buyOption(selectedBetSize)} disabled={isBuying}>
    {isBuying ? 'Processing...' : `Buy Option ($${selectedBetSize} USDC)`}
  </button>
)}
```

### Transaction State Management

```typescript
const [isBuying, setIsBuying] = useState(false);

// During transaction
setIsBuying(true);
try {
  // ... transaction logic
} finally {
  setIsBuying(false); // Always reset state
}
```

---

## 12. Type Safety & TypeScript Patterns

### Type Definitions

```typescript
// Toast interface
interface Toast {
  id: number;
  message: string;
  txHash?: string;
  type: 'success' | 'error' | 'info';
}

// Window interface for MetaMask
interface Window {
  ethereum?: any;
}
```

### Error Type Handling

```typescript
// Typed catch blocks
catch (error: unknown) {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
}

// Any type for Web3 errors (needed for .code property)
catch (error: any) {
  if (error.code === 'ACTION_REJECTED') {
    // Handle rejection
  }
}
```

---

## 13. Key Files Summary

| File Path | Purpose | Key Patterns |
|-----------|---------|--------------|
| `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx` | Main trading component | Wallet connection, contract interactions, transaction flow, error handling |
| `/Users/avuthegreat/thetanuts-demo/src/global.d.ts` | Type definitions | Window.ethereum interface for MetaMask |
| `/Users/avuthegreat/thetanuts-demo/src/app/api/orders/route.ts` | Next.js API route | Server-side data fetching, error handling |
| `/Users/avuthegreat/thetanuts-demo/OptionBook.md` | Integration guide | Contract addresses, ABIs, trading patterns, error scenarios |
| `/Users/avuthegreat/thetanuts-demo/package.json` | Dependencies | ethers.js v6.15.0, Next.js 14.2.0 |

---

## 14. Best Practices Identified

### Transaction Flow
1. Always check wallet connection before transactions
2. Verify correct network (Base, chainId 8453)
3. Check USDC allowance before approval
4. Round down when calculating contracts
5. Never modify order parameters (except numContracts)
6. Wait for transaction confirmation: `await tx.wait()`
7. Provide user feedback via toast notifications

### Error Handling
1. Type error parameters appropriately (`unknown` vs `any`)
2. Handle user rejection separately (`ACTION_REJECTED`)
3. Truncate long error messages for UI display
4. Log full errors to console for debugging
5. Always reset UI state in `finally` blocks

### UX Patterns
1. Disable buttons during processing
2. Show loading states with descriptive text
3. Auto-remove success notifications (10s timeout)
4. Display transaction hashes with BaseScan links
5. Persist positions to localStorage per wallet

### Security Considerations
1. Never expose private keys
2. Validate all user inputs
3. Check allowances before approvals
4. Verify network before transactions
5. Use exact order data from API (signature validation)

---

## 15. Implementation Checklist for New Features

When implementing new Web3 features:

- [ ] Check wallet connection state
- [ ] Verify correct network (Base, 8453)
- [ ] Handle MetaMask not installed
- [ ] Implement proper error handling
- [ ] Add loading states
- [ ] Provide user feedback (toasts)
- [ ] Test transaction rejection
- [ ] Test network switching
- [ ] Handle decimal conversions correctly
- [ ] Add transaction confirmation waiting
- [ ] Test with real testnet/mainnet
- [ ] Document new contract addresses/ABIs
- [ ] Update type definitions if needed

---

## 16. Common Pitfalls to Avoid

1. **Decimal Confusion**
   - USDC is 6 decimals, not 18
   - Strikes/prices are 8 decimals
   - Always use correct `parseUnits(value, decimals)`

2. **Rounding Errors**
   - Always round DOWN: `Math.floor()`
   - Never round up or you may exceed approved amount

3. **Order Modification**
   - Never change order fields from API
   - Signature will fail if any field (except numContracts) is modified

4. **Stale Data**
   - Always fetch fresh order data before trading
   - Don't cache order data longer than 30-60 seconds

5. **State Management**
   - Always reset loading states in `finally` blocks
   - Clean up event listeners on unmount

6. **Type Safety**
   - Use `unknown` for general catches
   - Use `any` only when accessing Web3-specific properties

---

## References

- **ethers.js v6 Documentation:** https://docs.ethers.org/v6/
- **Base Network:** https://base.org
- **Thetanuts Protocol:** https://thetanuts.finance
- **BaseScan Explorer:** https://basescan.org
- **MetaMask Documentation:** https://docs.metamask.io

---

**End of Documentation**
