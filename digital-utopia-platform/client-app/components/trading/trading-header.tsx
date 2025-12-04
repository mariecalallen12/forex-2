'use client';

/**
 * Trading Header Component
 * 
 * Top navigation bar for the trading interface.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import { Menu, Bell, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useState } from 'react';

interface TradingHeaderProps {
  onMenuClick: () => void;
  selectedSymbol: string;
}

export function TradingHeader({ onMenuClick, selectedSymbol }: TradingHeaderProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-4">
      {/* Left Section */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">DU</span>
          </div>
          <span className="font-semibold text-foreground hidden sm:block">
            Digital Utopia
          </span>
        </div>
      </div>

      {/* Center Section - Current Symbol */}
      <div className="hidden md:flex items-center gap-2">
        <span className="text-foreground-secondary text-sm">Symbol:</span>
        <span className="font-mono font-semibold text-foreground">
          {selectedSymbol}
        </span>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-muted rounded-lg transition-colors relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-error rounded-full"></span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <span className="hidden sm:block text-sm font-medium">
              {user?.displayName || 'User'}
            </span>
          </button>

          {/* User Menu Dropdown */}
          {showUserMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 bg-surface border border-border rounded-lg shadow-lg py-2 z-50">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-sm font-medium">{user?.displayName}</p>
                <p className="text-xs text-foreground-secondary">{user?.email}</p>
              </div>
              
              <button className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="text-sm">Settings</span>
              </button>
              
              <button 
                onClick={handleLogout}
                className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 text-error"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm">Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}