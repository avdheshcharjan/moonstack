# Quick Start Guide - Gasless Cart Transactions

## 🚀 Get Started in 5 Minutes

### Step 1: Get Your Base Paymaster API Key

1. Go to [https://portal.cdp.coinbase.com](https://portal.cdp.coinbase.com)
2. Sign in or create an account
3. Create a new project (or select existing)
4. Navigate to **Paymaster** in the left sidebar
5. Copy your **RPC URL** (looks like: `https://api.developer.coinbase.com/rpc/v1/base/abc123...`)

### Step 2: Configure Environment

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY
```

> Replace `YOUR_API_KEY` with your actual API key from step 1.

### Step 3: Enable & Configure Paymaster

In the Coinbase Developer Platform:

1. **Enable Paymaster**: Toggle the switch to ON
2. **Add Allowlisted Contracts**:
   - Click "Add" button
   - Add `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1` (OptionBook)
   - Add `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` (USDC)
   - Leave functions empty (or specify `fillOrder` and `approve`)
3. **Set Per-User Limits**:
   - Max USD: `$0.50`
   - Max UserOperations: `10`
   - Cycle: Daily
4. **Set Global Limit**:
   - Max USD: `$100.00` (adjust based on your needs)

### Step 4: Start the App

```bash
npm install  # Install dependencies if needed
npm run dev  # Start development server
```

### Step 5: Test It Out!

1. **Open** `http://localhost:3000` in your browser
2. **Connect** your wallet (Base Account or any wallet)
3. **Swipe right** on 2-3 prediction cards to add them to cart
4. **Tap the cart icon** (bottom navigation)
5. **Click "Approve All"** (green button)
6. **Sign once** in your wallet popup
7. **Watch** all transactions execute gaslessly! ✨

## 🎯 What Just Happened?

- ✅ All transactions batched into a single User Operation
- ✅ Gas fees sponsored by Base Paymaster (zero cost to user)
- ✅ Atomic execution (all succeed or all fail)
- ✅ One signature, multiple transactions

## 📊 Monitor Usage

View your paymaster usage in the CDP dashboard:
- Go to **Paymaster** → **Analytics** tab
- See total gas sponsored, user operations, success rates

## 🔧 Troubleshooting

### "Paymaster not configured" error
```bash
# Make sure .env.local exists and has correct URL
cat .env.local

# Restart dev server
npm run dev
```

### "Request denied - contract not allowlisted"
- Go to CDP → Paymaster → Configuration
- Verify contracts are in the allowlist
- Wait 1-2 minutes for changes to propagate

### Nothing happens when clicking "Approve All"
- Check browser console for errors (F12 → Console)
- Verify wallet is connected
- Ensure cart has items

## 📚 Detailed Documentation

For more information, see:
- **`PAYMASTER_SETUP.md`** - Detailed paymaster configuration
- **`CART_IMPLEMENTATION.md`** - Technical implementation details

## 🆘 Need Help?

- **Discord**: [Base Discord](https://discord.gg/buildonbase)
- **Docs**: [Base Paymaster Docs](https://docs.base.org/learn/onchain-app-development/account-abstraction/gasless-transactions-with-paymaster)
- **Support**: [Coinbase Developer Platform](https://portal.cdp.coinbase.com)

---

**You're all set!** Your users can now make gasless transactions on Base. 🎉

