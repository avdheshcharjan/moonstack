# OnchainKit Wallet Integration Setup

This document outlines the OnchainKit integration for wallet-based sign-in functionality in Moonstack.

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# OnchainKit Configuration
# Get your Client API Key from: https://portal.cdp.coinbase.com/products/onchainkit
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_client_api_key_here

# Application URL
NEXT_PUBLIC_URL=http://localhost:3000
```

## Getting Your OnchainKit API Key

1. Visit [Coinbase Developer Platform](https://portal.cdp.coinbase.com/products/onchainkit)
2. Sign in or create an account
3. Navigate to the OnchainKit section
4. Create a new project or select an existing one
5. Copy your Client API Key
6. Add it to your `.env.local` file

## Features Implemented

### 1. **Wallet Provider Setup**
- Integrated OnchainKit with Wagmi and React Query
- Configured Coinbase Wallet with smart wallet support
- Set up Base mainnet and Base Sepolia testnet support

### 2. **Wallet Sign-In Component**
- Added OnchainKit Wallet component to TopBar
- Displays user avatar and name when connected
- Includes dropdown with:
  - Identity information (Avatar, Name, Address)
  - Copy address functionality
  - Disconnect option

### 3. **Wallet Context**
- Updated WalletContext to use Wagmi hooks
- Maintains backward compatibility with existing wallet state management
- Provides `walletAddress`, `chainId`, `isConnecting` state
- Exposes `connectWallet()` and `disconnectWallet()` methods

## Files Modified

1. **src/app/layout.tsx** - Added OnchainKit styles import and Providers wrapper
2. **src/providers/Providers.tsx** - Configured WagmiProvider, QueryClientProvider, and OnchainKitProvider
3. **src/wagmi.ts** - Created Wagmi configuration with Coinbase Wallet connector
4. **src/components/layout/TopBar.tsx** - Integrated OnchainKit Wallet component
5. **src/contexts/WalletContext.tsx** - Updated to use Wagmi hooks for wallet management

## Usage

### Connecting a Wallet

Users can connect their wallet by:
1. Clicking the "Connect Wallet" button in the TopBar
2. Following the Coinbase Wallet connection flow
3. Approving the connection in their wallet

### Accessing Wallet State

Throughout the app, you can access wallet state using the `useWallet` hook:

```typescript
import { useWallet } from '@/src/contexts/WalletContext';

const MyComponent = () => {
  const { walletAddress, chainId, isConnecting, connectWallet, disconnectWallet } = useWallet();
  
  // Use wallet state...
};
```

### Using Wagmi Hooks Directly

You can also use Wagmi hooks directly for more advanced functionality:

```typescript
import { useAccount, useBalance } from 'wagmi';

const MyComponent = () => {
  const { address, isConnected } = useAccount();
  const { data: balance } = useBalance({ address });
  
  // Use account and balance...
};
```

## Smart Wallet Features

The integration uses Coinbase Smart Wallet, which provides:
- **Gas sponsorship** - Users don't need ETH for gas fees
- **Social recovery** - Recover wallet with social authentication
- **Batch transactions** - Multiple transactions in one signature
- **Session keys** - Reduced signing prompts for better UX

## Testing

### Local Development
1. Set `NEXT_PUBLIC_URL=http://localhost:3000` in `.env.local`
2. Run `npm run dev`
3. Test wallet connection with Coinbase Wallet browser extension or mobile app

### Testnet (Base Sepolia)
To test on Base Sepolia testnet:
1. Update chain in `src/wagmi.ts` to use `baseSepolia` by default
2. Get testnet ETH from [Base Sepolia Faucet](https://www.coinbase.com/faucets/base-ethereum-goerli-faucet)

## Documentation

For more information, refer to:
- [OnchainKit Documentation](https://docs.base.org/onchainkit/installation/nextjs)
- [Wagmi Documentation](https://wagmi.sh/)
- [Coinbase Wallet SDK](https://docs.cloud.coinbase.com/wallet-sdk/docs)

## Troubleshooting

### Wallet Not Connecting
- Ensure your OnchainKit API key is set correctly in `.env.local`
- Check browser console for errors
- Try clearing browser cache and refreshing

### Chain Not Supported
- Verify you're connected to Base mainnet (chainId: 8453) or Base Sepolia (chainId: 84532)
- Switch networks in your wallet

### Styles Not Loading
- Ensure `@coinbase/onchainkit/styles.css` is imported before other styles in `layout.tsx`
- Clear Next.js cache: `rm -rf .next && npm run dev`

