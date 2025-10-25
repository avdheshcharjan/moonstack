# Batch Transactions with Base Paymaster - Implementation Summary

## Overview

Implemented batch transaction functionality for the swipe-to-bet interface with USDC betting and gas sponsorship via Coinbase's Base Paymaster using ERC-4337 Account Abstraction.

## What Was Implemented

### 1. Smart Account Infrastructure (`src/lib/smartAccount.ts`)
- Created smart account client configuration using `permissionless` library
- Integrated with ERC-4337 EntryPoint v0.7
- Configured for Coinbase Bundler and Paymaster endpoints
- Supports signing via browser wallet (MetaMask, etc.)

### 2. Paymaster Integration (`src/lib/paymaster.ts`)
- Implemented `pm_getPaymasterStubData` for gas estimation
- Implemented `pm_getPaymasterData` for paymaster signatures
- Provides gas sponsorship configuration checking
- Enables gasless transactions for users

### 3. USDC Token Management (`src/utils/usdcApproval.ts`)
- USDC allowance checking for OptionBook contract
- USDC approval encoding for batch approvals
- Total USDC calculation for batches
- USDC balance checking
- Helper functions for formatting/parsing USDC amounts (6 decimals)

### 4. Batch Transaction Hook (`src/hooks/useBatchTransactions.ts`)
- State management for batch queue
- Add/remove bets from batch
- Batch mode toggle
- Batch execution coordination
- Transaction status tracking per bet

### 5. Batch Execution Service (`src/services/batchExecution.ts`)
- Sequential execution of batched bets
- Automatic USDC approval if needed
- Smart account transaction sending
- Integration with Supabase for position storage
- Error handling for individual bet failures

### 6. Transaction Status Hook (`src/hooks/useTransactionStatus.ts`)
- Real-time transaction monitoring
- Confirmation counting
- Status polling (pending, confirming, confirmed, failed)
- BaseScan integration for transaction links

### 7. UI Components

#### BatchConfirmationModal (`src/components/market/BatchConfirmationModal.tsx`)
- Visual review of pending bets
- Total USDC calculation display
- Individual bet removal
- Real-time execution status per bet
- Gas sponsorship indicator
- BaseScan transaction links

#### Updated SwipeView (`src/components/market/SwipeView.tsx`)
- Batch mode toggle button
- "Review Batch" button with count
- "Clear All" batch button
- Modal integration
- Batch execution flow

#### Updated CardStack (`src/components/market/CardStack.tsx`)
- Compatible with both immediate and batch modes
- Continues to next card after batch add

### 8. Contract Configuration Updates (`src/utils/contracts.ts`)
- Added EntryPoint v0.7 address
- Added Bundler URL configuration
- Added Paymaster URL configuration

### 9. Environment Configuration (`.env.example`)
- Template for Coinbase Developer Platform credentials
- Paymaster URL configuration
- Bundler URL configuration
- CDP Project ID and API Key placeholders

## Setup Instructions

### 1. Install Dependencies
```bash
npm install permissionless viem
```

### 2. Configure Coinbase Developer Platform

1. Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com)
2. Create a new project or use existing
3. Activate Paymaster (get 0.25 ETH in gas credits automatically)
4. Configure Gas Policy:
   - Allowlist OptionBook contract: `0xd58b814C7Ce700f251722b5555e25aE0fa8169A1`
   - Allowlist USDC contract: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in:

```bash
# From CDP dashboard
NEXT_PUBLIC_PAYMASTER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID
NEXT_PUBLIC_BUNDLER_URL=https://api.developer.coinbase.com/rpc/v1/base/YOUR_PROJECT_ID
CDP_PROJECT_ID=your_project_id_here
CDP_API_KEY=your_api_key_here
```

## How It Works

### Batch Mode Flow

1. **Enable Batch Mode**: User clicks "Batch Mode" toggle
2. **Add Bets**: Swiping left/right adds bets to queue instead of executing
3. **Review Batch**: Click "Review Batch (N)" to open confirmation modal
4. **Execute Batch**:
   - Creates smart account from user's EOA
   - Checks USDC balance
   - Approves USDC for total batch amount (if needed)
   - Executes each bet sequentially
   - Gas fees sponsored by Base Paymaster
   - Stores positions in Supabase
5. **Track Progress**: Real-time status updates per bet
6. **View Transactions**: Click links to view on BaseScan

### Gas Sponsorship

- All transaction gas fees are sponsored by Coinbase's Base Paymaster
- Users only need USDC for betting (no ETH required)
- Gas policy enforced via contract allowlist in CDP dashboard

### Immediate Mode

- Batch mode can be toggled off
- Returns to traditional single-bet execution
- Still uses smart accounts and paymaster sponsorship

## Key Benefits

1. **Gasless Experience**: Users don't need ETH, only USDC
2. **Batch Efficiency**: Queue multiple bets before executing
3. **Cost Savings**: Gas sponsored by paymaster
4. **Smart Account**: ERC-4337 features (recovery, session keys possible later)
5. **Transparent**: Real-time status and BaseScan links

## Architecture

```
User Wallet (EOA)
    ↓
Smart Account (ERC-4337)
    ↓
Batch Execution Service
    ↓
    ├─→ USDC Approval (if needed)
    └─→ Bet Execution Loop
         ├─→ Encode fillOrder call
         ├─→ Send UserOperation
         ├─→ Bundler processes
         ├─→ Paymaster sponsors gas
         └─→ Store position in Supabase
```

## Files Created

- `src/lib/smartAccount.ts` - Smart account configuration
- `src/lib/paymaster.ts` - Paymaster integration
- `src/hooks/useBatchTransactions.ts` - Batch state management
- `src/hooks/useTransactionStatus.ts` - Transaction monitoring
- `src/services/batchExecution.ts` - Batch execution logic
- `src/utils/usdcApproval.ts` - USDC token utilities
- `src/components/market/BatchConfirmationModal.tsx` - Batch review UI
- `.env.example` - Environment configuration template

## Files Modified

- `src/components/market/SwipeView.tsx` - Added batch mode UI
- `src/components/market/CardStack.tsx` - Batch compatibility
- `src/utils/contracts.ts` - Added constants
- `package.json` - Added permissionless dependency

## Next Steps

To use this feature:

1. Set up Coinbase Developer Platform project
2. Add environment variables to `.env.local`
3. Configure gas policy allowlist in CDP dashboard
4. Run the app: `npm run dev`
5. Connect wallet and toggle "Batch Mode"
6. Swipe to add bets to batch
7. Review and execute batch

## Support

- [Coinbase Paymaster Docs](https://docs.cdp.coinbase.com/paymaster/introduction/welcome)
- [ERC-4337 Docs](https://docs.erc4337.io/)
- [Permissionless.js Docs](https://docs.pimlico.io/permissionless)
- [CDP Discord](https://discord.com/channels/1220414409550336183/1233164126251909190) - #paymaster channel
