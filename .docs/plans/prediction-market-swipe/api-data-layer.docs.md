# API and Data Layer Documentation - Binary Options

## Overview
This document details the API and data layer for binary options in the Thetanuts trading platform. The system fetches live options data from a Cloudflare Workers API and transforms it for consumption in React components.

---

## API Endpoint

### Primary API
- **URL**: `https://round-snowflake-9c31.devops-118.workers.dev/`
- **Method**: GET
- **Cache**: No-store (always fresh data)
- **Response Format**: JSON

---

## File Structure

### 1. `/src/app/api/orders/route.ts`
**Purpose**: Next.js API route that acts as a proxy to fetch data from the Thetanuts API

**Key Details**:
- Server-side API route (Next.js App Router)
- Fetches data from Cloudflare Workers endpoint
- Passes through the response with minimal transformation
- Error handling with structured error responses

**Environment Variables**:
- `API_URL`: Cloudflare Workers endpoint (defaults to production URL)

**Response Flow**:
```
Client → Next.js API Route (/api/orders) → Cloudflare Workers → Client
```

---

## Data Structures

### Root Response Structure
```typescript
{
  data: {
    timestamp: string,        // ISO 8601 timestamp
    orders: Order[],          // Array of order objects
    market_data: MarketData   // Current market prices
  }
}
```

### Order Object (from API)
```typescript
{
  order: {
    // Identification
    ticker: string | null,              // e.g., "ETH-22OCT25-3700-P" or null for binaries
    type?: "binaries" | undefined,      // Only present for binary options
    name?: string,                      // Only for binaries, e.g., "Weekly 100k Down"

    // Contract Details
    maker: string,                      // Ethereum address (0x...)
    orderExpiryTimestamp: number,       // Unix timestamp (order validity)
    expiry: number,                     // Unix timestamp (option expiry)
    strikes: number[],                  // Array of strikes (scaled by 1e8)

    // Asset Details
    collateral: string,                 // Token address (USDC or WETH)
    isCall: boolean,                    // true = call, false = put
    priceFeed: string,                  // Oracle address (BTC/ETH feed)
    implementation: string,             // Implementation contract address

    // Trading Parameters
    isLong: boolean,                    // Always false (selling options)
    maxCollateralUsable: string,        // Max size (in wei for collateral decimals)
    price: string,                      // Premium per contract (scaled by 1e8)
    numContracts: string,               // Number of contracts available
    extraOptionData: string             // Additional data (usually "0x")
  },
  signature: string,                    // EIP-712 signature (0x...)
  chainId: number,                      // 8453 (Base network)
  optionBookAddress: string,            // OptionBook contract address
  nonce: string,                        // Unique nonce (0x...)
  greeks?: {                            // Optional Greeks data
    delta: number,
    iv: number,                         // Implied volatility
    gamma: number,
    theta: number,
    vega: number
  }
}
```

### Binary Options Structure
Binary options have a distinct structure:
```typescript
{
  order: {
    type: "binaries",
    name: string,                       // e.g., "Weekly 100k Down", "Monthly 100k Up"
    ticker: null,
    strikes: [number, number],          // Always 2 strikes defining the range
    isCall: boolean,                    // true = Up bet, false = Down bet
    // ... (all other Order fields)
  }
  // ... (signature, chainId, etc.)
}
```

**Binary Options Naming Convention**:
- Pattern: `{Period} {Strike} {Direction}`
- Examples:
  - "Weekly 100k Down"
  - "Monthly 100k Up"
  - "Quarterly 100k Down"

**Binary Strike Interpretation**:
- Two strikes define a price range
- For "Up" bets (isCall=true): Price must be ABOVE the range at expiry
- For "Down" bets (isCall=false): Price must be BELOW the range at expiry
- Strikes scaled by 1e8 (e.g., 10000000000000 = $100,000)

### Market Data Structure
```typescript
{
  ETH: number,        // Current ETH price (USD)
  BTC: number,        // Current BTC price (USD)
  SOL: number,        // Current SOL price (USD)
  XRP: number,        // Current XRP price (USD)
  BNB: number         // Current BNB price (USD)
}
```

---

## Data Transformations

### 1. Price Feed Identification
```typescript
const BTC_FEED = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F';
const ETH_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70';

// Determines underlying asset
const underlying = order.priceFeed.toLowerCase() === BTC_FEED.toLowerCase()
  ? 'BTC'
  : 'ETH';
```

### 2. Collateral Handling
```typescript
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const WETH_ADDRESS = '0x4200000000000000000000000000000000000006';

// USDC uses 6 decimals, WETH uses 18 decimals
const isUSDC = order.collateral.toLowerCase() === USDC_ADDRESS.toLowerCase();
const decimals = isUSDC ? 1e6 : 1e18;
const maxSize = Number(order.maxCollateralUsable) / decimals;
```

### 3. Strike Price Conversion
```typescript
// Strikes are scaled by 1e8
const strikes = order.strikes.map(s => Number(s) / 1e8);
// Example: 370000000000 → 3700
```

### 4. Premium Price Conversion
```typescript
// Price is scaled by 1e8
const pricePerContract = Number(order.price) / 1e8;
// Example: 1101577087 → 11.01577087 USDC
```

### 5. Strategy Type Determination
```typescript
const isBinary = order.type === 'binaries';

let strategyType;
if (isBinary) {
  strategyType = 'BINARY';
} else if (strikes.length === 2) {
  strategyType = 'SPREAD';
} else if (strikes.length === 3) {
  strategyType = 'BUTTERFLY';
} else if (strikes.length === 4) {
  strategyType = 'CONDOR';
}
```

### 6. Parsed Order Object (Component State)
The `parseOrder()` function in `ThetanutsTradingDemo.tsx` transforms API data:

```typescript
{
  strategyType: 'BINARY' | 'SPREAD' | 'BUTTERFLY' | 'CONDOR',
  underlying: 'BTC' | 'ETH',
  isCall: boolean,
  strikes: number[],                    // Converted to decimal format
  strikeWidth: number,                  // Distance between first two strikes
  expiry: Date,                         // JavaScript Date object
  pricePerContract: number,             // In USDC/ETH
  maxSize: number,                      // In USDC/ETH
  rawOrder: any,                        // Original API response
  isBinary: boolean,                    // true if binary option
  binaryName?: string                   // Name if binary option
}
```

---

## Data Consumption Flow

### Component: `ThetanutsTradingDemo.tsx`

**1. Fetching Data**
```typescript
// Line 91-133
const fetchOrders = async () => {
  const response = await fetch('/api/orders');
  const data = await response.json();

  setOrders(data.data.orders || []);
  setMarketData(data.data.market_data || {});
};
```

**2. Filtering Logic**
```typescript
// Line 362-402
// Binary options filter
const binaries = orders.filter(o => o.order.type === 'binaries');
const regularOptions = orders.filter(o =>
  o.order.type !== 'binaries' &&
  o.order.strikes.length >= 2
);

// Asset filter
const filtered = orders.filter(o =>
  o.order.priceFeed.toLowerCase() === targetFeed.toLowerCase()
);

// Collateral filter (USDC or WETH only)
const filtered = orders.filter(o => {
  const collateral = o.order.collateral.toLowerCase();
  return collateral === USDC.toLowerCase() ||
         collateral === WETH.toLowerCase();
});
```

**3. Display Rendering**
```typescript
// Line 650-737
// Maps over filtered orders
filteredOrders.map((orderData) => {
  const parsed = parseOrder(orderData);
  // Renders card with parsed data
});
```

---

## Contract Interaction

### OptionBook Contract
- **Address**: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
- **Network**: Base (Chain ID: 8453)
- **Method**: `fillOrder(order, signature, referrer)`

### Order Execution Flow
1. User selects bet size (e.g., $1, $5, $10, $25 USDC)
2. Calculate contracts: `betSize / pricePerContract`
3. Check/approve USDC allowance for OptionBook contract
4. Call `fillOrder()` with:
   - Original order parameters (unmodified)
   - Signature from API
   - Referrer address
   - Modified `numContracts` field for bet size

**Critical**: Order parameters MUST NOT be modified (except numContracts) or signature validation will fail.

---

## Key Scaling Factors

| Field | Scaling Factor | Example |
|-------|---------------|---------|
| strikes | 1e8 | 370000000000 → $3,700 |
| price | 1e8 | 1101577087 → $11.01 |
| maxCollateralUsable (USDC) | 1e6 | 10000000000 → $10,000 |
| maxCollateralUsable (WETH) | 1e18 | 2583182863516411392 → ~2.58 ETH |
| expiry | Unix seconds | 1761120000 → Oct 22, 2025 |

---

## Error Handling

### API Route (`route.ts`)
```typescript
// Returns structured error response
{
  error: 'Failed to fetch data',
  message: string
}
```

### Component Level
```typescript
// Shows error in fetchStatus state
setFetchStatus(`❌ Failed to load data: ${errorMessage}`);
setOrders([]);
setMarketData(null);
```

---

## Important Constants

### Contract Addresses (Base Network)
```typescript
OPTION_BOOK_ADDRESS = '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1';
USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
WETH_ADDRESS = '0x4200000000000000000000000000000000000006';
```

### Oracle Addresses (Base Network)
```typescript
BTC_FEED = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F';
ETH_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70';
```

---

## Binary Options Specifics

### Identification
```typescript
const isBinary = order.order.type === 'binaries';
```

### Data Points
- `name`: Human-readable prediction (e.g., "Weekly 100k Down")
- `strikes[0]`: Lower bound of range
- `strikes[1]`: Upper bound of range
- `isCall`: Direction (true = Up, false = Down)
- `ticker`: Always null for binaries

### Current Binary Options
Based on live API data:
- Weekly 100k Down/Up (BTC)
- Monthly 100k Down/Up (BTC)
- Quarterly 100k Down/Up (BTC)

### Strike Width Calculation
```typescript
const strikeWidth = Math.abs(strikes[1] - strikes[0]);
// Example: [100000, 102000] → $2,000 range
```

---

## Data Refresh Strategy

### Current Implementation
- Manual refresh via button click
- Fetches on component mount
- No automatic polling

### Recommended for Production
```typescript
// Poll every 30 seconds
useEffect(() => {
  const interval = setInterval(fetchOrders, 30000);
  return () => clearInterval(interval);
}, []);
```

---

## Related Files

### Core Files
1. **`/src/app/api/orders/route.ts`** - API proxy route
2. **`/src/components/ThetanutsTradingDemo.tsx`** - Main component with data consumption
3. **`/src/global.d.ts`** - Global type definitions

### Type Definitions
Currently, types are inferred or defined inline. No separate types file exists.

**Recommendation**: Create `/src/types/options.ts` for centralized type definitions.

---

## Missing Data Transformation Utilities

Currently, there are NO separate utility files for data transformation. All transformations happen inline in `ThetanutsTradingDemo.tsx`.

**Recommendation**: Create utility files:
- `/src/utils/optionsParser.ts` - Parse and transform order data
- `/src/utils/contracts.ts` - Contract addresses and ABIs
- `/src/utils/formatting.ts` - Price/number formatting

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Workers API                                       │
│ (round-snowflake-9c31.devops-118.workers.dev)              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ GET request
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ Next.js API Route                                            │
│ /src/app/api/orders/route.ts                                │
│ - Proxies request                                            │
│ - Minimal error handling                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ JSON Response
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ React Component (ThetanutsTradingDemo)                       │
│ /src/components/ThetanutsTradingDemo.tsx                    │
│                                                              │
│ State Management:                                            │
│ - orders: Order[]                                            │
│ - marketData: MarketData                                     │
│ - filteredOrders: Order[]                                    │
│                                                              │
│ Data Transformations:                                        │
│ - parseOrder() → ParsedOrder                                 │
│ - Filter binaries vs regular options                         │
│ - Filter by asset (BTC/ETH)                                  │
│ - Filter by strategy type                                    │
│ - Calculate max payout                                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Rendered UI
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ User Interface                                               │
│ - Order cards                                                │
│ - Binary options cards                                       │
│ - Order detail modal                                         │
│ - Bet size selector                                          │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

### API Layer
- **Single endpoint**: Cloudflare Workers API
- **Proxy**: Next.js API route (`/api/orders`)
- **No caching**: Fresh data on every request

### Data Layer
- **No dedicated data utilities**: All transformations inline
- **Type safety**: Minimal (mostly `any` types)
- **State management**: React useState hooks

### Binary Options
- **Identification**: `order.type === 'binaries'`
- **Structure**: 2 strikes, name field, null ticker
- **Display**: Gradient styling, special UI treatment

### Recommendations
1. Create dedicated types file for type safety
2. Extract data transformations to utility functions
3. Implement automatic polling for live data
4. Add data validation layer
5. Consider using a state management library (Zustand/Redux) for complex state
