# Moonstack

A Next.js-based binary options trading platform built on Base blockchain. Swipe to predict crypto price movements (UP/DOWN) with instant gasless execution powered by Coinbase Paymaster.

![Demo Screenshot](https://img.shields.io/badge/status-live-brightgreen)

## Features

- 📱 **Swipe Interface** - Tinder-style card swipe for placing binary options bets
- ⚡ **Gasless Trading** - All transactions sponsored by Coinbase Paymaster (zero gas fees)
- 🔐 **Base Account** - One-click wallet creation via Base Account SDK
- 🎯 **Binary Options** - Simple UP/DOWN predictions on crypto prices
- 💰 **Multi-Asset** - Trade BTC, ETH, SOL, XRP, BNB, DOGE, PAXG
- ⏰ **Time Filters** - Filter by expiry: 24h, 7d, 30d, or all
- 📊 **Portfolio Tracking** - View your active positions and transaction history
- 🌐 **Farcaster Integration** - Works as a Farcaster miniapp

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Blockchain**: Base (Ethereum L2)
- **Wallet**: Base Account SDK (@base-org/account)
- **Smart Accounts**: ERC-4337 with Coinbase Paymaster
- **Database**: Supabase (position tracking)
- **UI Library**: OnchainKit, Framer Motion

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/moonstack.git
cd moonstack
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your credentials:
- `NEXT_PUBLIC_PAYMASTER_URL` - Coinbase Developer Platform Paymaster URL
- `NEXT_PUBLIC_BUNDLER_URL` - Coinbase Developer Platform Bundler URL
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anon key
- `CDP_PROJECT_ID` - Coinbase Developer Platform project ID
- `CDP_API_KEY` - Coinbase Developer Platform API key

## Running the App

### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Mode

```bash
npm run build
npm start
```

## How It Works

### Gasless Transactions
Moonstack uses Coinbase Paymaster to sponsor all gas fees for users:
1. User connects wallet via Base Account (instant smart wallet)
2. User swipes to place a bet (UP or DOWN)
3. App prepares two transactions: USDC approval + fillOrder
4. Transactions sent via EIP-5792 `wallet_sendCalls` with paymaster capability
5. Paymaster sponsors gas - user pays zero fees
6. Position stored in Supabase for portfolio tracking

### Architecture Flow
```
User Swipe
    ↓
Base Account SDK (Smart Wallet)
    ↓
directExecution.ts (Transaction Builder)
    ↓
EIP-5792 wallet_sendCalls + Paymaster
    ↓
OptionBook Contract (Base)
    ↓
Supabase (Position Storage)
```

## Project Structure

```
moonstack/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── orders/route.ts      # Fetch orders from Thetanuts API
│   │   │   ├── positions/route.ts   # Store positions in Supabase
│   │   │   └── leaderboard/route.ts # Leaderboard API
│   │   ├── page.tsx                 # Main entry point
│   │   └── layout.tsx               # Root layout
│   ├── components/
│   │   ├── market/
│   │   │   ├── SwipeView.tsx        # Swipeable card interface
│   │   │   ├── CardStack.tsx        # Card stack animation
│   │   │   └── BinaryCard.tsx       # Individual option card
│   │   ├── bets/MyBets.tsx          # Portfolio view
│   │   ├── layout/
│   │   │   ├── TopBar.tsx           # Top navigation
│   │   │   └── BottomNav.tsx        # Bottom navigation
│   │   └── Moonstack.tsx            # Main app component
│   ├── services/
│   │   └── directExecution.ts       # Blockchain transaction logic
│   ├── hooks/
│   │   ├── useOrders.ts             # Fetch and filter orders
│   │   ├── useWallet.ts             # Wallet state management
│   │   └── useLocalStorage.ts       # Local storage hook
│   ├── utils/
│   │   ├── contracts.ts             # Contract addresses and ABIs
│   │   ├── binaryPairing.ts         # Pair call/put options
│   │   ├── optionsParser.ts         # Parse raw order data
│   │   └── expiryFiltering.ts       # Filter by expiry
│   └── types/
│       ├── orders.ts                # Order type definitions
│       └── prediction.ts            # Binary pair types
├── public/                          # Static assets
├── .env.example                     # Environment template
├── package.json                     # Dependencies
├── next.config.js                   # Next.js config
├── tailwind.config.js               # Tailwind config
└── tsconfig.json                    # TypeScript config
```

## Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Features Breakdown

### Swipe Trading
- **Swipe Right (UP)** - Bet that price will increase
- **Swipe Left (DOWN)** - Bet that price will decrease
- **Tap for Details** - View strike prices, expiry, potential payout
- **Smooth Animations** - Framer Motion powered card stack

### Binary Options
- **Simple Predictions** - Just UP or DOWN, no complex strategies
- **Fixed Expiry** - Options paired by expiry date and underlying
- **USDC Collateral** - All bets settled in USDC
- **Automatic Pairing** - System pairs call/put options into binary predictions

### Wallet Integration
- **Base Account** - One-click smart wallet creation
- **No Gas Fees** - Coinbase Paymaster sponsors all transactions
- **No Seed Phrases** - Passkey-based authentication
- **Instant Setup** - No manual network configuration

### Portfolio Management
- **My Bets** - View all your active positions
- **Transaction History** - See all past trades with BaseScan links
- **Bet Settings** - Adjust default bet size (5, 10, 20, 50, 100 USDC)
- **Real-time Updates** - Position tracking via Supabase

## Data Structure

### Binary Pair Format
Each swipeable card represents a binary prediction:
```typescript
{
  underlying: 'BTC' | 'ETH' | 'SOL' | ...,
  expiry: Date,
  currentPrice: 98500,
  callOption: RawOrderData,    // UP bet
  putOption: RawOrderData,     // DOWN bet
  callParsed: ParsedOrder,
  putParsed: ParsedOrder
}
```

### Order Structure
```json
{
  "order": {
    "maker": "0x...",
    "collateral": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    "isCall": true,
    "priceFeed": "0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F",
    "strikes": ["9500000000000"],
    "expiry": 1730505600,
    "price": "50000000",
    "maxCollateralUsable": "100000000",
    "numContracts": "5000000",
    ...
  },
  "signature": "0x..."
}
```

## Contract Addresses (Base)

### Core Contracts
- **OptionBook (v2)**: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
- **USDC**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **WETH**: `0x4200000000000000000000000000000000000006`
- **EntryPoint (ERC-4337 v0.7)**: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

### Price Feeds (Chainlink)
- **BTC/USD**: `0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F`
- **ETH/USD**: `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`
- **SOL/USD**: `0x975043adBb80fc32276CbF9Bbcfd4A601a12462D`
- **XRP/USD**: `0x9f0C1dD78C4CBdF5b9cf923a549A201EdC676D34`
- **BNB/USD**: `0x4b7836916781CAAfbb7Bd1E5FDd20ED544B453b1`
- **DOGE/USD**: `0x8422f3d3CAFf15Ca682939310d6A5e619AE08e57`
- **PAXG/USD**: `0x5213eBB69743b85644dbB6E25cdF994aFBb8cF31`

## Development Notes

### Price Formatting
- **Strikes**: Divided by `1e13` for display (e.g., `9500000000000` → `$95,000`)
- **Premiums**: Divided by `1e8` for display (e.g., `50000000` → `$0.50`)
- **USDC Amounts**: Divided by `1e6` (6 decimals)
- **Contract Calculation**: `numContracts = betSize / (price / 1e8)`, scaled to 6 decimals

### Binary Option Detection
```typescript
if (strikes.length === 1) → BINARY (Yes/No)
if (strikes.length === 2) → SPREAD
if (strikes.length === 3) → BUTTERFLY
if (strikes.length === 4) → CONDOR
```

### Transaction Flow
1. **Check Balance** - Verify user has enough USDC
2. **Approval** - Send USDC approval transaction (if needed)
3. **Execute** - Call `fillOrder` on OptionBook contract
4. **Store** - Save position to Supabase
5. Both transactions use EIP-5792 with paymaster for gasless execution

## Troubleshooting

### Wallet not connecting?
1. Make sure you're using a supported browser (Chrome, Brave, Edge)
2. Clear browser cache and try again
3. Check that Base Account SDK is properly configured
4. Ensure you have an internet connection (for passkey authentication)

### Transactions failing?
1. **Check USDC Balance** - Ensure you have enough USDC in your wallet
2. **Check Network** - Verify you're on Base mainnet (Chain ID: 8453)
3. **Paymaster Issues** - Confirm `NEXT_PUBLIC_PAYMASTER_URL` is set correctly
4. **Check Console** - Open browser DevTools for detailed error messages

### No orders showing?
1. Check that API route is accessible: `http://localhost:3000/api/orders`
2. Verify `API_URL` environment variable is set
3. Check browser console for network errors
4. Ensure Thetanuts API is responding

### Supabase errors?
1. Verify Supabase credentials in `.env`
2. Check that positions table exists with correct schema
3. Ensure Row Level Security (RLS) policies allow inserts

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_PAYMASTER_URL`
   - `NEXT_PUBLIC_BUNDLER_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `CDP_PROJECT_ID`
   - `CDP_API_KEY`
   - `API_URL` (Thetanuts API endpoint)

3. Deploy:
   ```bash
   vercel deploy --prod
   ```

### Environment Setup

Required environment variables (`.env`):

```env
# Coinbase Developer Platform
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID
CDP_PROJECT_ID=your_project_id
CDP_API_KEY=your_api_key

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API
API_URL=https://round-snowflake-9c31.devops-118.workers.dev/
NEXT_PUBLIC_CHAIN_ID=8453
```

## Completed Features

- ✅ **Base Account Integration** - Passkey-based smart wallet authentication
- ✅ **Gasless Transactions** - Coinbase Paymaster sponsoring all gas fees
- ✅ **Binary Options Trading** - Simple UP/DOWN predictions
- ✅ **Swipe Interface** - Tinder-style card swipe UX
- ✅ **Multi-Asset Support** - BTC, ETH, SOL, XRP, BNB, DOGE, PAXG
- ✅ **Expiry Filtering** - Filter options by 24h, 7d, 30d, or all
- ✅ **Portfolio Tracking** - Supabase-powered position storage
- ✅ **Transaction History** - BaseScan links for all trades
- ✅ **Bet Size Configuration** - Customize default bet amounts
- ✅ **Responsive Design** - Mobile-first Tailwind CSS
- ✅ **Farcaster MiniApp** - Works in Farcaster clients

## Roadmap

- [ ] **Leaderboard** - Global rankings by profit/win rate
- [ ] **AI Predictions** - Moon AI for market insights
- [ ] **Real-time Updates** - WebSocket price feeds
- [ ] **Position Settlement** - Exercise/claim winning bets
- [ ] **P&L Dashboard** - Track profits and losses over time
- [ ] **Social Features** - Share bets, follow top traders
- [ ] **Multi-chain** - Expand to Arbitrum, Optimism

## Key Technologies

### Base Account SDK
- Passkey authentication (no seed phrases)
- Instant smart wallet creation
- ERC-4337 account abstraction
- Built-in session keys

### Coinbase Paymaster
- Gasless transactions for all users
- EIP-5792 `wallet_sendCalls` support
- Automatic gas sponsorship
- No user gas token required

### Thetanuts Protocol
- On-chain options orderbook
- Maker/taker model
- EIP-712 signed orders
- USDC collateral settlement

## License

MIT

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

For major changes, please open an issue first to discuss what you would like to change.

## Security

This is experimental software. Use at your own risk. Never invest more than you can afford to lose.

**Not audited. Not financial advice.**

## Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/moonstack/issues)
- **Docs**: See `.docs/plans/` directory for implementation details
- **Base**: [base.org](https://base.org/)
- **Thetanuts**: [thetanuts.finance](https://thetanuts.finance/)

## Acknowledgments

- [Thetanuts Finance](https://thetanuts.finance/) - Options protocol and API
- [Base](https://base.org/) - Ethereum L2 network
- [Coinbase Developer Platform](https://portal.cdp.coinbase.com) - Paymaster and bundler
- [OnchainKit](https://onchainkit.xyz/) - React components
- [Farcaster](https://www.farcaster.xyz/) - Decentralized social protocol

---

**Built with ❤️ on Base**
