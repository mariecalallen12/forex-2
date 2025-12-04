'use client';

/**
 * Trading Sidebar Component
 * 
 * Navigation sidebar for trading interface.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import { X, TrendingUp, BarChart3, PieChart, BookOpen, Settings } from 'lucide-react';
import { TRADING_SYMBOLS } from '../../shared/constants';

interface TradingSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSymbol: string;
  onSymbolChange: (symbol: string) => void;
}

export function TradingSidebar({ isOpen, onClose, selectedSymbol, onSymbolChange }: TradingSidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative top-0 left-0 h-full w-80 bg-surface border-r border-border z-50 transform transition-transform duration-300
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Markets</h2>
          <button
            onClick={onClose}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <div className="p-4">
          <nav className="space-y-2">
            <NavItem icon={TrendingUp} label="Trading" active />
            <NavItem icon={BarChart3} label="Charts" />
            <NavItem icon={PieChart} label="Portfolio" />
            <NavItem icon={BookOpen} label="Education" />
            <NavItem icon={Settings} label="Settings" />
          </nav>
        </div>

        {/* Symbol List */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <h3 className="text-sm font-medium text-foreground-secondary mb-2">
              Popular Pairs
            </h3>
            <div className="space-y-1">
              {TRADING_SYMBOLS.slice(0, 10).map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => {
                    onSymbolChange(symbol);
                    onClose();
                  }}
                  className={`
                    w-full text-left px-3 py-2 rounded-lg transition-colors text-sm font-mono
                    ${selectedSymbol === symbol 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted text-foreground'
                    }
                  `}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface NavItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active?: boolean;
}

function NavItem({ icon: Icon, label, active = false }: NavItemProps) {
  return (
    <button
      className={`
        w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left
        ${active 
          ? 'bg-primary text-primary-foreground' 
          : 'hover:bg-muted text-foreground'
        }
      `}
    >
      <Icon className="w-5 h-5" />
      <span className="text-sm">{label}</span>
    </button>
  );
}