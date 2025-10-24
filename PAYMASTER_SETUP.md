# Base Paymaster Setup Guide

This guide will help you set up gasless transactions using the Base Paymaster from Coinbase Developer Platform.

## Overview

The Base Paymaster allows you to:
- **Sponsor gas fees** for your users (gasless transactions)
- **Batch multiple transactions** into a single user operation
- **Improve UX** by removing the complexity of gas from the user experience
- Get up to **$10k monthly sponsorship** on mainnet (unlimited on testnet)

## Prerequisites

1. A Coinbase Developer Platform account
2. A project created on CDP
3. Base Paymaster enabled for your project

## Step 1: Create a Coinbase Developer Platform Account

1. Go to [https://portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
2. Sign up or log in with your Coinbase account
3. Create a new project or select an existing one

## Step 2: Configure Base Paymaster

1. Navigate to your project in CDP
2. Click on **"Paymaster"** in the left navigation
3. Go to the **"Configuration"** tab
4. Copy the **RPC URL** (it should look like: `https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY`)
5. Enable the paymaster by clicking the toggle button

## Step 3: Allowlist Your Contracts

To ensure security, you need to allowlist the contracts that the paymaster will sponsor:

1. In the Configuration page, click **"Add"** to add an allowlisted contract
2. Add the **OptionBook contract**: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
3. Add the **USDC contract**: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
4. For each contract, you can specify which functions to sponsor (or leave empty to sponsor all)

### Recommended Functions to Allowlist

**OptionBook Contract:**
- `fillOrder(tuple,bytes,address)` - For executing binary options trades

**USDC Contract:**
- `approve(address,uint256)` - For approving USDC spending

## Step 4: Set Spending Limits

Configure spending limits to control costs:

### Per User Limit
- **Max USD**: Set how much each user can spend (e.g., `$0.50` per transaction)
- **Max UserOperations**: Set how many operations per user (e.g., `10` per day)
- **Limit Cycle**: Choose when limits reset (daily, weekly, monthly)

### Global Limit
- Set a total spending limit for all users (e.g., `$100` per month)
- This prevents unexpected costs if usage spikes

## Step 5: Configure Environment Variables

1. Create a `.env.local` file in the root of your project
2. Add your Paymaster URL:

```bash
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY
```

> **Important**: Keep your API key secure! Never commit `.env.local` to version control.

## Step 6: Test Your Setup

1. Start your development server: `npm run dev`
2. Connect your wallet
3. Swipe right on a prediction card to add it to cart
4. Open the cart and click "Approve All"
5. The transaction should be executed gaslessly!

## Architecture

The gasless transaction flow works as follows:

```
User Action (Approve All)
    ↓
CartModal.tsx
    ↓
batchExecution.ts
    ↓
basePaymaster.ts
    ↓
Smart Account Client (permissionless.js)
    ↓
Base Paymaster RPC
    ↓
Base Blockchain (Gasless!)
```

## Key Files

- **`src/lib/basePaymaster.ts`**: Core paymaster integration logic
- **`src/services/batchExecution.ts`**: Batch transaction execution
- **`src/components/cart/CartModal.tsx`**: UI for approving/discarding bets

## How Batching Works

When you click "Approve All":

1. All cart transactions are collected
2. They're sent as a single **User Operation** to the smart account
3. The Base Paymaster sponsors the gas fees
4. All transactions are executed atomically (all succeed or all fail)

## Benefits

✅ **No gas fees for users** - Paymaster sponsors all transactions  
✅ **Faster UX** - Single signature for multiple transactions  
✅ **Atomic execution** - All transactions succeed or fail together  
✅ **Lower costs** - Batching reduces overall gas consumption  
✅ **Better conversion** - Users don't need ETH to transact  

## Monitoring & Analytics

Monitor your paymaster usage in the CDP dashboard:

1. Go to the **"Analytics"** tab in Paymaster
2. View:
   - Total gas sponsored
   - Number of user operations
   - Success/failure rates
   - Per-user spending

## Troubleshooting

### Error: "Paymaster not configured"
- Make sure `NEXT_PUBLIC_PAYMASTER_URL` is set in `.env.local`
- Restart your dev server after adding env variables

### Error: "Request denied - contract not allowlisted"
- Add your contract address to the allowlist in CDP
- Make sure the function signature matches exactly

### Error: "Maximum per address transaction count reached"
- User has hit their per-user limit
- Increase the limit in CDP or wait for the cycle to reset

### Error: "Max global USD spend permission reached"
- Your paymaster has hit the global spending limit
- Increase the limit in CDP dashboard

## Need Help?

- [Base Documentation](https://docs.base.org/learn/onchain-app-development/account-abstraction/gasless-transactions-with-paymaster)
- [Coinbase Developer Discord](https://discord.gg/coinbasecloud)
- [Base Discord](https://discord.gg/buildonbase)

## Next Steps

- Configure daily/weekly spending limits based on your user base
- Set up monitoring alerts for spending thresholds
- Consider implementing conditional sponsorship (e.g., only sponsor first 3 transactions per user)
- Add analytics to track user engagement with gasless features

---

**Happy Building on Base!** 🚀

