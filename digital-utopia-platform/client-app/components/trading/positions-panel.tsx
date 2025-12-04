'use client';

/**
 * Positions Panel Component
 * 
 * Shows current trading positions.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import { TrendingUp, TrendingDown } from 'lucide-react';

export function PositionsPanel() {
  // Mock positions data
  const positions = [
    {
      id: '1',
      symbol: 'EURUSD',
      side: 'long',
      size: '0.10',
      entryPrice: '1.0820',
      currentPrice: '1.0845',
      pnl: '+0.25',
      pnlPercent: '+0.23%',
    },
    {
      id: '2',
      symbol: 'BTCUSD',
      side: 'short',
      size: '0.01',
      entryPrice: '44,000',
      currentPrice: '43,256',
      pnl: '+744',
      pnlPercent: '+1.69%',
    },
  ];

  if (positions.length === 0) {
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-4">Positions</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 mx-auto mb-3 bg-muted rounded-full flex items-center justify-center">
            <span className="text-xl">📊</span>
          </div>
          <p className="text-foreground-secondary">No open positions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">Positions ({positions.length})</h3>
      
      <div className="space-y-3">
        {positions.map((position) => (
          <div
            key={position.id}
            className="bg-background border border-border rounded-lg p-3"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-mono font-semibold">{position.symbol}</span>
                <div className={`flex items-center gap-1 text-xs ${
                  position.side === 'long' ? 'text-success' : 'text-error'
                }`}>
                  {position.side === 'long' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span className="uppercase">{position.side}</span>
                </div>
              </div>
              <div className={`font-semibold ${
                parseFloat(position.pnl) >= 0 ? 'text-success' : 'text-error'
              }`}>
                {position.pnl} ({position.pnlPercent})
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-foreground-secondary">Size:</span>
                <span className="ml-2 font-mono">{position.size}</span>
              </div>
              <div>
                <span className="text-foreground-secondary">Entry:</span>
                <span className="ml-2 font-mono">{position.entryPrice}</span>
              </div>
              <div>
                <span className="text-foreground-secondary">Current:</span>
                <span className="ml-2 font-mono">{position.currentPrice}</span>
              </div>
              <div>
                <button className="text-xs text-primary hover:underline">
                  Close
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}