'use client';

/**
 * Market Overview Component
 * 
 * Shows current market data for selected symbol.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';

interface MarketOverviewProps {
  selectedSymbol: string;
}

export function MarketOverview({ selectedSymbol }: MarketOverviewProps) {
  // Mock data - replace with real API data
  const marketData = {
    symbol: selectedSymbol,
    price: '1.0845',
    change: '+0.0023',
    changePercent: '+0.21%',
    isUp: true,
    high: '1.0876',
    low: '1.0821',
    volume: '1.2M',
    open: '1.0822',
    previousClose: '1.0822',
  };

  return (
    <div className="bg-surface border-b border-border p-4">
      <div className="flex items-center justify-between">
        {/* Symbol and Price */}
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold font-mono">{marketData.symbol}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-2xl font-bold">{marketData.price}</span>
              <div className={`flex items-center gap-1 ${marketData.isUp ? 'text-success' : 'text-error'}`}>
                {marketData.isUp ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                <span className="font-semibold">
                  {marketData.change} ({marketData.changePercent})
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-foreground-secondary">High</p>
            <p className="font-mono font-semibold">{marketData.high}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-secondary">Low</p>
            <p className="font-mono font-semibold">{marketData.low}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-secondary">Volume</p>
            <p className="font-mono font-semibold">{marketData.volume}</p>
          </div>
          <div>
            <p className="text-xs text-foreground-secondary">Open</p>
            <p className="font-mono font-semibold">{marketData.open}</p>
          </div>
        </div>

        {/* Chart Icon */}
        <button className="p-2 hover:bg-muted rounded-lg transition-colors">
          <BarChart3 className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}