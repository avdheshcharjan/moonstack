import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, parseUnits } from 'ethers';
import { useWallet } from '@/src/hooks/useWallet';
import SwipeView from '@/src/components/market/SwipeView';
import BetSettings from '@/src/components/settings/BetSettings';
import MyBets from '@/src/components/bets/MyBets';
import { UserPosition } from '@/src/types/orders';
import RollingNumber from '@/src/components/shared/RollingNumber';

// OptionBook contract address on Base (v2 - r10)
const OPTION_BOOK_ADDRESS = '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1';

// USDC contract address on Base
const USDC_ADDRESS = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

// Your unique referrer address for tracking positions
const REFERRER_ADDRESS = '0x0000000000000000000000000000000000000001'; // TODO: Replace with your actual referrer address

// OptionBook ABI (v2) - uses fillOrder method
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
  }
];

const ERC20_ABI = [
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
];

interface Toast {
  id: number;
  message: string;
  txHash?: string;
  type: 'success' | 'error' | 'info';
}

const ThetanutsTradingDemo = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [showBinaries, setShowBinaries] = useState(true);
  const [marketData, setMarketData] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [fetchStatus, setFetchStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;

  // Wallet state - using hook
  const { walletAddress, chainId, isConnecting, connectWallet, disconnectWallet } = useWallet();

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isBuying, setIsBuying] = useState(false);

  // Page navigation
  const [currentView, setCurrentView] = useState<'market' | 'profile'>('market');

  // View mode toggle
  const [viewMode, setViewMode] = useState<'grid' | 'swipe'>('grid');

  // User positions (stored in localStorage)
  const [userPositions, setUserPositions] = useState<UserPosition[]>([]);

  // Bet size selection
  const [selectedBetSize, setSelectedBetSize] = useState(1);

  // Fetch orders from API
  const fetchOrders = async () => {
    setLoading(true);
    setFetchStatus('Fetching live data...');

    // Use Next.js API route
    const ordersUrl = '/api/orders';

    try {
      setFetchStatus('Fetching orders...');
      console.log('Fetching from Next.js API:', ordersUrl);

      const response = await fetch(ordersUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data && data.data) {
        setOrders(data.data.orders || []);
        setMarketData(data.data.market_data || {});
        setFetchStatus(`✅ Live data loaded! (${data.data.orders?.length || 0} orders)`);
        setLoading(false);
        console.log('✅ Successfully fetched real data!');
        return; // Success!
      } else if (data.error) {
        throw new Error(data.message || 'API error');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Failed to fetch orders:', errorMessage);
      setFetchStatus(`❌ Failed to load data: ${errorMessage}`);
      setOrders([]);
      setMarketData(null);
      setLoading(false);
    }
  };


  // Toast functions
  const addToast = (message: string, type: 'success' | 'error' | 'info', txHash?: string) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, txHash }]);

    // Auto-remove after 10 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 10000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Buy option function
  const buyOption = async (collateralAmount: number) => {
    if (!selectedOrder || !walletAddress) return;

    try {
      setIsBuying(true);
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      // Create contract instances
      const usdcContract = new Contract(USDC_ADDRESS, ERC20_ABI, signer);
      const optionBookContract = new Contract(OPTION_BOOK_ADDRESS, OPTION_BOOK_ABI, signer);

      // Calculate number of contracts based on USDC amount and premium
      const pricePerContract = Number(selectedOrder.rawOrder.order.price) / 1e8; // Price in USDC
      const contractsToBuy = collateralAmount / pricePerContract;

      // Scale by 6 decimals (USDC) and round down
      const numContracts = Math.floor(contractsToBuy * 1e6);
      const requiredAmount = parseUnits(collateralAmount.toString(), 6);

      addToast('Checking USDC allowance...', 'info');

      // Check allowance
      const allowance = await usdcContract.allowance(walletAddress, OPTION_BOOK_ADDRESS);

      // If allowance is insufficient, approve
      if (allowance < requiredAmount) {
        addToast('Approving USDC...', 'info');
        const approveTx = await usdcContract.approve(OPTION_BOOK_ADDRESS, requiredAmount);
        addToast('Waiting for approval confirmation...', 'info');
        await approveTx.wait();
        addToast('USDC approved!', 'success');
      }

      addToast('Executing fillOrder...', 'info');

      // Prepare order parameters (DO NOT modify order fields - signature will fail!)
      const rawOrder = selectedOrder.rawOrder.order;
      const orderParams = {
        maker: rawOrder.maker,
        orderExpiryTimestamp: rawOrder.orderExpiryTimestamp,
        collateral: rawOrder.collateral,
        isCall: rawOrder.isCall,
        priceFeed: rawOrder.priceFeed,
        implementation: rawOrder.implementation,
        isLong: rawOrder.isLong,
        maxCollateralUsable: rawOrder.maxCollateralUsable,
        strikes: rawOrder.strikes,
        expiry: rawOrder.expiry,
        price: rawOrder.price,
        numContracts: numContracts.toString(),
        extraOptionData: rawOrder.extraOptionData || "0x"
      };

      // Execute the fillOrder transaction
      const tx = await optionBookContract.fillOrder(
        orderParams,
        selectedOrder.rawOrder.signature,
        REFERRER_ADDRESS
      );

      addToast('Transaction submitted! Waiting for confirmation...', 'info');

      const receipt = await tx.wait();

      addToast('Option purchased successfully!', 'success', receipt.hash);

      // Save position to localStorage
      const newPosition = {
        id: receipt.hash,
        timestamp: Date.now(),
        order: selectedOrder,
        collateralUsed: collateralAmount,
        txHash: receipt.hash,
        status: 'active'
      };

      const updatedPositions = [...userPositions, newPosition];
      setUserPositions(updatedPositions);
      localStorage.setItem(`positions_${walletAddress}`, JSON.stringify(updatedPositions));

      // Refresh orders after successful purchase
      setTimeout(() => fetchOrders(), 2000);

    } catch (error: unknown) {
      console.error('Error buying option:', error);

      let errorMessage = 'Failed to buy option';
      if (error instanceof Error) {
        if ('code' in error && error.code === 'ACTION_REJECTED') {
          errorMessage = 'Transaction rejected by user';
        } else if (error.message) {
          errorMessage = error.message.slice(0, 100);
        }
      }

      addToast(errorMessage, 'error');
    } finally {
      setIsBuying(false);
    }
  };

  // Load orders on mount
  useEffect(() => {
    fetchOrders();
  }, []);

  // Load user positions from localStorage
  useEffect(() => {
    if (walletAddress) {
      const stored = localStorage.getItem(`positions_${walletAddress}`);
      if (stored) {
        const positions = JSON.parse(stored) as UserPosition[];
        // Reconstruct Date objects
        const reconstructed = positions.map((pos) => ({
          ...pos,
          order: {
            ...pos.order,
            expiry: new Date(pos.order.expiry)
          }
        }));
        setUserPositions(reconstructed);
      }
    }
  }, [walletAddress]);

  // Filter orders
  useEffect(() => {
    let filtered = orders;

    // Split into binaries and regular options
    const binaries = filtered.filter(o => o.order.type === 'binaries');
    const regularOptions = filtered.filter(o => o.order.type !== 'binaries' && o.order.strikes.length >= 2);

    // Start with appropriate set based on showBinaries
    if (showBinaries) {
      filtered = binaries;
    } else {
      filtered = regularOptions;

      // Filter by strategy (strike count) - only for regular options
      if (selectedStrategy !== 'all') {
        const strikeCount = parseInt(selectedStrategy);
        filtered = filtered.filter(o => o.order.strikes.length === strikeCount);
      }
    }

    // Filter by asset (applies to both binaries and regular options)
    if (selectedAsset !== 'all') {
      const BTC_FEED = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F';
      const ETH_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70';
      const feed = selectedAsset === 'BTC' ? BTC_FEED : ETH_FEED;
      filtered = filtered.filter(o =>
        o.order.priceFeed.toLowerCase() === feed.toLowerCase()
      );
    }

    // Only USDC collateral (or ETH for calls)
    const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const WETH = '0x4200000000000000000000000000000000000006';
    filtered = filtered.filter(o => {
      const collateral = o.order.collateral.toLowerCase();
      return collateral === USDC.toLowerCase() || collateral === WETH.toLowerCase();
    });

    setFilteredOrders(filtered);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [orders, selectedStrategy, selectedAsset, showBinaries]);

  // Parse order helper
  const parseOrder = (orderData) => {
    const order = orderData.order;
    const strikes = order.strikes.map(s => Number(s) / 1e8);
    const price = Number(order.price) / 1e8;

    // Handle collateral decimals - USDC is 6, WETH is 18
    const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    const isUSDC = order.collateral.toLowerCase() === USDC.toLowerCase();
    const decimals = isUSDC ? 1e6 : 1e18;
    const maxSize = Number(order.maxCollateralUsable) / decimals;

    // Check if this is a binary option
    const isBinary = order.type === 'binaries';

    let strategyType;
    if (isBinary) {
      strategyType = 'BINARY';
    } else if (strikes.length === 2) {
      strategyType = 'SPREAD';
    } else if (strikes.length === 3) {
      strategyType = 'BUTTERFLY';
    } else if (strikes.length === 4) {
      strategyType = 'CONDOR';
    }

    const BTC_FEED = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F';
    const underlying = order.priceFeed.toLowerCase() === BTC_FEED.toLowerCase() ? 'BTC' : 'ETH';

    return {
      strategyType,
      underlying,
      isCall: order.isCall,
      strikes,
      strikeWidth: strikes.length >= 2 ? Math.abs(strikes[1] - strikes[0]) : 0,
      expiry: new Date(order.expiry * 1000),
      pricePerContract: price,
      maxSize,
      rawOrder: orderData,
      isBinary,
      binaryName: isBinary ? order.name : undefined
    };
  };

  // Calculate max payout
  const calculateMaxPayout = (strikes, numContracts = 1) => {
    if (!strikes || strikes.length < 2) return 0;

    let strikeWidth;
    if (strikes.length === 2) {
      strikeWidth = Math.abs(strikes[1] - strikes[0]);
    } else if (strikes.length === 3) {
      strikeWidth = strikes[1] - strikes[0];
    } else if (strikes.length === 4) {
      strikeWidth = strikes[1] - strikes[0];
    } else {
      strikeWidth = 0;
    }
    return strikeWidth * numContracts;
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">Thetanuts Options Trading</h1>
            <p className="text-blue-100">Decentralized Options on Base - Live Order Book</p>
            {fetchStatus && (
              <div className="mt-2 text-sm bg-white/20 rounded px-3 py-1 inline-block">
                {fetchStatus}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 items-end">
            {orders.length > 0 && (
              <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                🔴 LIVE DATA
              </div>
            )}
            {!walletAddress ? (
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-white text-blue-600 px-4 py-2 rounded-lg font-bold hover:bg-blue-50 transition disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="bg-white/20 rounded-lg px-4 py-2 text-sm">
                  <div className="font-mono">
                    {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                  </div>
                  {chainId === 8453 ? (
                    <div className="text-xs text-green-300">✓ Base Network</div>
                  ) : (
                    <div className="text-xs text-yellow-300">⚠ Wrong Network</div>
                  )}
                </div>
                <button
                  onClick={disconnectWallet}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-2 border-b border-white/20 pb-2">
          <button
            onClick={() => setCurrentView('market')}
            className={`px-4 py-2 rounded-t font-semibold transition ${
              currentView === 'market'
                ? 'bg-white text-blue-600'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Market
          </button>
          <button
            onClick={() => setCurrentView('profile')}
            className={`px-4 py-2 rounded-t font-semibold transition ${
              currentView === 'profile'
                ? 'bg-white text-blue-600'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            My Positions {userPositions.length > 0 && `(${userPositions.length})`}
          </button>
        </div>

        {currentView === 'market' && marketData && (
          <div className="mt-4 flex gap-6">
            <div className="bg-white/10 rounded px-4 py-2">
              <div className="text-xs text-blue-200">BTC Price</div>
              <div className="text-xl font-bold">
                <RollingNumber
                  value={marketData.BTC || 0}
                  decimals={2}
                  prefix="$"
                  formatOptions={{
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }}
                />
              </div>
            </div>
            <div className="bg-white/10 rounded px-4 py-2">
              <div className="text-xs text-blue-200">ETH Price</div>
              <div className="text-xl font-bold">
                <RollingNumber
                  value={marketData.ETH || 0}
                  decimals={2}
                  prefix="$"
                  formatOptions={{
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }}
                />
              </div>
            </div>
            <div className="bg-white/10 rounded px-4 py-2">
              <div className="text-xs text-blue-200">Total Orders</div>
              <div className="text-xl font-bold">{orders.length}</div>
            </div>
          </div>
        )}
      </div>

      {/* Market View */}
      {currentView === 'market' && (
        <>
      {/* View Mode Toggle */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex-1 py-2 px-4 rounded font-semibold transition ${
              viewMode === 'grid'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Grid View
          </button>
          <button
            onClick={() => setViewMode('swipe')}
            className={`flex-1 py-2 px-4 rounded font-semibold transition ${
              viewMode === 'swipe'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Swipe View
          </button>
        </div>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <>
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Filter Orders</h2>

        {/* Product Type Toggle */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-600 mb-2">
            Product Type
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBinaries(false)}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                !showBinaries
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Options Strategies
            </button>
            <button
              onClick={() => setShowBinaries(true)}
              className={`flex-1 py-2 px-4 rounded font-semibold transition ${
                showBinaries
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              🎯 Binary Options
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              {showBinaries ? 'Filter' : 'Strategy Type'}
            </label>
            {showBinaries ? (
              <div className="p-2 border rounded bg-gray-50 text-gray-500 text-sm">
                Showing all binary options
              </div>
            ) : (
              <select
                value={selectedStrategy}
                onChange={(e) => setSelectedStrategy(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Strategies</option>
                <option value="2">Spreads (2 strikes)</option>
                <option value="3">Butterflies (3 strikes)</option>
                <option value="4">Condors (4 strikes)</option>
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Underlying Asset
            </label>
            <select
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Assets</option>
              <option value="BTC">Bitcoin (BTC)</option>
              <option value="ETH">Ethereum (ETH)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchOrders}
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
            >
              {loading ? '⟳ Loading...' : '🔄 Refresh Orders'}
            </button>
          </div>
        </div>

        <div className="mt-4 text-sm text-gray-600">
          Showing <strong>{filteredOrders.length}</strong> {showBinaries ? 'binary options' : 'option strategies'} ({ordersPerPage} per page)
        </div>
      </div>

      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOrders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage).map((orderData, index) => {
          const parsed = parseOrder(orderData);
          const maxPayout = calculateMaxPayout(parsed.strikes);

          const strategyColor = {
            BINARY: 'gradient-to-r from-purple-600 to-pink-600',
            SPREAD: 'blue',
            BUTTERFLY: 'green',
            CONDOR: 'purple'
          }[parsed.strategyType];

          const isBinary = parsed.isBinary;

          return (
            <div
              key={index}
              className={`bg-white rounded-lg shadow hover:shadow-lg transition p-4 cursor-pointer border-2 ${
                isBinary ? 'border-purple-200 hover:border-purple-400' : 'border-transparent hover:border-blue-300'
              }`}
              onClick={() => setSelectedOrder(parsed)}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  {isBinary ? (
                    <div className="inline-block px-2 py-1 rounded text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 mb-1">
                      BINARY OPTION
                    </div>
                  ) : (
                    <div className={`inline-block px-2 py-1 rounded text-xs font-bold text-white bg-${strategyColor}-600 mb-1`}>
                      {parsed.strategyType}
                    </div>
                  )}
                  <div className="text-lg font-bold">
                    {isBinary ? parsed.binaryName : `${parsed.underlying} ${parsed.isCall ? 'CALL' : 'PUT'}`}
                  </div>
                  {isBinary && (
                    <div className="text-sm text-gray-600">
                      {parsed.underlying} • {parsed.isCall ? 'Up' : 'Down'}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Premium</div>
                  <div className="text-xl font-bold text-green-600">
                    ${parsed.pricePerContract.toFixed(2)}
                  </div>
                </div>
              </div>

              {/* Strikes */}
              <div className="mb-3">
                <div className="text-xs font-semibold text-gray-600 mb-1">
                  {isBinary ? 'PRICE RANGE' : 'STRIKES'}
                </div>
                <div className="flex gap-1 flex-wrap">
                  {parsed.strikes.map((strike, i) => (
                    <div key={i} className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                      ${strike.toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-gray-500">{isBinary ? 'Range' : 'Width'}</div>
                  <div className="font-bold">${parsed.strikeWidth.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Max Payout</div>
                  <div className="font-bold">${maxPayout.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-500">Expiry</div>
                  <div className="font-bold">{parsed.expiry.toLocaleDateString()}</div>
                </div>
              </div>

              {/* Max Size */}
              <div className="mt-3 pt-3 border-t text-xs text-gray-600">
                Max size: <strong>${parsed.maxSize.toFixed(2)}{isBinary && parsed.rawOrder.order.collateral.toLowerCase() === '0x4200000000000000000000000000000000000006' ? ' ETH' : ' USDC'}</strong>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Controls */}
      {filteredOrders.length > ordersPerPage && (
        <div className="flex justify-center items-center gap-4 mt-6 mb-6">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition"
          >
            ← Previous
          </button>

          <div className="text-sm text-gray-600">
            Page <strong>{currentPage}</strong> of <strong>{Math.ceil(filteredOrders.length / ordersPerPage)}</strong>
            <span className="ml-2 text-gray-400">
              (Showing {((currentPage - 1) * ordersPerPage) + 1}-{Math.min(currentPage * ordersPerPage, filteredOrders.length)} of {filteredOrders.length})
            </span>
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredOrders.length / ordersPerPage), prev + 1))}
            disabled={currentPage === Math.ceil(filteredOrders.length / ordersPerPage)}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-blue-700 transition"
          >
            Next →
          </button>
        </div>
      )}

      {filteredOrders.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <div className="text-4xl mb-4">📭</div>
          <div className="text-xl font-bold text-gray-400">No orders found</div>
          <div className="text-gray-500 mt-2">Try adjusting your filters</div>
        </div>
      )}

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  {selectedOrder.isBinary ? (
                    <>
                      <div className="inline-block px-3 py-1 rounded text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
                        BINARY OPTION
                      </div>
                      <h2 className="text-2xl font-bold mb-1">
                        {selectedOrder.binaryName}
                      </h2>
                      <div className="text-gray-600">
                        {selectedOrder.underlying} • {selectedOrder.isCall ? 'Up Bet' : 'Down Bet'}
                      </div>
                    </>
                  ) : (
                    <>
                      <h2 className="text-2xl font-bold mb-1">
                        {selectedOrder.strategyType} - {selectedOrder.underlying}
                      </h2>
                      <div className="text-gray-600">
                        {selectedOrder.isCall ? 'CALL' : 'PUT'} Option
                      </div>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Strikes Visualization */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-sm font-semibold text-gray-600 mb-3">
                  {selectedOrder.isBinary ? 'PRICE RANGE' : 'STRIKE PRICES'}
                </div>
                {selectedOrder.isBinary ? (
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg flex items-center justify-center font-bold mb-2">
                        Min
                      </div>
                      <div className="font-mono text-lg font-bold">${selectedOrder.strikes[0].toLocaleString()}</div>
                    </div>
                    <div className="flex-1 max-w-xs">
                      <div className="h-2 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" />
                      <div className="text-center text-sm text-gray-600 mt-2">
                        {selectedOrder.isCall ? 'Price must be above range' : 'Price must be below range'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded-lg flex items-center justify-center font-bold mb-2">
                        Max
                      </div>
                      <div className="font-mono text-lg font-bold">${selectedOrder.strikes[1].toLocaleString()}</div>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    {selectedOrder.strikes.map((strike: number, i: number) => (
                      <React.Fragment key={i}>
                        <div className="text-center">
                          <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold mb-2">
                            K{i + 1}
                          </div>
                          <div className="font-mono text-sm">${strike.toLocaleString()}</div>
                        </div>
                        {i < selectedOrder.strikes.length - 1 && (
                          <div className="flex-1 border-t-2 border-dashed border-gray-300 mx-2" />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {(() => {
                  const contracts = selectedOrder.pricePerContract > 0
                    ? selectedBetSize / selectedOrder.pricePerContract
                    : 0;
                  const maxPayout = calculateMaxPayout(selectedOrder.strikes, contracts);
                  const roi = selectedBetSize > 0 ? (maxPayout / selectedBetSize) * 100 : 0;

                  return (
                    <>
                      <div className="bg-green-50 p-4 rounded-lg">
                        <div className="text-sm font-semibold text-green-700">YOUR BET</div>
                        <div className="text-2xl font-bold text-green-600">
                          ${selectedBetSize.toFixed(2)} USDC
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          {contracts.toFixed(2)} contracts @ ${selectedOrder.pricePerContract.toFixed(4)}
                        </div>
                      </div>

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="text-sm font-semibold text-blue-700">MAX PAYOUT</div>
                        <div className="text-2xl font-bold text-blue-600">
                          ${maxPayout.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                        <div className="text-xs text-blue-600 mt-1">
                          Width: ${selectedOrder.strikes?.length >= 2 ? Math.abs(selectedOrder.strikes[1] - selectedOrder.strikes[0]).toLocaleString() : 0} × {contracts.toFixed(2)}
                        </div>
                      </div>

                      <div className="bg-purple-50 p-4 rounded-lg">
                        <div className="text-sm font-semibold text-purple-700">EXPIRY</div>
                        <div className="text-lg font-bold text-purple-600">
                          {selectedOrder.expiry.toLocaleDateString()}
                        </div>
                        <div className="text-xs text-purple-600 mt-1">
                          {Math.ceil((selectedOrder.expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                        </div>
                      </div>

                      <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="text-sm font-semibold text-orange-700">POTENTIAL ROI</div>
                        <div className="text-lg font-bold text-orange-600">
                          {roi.toFixed(0)}%
                        </div>
                        <div className="text-xs text-orange-600 mt-1">Max return on investment</div>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Bet Size Selector */}
              <div className="mb-4">
                <div className="text-sm font-semibold text-gray-700 mb-3">Select Bet Size</div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 5, 10, 25].map((amount) => {
                    const contracts = amount / selectedOrder.pricePerContract;
                    const maxPayout = calculateMaxPayout(selectedOrder.strikes, contracts);
                    return (
                      <button
                        key={amount}
                        onClick={() => setSelectedBetSize(amount)}
                        className={`p-3 rounded-lg border-2 transition ${
                          selectedBetSize === amount
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        <div className="text-lg font-bold">${amount}</div>
                        <div className="text-xs text-gray-600 mt-1">
                          {contracts.toFixed(2)} contracts
                        </div>
                        <div className="text-xs text-green-600 font-semibold">
                          Max: ${maxPayout.toFixed(0)}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Premium: ${selectedOrder.pricePerContract.toFixed(4)} per contract
                </div>
              </div>

              {/* Action Button */}
              {!walletAddress ? (
                <button
                  onClick={connectWallet}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition"
                >
                  Connect Wallet to Trade
                </button>
              ) : chainId !== 8453 ? (
                <button
                  onClick={connectWallet}
                  className="w-full bg-yellow-600 text-white py-3 px-4 rounded-lg font-bold hover:bg-yellow-700 transition"
                >
                  Switch to Base Network
                </button>
              ) : (
                <button
                  onClick={() => buyOption(selectedBetSize)}
                  disabled={isBuying}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 text-white py-3 px-4 rounded-lg font-bold hover:from-green-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isBuying ? 'Processing...' : `Buy Option ($${selectedBetSize} USDC)`}
                </button>
              )}

              <div className="mt-4 text-xs text-gray-500 text-center">
                {walletAddress && chainId === 8453
                  ? 'Ready to trade on Base network'
                  : 'Connect your wallet to execute real trades'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 rounded-lg p-6 mt-6">
        <h3 className="font-bold text-blue-900 mb-3">📚 How to Use This Demo</h3>
        {orders.length > 0 ? (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 rounded text-sm text-green-800">
            <strong>✅ Live Data:</strong> Successfully fetched real orders from Thetanuts API! These are actual live orders you can trade on Base.
          </div>
        ) : (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
            <strong>⚠️ No Data:</strong> Unable to fetch orders from the API
          </div>
        )}
        <div className="space-y-2 text-sm text-blue-800">
          <div>1. <strong>Filter orders</strong> by strategy type (spreads, butterflies, condors) or underlying asset (BTC, ETH)</div>
          <div>2. <strong>Click any card</strong> to see detailed information about that option</div>
          <div>3. <strong>Refresh every 30 seconds</strong> in production to get latest prices and availability</div>
          <div>4. <strong>Check the code artifacts</strong> above for complete implementation examples</div>
        </div>
      </div>

      {/* Technical Info */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h3 className="font-bold mb-3">🔧 Technical Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold text-gray-600">Chain</div>
            <div className="font-mono">Base (Chain ID: 8453)</div>
          </div>
          <div>
            <div className="font-semibold text-gray-600">OptionBook Contract</div>
            <div className="font-mono text-xs">0xd58b...69A1</div>
          </div>
          <div>
            <div className="font-semibold text-gray-600">Collateral</div>
            <div>USDC (6 decimals)</div>
          </div>
          <div>
            <div className="font-semibold text-gray-600">API Endpoint</div>
            <div className="font-mono text-xs">round-snowflake-9c31...</div>
          </div>
        </div>
      </div>
        </>
      )}

      {/* Swipe View */}
      {viewMode === 'swipe' && (
        <>
          {!walletAddress ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <div className="text-4xl mb-4">🔐</div>
              <div className="text-xl font-bold text-gray-600 mb-2">Connect Your Wallet</div>
              <div className="text-gray-500 mb-4">Please connect your wallet to access Swipe View</div>
              <button
                onClick={connectWallet}
                disabled={isConnecting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition disabled:opacity-50"
              >
                {isConnecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            </div>
          ) : (
            <SwipeView walletAddress={walletAddress} />
          )}
        </>
      )}
        </>
      )}

      {/* Profile View */}
      {currentView === 'profile' && (
        <div className="space-y-6">
          <BetSettings walletAddress={walletAddress} />
          <MyBets walletAddress={walletAddress} marketData={marketData} />
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`max-w-md rounded-lg shadow-lg p-4 flex items-start gap-3 animate-slide-in ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : toast.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-blue-500 text-white'
            }`}
          >
            <div className="flex-1">
              <div className="font-semibold mb-1">
                {toast.type === 'success' ? '✓ Success' : toast.type === 'error' ? '✗ Error' : 'ℹ Info'}
              </div>
              <div className="text-sm">{toast.message}</div>
              {toast.txHash && (
                <a
                  href={`https://basescan.org/tx/${toast.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm underline mt-2 inline-block hover:text-blue-100"
                >
                  View on BaseScan →
                </a>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-white hover:text-gray-200 text-xl leading-none"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThetanutsTradingDemo;
