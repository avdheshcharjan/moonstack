# 🚀 Quick Start Guide - OnchainKit Wallet Integration

Your Moonstack app is now integrated with OnchainKit for seamless wallet sign-in! Follow these steps to get started.

## ⚡️ Setup (2 minutes)

### 1. Get Your OnchainKit API Key

Visit [Coinbase Developer Platform](https://portal.cdp.coinbase.com/products/onchainkit) to get your free API key.

### 2. Set Environment Variable

Create a `.env.local` file in your project root:

```bash
# Copy this to .env.local
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_api_key_here
NEXT_PUBLIC_URL=http://localhost:3000
```

### 3. Start the Development Server

```bash
npm run dev
```

## ✅ What's Been Integrated

### 🎨 Visual Changes
- **TopBar**: Now includes a beautiful Wallet button in the top-right corner
  - When disconnected: Shows "Connect Wallet" button
  - When connected: Shows user avatar, name/basename, and address
  - Dropdown menu with disconnect option

### 🔧 Technical Changes

1. **Wagmi Configuration** (`src/wagmi.ts`)
   - Configured with Base mainnet and Base Sepolia testnet
   - Coinbase Wallet connector with smart wallet support

2. **Provider Setup** (`src/providers/Providers.tsx`)
   - WagmiProvider for wallet connections
   - QueryClientProvider for data fetching
   - OnchainKitProvider for OnchainKit components

3. **Layout** (`src/app/layout.tsx`)
   - Added OnchainKit styles
   - Properly wrapped with all providers

4. **Wallet Context** (`src/contexts/WalletContext.tsx`)
   - Now uses Wagmi hooks under the hood
   - Maintains backward compatibility with existing code
   - Same API: `useWallet()` hook still works everywhere

5. **TopBar Component** (`src/components/layout/TopBar.tsx`)
   - Integrated OnchainKit Wallet components
   - Beautiful UI with avatar, name, and address display
   - One-click copy address functionality

## 🎯 How to Use

### For End Users

1. Click the "Connect Wallet" button in the top-right corner
2. Choose to create a new wallet or connect existing one
3. Approve the connection
4. Start using the app!

### For Developers

The `useWallet()` hook works exactly as before:

```typescript
import { useWallet } from '@/src/contexts/WalletContext';

function MyComponent() {
  const { 
    walletAddress,    // User's wallet address (or null)
    chainId,          // Current chain ID
    isConnecting,     // Loading state
    connectWallet,    // Function to trigger connection
    disconnectWallet  // Function to disconnect
  } = useWallet();
  
  // Your code...
}
```

You can also use Wagmi hooks directly for advanced features:

```typescript
import { useAccount, useBalance, useSignMessage } from 'wagmi';

function AdvancedComponent() {
  const { address } = useAccount();
  const { data: balance } = useBalance({ address });
  const { signMessage } = useSignMessage();
  
  // Advanced wallet interactions...
}
```

## 🎨 Customization

### Change Wallet Button Appearance

Edit `src/components/layout/TopBar.tsx`:

```typescript
<ConnectWallet>
  <Avatar className="h-6 w-6" />
  <Name />
  {/* Add more components or customize styling */}
</ConnectWallet>
```

### Add More Wallet Connectors

Edit `src/wagmi.ts` to add MetaMask, WalletConnect, etc.:

```typescript
import { metaMask, walletConnect } from 'wagmi/connectors';

connectors: [
  coinbaseWallet({ ... }),
  metaMask(),
  walletConnect({ projectId: 'YOUR_PROJECT_ID' }),
]
```

## 🧪 Testing

1. **Local Testing**: Just run `npm run dev` and click the wallet button
2. **Testnet**: Change `base` to `baseSepolia` in `src/wagmi.ts`
3. **Production**: Deploy and ensure `NEXT_PUBLIC_ONCHAINKIT_API_KEY` is set

## 📚 Learn More

- [OnchainKit Components](https://docs.base.org/onchainkit)
- [Wagmi Documentation](https://wagmi.sh)
- [Base Network Docs](https://docs.base.org)

## 🎉 You're All Set!

Your app now has:
- ✅ Beautiful wallet connection UI
- ✅ Smart wallet support (no gas fees!)
- ✅ Base network integration
- ✅ Basename support
- ✅ Avatar and identity display
- ✅ Full backward compatibility

Just add your API key and start developing! 🚀

