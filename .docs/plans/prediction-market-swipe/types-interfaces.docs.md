# TypeScript Types and Interfaces Documentation

## Overview
This document catalogs all TypeScript types and interfaces used in the Thetanuts Options Trading codebase. The application uses a mix of explicit interfaces and implicit types, with a focus on binary options, orders, and trading mechanics.

---

## Explicit Type Definitions

### 1. Window Extension (`src/global.d.ts`)

**Location:** `/Users/avuthegreat/thetanuts-demo/src/global.d.ts`

```typescript
interface Window {
  ethereum?: any;
}
```

**Purpose:** Extends the browser Window interface to include MetaMask's ethereum provider.

**Notes:**
- Uses `any` type for ethereum (violates codebase rule - should be typed)
- Required for Web3/MetaMask integration

---

### 2. Toast Interface (`src/components/ThetanutsTradingDemo.tsx`)

**Location:** `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:52-57`

```typescript
interface Toast {
  id: number;
  message: string;
  txHash?: string;
  type: 'success' | 'error' | 'info';
}
```

**Purpose:** Defines the structure for toast notifications.

**Properties:**
- `id`: Unique identifier (timestamp)
- `message`: Notification message
- `txHash`: Optional transaction hash for blockchain operations
- `type`: Toast style/severity (union type)

**Usage:** Toast notification system for user feedback

---

### 3. FAQItem Interface (`src/app/faq/page.tsx`)

**Location:** `/Users/avuthegreat/thetanuts-demo/src/app/faq/page.tsx:6-10`

```typescript
interface FAQItem {
  question: string;
  answer: string | JSX.Element;
  category: string;
}
```

**Purpose:** Defines the structure for FAQ entries.

**Properties:**
- `question`: FAQ question text
- `answer`: Answer (string or React element for complex formatting)
- `category`: FAQ category for organization

**Usage:** FAQ page content structure

---

### 4. Metadata Type (Next.js)

**Location:** `/Users/avuthegreat/thetanuts-demo/src/app/layout.tsx:2,5-8`

```typescript
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Thetanuts Options Trading',
  description: 'Decentralized Options on Base - Live Order Book',
};
```

**Purpose:** Next.js metadata for SEO and page information.

**Source:** Imported from `next` framework

---

## Implicit Types (Inferred from Usage)

### 5. Order Data Structure

**Inferred from:** `parseOrder` function and API responses

```typescript
interface RawOrderData {
  order: {
    // Core order properties
    maker: string;                    // Ethereum address
    orderExpiryTimestamp: number;     // Unix timestamp
    collateral: string;               // Token address (USDC/WETH)
    isCall: boolean;                  // true = call, false = put
    priceFeed: string;                // Chainlink price feed address
    implementation: string;            // Smart contract implementation address
    isLong: boolean;                  // Position direction
    maxCollateralUsable: number;      // Max collateral (raw, with decimals)
    strikes: number[];                // Strike prices (raw, 1e8 decimals)
    expiry: number;                   // Unix timestamp
    price: number;                    // Premium per contract (raw, 1e8 decimals)
    numContracts: number;             // Number of contracts
    extraOptionData: string;          // Additional data (bytes)

    // Binary-specific properties
    type?: string;                    // 'binaries' for binary options
    name?: string;                    // Binary option name
  };
  signature: string;                  // EIP-712 signature
}
```

**Source Files:**
- `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:249-264`
- `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:405-446`

**Notes:**
- Matches OptionBook smart contract ABI structure
- Uses raw numeric values that require decimal conversion
- USDC uses 6 decimals, WETH uses 18 decimals
- Strikes and prices use 8 decimals (1e8)

---

### 6. Parsed Order Structure

**Inferred from:** `parseOrder` return value

```typescript
interface ParsedOrder {
  strategyType: 'BINARY' | 'SPREAD' | 'BUTTERFLY' | 'CONDOR';
  underlying: 'BTC' | 'ETH';
  isCall: boolean;
  strikes: number[];                  // Normalized (divided by 1e8)
  strikeWidth: number;                // Difference between strikes
  expiry: Date;                       // JavaScript Date object
  pricePerContract: number;           // Normalized USDC price
  maxSize: number;                    // Normalized max collateral
  rawOrder: RawOrderData;             // Original raw data
  isBinary: boolean;
  binaryName?: string;                // Only for binary options
}
```

**Source:** `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:433-446`

**Purpose:** User-friendly representation of order data with normalized decimals.

**Usage:** Display and trading logic throughout the component

---

### 7. User Position Structure

**Inferred from:** localStorage and position tracking

```typescript
interface UserPosition {
  id: string;                         // Transaction hash
  timestamp: number;                  // Purchase timestamp (ms)
  order: ParsedOrder;                 // The purchased order
  collateralUsed: number;             // Amount spent (USDC)
  txHash: string;                     // Blockchain transaction hash
  status: 'active' | string;          // Position status
}
```

**Source Files:**
- `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:280-287`
- `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:318-334`
- `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:1086-1172`

**Storage:** Browser localStorage, keyed by wallet address

**Notes:**
- Persists between sessions
- Cleared if browser data is cleared
- Date objects need reconstruction from JSON

---

### 8. Market Data Structure

**Inferred from:** API response handling

```typescript
interface MarketData {
  BTC?: number;                       // Current BTC price (USD)
  ETH?: number;                       // Current ETH price (USD)
  [key: string]: number | undefined;  // Extensible for other assets
}
```

**Source:** `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:66,117,540-554`

**Usage:** Display current market prices in header

---

### 9. API Response Structure

**Inferred from:** Fetch handlers

```typescript
interface ThetanutsAPIResponse {
  data?: {
    orders?: RawOrderData[];
    market_data?: MarketData;
  };
  error?: string;
  message?: string;
}
```

**Source:** `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:115-124`

**Endpoint:** `/api/orders` (proxies to Cloudflare Worker)

---

### 10. React State Types

**Component State Variables:**

```typescript
// Order and market state
const [orders, setOrders] = useState<RawOrderData[]>([]);
const [filteredOrders, setFilteredOrders] = useState<RawOrderData[]>([]);
const [marketData, setMarketData] = useState<MarketData | null>(null);
const [selectedOrder, setSelectedOrder] = useState<ParsedOrder | null>(null);

// UI state
const [loading, setLoading] = useState<boolean>(false);
const [selectedStrategy, setSelectedStrategy] = useState<'all' | '2' | '3' | '4'>('all');
const [selectedAsset, setSelectedAsset] = useState<'all' | 'BTC' | 'ETH'>('all');
const [showBinaries, setShowBinaries] = useState<boolean>(true);
const [fetchStatus, setFetchStatus] = useState<string>('');
const [currentPage, setCurrentPage] = useState<number>(1);
const [currentView, setCurrentView] = useState<'market' | 'profile'>('market');

// Wallet state
const [walletAddress, setWalletAddress] = useState<string | null>(null);
const [chainId, setChainId] = useState<number | null>(null);
const [isConnecting, setIsConnecting] = useState<boolean>(false);

// Trading state
const [toasts, setToasts] = useState<Toast[]>([]);
const [isBuying, setIsBuying] = useState<boolean>(false);
const [userPositions, setUserPositions] = useState<UserPosition[]>([]);
const [selectedBetSize, setSelectedBetSize] = useState<number>(1);
```

**Source:** `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:60-88`

**Notes:**
- Most use explicit type parameters
- Some use implicit typing (e.g., `useState([])` without type parameter)
- Violates codebase rule about avoiding `any`

---

## Smart Contract Types

### 11. OptionBook ABI Structure

**Location:** `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:14-45`

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

**Contract Address:** `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1` (Base Mainnet)

**Method:** `fillOrder(order, signature, referrer)`

---

### 12. ERC20 ABI

**Location:** `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:47-50`

```typescript
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];
```

**Purpose:** USDC token interaction (approvals)

**USDC Address:** `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (Base Mainnet)

---

## Ethers.js Types

### 13. Imported Ethers Types

**Location:** `/Users/avuthegreat/thetanuts-demo/src/components/ThetanutsTradingDemo.tsx:2`

```typescript
import { BrowserProvider, Contract, parseUnits } from 'ethers';
```

**Types Used:**
- `BrowserProvider`: Web3 provider for browser wallets
- `Contract`: Smart contract interaction wrapper
- `parseUnits`: Utility for decimal conversion

**Usage:**
- `BrowserProvider(window.ethereum)` - Connect to MetaMask
- `new Contract(address, abi, signer)` - Create contract instances
- `parseUnits(amount, decimals)` - Convert human-readable amounts

---

## Constants and Configuration

### 14. Contract Addresses

```typescript
const OPTION_BOOK_ADDRESS = '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1';
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
const REFERRER_ADDRESS = '0x0000000000000000000000000000000000000001';
```

### 15. Price Feed Addresses

```typescript
const BTC_FEED = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F';  // Chainlink BTC/USD
const ETH_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70';  // Chainlink ETH/USD
```

### 16. Network Configuration

```typescript
const BASE_CHAIN_ID = 8453;
const BASE_CHAIN_HEX = '0x2105';
```

---

## Type Patterns and Conventions

### Naming Conventions

1. **Interfaces:** PascalCase (e.g., `Toast`, `FAQItem`)
2. **Type aliases:** PascalCase (same as interfaces)
3. **Props:** Typically inline or `ComponentNameProps` pattern
4. **State variables:** camelCase with descriptive names
5. **Constants:** UPPER_SNAKE_CASE for addresses and config

### Common Patterns

1. **Union Types:** Used for restricted string values
   ```typescript
   type ToastType = 'success' | 'error' | 'info';
   type StrategyType = 'BINARY' | 'SPREAD' | 'BUTTERFLY' | 'CONDOR';
   ```

2. **Optional Properties:** Using `?` operator
   ```typescript
   txHash?: string;
   binaryName?: string;
   ```

3. **Generic React Types:**
   ```typescript
   React.ReactNode
   JSX.Element
   React.Fragment
   ```

4. **Ethereum Address Type:** Always `string` (should be `0x${string}` for type safety)

5. **Numeric Types:**
   - Blockchain amounts: `number` or `bigint`
   - Timestamps: `number` (Unix timestamp)
   - Dates: `Date` object for display

### Type Issues and Recommendations

1. **`any` Usage:**
   - Found in: `window.ethereum`, `userPositions` array, error catches
   - Recommendation: Create proper types for ethereum provider

2. **Missing Type Parameters:**
   - `useState([])` without explicit type
   - Should be: `useState<RawOrderData[]>([])`

3. **Untyped Function Parameters:**
   - `parseOrder(orderData)` has no type annotation
   - Should define `orderData: RawOrderData`

4. **Implicit any in maps:**
   - `positions.map((pos: any) => ...)`
   - Should be: `positions.map((pos: UserPosition) => ...)`

---

## Summary

### Total Type Definitions

| Category | Count | Files |
|----------|-------|-------|
| Explicit Interfaces | 3 | global.d.ts, ThetanutsTradingDemo.tsx, page.tsx (FAQ) |
| Implicit Types (inferred) | 7 | ThetanutsTradingDemo.tsx, route.ts |
| Smart Contract Types | 2 | ThetanutsTradingDemo.tsx |
| External Library Types | 3+ | ethers, next, react |
| **TOTAL** | **15+** | **6 source files** |

### Key Files by Type Usage

1. **`/src/components/ThetanutsTradingDemo.tsx`** - Primary component (1222 lines)
   - Toast interface
   - All implicit order/position types
   - Smart contract ABIs
   - State management types

2. **`/src/global.d.ts`** - Global type extensions (3 lines)
   - Window interface extension

3. **`/src/app/faq/page.tsx`** - FAQ page (305 lines)
   - FAQItem interface

4. **`/src/app/layout.tsx`** - Layout component (21 lines)
   - Next.js Metadata type

5. **`/src/app/page.tsx`** - Home page (8 lines)
   - No custom types (re-exports component)

6. **`/src/app/api/orders/route.ts`** - API route (39 lines)
   - NextResponse types (from Next.js)
   - Error type guards

### Recommended Improvements

1. Create dedicated `types/` directory with:
   - `types/orders.ts` - Order-related types
   - `types/positions.ts` - Position tracking types
   - `types/wallet.ts` - Web3/wallet types
   - `types/api.ts` - API response types

2. Replace all `any` types with proper interfaces

3. Add type guards for runtime validation

4. Use `const` assertions for literal types

5. Consider using `zod` or similar for runtime type validation

6. Add JSDoc comments for complex types

---

## File Locations Reference

```
/Users/avuthegreat/thetanuts-demo/
├── src/
│   ├── global.d.ts                              [Window interface]
│   ├── components/
│   │   └── ThetanutsTradingDemo.tsx            [Toast, Order types, ABIs]
│   └── app/
│       ├── layout.tsx                           [Metadata]
│       ├── page.tsx                             [No custom types]
│       ├── faq/
│       │   └── page.tsx                         [FAQItem]
│       └── api/
│           └── orders/
│               └── route.ts                     [API types]
└── .docs/
    └── plans/
        └── prediction-market-swipe/
            └── types-interfaces.docs.md         [This file]
```

---

*Document generated: 2025-10-21*
*Codebase version: Based on commit 3530337 (fixed linting errors)*
