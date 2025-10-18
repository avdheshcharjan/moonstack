import React, { useState, useEffect } from 'react';

const ThetanutsTradingDemo = () => {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState('all');
  const [selectedAsset, setSelectedAsset] = useState('all');
  const [marketData, setMarketData] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [fetchStatus, setFetchStatus] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 10;
  
  // Fetch orders from API
  const fetchOrders = async () => {
    setLoading(true);
    setFetchStatus('Fetching live data...');

    // Use local CORS proxy server
    const localProxyUrl = 'http://localhost:3001/api/orders';

    try {
      setFetchStatus('Connecting to local proxy...');
      console.log('Fetching from local proxy:', localProxyUrl);

      const response = await fetch(localProxyUrl, {
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
        console.log('✅ Successfully fetched real data via local proxy!');
        return; // Success!
      } else if (data.error) {
        throw new Error(data.message || 'Proxy error');
      }
    } catch (error) {
      console.error('Failed to fetch via local proxy:', error.message);
      setFetchStatus(`❌ Failed to load data: ${error.message}`);
      setOrders([]);
      setMarketData(null);
      setLoading(false);
    }
  };
  
  // Load orders on mount
  useEffect(() => {
    fetchOrders();
  }, []);
  
  // Filter orders
  useEffect(() => {
    let filtered = orders;
    
    // Filter by strategy (strike count)
    if (selectedStrategy !== 'all') {
      const strikeCount = parseInt(selectedStrategy);
      filtered = filtered.filter(o => o.order.strikes.length === strikeCount);
    }
    
    // Filter by asset
    if (selectedAsset !== 'all') {
      const BTC_FEED = '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F';
      const ETH_FEED = '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70';
      const feed = selectedAsset === 'BTC' ? BTC_FEED : ETH_FEED;
      filtered = filtered.filter(o => 
        o.order.priceFeed.toLowerCase() === feed.toLowerCase()
      );
    }
    
    // Only USDC collateral
    const USDC = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
    filtered = filtered.filter(o => 
      o.order.collateral.toLowerCase() === USDC.toLowerCase()
    );
    
    setFilteredOrders(filtered);
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [orders, selectedStrategy, selectedAsset]);
  
  // Parse order helper
  const parseOrder = (orderData) => {
    const order = orderData.order;
    const strikes = order.strikes.map(s => Number(s) / 1e8);
    const price = Number(order.price) / 1e8;
    const maxSize = Number(order.maxCollateralUsable) / 1e6;
    
    let strategyType;
    if (strikes.length === 2) strategyType = 'SPREAD';
    else if (strikes.length === 3) strategyType = 'BUTTERFLY';
    else if (strikes.length === 4) strategyType = 'CONDOR';
    
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
      rawOrder: orderData
    };
  };
  
  // Calculate max payout
  const calculateMaxPayout = (strikes, numContracts = 1) => {
    let strikeWidth;
    if (strikes.length === 2) {
      strikeWidth = Math.abs(strikes[1] - strikes[0]);
    } else if (strikes.length === 3) {
      strikeWidth = strikes[1] - strikes[0];
    } else if (strikes.length === 4) {
      strikeWidth = strikes[1] - strikes[0];
    }
    return strikeWidth * numContracts;
  };
  
  return (
    <div className="w-full max-w-7xl mx-auto p-4 bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">Thetanuts Options Trading</h1>
            <p className="text-blue-100">Decentralized Options on Base - Live Order Book</p>
            {fetchStatus && (
              <div className="mt-2 text-sm bg-white/20 rounded px-3 py-1 inline-block">
                {fetchStatus}
              </div>
            )}
          </div>
          {orders.length > 0 && (
            <div className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-bold">
              🔴 LIVE DATA
            </div>
          )}
        </div>
        
        {marketData && (
          <div className="mt-4 flex gap-6">
            <div className="bg-white/10 rounded px-4 py-2">
              <div className="text-xs text-blue-200">BTC Price</div>
              <div className="text-xl font-bold">${marketData.BTC?.toLocaleString()}</div>
            </div>
            <div className="bg-white/10 rounded px-4 py-2">
              <div className="text-xs text-blue-200">ETH Price</div>
              <div className="text-xl font-bold">${marketData.ETH?.toLocaleString()}</div>
            </div>
            <div className="bg-white/10 rounded px-4 py-2">
              <div className="text-xs text-blue-200">Total Orders</div>
              <div className="text-xl font-bold">{orders.length}</div>
            </div>
          </div>
        )}
      </div>
      
      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4">Filter Orders</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Strategy Type
            </label>
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
          Showing <strong>{filteredOrders.length}</strong> orders total ({ordersPerPage} per page)
        </div>
      </div>
      
      {/* Orders List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredOrders.slice((currentPage - 1) * ordersPerPage, currentPage * ordersPerPage).map((orderData, index) => {
          const parsed = parseOrder(orderData);
          const maxPayout = calculateMaxPayout(parsed.strikes);
          
          const strategyColor = {
            SPREAD: 'blue',
            BUTTERFLY: 'green',
            CONDOR: 'purple'
          }[parsed.strategyType];
          
          return (
            <div 
              key={index}
              className="bg-white rounded-lg shadow hover:shadow-lg transition p-4 cursor-pointer border-2 border-transparent hover:border-blue-300"
              onClick={() => setSelectedOrder(parsed)}
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className={`inline-block px-2 py-1 rounded text-xs font-bold text-white bg-${strategyColor}-600 mb-1`}>
                    {parsed.strategyType}
                  </div>
                  <div className="text-lg font-bold">
                    {parsed.underlying} {parsed.isCall ? 'CALL' : 'PUT'}
                  </div>
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
                <div className="text-xs font-semibold text-gray-600 mb-1">STRIKES</div>
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
                  <div className="text-gray-500">Width</div>
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
                Max size: <strong>${parsed.maxSize.toFixed(2)} USDC</strong>
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
                  <h2 className="text-2xl font-bold mb-1">
                    {selectedOrder.strategyType} - {selectedOrder.underlying}
                  </h2>
                  <div className="text-gray-600">
                    {selectedOrder.isCall ? 'CALL' : 'PUT'} Option
                  </div>
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
                <div className="text-sm font-semibold text-gray-600 mb-3">STRIKE PRICES</div>
                <div className="flex justify-between items-center">
                  {selectedOrder.strikes.map((strike, i) => (
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
              </div>
              
              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-green-700">PREMIUM</div>
                  <div className="text-2xl font-bold text-green-600">
                    ${selectedOrder.pricePerContract.toFixed(2)} USDC
                  </div>
                  <div className="text-xs text-green-600 mt-1">per contract</div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-blue-700">MAX PAYOUT</div>
                  <div className="text-2xl font-bold text-blue-600">
                    ${calculateMaxPayout(selectedOrder.strikes).toLocaleString()}
                  </div>
                  <div className="text-xs text-blue-600 mt-1">Strike width × 1 contract</div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-purple-700">EXPIRY</div>
                  <div className="text-lg font-bold text-purple-600">
                    {selectedOrder.expiry.toLocaleDateString()}
                  </div>
                  <div className="text-xs text-purple-600 mt-1">
                    {Math.ceil((selectedOrder.expiry - new Date()) / (1000 * 60 * 60 * 24))} days
                  </div>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-sm font-semibold text-orange-700">MAX SIZE</div>
                  <div className="text-lg font-bold text-orange-600">
                    ${selectedOrder.maxSize.toFixed(2)}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">USDC collateral</div>
                </div>
              </div>
              
              {/* How to Buy */}
              <div className="bg-gray-900 text-gray-100 rounded-lg p-4 mb-4">
                <div className="text-sm font-bold text-green-400 mb-2">// How to buy this option:</div>
                <div className="font-mono text-xs space-y-1">
                  <div><span className="text-blue-400">const</span> order = orders[{filteredOrders.findIndex(o => parseOrder(o).rawOrder === selectedOrder.rawOrder)}];</div>
                  <div><span className="text-blue-400">const</span> result = <span className="text-blue-400">await</span> <span className="text-yellow-400">buyOption</span>(</div>
                  <div>  provider,</div>
                  <div>  order,</div>
                  <div>  <span className="text-green-300">10</span> <span className="text-gray-400">// $10 USDC</span></div>
                  <div>);</div>
                </div>
              </div>
              
              {/* Action Button */}
              <button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition">
                Connect Wallet to Trade
              </button>
              
              <div className="mt-4 text-xs text-gray-500 text-center">
                This is a demo. Connect your wallet to execute real trades.
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
            <strong>✅ Live Data:</strong> Successfully fetched real orders from Thetanuts API via local proxy! These are actual live orders you can trade on Base.
          </div>
        ) : (
          <div className="mb-4 p-3 bg-yellow-100 border border-yellow-300 rounded text-sm text-yellow-800">
            <strong>⚠️ No Data:</strong> Make sure the proxy server is running with <code className="bg-yellow-200 px-1 rounded">npm run proxy</code>
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
    </div>
  );
};

export default ThetanutsTradingDemo;