'use client';

/**
 * News Panel Component
 * 
 * Shows latest market news and updates.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import { Clock } from 'lucide-react';

export function NewsPanel() {
  // Mock news data
  const news = [
    {
      id: '1',
      title: 'Fed Holds Interest Rates Steady, Signals Caution',
      summary: 'The Federal Reserve maintained its key interest rate and indicated a cautious approach to future changes...',
      time: '2 hours ago',
      category: 'Monetary Policy',
    },
    {
      id: '2',
      title: 'Bitcoin Reaches New Monthly High',
      summary: 'Cryptocurrency markets rally as institutional adoption continues to grow...',
      time: '4 hours ago',
      category: 'Cryptocurrency',
    },
    {
      id: '3',
      title: 'EUR/USD Strengthens on ECB Optimism',
      summary: 'The euro gained against the dollar following positive comments from European Central Bank officials...',
      time: '6 hours ago',
      category: 'Forex',
    },
    {
      id: '4',
      title: 'Oil Prices Surge on Supply Concerns',
      summary: 'Crude oil futures climbed as geopolitical tensions raised supply disruption worries...',
      time: '8 hours ago',
      category: 'Commodities',
    },
  ];

  return (
    <div className="h-full bg-surface">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold">Market News</h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {news.map((item) => (
          <article
            key={item.id}
            className="p-4 border-b border-border hover:bg-muted cursor-pointer transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-sm leading-snug mb-2">
                  {item.title}
                </h4>
                <p className="text-xs text-foreground-secondary leading-relaxed mb-3">
                  {item.summary}
                </p>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-primary/20 text-primary rounded-full">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-1 text-foreground-muted">
                    <Clock className="w-3 h-3" />
                    <span>{item.time}</span>
                  </div>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="p-4 border-t border-border">
        <button className="w-full text-sm text-primary hover:underline">
          View All News →
        </button>
      </div>
    </div>
  );
}