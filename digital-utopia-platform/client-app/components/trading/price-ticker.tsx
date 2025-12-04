'use client';

/**
 * Price Ticker Component
 * 
 * Horizontal scrolling ticker of price movements.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import { TrendingUp, TrendingDown } from 'lucide-react';
import { useState, useEffect } from 'react';

const MOCK_DATA = [
  { symbol: 'EURUSD', price: '1.0845', change: '+0.0023', changePercent: '+0.21%', isUp: true },
  { symbol: 'GBPUSD', price: '1.2634', change: '-0.0045', changePercent: '-0.35%', isUp: false },
  { symbol: 'USDJPY', price: '149.23', change: '+0.87', changePercent: '+0.59%', isUp: true },
  { symbol: 'BTCUSD', price: '43,256', change: '+1,234', changePercent: '+2.94%', isUp: true },
  { symbol: 'ETHUSD', price: '2,567', change: '-89', changePercent: '-3.35%', isUp: false },
  { symbol: 'US30', price: '35,124', change: '+156', changePercent: '+0.45%', isUp: true },
  { symbol: 'NAS100', price: '16,234', change: '-89', changePercent: '-0.55%', isUp: false },
  { symbol: 'XAUUSD', price: '2,045', change: '+12', changePercent: '+0.59%', isUp: true },
];

export function PriceTicker() {
  const [currentData, setCurrentData] = useState(MOCK_DATA);

  // Simulate real-time price updates
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentData(prevData => 
        prevData.map(item => {
          const change = (Math.random() - 0.5) * 0.01;
          const newPrice = parseFloat(item.price.replace(/[,]/g, '')) * (1 + change);
          const isUp = change >= 0;
          
          return {
            ...item,
            price: item.price.includes(',') 
              ? newPrice.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
              : newPrice.toFixed(4),
            change: isUp ? `+${Math.abs(change * 100).toFixed(4)}` : `-${Math.abs(change * 100).toFixed(4)}`,
            changePercent: `${isUp ? '+' : '-'}${Math.abs(change * 100).toFixed(2)}%`,
            isUp,
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-12 bg-surface border-b border-border overflow-hidden">
      <div className="h-full flex items-center price-ticker">
        {currentData.map((item, index) => (
          <div
            key={`${item.symbol}-${index}`}
            className="flex items-center gap-2 px-6 whitespace-nowrap"
          >
            <span className="font-mono font-semibold text-sm">
              {item.symbol}
            </span>
            <span className="font-mono text-sm">
              {item.price}
            </span>
            <div className={`flex items-center gap-1 ${item.isUp ? 'text-success' : 'text-error'}`}>
              {item.isUp ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span className="text-xs font-medium">
                {item.change} ({item.changePercent})
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}