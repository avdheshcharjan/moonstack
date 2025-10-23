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

type TimeRange = '0.04' | '0.25' | '0.5' | '1';

interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  timestamp: number;
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
  const [timeRange, setTimeRange] = useState<TimeRange>('1');
  const [hoveredCandle, setHoveredCandle] = useState<Candle | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const candlesRef = useRef<Candle[]>([]);
  const chartMetricsRef = useRef<{
    padding: { top: number; right: number; bottom: number; left: number };
    chartWidth: number;
    chartHeight: number;
    candleSpacing: number;
    minPrice: number;
    maxPrice: number;
    priceRange: number;
  } | null>(null);

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
        const response = await fetch(`/api/chart?coinId=${coinId}&timeRange=${timeRange}`);

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
  }, [symbol, timeRange]);

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

    // Group prices into candles based on number of data points
    const prices = chartData.prices;
    const candleCount = Math.min(50, prices.length); // Max 50 candles
    const pointsPerCandle = Math.floor(prices.length / candleCount);

    const candles: Candle[] = [];
    for (let i = 0; i < candleCount; i++) {
      const start = i * pointsPerCandle;
      const end = Math.min(start + pointsPerCandle, prices.length);
      const candleData = prices.slice(start, end);
      const candlePrices = candleData.map(p => p[1]);

      if (candlePrices.length > 0) {
        candles.push({
          open: candlePrices[0],
          high: Math.max(...candlePrices),
          low: Math.min(...candlePrices),
          close: candlePrices[candlePrices.length - 1],
          timestamp: candleData[0][0],
        });
      }
    }

    candlesRef.current = candles;

    const allPrices = candles.flatMap(c => [c.high, c.low]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;

    const padding = { top: 20, right: 20, bottom: 30, left: 60 };
    const chartWidth = rect.width - padding.left - padding.right;
    const chartHeight = rect.height - padding.top - padding.bottom;
    const candleSpacing = chartWidth / candles.length;

    // Store chart metrics for mouse interaction
    chartMetricsRef.current = {
      padding,
      chartWidth,
      chartHeight,
      candleSpacing,
      minPrice,
      maxPrice,
      priceRange,
    };

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

    // Draw candlesticks
    const candleWidth = Math.max(2, (chartWidth / candles.length) * 0.7);

    candles.forEach((candle, index) => {
      const x = padding.left + candleSpacing * index + candleSpacing / 2;

      const highY = padding.top + chartHeight - ((candle.high - minPrice) / priceRange) * chartHeight;
      const lowY = padding.top + chartHeight - ((candle.low - minPrice) / priceRange) * chartHeight;
      const openY = padding.top + chartHeight - ((candle.open - minPrice) / priceRange) * chartHeight;
      const closeY = padding.top + chartHeight - ((candle.close - minPrice) / priceRange) * chartHeight;

      const isGreen = candle.close >= candle.open;
      const isHovered = hoveredCandle?.timestamp === candle.timestamp;

      const color = isGreen
        ? (theme === 'dark' ? '#10b981' : '#059669')
        : (theme === 'dark' ? '#ef4444' : '#dc2626');

      // Highlight hovered candle
      if (isHovered) {
        ctx.fillStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(
          x - candleSpacing / 2,
          padding.top,
          candleSpacing,
          chartHeight
        );
      }

      // Draw wick (high-low line)
      ctx.strokeStyle = color;
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw body (open-close rectangle)
      const bodyTop = Math.min(openY, closeY);
      const bodyHeight = Math.max(1, Math.abs(closeY - openY));

      ctx.fillStyle = color;
      ctx.fillRect(
        x - candleWidth / 2,
        bodyTop,
        candleWidth,
        bodyHeight
      );

      // Add border to hovered candle
      if (isHovered) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.strokeRect(
          x - candleWidth / 2,
          bodyTop,
          candleWidth,
          bodyHeight
        );
      }
    });

    // Draw crosshair if mouse is hovering
    if (mousePos && hoveredCandle) {
      const metrics = chartMetricsRef.current;
      if (metrics) {
        // Vertical crosshair line
        ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(mousePos.x, metrics.padding.top);
        ctx.lineTo(mousePos.x, metrics.padding.top + metrics.chartHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

  }, [chartData, loading, theme, hoveredCandle, mousePos]);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>): void => {
    if (!canvasRef.current || !chartMetricsRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const metrics = chartMetricsRef.current;

    // Check if mouse is within chart area
    if (
      x < metrics.padding.left ||
      x > metrics.padding.left + metrics.chartWidth ||
      y < metrics.padding.top ||
      y > metrics.padding.top + metrics.chartHeight
    ) {
      setHoveredCandle(null);
      setMousePos(null);
      return;
    }

    setMousePos({ x, y });

    // Find which candle is being hovered
    const relativeX = x - metrics.padding.left;
    const candleIndex = Math.floor(relativeX / metrics.candleSpacing);

    if (candleIndex >= 0 && candleIndex < candlesRef.current.length) {
      setHoveredCandle(candlesRef.current[candleIndex]);
    } else {
      setHoveredCandle(null);
    }
  };

  const handleMouseLeave = (): void => {
    setHoveredCandle(null);
    setMousePos(null);
  };

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center text-red-400">
        Error loading chart: {error}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-full flex flex-col">
        <div className="flex gap-1 mb-2 justify-center">
          {(['1hr', '6hr', '12hr', '1D'] as const).map((label) => (
            <button
              key={label}
              disabled
              className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-500 cursor-not-allowed"
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse text-slate-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  const timeRangeButtons: Array<{ label: string; value: TimeRange }> = [
    { label: '1hr', value: '0.04' },
    { label: '6hr', value: '0.25' },
    { label: '12hr', value: '0.5' },
    { label: '1D', value: '1' },
  ];

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Time Range Controls */}
      <div className="flex gap-1 mb-1 justify-center">
        {timeRangeButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setTimeRange(btn.value)}
            className={`px-2.5 py-1 text-xs rounded font-semibold transition-all ${
              timeRange === btn.value
                ? 'bg-purple-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 min-h-0 relative">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-crosshair"
          style={{ width: '100%', height: '100%' }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip */}
        {hoveredCandle && mousePos && (
          <div
            className="absolute bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs pointer-events-none z-10"
            style={{
              left: `${mousePos.x + 10}px`,
              top: `${mousePos.y - 80}px`,
              transform: mousePos.x > (canvasRef.current?.width || 0) / 2 ? 'translateX(-100%)' : 'none',
            }}
          >
            <div className="text-slate-400 mb-1">{formatTime(hoveredCandle.timestamp)}</div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <div className="text-slate-500">O:</div>
              <div className={`font-semibold ${hoveredCandle.open > hoveredCandle.close ? 'text-red-400' : 'text-green-400'}`}>
                ${hoveredCandle.open.toFixed(2)}
              </div>
              <div className="text-slate-500">H:</div>
              <div className="font-semibold text-white">${hoveredCandle.high.toFixed(2)}</div>
              <div className="text-slate-500">L:</div>
              <div className="font-semibold text-white">${hoveredCandle.low.toFixed(2)}</div>
              <div className="text-slate-500">C:</div>
              <div className={`font-semibold ${hoveredCandle.close >= hoveredCandle.open ? 'text-green-400' : 'text-red-400'}`}>
                ${hoveredCandle.close.toFixed(2)}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinGeckoChart;
