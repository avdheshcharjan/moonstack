# Environment Setup Checklist

## Required Environment Variables

Create a file named `.env.local` in the root directory with these variables:

```bash
# Base Paymaster & Bundler RPC URL
# Get your API key from https://portal.cdp.coinbase.com
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY_HERE
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_API_KEY_HERE

# App URL (for Base Account SDK)
NEXT_PUBLIC_URL=http://localhost:3000
```

## How to Get Your API Key

1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com)
2. Sign in with your Coinbase account
3. Create a new project or select existing one
4. Navigate to "Paymaster" in the left sidebar
5. Click "Configuration" tab
6. Copy the RPC URL (it includes your API key)
7. Paste it as both `NEXT_PUBLIC_PAYMASTER_URL` and `NEXT_PUBLIC_BUNDLER_URL`

## Paymaster Configuration in CDP

### 1. Enable Paymaster
- Toggle the "Enable Paymaster" switch in CDP dashboard

### 2. Allowlist Contracts
Add these contract addresses to the allowlist:

**OptionBook Contract:**
```
0xd58b814C7Ce700f251722b5555e25aE0fa8169A1
```
Functions to allowlist:
- `fillOrder(tuple,bytes,address)`

**USDC Contract:**
```
0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
```
Functions to allowlist:
- `approve(address,uint256)`

### 3. Set Spending Limits

**Per User Limits:**
- Max USD per transaction: `$0.50` (recommended)
- Max operations per day: `10` (recommended)
- Limit cycle: Daily

**Global Limits:**
- Total monthly spending: `$100` (adjust based on needs)

## Verification

After setup, check that:
- [ ] `.env.local` file created
- [ ] Both `PAYMASTER_URL` and `BUNDLER_URL` are set
- [ ] API key is valid (not placeholder)
- [ ] Paymaster is enabled in CDP
- [ ] Both contracts are allowlisted
- [ ] Spending limits are configured
- [ ] Restart dev server after creating `.env.local`

## Security Note

⚠️ **NEVER commit `.env.local` to git!**

It's already in `.gitignore`, but always verify before committing.

## Testing Setup

After configuration, test with:
```bash
npm run dev
```

Check the browser console for:
```
🔧 Paymaster Configuration: {
  paymasterConfigured: true,
  bundlerConfigured: true
}
```

If you see `false`, check that:
1. `.env.local` file exists
2. Environment variables are spelled correctly (with `NEXT_PUBLIC_` prefix)
3. Dev server was restarted after creating `.env.local`

