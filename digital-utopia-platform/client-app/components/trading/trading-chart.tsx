'use client';

/**
 * Trading Chart Component
 * 
 * Professional candlestick chart with technical indicators.
 * Uses HTML5 Canvas for high-performance rendering.
 * 
 * @author Digital Utopia Platform
 * @version 2.0
 */

import { useEffect, useRef, useState } from 'react';
import { TrendingUp, TrendingDown, BarChart3, Calendar } from 'lucide-react';

interface TradingChartProps {
  symbol: string;
}

interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d';

export function TradingChart({ symbol }: TradingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('15m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Generate sample candle data (in production, this would come from WebSocket)
  useEffect(() => {
    // Simulate loading
    setIsLoading(true);
    
    // Generate initial candles
    const generateCandles = () => {
      const now = Date.now();
      const candleCount = 100;
      const timeframeMs = getTimeframeMs(timeframe);
      let price = getInitialPrice(symbol);
      
      const newCandles: Candle[] = [];
      
      for (let i = candleCount; i >= 0; i--) {
        const timestamp = now - (i * timeframeMs);
        const volatility = 0.02; // 2% volatility
        
        const open = price;
        const change = (Math.random() - 0.5) * price * volatility;
        const close = price + change;
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.random() * 100000 + 50000;
        
        newCandles.push({
          timestamp,
          open,
          high,
          low,
          close,
          volume,
        });
        
        price = close;
      }
      
      setCandles(newCandles);
      setCurrentPrice(price);
      
      if (newCandles.length > 1) {
        const change = ((price - newCandles[0].open) / newCandles[0].open) * 100;
        setPriceChange(change);
      }
      
      setIsLoading(false);
    };

    generateCandles();
    
    // Update prices periodically
    const interval = setInterval(() => {
      setCandles(prev => {
        if (prev.length === 0) return prev;
        
        const lastCandle = prev[prev.length - 1];
        const volatility = 0.001; // 0.1% per update
        const change = (Math.random() - 0.5) * lastCandle.close * volatility;
        const newPrice = lastCandle.close + change;
        
        setCurrentPrice(newPrice);
        
        const priceChangePercent = ((newPrice - prev[0].open) / prev[0].open) * 100;
        setPriceChange(priceChangePercent);
        
        // Update last candle
        const updated = [...prev];
        updated[updated.length - 1] = {
          ...lastCandle,
          close: newPrice,
          high: Math.max(lastCandle.high, newPrice),
          low: Math.min(lastCandle.low, newPrice),
        };
        
        return updated;
      });
    }, 2000); // Update every 2 seconds
    
    return () => clearInterval(interval);
  }, [symbol, timeframe]);

  // Draw chart on canvas
  useEffect(() => {
    if (!canvasRef.current || candles.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const { width, height } = canvas;
    const padding = 60;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Find price range
    const prices = candles.flatMap(c => [c.high, c.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;

    // Draw grid lines
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 5; i++) {
      const y = padding + (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();

      // Price labels
      const price = maxPrice - (priceRange / 5) * i;
      ctx.fillStyle = 'rgba(200, 200, 200, 0.8)';
      ctx.font = '12px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(price.toFixed(2), padding - 10, y + 4);
    }

    // Draw candles
    const candleWidth = chartWidth / candles.length;
    const candlePadding = candleWidth * 0.2;

    candles.forEach((candle, index) => {
      const x = padding + index * candleWidth;
      const isGreen = candle.close >= candle.open;

      // Calculate y positions
      const openY = padding + ((maxPrice - candle.open) / priceRange) * chartHeight;
      const closeY = padding + ((maxPrice - candle.close) / priceRange) * chartHeight;
      const highY = padding + ((maxPrice - candle.high) / priceRange) * chartHeight;
      const lowY = padding + ((maxPrice - candle.low) / priceRange) * chartHeight;

      // Draw wick (high-low line)
      ctx.strokeStyle = isGreen ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + candleWidth / 2, highY);
      ctx.lineTo(x + candleWidth / 2, lowY);
      ctx.stroke();

      // Draw body (open-close rectangle)
      ctx.fillStyle = isGreen ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)';
      const bodyHeight = Math.abs(closeY - openY) || 1;
      const bodyY = Math.min(openY, closeY);
      ctx.fillRect(
        x + candlePadding,
        bodyY,
        candleWidth - candlePadding * 2,
        bodyHeight
      );
    });

    // Draw current price line
    const currentPriceY = padding + ((maxPrice - currentPrice) / priceRange) * chartHeight;
    ctx.strokeStyle = priceChange >= 0 ? 'rgba(34, 197, 94, 0.8)' : 'rgba(239, 68, 68, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(padding, currentPriceY);
    ctx.lineTo(width - padding, currentPriceY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label
    ctx.fillStyle = priceChange >= 0 ? 'rgba(34, 197, 94, 1)' : 'rgba(239, 68, 68, 1)';
    ctx.fillRect(width - padding + 5, currentPriceY - 12, 70, 24);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(currentPrice.toFixed(2), width - padding + 10, currentPriceY + 4);

  }, [candles, currentPrice, priceChange]);

  const timeframes: { value: Timeframe; label: string }[] = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1H' },
    { value: '4h', label: '4H' },
    { value: '1d', label: '1D' },
  ];

  return (
    <div className="chart-container-3d h-full bg-surface rounded-xl border border-border overflow-hidden flex flex-col">
      {/* Chart Header */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <span className="font-semibold text-lg">{symbol}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {priceChange >= 0 ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <TrendingDown className="w-5 h-5 text-error" />
            )}
            <span className="text-2xl font-bold">
              ${currentPrice.toFixed(2)}
            </span>
            <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-success' : 'text-error'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Timeframe Selector */}
        <div className="flex items-center gap-1 bg-background rounded-lg p-1">
          {timeframes.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setTimeframe(value)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                timeframe === value
                  ? 'bg-primary text-white'
                  : 'text-foreground-secondary hover:text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="flex-1 relative">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-surface/50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-foreground-secondary">Loading chart data...</p>
            </div>
          </div>
        ) : (
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{ display: 'block' }}
          />
        )}
      </div>

      {/* Chart Footer */}
      <div className="px-4 py-2 border-t border-border bg-muted/50 flex items-center justify-between text-sm text-foreground-secondary">
        <div className="flex items-center gap-4">
          <span>Volume: {candles[candles.length - 1]?.volume.toLocaleString() || '0'}</span>
          <span>Open: ${candles[candles.length - 1]?.open.toFixed(2) || '0.00'}</span>
          <span>High: ${candles[candles.length - 1]?.high.toFixed(2) || '0.00'}</span>
          <span>Low: ${candles[candles.length - 1]?.low.toFixed(2) || '0.00'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          <span>{new Date().toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}

// Helper functions
function getTimeframeMs(timeframe: Timeframe): number {
  const map: Record<Timeframe, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
  };
  return map[timeframe];
}

function getInitialPrice(symbol: string): number {
  const prices: Record<string, number> = {
    'BTC/USDT': 42000,
    'ETH/USDT': 2200,
    'EUR/USD': 1.08,
    'GBP/USD': 1.27,
    'XAU/USD': 2050,
  };
  return prices[symbol] || 1000;
}