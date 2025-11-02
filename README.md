# Thetanuts Options Trading Demo

A React-based web application for viewing and filtering live options orders from the Thetanuts Finance API on Base blockchain.

![Demo Screenshot](https://img.shields.io/badge/status-live-brightgreen)

## Features

- 🔴 **Live Data** - Real-time options orders from Thetanuts API
- 📊 **Multiple Strategies** - View Spreads, Butterflies, and Condors
- 🎯 **Smart Filters** - Filter by strategy type and underlying asset (BTC/ETH)
- 📄 **Pagination** - 10 orders per page with easy navigation
- 💰 **Detailed Views** - Click any order to see strike prices, premiums, expiry, and max payout
- ⚡ **CORS Bypass** - Local proxy server to fetch data without CORS restrictions

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (via CDN)
- **Backend Proxy**: Express.js + Node.js
- **API**: Thetanuts Finance Options API

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/thetanuts-demo.git
cd thetanuts-demo
```

2. Install dependencies:
```bash
npm install
```

## Running the App

### Development Mode

You need to run **two servers** simultaneously:

1. **Start the CORS Proxy Server**
   ```bash
   npm run proxy
   ```
   This starts the proxy server on `http://localhost:3001`

2. **Start the Frontend Development Server**
   ```bash
   npm run dev
   ```
   This starts the Vite dev server on `http://localhost:3000`

3. **Open in Browser**
   Navigate to `http://localhost:3000`

### Production Mode

Build and run the production server:

```bash
# Build and start in one command
npm run serve

# Or run separately
npm run build
npm start
```

This will:
- Build the React app to `/dist`
- Start the Express server on port 3001
- Serve the frontend and API routes from the same server

## How It Works

### CORS Bypass Solution
The Thetanuts API doesn't allow direct browser requests due to CORS restrictions. This app uses a local Node.js proxy server that:
1. Receives requests from the React frontend
2. Fetches data from the Thetanuts API (server-to-server, no CORS)
3. Returns the data to the frontend

### Data Flow
```
React App (localhost:3000)
    ↓
Local Proxy (localhost:3001)
    ↓
Thetanuts API (round-snowflake-9c31.devops-118.workers.dev)
    ↓
Returns: Live options orders + market data
```

## Project Structure

```
thetanuts-demo/
├── src/
│   ├── App.tsx          # Main React component
│   └── main.tsx         # React entry point
├── proxy-server.js      # Express proxy server
├── index.html           # HTML template
├── package.json         # Dependencies and scripts
├── vite.config.ts       # Vite configuration
└── tsconfig.json        # TypeScript configuration
```

## Available Scripts

- `npm run dev` - Start the frontend development server
- `npm run proxy` - Start the CORS proxy server (for development)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run serve` - Build and start production server
- `npm run preview` - Preview production build with Vite

## Features Breakdown

### Filter Orders
- **By Strategy Type**: Spreads (2 strikes), Butterflies (3 strikes), Condors (4 strikes)
- **By Asset**: Bitcoin (BTC) or Ethereum (ETH)
- **Automatic**: Only shows USDC collateral orders

### View Order Details
Click any order card to see:
- Strike prices visualization
- Premium per contract
- Maximum payout
- Expiry date and days remaining
- Max position size
- Code example for buying the option

### Pagination
- 10 orders per page
- Previous/Next navigation
- Shows current page and total pages
- Displays order range (e.g., "Showing 1-10 of 45")

## API Response Format

The Thetanuts API returns data in this structure:
```json
{
  "data": {
    "orders": [
      {
        "order": {
          "maker": "0x...",
          "collateral": "0x...",
          "isCall": true,
          "priceFeed": "0x...",
          "strikes": ["95000000000", "105000000000"],
          "expiry": 1234567890,
          "price": "500000000",
          "maxCollateralUsable": "10000000000",
          ...
        },
        "signature": "0x..."
      }
    ],
    "market_data": {
      "BTC": 98500,
      "ETH": 3520
    }
  }
}
```

## Contract Addresses (Base)

- **OptionBook Contract**: `0xd58b...69A1`
- **USDC (Collateral)**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- **BTC Price Feed**: `0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F`
- **ETH Price Feed**: `0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70`

## Development Notes

### Price Formatting
- Strikes: Divided by `1e8` (e.g., `9500000000000` → `$95,000`)
- Prices: Divided by `1e8` (e.g., `500000000` → `$5.00`)
- Collateral: Divided by `1e6` for USDC (6 decimals)

### Strategy Detection
```typescript
if (strikes.length === 2) → SPREAD
if (strikes.length === 3) → BUTTERFLY
if (strikes.length === 4) → CONDOR
```

## Troubleshooting

### No data showing?
1. Make sure both servers are running (`npm run proxy` and `npm run dev`)
2. Check browser console for errors
3. Verify proxy is accessible at `http://localhost:3001/api/orders`

### CORS errors?
The proxy server should handle this. If you still see CORS errors, restart the proxy server.

### Port already in use?
Change the port in `vite.config.ts` (frontend) or `proxy-server.js` (backend).

## Deployment

### Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Set environment variables in Vercel project settings:
   - `API_URL` - Your Thetanuts API endpoint
   - `ARBITRUM_RPC_URL` - Arbitrum RPC endpoint (optional)

3. Deploy:
   ```bash
   vercel deploy --prod
   ```

The `vercel.json` configuration will automatically:
- Build the frontend to `/dist`
- Route all `/api/*` requests to `server.js`
- Serve the frontend from `server.js`

## Environment Variables

Create a `.env` file in the root directory (see `.env.example`):

```env
API_URL=[TNUTS]
PORT=3000
```

## Completed Features

- ✅ Wallet connection (MetaMask)
- ✅ Buy/sell functionality with on-chain execution
- ✅ Portfolio tracking with localStorage
- ✅ Bet sizing options
- ✅ Transaction history with BaseScan links

## Future Enhancements

- [ ] Add real-time price updates via WebSocket
- [ ] Show Greeks (Delta, Gamma, Theta, Vega)
- [ ] Add profit/loss calculator
- [ ] Display historical order data
- [ ] Exercise/settle positions UI



## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.

## Acknowledgments

- [Thetanuts Finance](https://thetanuts.finance/) for the options API
- Built on [Base](https://base.org/) - Ethereum L2
