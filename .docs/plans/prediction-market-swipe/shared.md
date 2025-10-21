# Prediction Market Swipe - Architecture Overview

The codebase uses a monolithic React component (`ThetanutsTradingDemo.tsx`) handling all trading logic via ethers.js v6 on Base L2. Binary options are fetched from a Cloudflare Workers API, transformed via `parseOrder()`, and traded through the OptionBook contract with USDC collateral. State is managed with React Hooks and positions persist to localStorage per wallet. The swipe feature will extract reusable patterns (wallet, trading, parsing) into hooks/utils and create new swipe-specific components using framer-motion for gestures.

## Relevant Files

### Core Components
- `/src/components/ThetanutsTradingDemo.tsx` - Main monolithic component (1222 lines), contains all trading logic, wallet connection, order parsing, and UI state
- `/src/app/page.tsx` - Home page wrapper, renders ThetanutsTradingDemo
- `/src/app/layout.tsx` - Root layout with metadata
- `/src/app/faq/page.tsx` - FAQ page with categories

### API & Data
- `/src/app/api/orders/route.ts` - Next.js API proxy to Cloudflare Workers endpoint
- `/Pricing.txt` - Example binary options data with implied probabilities

### Type Definitions
- `/src/global.d.ts` - Window.ethereum interface (MetaMask)

### Documentation
- `/OptionBook.md` - Contract integration guide, addresses, ABIs, error scenarios
- `/surge.png` - Target card design reference (dark theme, probability indicators)
- `/mybets.png` - My Bets section layout reference

### Research Docs (Planning Phase)
- `/.docs/plans/prediction-market-swipe/requirements.md` - Feature requirements and acceptance criteria
- `/.docs/plans/prediction-market-swipe/component-architecture.docs.md` - Component breakdown and extraction opportunities
- `/.docs/plans/prediction-market-swipe/api-data-layer.docs.md` - API structure and data transformations
- `/.docs/plans/prediction-market-swipe/web3-integration.docs.md` - Web3 patterns and contract interactions
- `/.docs/plans/prediction-market-swipe/types-interfaces.docs.md` - TypeScript types inventory

## Relevant Tables

None - no database tables (all data from API, positions in localStorage)

## Relevant Patterns

**parseOrder transformation** (`ThetanutsTradingDemo.tsx:405-446`): Converts raw API data (strikes/prices scaled 1e8, collateral in wei) to display format, identifies strategy type by strike count, extracts binary name if present.

**USDC approval pattern** (`ThetanutsTradingDemo.tsx:232-244`): Always check `allowance()` before `approve()` to avoid unnecessary transactions, approve exact required amount for OptionBook contract.

**buyOption flow** (`ThetanutsTradingDemo.tsx:212-310`): Complete trading sequence - check allowance, approve if needed, execute fillOrder with unmodified order params (except numContracts), wait for confirmation, save to localStorage, show toasts.

**Wallet connection** (`ThetanutsTradingDemo.tsx:136-194`): BrowserProvider from window.ethereum, request accounts, switch/add Base network (8453), event listeners for accountsChanged/chainChanged.

**LocalStorage per wallet** (`ThetanutsTradingDemo.tsx:318-334`): Key pattern `positions_${walletAddress}`, reconstruct Date objects after JSON.parse, separate storage per connected wallet.

**Decimal conversions**: USDC = 6 decimals (parseUnits), strikes/prices = 8 decimals (÷1e8), WETH = 18 decimals, always Math.floor() for contract calculations to avoid exceeding approved amounts.

**Toast notifications** (`ThetanutsTradingDemo.tsx:197-209, 1179-1216`): Auto-dismiss after 10s, color-coded by type (success/error/info), BaseScan links for transaction hashes, stacked bottom-right.

**Binary identification**: `order.type === 'binaries'`, has `name` field ("Weekly 100k Down"), 2 strikes defining range, isCall determines direction (true=Up, false=Down).

**Filtering logic** (`ThetanutsTradingDemo.tsx:362-402`): Filter by type (binaries vs regular), by asset (priceFeed address matching BTC/ETH feeds), by collateral (USDC/WETH only), by strategy (strike count).

## Relevant Docs

**`/OptionBook.md`**: You _must_ read this when working on contract interactions, transaction execution, error handling, network configuration.

**`/.docs/plans/prediction-market-swipe/requirements.md`**: You _must_ read this when working on swipe UI, card design, user flows, acceptance criteria, binary option pairing.

**`/.docs/plans/prediction-market-swipe/component-architecture.docs.md`**: You _must_ read this when extracting components, creating hooks, understanding current structure.

**`/.docs/plans/prediction-market-swipe/web3-integration.docs.md`**: You _must_ read this when implementing wallet connection, trading logic, USDC approvals, ethers.js v6 patterns.

**`/.docs/plans/prediction-market-swipe/api-data-layer.docs.md`**: You _must_ read this when fetching orders, parsing data, understanding binary options structure, data transformations.

**`/.docs/plans/prediction-market-swipe/types-interfaces.docs.md`**: You _must_ read this when creating type definitions, avoiding any types, understanding existing implicit types.

**`/surge.png` and `/mybets.png`**: You _must_ reference these when implementing card UI design and My Bets layout.
