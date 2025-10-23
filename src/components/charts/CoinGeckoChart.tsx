import React, { useEffect, useRef, useState } from 'react';

interface CoinGeckoChartProps {
  symbol?: string;
  theme?: 'light' | 'dark';
  autosize?: boolean;
  height?: number;
}

interface ChartData {
  prices: [number, number][];
}

const CoinGeckoChart: React.FC<CoinGeckoChartProps> = ({
  symbol = 'BINANCE:BNBUSDT',
  theme = 'dark',
  height = 400,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getCoinGeckoId = (symbol: string): string => {
    const symbolMap: Record<string, string> = {
      'BINANCE:BTCUSDT': 'bitcoin',
      'BINANCE:ETHUSDT': 'ethereum',
      'BINANCE:BNBUSDT': 'binancecoin',
      'BINANCE:SOLUSDT': 'solana',
      'BINANCE:XRPUSDT': 'ripple',
    };
    return symbolMap[symbol] || 'bitcoin';
  };

  useEffect(() => {
    const fetchChartData = async (): Promise<void> => {
      try {
        setLoading(true);
        setError(null);

        const coinId = getCoinGeckoId(symbol);
        const response = await fetch(`/api/chart?coinId=${coinId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch chart data');
        }

        const data: ChartData = await response.json();
        setChartData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    void fetchChartData();
  }, [symbol]);

  useEffect(() => {
    if (!canvasRef.current || !chartData || loading) {
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const prices = chartData.prices.map(p => p[1]);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice;

    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;

    ctx.clearRect(0, 0, rect.width, rect.height);

    // Draw grid lines
    ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartHeight / 4) * i;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartWidth, y);
      ctx.stroke();
    }

    // Draw price labels
    ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
      const price = maxPrice - (priceRange / 4) * i;
      const y = padding.top + (chartHeight / 4) * i;
      ctx.fillText(`$${price.toFixed(2)}`, padding.left - 10, y + 4);
    }

    // Draw line chart
    ctx.beginPath();
    ctx.strokeStyle = theme === 'dark' ? '#3b82f6' : '#2563eb';
    ctx.lineWidth = 2;

    prices.forEach((price, index) => {
      const x = padding.left + (chartWidth / (prices.length - 1)) * index;
      const y = padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw gradient fill
    const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
    gradient.addColorStop(0, theme === 'dark' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(37, 99, 235, 0.3)');
    gradient.addColorStop(1, theme === 'dark' ? 'rgba(59, 130, 246, 0)' : 'rgba(37, 99, 235, 0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    prices.forEach((price, index) => {
      const x = padding.left + (chartWidth / (prices.length - 1)) * index;
      const y = padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.closePath();
    ctx.fill();

  }, [chartData, loading, theme]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400">
        Error loading chart: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading chart...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full" style={{ height: `${height}px` }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default CoinGeckoChart;
