'use client';

/**
 * Order Panel Component
 * 
 * Trading order entry form.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface OrderPanelProps {
  selectedSymbol: string;
}

export function OrderPanel({ selectedSymbol }: OrderPanelProps) {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market');
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [price, setPrice] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle order submission
    console.log('Order submitted:', { orderType, side, amount, price, symbol: selectedSymbol });
  };

  return (
    <div className="p-4 bg-surface border-b border-border">
      <h3 className="font-semibold mb-4">Place Order</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Order Type Toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            type="button"
            onClick={() => setOrderType('market')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              orderType === 'market' 
                ? 'bg-background shadow-sm' 
                : 'text-foreground-secondary'
            }`}
          >
            Market
          </button>
          <button
            type="button"
            onClick={() => setOrderType('limit')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              orderType === 'limit' 
                ? 'bg-background shadow-sm' 
                : 'text-foreground-secondary'
            }`}
          >
            Limit
          </button>
        </div>

        {/* Buy/Sell Toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          <button
            type="button"
            onClick={() => setSide('buy')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              side === 'buy' 
                ? 'bg-success text-white shadow-sm' 
                : 'text-foreground-secondary'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            Buy
          </button>
          <button
            type="button"
            onClick={() => setSide('sell')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
              side === 'sell' 
                ? 'bg-error text-white shadow-sm' 
                : 'text-foreground-secondary'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Sell
          </button>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium mb-2">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            step="0.01"
            min="0"
            required
          />
        </div>

        {/* Price Input (for limit orders) */}
        {orderType === 'limit' && (
          <div>
            <label className="block text-sm font-medium mb-2">Price</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              step="0.0001"
              min="0"
              required
            />
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className={`w-full py-3 rounded-lg font-semibold transition-colors ${
            side === 'buy'
              ? 'bg-success hover:bg-success/90 text-white'
              : 'bg-error hover:bg-error/90 text-white'
          }`}
        >
          {side === 'buy' ? 'Buy' : 'Sell'} {selectedSymbol}
        </button>

        {/* Order Summary */}
        <div className="text-xs text-foreground-secondary space-y-1">
          <div className="flex justify-between">
            <span>Est. Cost:</span>
            <span className="font-mono">${amount || '0.00'}</span>
          </div>
          <div className="flex justify-between">
            <span>Fee (0.1%):</span>
            <span className="font-mono">${((parseFloat(amount) || 0) * 0.001).toFixed(2)}</span>
          </div>
        </div>
      </form>
    </div>
  );
}