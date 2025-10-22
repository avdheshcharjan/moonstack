import { useState, useCallback, useEffect, useRef } from 'react';
import { parseOrder } from '../utils/optionsParser';
import { RawOrderData, ParsedOrder, MarketData } from '../types/orders';
import { USDC_ADDRESS, WETH_ADDRESS } from '../utils/contracts';

const REFRESH_INTERVAL = 10000; // 10 seconds

interface UseOrdersReturn {
  orders: ParsedOrder[];
  marketData: MarketData | null;
  loading: boolean;
  error: string | null;
  fetchOrders: () => Promise<void>;
  filterBinaries: () => ParsedOrder[];
}

export function useOrders(): UseOrdersReturn {
  const [orders, setOrders] = useState<ParsedOrder[]>([]);
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasLoadedOnce = useRef<boolean>(false);

  const fetchOrders = useCallback(async (): Promise<void> => {
    // Only show loading spinner on initial load, not on auto-refresh
    if (!hasLoadedOnce.current) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await fetch('/api/orders', {
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
        const rawOrders: RawOrderData[] = data.data.orders || [];
        const parsedOrders = rawOrders.map(parseOrder);
        setOrders(parsedOrders);
        setMarketData(data.data.market_data || null);
        setLoading(false);
        hasLoadedOnce.current = true;
      } else if (data.error) {
        throw new Error(data.message || 'API error');
      } else {
        throw new Error('Invalid response format');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setOrders([]);
      setMarketData(null);
      setLoading(false);
      hasLoadedOnce.current = true;
    }
  }, []);

  // Set up auto-refresh every 10 seconds
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set up new interval
    intervalRef.current = setInterval(() => {
      fetchOrders();
    }, REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchOrders]);

  const filterBinaries = useCallback((): ParsedOrder[] => {
    return orders.filter(order => {
      if (!order.isBinary) {
        return false;
      }

      const collateral = order.rawOrder.order.collateral.toLowerCase();
      if (collateral !== USDC_ADDRESS.toLowerCase()) {
        return false;
      }

      return true;
    });
  }, [orders]);

  return {
    orders,
    marketData,
    loading,
    error,
    fetchOrders,
    filterBinaries
  };
}
