import React, { useEffect, useRef } from 'react';

interface TradingViewChartProps {
  symbol?: string;
  theme?: 'light' | 'dark';
  autosize?: boolean;
  height?: number;
}

const TradingViewChart: React.FC<TradingViewChartProps> = ({
  symbol = 'BINANCE:BNBUSDT',
  theme = 'dark',
  autosize = true,
  height = 400,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      const win = window as unknown as Window & { TradingView?: { widget: new (config: Record<string, unknown>) => void } };
      if (typeof window !== 'undefined' && win.TradingView && containerRef.current) {
        new win.TradingView.widget({
          autosize: autosize,
          symbol: symbol,
          interval: '5',
          timezone: 'Etc/UTC',
          theme: theme,
          style: '1',
          locale: 'en',
          toolbar_bg: '#0f172a',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: true,
          save_image: false,
          container_id: containerRef.current.id,
          height: height,
          studies: [],
          show_popup_button: false,
          popup_width: '1000',
          popup_height: '650',
          backgroundColor: '#0f172a',
          gridColor: 'rgba(255, 255, 255, 0.06)',
          disabled_features: ['header_widget'],
          enabled_features: ['hide_left_toolbar_by_default'],
          telemetry: false,
        });
      }
    };
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [symbol, theme, autosize, height]);

  return (
    <div className="tradingview-widget-container w-full h-full">
      <div id={`tradingview_${Math.random().toString(36).substring(7)}`} ref={containerRef} className="w-full h-full" />
    </div>
  );
};

export default TradingViewChart;
