'use client';

/**
 * Watchlist Panel Component
 * 
 * Shows user's watchlist and market data.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import { TrendingUp, TrendingDown, Plus, Star } from 'lucide-react';

interface WatchlistPanelProps {
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

export function WatchlistPanel({ selectedSymbol, onSymbolChange }: WatchlistPanelProps) {
  // Mock watchlist data
  const watchlist = [
    { symbol: 'EURUSD', price: '1.0845', change: '+0.0023', changePercent: '+0.21%', isUp: true },
    { symbol: 'GBPUSD', price: '1.2634', change: '-0.0045', changePercent: '-0.35%', isUp: false },
    { symbol: 'USDJPY', price: '149.23', change: '+0.87', changePercent: '+0.59%', isUp: true },
    { symbol: 'BTCUSD', price: '43,256', change: '+1,234', changePercent: '+2.94%', isUp: true },
    { symbol: 'ETHUSD', price: '2,567', change: '-89', changePercent: '-3.35%', isUp: false },
  ];

  return (
    <div className="h-full bg-surface border-r border-border">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Watchlist</h3>
          <button className="p-1 hover:bg-muted rounded transition-colors">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {watchlist.map((item) => (
          <button
            key={item.symbol}
            onClick={() => onSymbolChange(item.symbol)}
            className={`
              w-full p-3 text-left border-b border-border hover:bg-muted transition-colors
              ${selectedSymbol === item.symbol ? 'bg-primary/10 border-primary/20' : ''}
            `}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-warning fill-current" />
                <span className="font-mono font-semibold">{item.symbol}</span>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold">{item.price}</div>
                <div className={`text-xs flex items-center gap-1 ${
                  item.isUp ? 'text-success' : 'text-error'
                }`}>
                  {item.isUp ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  {item.change}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}