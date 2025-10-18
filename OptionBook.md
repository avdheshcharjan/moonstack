# Thetanuts v4 - Guide for implementing Option Book

# OptionBook Integration Guide

> ⚠️ Important: All code examples in this guide are for reference only and have not been thoroughly tested. Developers should review, test, and verify all code before using in production. ThetaNuts is not responsible for any issues arising from using this code.
> 

---

## What is OptionBook?

OptionBook is a decentralized order book for options trading on Base. It works as follows:

1. **Makers** create signed orders off-chain offering to sell options (spreads, butterflies, condors)
2. **Orders** are aggregated and published via API
3. **Takers** (your users) fill orders on-chain by calling `fillOrder()` on the OptionBook contract
4. **Options** are created as new smart contracts with collateral locked inside
5. **Settlement** - ThetaNuts processes option expiries daily to settle positions

**Key Feature:** The `referrer` parameter in `fillOrder()` lets you track which positions came from your platform. This is crucial for distinguishing your users' positions from other platforms using the same OptionBook.

---

## Quick Start

This guide shows you how to:

1. Fetch option orders from the API
2. Execute trades with USDC collateral using `fillOrder()`
3. Calculate payouts for different scenarios
4. Retrieve and filter user positions by your referrer address

**Assumption:** You're using USDC as collateral. The OptionBook supports other tokens (WETH, CBBTC) but this guide focuses on USDC only.

---

## Network Configuration

### 0.1 Base Mainnet (r10) - Current Deployment

```json
{
  "chain_id": 8453,
  "option_book": "0xd58b814C7Ce700f251722b5555e25aE0fa8169A1",
  "deployment_block": 36596854,

  "tokens": {
    "USDC": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "WETH": "0x4200000000000000000000000000000000000006",
    "CBBTC": "0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf",
    "aBasUSDC": "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB",
    "aBasWETH": "0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7",
    "aBascbBTC": "0xBdb9300b7CDE636d9cD4AFF00f6F009fFBBc8EE6"
  },

  "price_feeds": {
    "BTC": "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F",
    "ETH": "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"
  }
}

```

### 0.2 Option Product Types

Options are identified by their **implementation address**. Here are the current implementations:

```json
{
  "implementations": {
    "SPREAD": {
      "0x2Db5aFA04aeE616157Beb53b96612947b3d13eE3": "CALL_SPREAD (2 strikes)",
      "0x571471B2f823cC6B5683FC99ac6781209BC85F55": "PUT_SPREAD (2 strikes)"
    },
    "BUTTERFLY": {
      "0xb727690FDD4Bb0ff74f2f0CC3E68297850A634c5": "CALL_FLYS (3 strikes)",
      "0x78b02119007F9EFc2297A9738b9a47A3bc3c2777": "PUT_FLYS (3 strikes)"
    },
    "CONDOR": {
      "0x7D3C622852d71B932D0903F973cafF45BCdBa4F1": "CALL_CONDOR (4 strikes)",
      "0x5cc960B56049b6f850730FacB4F3EB45417c7679": "PUT_CONDOR (4 strikes)",
      "0xb200253b68Fbf18f31D813AECEf97be3A6246b79": "IRON_CONDOR (4 strikes)"
    }
  }
}

```

**Key Point:** The number of strikes in `order.strikes[]` tells you the product type:

- **2 strikes** = Spread
- **3 strikes** = Butterfly
- **4 strikes** = Condor/Iron Condor

---

## 1. Fetching Orders

> 💡 ThetaNuts Recommendation: For production applications, ThetaNuts recommends that you create your own indexer to fetch orders and positions directly from the blockchain. However, you may use ThetaNuts' current API infrastructure (Odette API) for development and testing purposes.
> 

### 1.1 API Endpoint

```
GET <https://round-snowflake-9c31.devops-118.workers.dev/>

```

### 1.2 Refresh Rate & Polling Strategy

**Recommended refresh interval: 30 seconds**

Both [Odette.fi](http://odette.fi/) and Flys.bet refresh order data and market prices every 30 seconds. This is the recommended polling frequency for your integration.

**Implementation example:**

```jsx
const REFRESH_INTERVAL = 30000; // 30 seconds

// Initial fetch
async function fetchAndUpdateOrders() {
  try {
    const response = await fetch('<https://round-snowflake-9c31.devops-118.workers.dev/>');
    const data = await response.json();

    // Update your UI with new orders
    updateOrdersDisplay(data.data.orders);

    // Update market prices
    if (data.data.market_data) {
      updateMarketPrices(data.data.market_data);
    }
  } catch (error) {
    console.error('Failed to fetch orders:', error);
  }
}

// Set up periodic refresh
fetchAndUpdateOrders(); // Initial fetch
setInterval(fetchAndUpdateOrders, REFRESH_INTERVAL); // Refresh every 30s

```

**Why 30 seconds?**

- Order prices and availability can change as other users fill orders
- Market prices (BTC, ETH) update regularly and affect option pricing
- Balances the need for fresh data with API request limits
- Maker orders can expire or be fully filled between refreshes

**Important:**

- Always fetch fresh order data immediately before executing a trade (see section 5.1)
- Don't cache order data for longer than 30-60 seconds
- The API includes both `order.orderExpiryTimestamp` and `order.expiry` - check both

### 1.3 Response Structure

```jsx
{
  "data": {
    "orders": [
      {
        "order": {
          "maker": "0x...",
          "collateral": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
          "isCall": true,
          "priceFeed": "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F", // BTC or ETH
          "implementation": "0xb727690FDD4Bb0ff74f2f0CC3E68297850A634c5", // Product type
          "strikes": [100000000000, 110000000000], // 8 decimals: [1000, 1100]
          "expiry": 1734336000, // Unix timestamp
          "price": "5000000", // 8 decimals: 0.05 USDC per contract
          "maxCollateralUsable": "1000000000", // Max size available
          "isLong": true,
          "orderExpiryTimestamp": 1734336000,
          "numContracts": "0",
          "extraOptionData": "0x"
        },
        "nonce": "12345",
        "signature": "0x...",
        "optionBookAddress": "0x1fcA1052F45A3271F12221D4D990BfED4EE7D0b1"
      }
    ],
    "market_data": {
      "BTC": 95000.50,
      "ETH": 3500.25
    }
  }
}

```

### 1.4 Filtering Orders

**By number of strikes:**

```jsx
const orders = data.data.orders;

const spreads = orders.filter(o => o.order.strikes.length === 2);
const butterflies = orders.filter(o => o.order.strikes.length === 3);
const condors = orders.filter(o => o.order.strikes.length === 4);

```

**By underlying asset:**

```jsx
const BTC_FEED = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F';
const ETH_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70';

const btcOrders = orders.filter(o => o.order.priceFeed === BTC_FEED);
const ethOrders = orders.filter(o => o.order.priceFeed === ETH_FEED);

```

**By collateral (USDC only):**

```jsx
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const usdcOrders = orders.filter(o =>
  o.order.collateral.toLowerCase() === USDC.toLowerCase()
);

```

**By implementation (product type):**

```jsx
// Spread implementations
const CALL_SPREAD = '0x2Db5aFA04aeE616157Beb53b96612947b3d13eE3';
const PUT_SPREAD = '0x571471B2f823cC6B5683FC99ac6781209BC85F55';

// Butterfly implementations
const CALL_FLY = '0xb727690FDD4Bb0ff74f2f0CC3E68297850A634c5';
const PUT_FLY = '0x78b02119007F9EFc2297A9738b9a47A3bc3c2777';

// Filter for spreads
const spreadOrders = orders.filter(o =>
  [CALL_SPREAD, PUT_SPREAD].includes(o.order.implementation)
);

// Filter for butterflies
const butterflyOrders = orders.filter(o =>
  [CALL_FLY, PUT_FLY].includes(o.order.implementation)
);

// Or filter by specific implementation
const callSpreads = orders.filter(o =>
  o.order.implementation.toLowerCase() === CALL_SPREAD.toLowerCase()
);

```

### 1.5 Understanding Decimals

All numeric values use specific decimal places:

| Field | Decimals | Example | Actual Value |
| --- | --- | --- | --- |
| `strikes[]` | 8 | `100000000000` | $1,000 |
| `price` | 8 | `5000000` | 0.05 USDC |
| `maxCollateralUsable` (USDC) | 6 | `1000000` | 1 USDC |

**Convert to readable format:**

```jsx
const strike = order.strikes[0] / 1e8; // 100000000000 → 1000
const price = Number(order.price) / 1e8; // 5000000 → 0.05

```

---

## 2. Executing Trades (fillOrder)

### 2.1 Prerequisites

```jsx
const OPTION_BOOK = '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const YOUR_REFERRER = '0x...'; // YOUR platform's unique address

```

### 2.2 🔑 Important: Referrer Address

**You MUST set up a unique referrer address for your platform.** This address:

1. **Identifies your platform** - The address is recorded in the `referrer` field when option contracts are created
2. **Enables position filtering** - You can filter user positions to show only trades from your platform (filter by the `referrer` field)
3. **Tracks referral fees** - The OptionBook v2 contract tracks referral fees paid in the `OrderFilled` event

**How to set up:**

```jsx
// Use a dedicated wallet address for your platform
const YOUR_REFERRER = '0x2e3C03C0700d7cbFd2CBa50B70fE33006B696188'; // Example: flys.bet address

// This address will be passed to fillOrder() for every trade
const tx = await optionBookContract.fillOrder(
  orderParams,
  signature,
  YOUR_REFERRER // This identifies trades from your platform
);

```

**⚠️ Note:** The `createdBy` field in position responses is the OptionBook contract address, NOT your referrer. Always use the `referrer` field to filter positions.

**Why this matters:**

- Multiple platforms can use the same OptionBook contract
- Without a unique referrer, you can't distinguish your users' positions from other platforms
- Users may have positions from multiple platforms in their wallet
- You need to filter by `referrer === YOUR_REFERRER` when displaying positions

### 2.3 Contract ABIs

**OptionBook ABI (v2):**

```jsx
// Minimal ABIs for fillOrder and USDC approval (v2 - includes extraOptionData and referrer)
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
    },
    {
        "inputs": [{"internalType": "address", "name": "token", "type": "address"}, {"internalType": "address", "name": "referrer", "type": "address"}],
        "name": "fees",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "token", "type": "address"}],
        "name": "claimFees",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
];

```

**ERC20 ABI (for USDC):**

```jsx
const ERC20_ABI = [
    {
        "inputs": [
            {"internalType": "address", "name": "spender", "type": "address"},
            {"internalType": "uint256", "name": "amount", "type": "uint256"}
        ],
        "name": "approve",
        "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [
            {"internalType": "address", "name": "owner", "type": "address"},
            {"internalType": "address", "name": "spender", "type": "address"}
        ],
        "name": "allowance",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    }
];

```

### 2.4 Trade Execution Flow

```jsx
async function buyOption(orderData, usdcAmount) {
  const signer = web3Provider.getSigner();
  const userAddress = await signer.getAddress();

  // 1. Setup contracts
  const usdcContract = new ethers.Contract(USDC, ERC20_ABI, signer);
  const optionBook = new ethers.Contract(OPTION_BOOK, OPTION_BOOK_ABI, signer);

  // 2. Check USDC balance
  const balance = await usdcContract.balanceOf(userAddress);
  const requiredAmount = ethers.utils.parseUnits(usdcAmount.toString(), 6); // USDC = 6 decimals

  if (balance.lt(requiredAmount)) {
    throw new Error(`Need ${usdcAmount} USDC, have ${ethers.utils.formatUnits(balance, 6)}`);
  }

  // 3. Approve USDC if needed
  const allowance = await usdcContract.allowance(userAddress, OPTION_BOOK);
  if (allowance.lt(requiredAmount)) {
    const approveTx = await usdcContract.approve(OPTION_BOOK, requiredAmount);
    await approveTx.wait();
  }

  // 4. Calculate contracts to buy
  const pricePerContract = Number(orderData.order.price) / 1e8; // Price in USDC
  const contractsToBuy = usdcAmount / pricePerContract;

  // Scale by 6 decimals (USDC) and round down
  const numContracts = ethers.BigNumber.from(
    Math.floor(contractsToBuy * 1e6).toString()
  );

  // 5. Prepare order (DO NOT modify order fields!)
  const orderParams = {
    maker: orderData.order.maker,
    orderExpiryTimestamp: orderData.order.orderExpiryTimestamp,
    collateral: orderData.order.collateral,
    isCall: orderData.order.isCall,
    priceFeed: orderData.order.priceFeed,
    implementation: orderData.order.implementation,
    isLong: orderData.order.isLong, // Keep original!
    maxCollateralUsable: orderData.order.maxCollateralUsable,
    strikes: orderData.order.strikes,
    expiry: orderData.order.expiry,
    price: orderData.order.price,
    extraOptionData: orderData.order.extraOptionData || "0x",
    numContracts: numContracts.toString()
  };

  // 6. Execute trade
  const tx = await optionBook.fillOrder(
    orderParams,
    orderData.signature,
    YOUR_REFERRER // Your address that earns referral fees
  );

  const receipt = await tx.wait();

  if (receipt.status === 1) {
    console.log('✅ Trade successful:', tx.hash);
    return { txHash: tx.hash, receipt };
  } else {
    throw new Error('Transaction failed');
  }
}

```

### 2.5 Important Notes

⚠️ **DO NOT modify order fields** - The signature will fail if you change any field from the API response, especially `isLong`.

⚠️ **Use 6 decimals for USDC amounts:**

```jsx
// ✅ Correct
ethers.utils.parseUnits("1.50", 6) // 1.5 USDC

// ❌ Wrong
ethers.utils.parseUnits("1.50", 18) // This is for WETH, not USDC

```

⚠️ **Always round DOWN contracts:**

```jsx
// ✅ Correct - avoid exceeding approved amount
Math.floor(contractsToBuy * 1e6)

// ❌ Wrong - might exceed approved amount
Math.ceil(contractsToBuy * 1e6)

```

---

## 3. Calculating Payouts

### 3.1 Max Payout Formula

The maximum payout depends on the product type:

```
Max Payout = Strike Width × Number of Contracts

```

### 3.2 Strike Width by Product Type

**1. Vanilla (1 strike):**

```jsx
// Max payout = unlimited for calls, strike price for puts

```

**2. Spreads (2 strikes):**

```jsx
const [strike1, strike2] = order.strikes.map(s => s / 1e8);
const strikeWidth = Math.abs(strike2 - strike1);

// Example: [1000, 1100] → width = 100

```

**3. Butterflies (3 strikes):**

```jsx
const [lower, middle, upper] = order.strikes.map(s => s / 1e8);
const strikeWidth = middle - lower; // Or: upper - middle (same in balanced fly)

// Example: [1000, 1100, 1200] → width = 100

```

**4. Condors (4 strikes):**

```jsx
const strikes = order.strikes.map(s => s / 1e8);
// Width calculation depends on condor structure
// Typically: (strikes[1] - strikes[0]) or (strikes[3] - strikes[2])

```

### 3.3 Complete Payout Calculation

```jsx
function calculateMaxPayout(order, numContracts) {
  const strikes = order.strikes.map(s => s / 1e8);

  let strikeWidth;

  switch(strikes.length) {
    case 2: // Spread
      strikeWidth = Math.abs(strikes[1] - strikes[0]);
      break;

    case 3: // Butterfly
      strikeWidth = strikes[1] - strikes[0];
      break;

    case 4: // Condor
      strikeWidth = strikes[1] - strikes[0]; // Simplified
      break;

    default:
      throw new Error('Unsupported option type');
  }

  return strikeWidth * numContracts;
}

// Example: BTC spread [95k, 100k] with 20 contracts
const maxPayout = calculateMaxPayout(order, 20);
// Result: 5000 * 20 = $100,000

```

### 3.4 Payout at Different Prices (example, untested)

```jsx
function calculatePayoutAtPrice(order, numContracts, settlementPrice) {
  const strikes = order.strikes.map(s => s / 1e8);
  const isCall = order.isCall;

  // Spreads (2 strikes)
  if (strikes.length === 2) {
    const [lower, upper] = strikes;

    if (isCall) {
      // Call spread: profit if price > lower strike
      if (settlementPrice <= lower) return 0;
      if (settlementPrice >= upper) return (upper - lower) * numContracts;
      return (settlementPrice - lower) * numContracts;
    } else {
      // Put spread: profit if price < upper strike
      if (settlementPrice >= upper) return 0;
      if (settlementPrice <= lower) return (upper - lower) * numContracts;
      return (upper - settlementPrice) * numContracts;
    }
  }

  // Butterflies (3 strikes)
  if (strikes.length === 3) {
    const [lower, middle, upper] = strikes;
    const width = middle - lower;

    if (settlementPrice <= lower || settlementPrice >= upper) return 0;
    if (settlementPrice === middle) return width * numContracts; // Max payout

    // Linear interpolation between strikes
    if (settlementPrice < middle) {
      return ((settlementPrice - lower) / width) * width * numContracts;
    } else {
      return ((upper - settlementPrice) / width) * width * numContracts;
    }
  }

  // Condors (4 strikes)
  if (strikes.length === 4) {
    const [strike1, strike2, strike3, strike4] = strikes;

    // Condor has two profit zones
    // Max payout occurs between strike2 and strike3
    const maxPayout = (strike2 - strike1) * numContracts;

    if (settlementPrice <= strike1 || settlementPrice >= strike4) return 0;

    if (settlementPrice >= strike2 && settlementPrice <= strike3) {
      // In the flat profit zone
      return maxPayout;
    }

    if (settlementPrice < strike2) {
      // Rising to max payout
      return ((settlementPrice - strike1) / (strike2 - strike1)) * maxPayout;
    }

    if (settlementPrice > strike3) {
      // Declining from max payout
      return ((strike4 - settlementPrice) / (strike4 - strike3)) * maxPayout;
    }
  }

  return 0;
}

```

---

## 4. Fetching Positions

> 💡 ThetaNuts Recommendation: For production applications, ThetaNuts recommends that you create your own indexer to track user positions directly from blockchain events. However, you may use ThetaNuts' Odette API infrastructure for development and testing purposes.
> 

### 4.1 API Base URL

```
<https://odette.fi/api>

```

### 4.2 After Making a Trade

**Step 1:** Trigger backend sync

```
POST/GET <https://odette.fi/api/update>

```

- Call this endpoint immediately after a trade
- Response: `{ status: "success" }` or `{ status: "skipped" }`
- If status is "skipped", the backend is still syncing - retry after 10 seconds
- Wait ~15 seconds after a successful update before fetching positions

**Step 2:** Fetch user positions

```
GET <https://odette.fi/api/user/{userAddress}/positions>

```

- Replace `{userAddress}` with the user's wallet address (lowercase)
- Returns array of **OPEN/LIVE** position objects (see format below)

### 4.3 Position Response Format

```jsx
[
  {
    "address": "0x...", // Option contract address
    "status": "open", // "open", "settled", "closed"
    "buyer": "0x...",
    "seller": "0x...",
    "referrer": "0x...", // YOUR referrer address passed to fillOrder() - use this to filter!
    "createdBy": "0x...", // OptionBook contract address that created this option

    // Entry details
    "entryTimestamp": 1734336000,
    "entryTxHash": "0x...",
    "entryPremium": "1000000", // Premium paid (6 decimals for USDC)
    "entryFeePaid": "30000", // Fee paid (6 decimals)

    // Option details
    "collateralToken": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "collateralSymbol": "USDC",
    "collateralDecimals": 6,
    "underlyingAsset": "BTC",
    "priceFeed": "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F",
    "strikes": ["10000000000", "11000000000"], // 8 decimals
    "expiryTimestamp": 1734364800,
    "numContracts": "20000000", // 6 decimals (USDC)
    "collateralAmount": "100000000", // 6 decimals
    "optionType": 257, // Option type code
    "optionTypeRaw": 257,

    // Settlement (only if settled)
    "settlement": {
      "settlementPrice": "10500000000", // 8 decimals
      "payoutBuyer": "50000000", // 6 decimals
      "collateralReturnedSeller": null
    },
    "explicitClose": null
  }
]

```

### 4.4 Filtering by Referrer (Your Platform)

**Important:** Users may have positions from multiple platforms. Always filter by your referrer address to show only positions created through your platform.

**How to filter:**

- Fetch all user positions from the API
- Filter client-side by checking `position.referrer === YOUR_REFERRER_ADDRESS`
- Currently no server-side filtering available

**⚠️ Critical:** Use the `referrer` field, NOT the `createdBy` field:

- **`referrer`** - YOUR platform's address that you passed to fillOrder() - THIS is what you filter by
- **`createdBy`** - The OptionBook contract address - DON'T use this for filtering

**Why filter by referrer:**

- Same user may trade on [odette.fi](http://odette.fi/), flys.bet, and your platform
- Each platform uses the same OptionBook contract
- Without filtering, you'd show positions from competing platforms
- The `referrer` field contains the exact address you passed as the 3rd parameter to fillOrder()

### 4.5 Fetching Position History (Settled Positions)

To view a user's historical positions (expired and settled), use the history endpoint:

```
GET <https://odette.fi/api/user/{userAddress}/history>

```

**Purpose:**

- Returns all **SETTLED** positions that have expired and been paid out
- Essential for showing users their trading history and P&L
- Includes final settlement prices and actual payouts

**Response format:**
Same as the `/positions` endpoint (section 4.3), but:

- `status` will be `"settled"` instead of `"open"`
- `settlement` object will be populated with actual data:
    - `settlementPrice` - Final price at expiry (8 decimals)
    - `payoutBuyer` - Amount paid to buyer (6 decimals for USDC)
    - `collateralReturnedSeller` - Amount returned to seller

**Example:**

```
<https://odette.fi/api/user/0x1ef4c65bdea202bd64426f73e5a34807a4477006/history>

```

**Filtering:**

- Like with open positions (section 4.4), filter by `position.referrer === YOUR_REFERRER_ADDRESS`
- Only show positions from your platform, not all platforms the user has traded on

**Use cases:**

- Display user's trading history and performance
- Calculate overall P&L across all positions
- Show which positions were profitable at expiry
- Build portfolio analytics and statistics

### 4.6 Other Endpoints

**Get all open positions (across entire OptionBook):**

```
GET <https://odette.fi/api/open-positions>

```

- Returns all open positions across the entire OptionBook, not filtered by user
- Response format: `{ count: number, positions: [...] }`
- Useful for discovering available options or building market views
- See live data: https://odette.fi/api/open-positions

**Get protocol stats:**

```
GET <https://odette.fi/api/stats>

```

- Returns: `{ totalOptionsTracked, openPositions, settledPositions, uniqueUsers, lastProcessedBlock, ... }`

---

## 5. Common Issues

### 5.1 Transaction Fails: "Signer Not Authorized"

**Cause:** Order data is stale or outdated from the API

**Fix:**

- Always fetch fresh order data from the API immediately before calling fillOrder
- Don't use cached order data - orders can expire or be fully filled
- Make a fresh API call to `https://round-snowflake-9c31.devops-118.workers.dev/` before each trade

### 5.2 Transaction Fails: "Signature Mismatch"

**Cause:** Modified order data before calling fillOrder

**Fix:**

- Use the exact order data from the API without modification
- Don't change any fields like `isLong`, `strikes`, `price`, etc.
- The signature is tied to the exact order parameters

### 5.3 Transaction Fails: "Insufficient Allowance"

**Cause:** USDC not approved

**Fix:**

- Check USDC allowance for the OptionBook contract before trading
- If allowance is insufficient, call `approve()` on the USDC contract
- Set allowance to at least the required USDC amount

### 5.4 Transaction Fails: "Transfer Amount Exceeds Balance"

**Cause:** Rounding error or price changed

**Fix:**

- Always round DOWN when calculating number of contracts
- Never round up or you may exceed the approved USDC amount
- For USDC: scale by 1e6 and use `Math.floor()`

### 5.5 Position Not Showing After Trade

**Cause:** Backend hasn't indexed yet

**Fix:**

- Call `https://odette.fi/api/update` immediately after the trade
- Wait ~15 seconds for the backend to index the new position
- Then fetch positions from `/api/user/{address}/positions`

---

## 6. Quick Reference

### 6.1 Decimals

- **USDC**: 6 decimals
- **Strikes**: 8 decimals
- **Prices**: 8 decimals
- **WETH**: 18 decimals (not used if USDC-only)
- **CBBTC**: 8 decimals (not used if USDC-only)

### 6.2 Referrer Address

- **Your Platform**: Use a unique address to identify your platform
- **Purpose**: Track positions, distinguish from other platforms
- **Required**: Pass to every `fillOrder()` call

### 6.3 API Endpoints

```
Orders:      <https://round-snowflake-9c31.devops-118.workers.dev/>
Trigger:     <https://odette.fi/api/update>
Positions:   <https://odette.fi/api/user/{address}/positions>
History:     <https://odette.fi/api/user/{address}/history>
Stats:       <https://odette.fi/api/stats>

```

---

## Example: Complete Flow

```jsx
// 1. Fetch orders
const data = await fetch('<https://round-snowflake-9c31.devops-118.workers.dev/>');
const { orders, market_data } = (await data.json()).data;

// 2. Filter for BTC spreads with USDC collateral
const BTC_FEED = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F';
const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const CALL_SPREAD = '0x2Db5aFA04aeE616157Beb53b96612947b3d13eE3';

// Option 1: Filter by strike count
const btcSpreads = orders.filter(o =>
  o.order.priceFeed === BTC_FEED &&
  o.order.collateral.toLowerCase() === USDC.toLowerCase() &&
  o.order.strikes.length === 2
);

// Option 2: Filter by implementation address
const btcCallSpreads = orders.filter(o =>
  o.order.priceFeed === BTC_FEED &&
  o.order.collateral.toLowerCase() === USDC.toLowerCase() &&
  o.order.implementation.toLowerCase() === CALL_SPREAD.toLowerCase()
);

// 3. Buy $10 worth of the first spread
const orderData = btcSpreads[0];
const result = await buyOption(orderData, 10); // 10 USDC

// 4. Trigger backend sync
await fetch('<https://odette.fi/api/update>');
await new Promise(r => setTimeout(r, 15000)); // Wait 15s

// 5. Fetch positions
const positions = await fetchUserPositions(userAddress);

// 6. Calculate payout at current price
const position = positions[0];
const currentPrice = market_data.BTC;
const contracts = Number(position.numContracts) / 1e6;
const payout = calculatePayoutAtPrice(position, contracts, currentPrice);

console.log(`Current payout: $${payout.toFixed(2)}`);

```

---

---

## Support

For questions, ABIs, or integration support, please contact ThetaNuts. 