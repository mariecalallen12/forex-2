/**
 * Trading Dashboard Homepage
 * 
 * Professional trading interface with real-time data, charts, and trading tools.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { TradingHeader } from '@/components/trading/trading-header';
import { TradingSidebar } from '@/components/trading/trading-sidebar';
import { MarketOverview } from '@/components/trading/market-overview';
import { TradingChart } from '@/components/trading/trading-chart';
import { OrderPanel } from '@/components/trading/order-panel';
import { PositionsPanel } from '@/components/trading/positions-panel';
import { WatchlistPanel } from '@/components/trading/watchlist-panel';
import { NewsPanel } from '@/components/trading/news-panel';
import { PriceTicker } from '@/components/trading/price-ticker';
import { WelcomeModal } from '@/components/trading/welcome-modal';

export default function TradingDashboard() {
  const { user, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [showWelcome, setShowWelcome] = useState(false);

  // Show welcome modal for new users
  useEffect(() => {
    if (user && !user.hasCompletedOnboarding) {
      setShowWelcome(true);
    }
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="mt-4 text-foreground-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-4">Welcome to Digital Utopia</h1>
          <p className="text-foreground-secondary mb-8">Please log in to access the trading platform</p>
          <a 
            href="/auth/login"
            className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <TradingSidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)}
        selectedSymbol={selectedSymbol}
        onSymbolChange={setSelectedSymbol}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <TradingHeader 
          onMenuClick={() => setSidebarOpen(true)}
          selectedSymbol={selectedSymbol}
        />
        
        {/* Price Ticker */}
        <PriceTicker />
        
        {/* Main Trading Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full flex">
            {/* Left Panel - Chart */}
            <div className="flex-1 flex flex-col">
              <MarketOverview selectedSymbol={selectedSymbol} />
              <div className="flex-1 p-4">
                <TradingChart symbol={selectedSymbol} />
              </div>
            </div>
            
            {/* Right Panel - Order & Positions */}
            <div className="w-80 flex flex-col border-l border-border">
              <div className="flex-1 flex flex-col">
                <OrderPanel selectedSymbol={selectedSymbol} />
                <PositionsPanel />
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom Panel - Watchlist & News */}
        <div className="h-64 border-t border-border">
          <div className="h-full flex">
            <div className="flex-1">
              <WatchlistPanel 
                selectedSymbol={selectedSymbol}
                onSymbolChange={setSelectedSymbol}
              />
            </div>
            <div className="w-96 border-l border-border">
              <NewsPanel />
            </div>
          </div>
        </div>
      </div>
      
      {/* Welcome Modal */}
      {showWelcome && (
        <WelcomeModal 
          onClose={() => setShowWelcome(false)}
          onComplete={() => setShowWelcome(false)}
        />
      )}
    </div>
  );
}
