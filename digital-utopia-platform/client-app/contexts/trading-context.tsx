'use client';

/**
 * Trading Context
 * 
 * Manages global trading state and data.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface TradingContextType {
  selectedSymbol: string;
  setSelectedSymbol: (symbol: string) => void;
  selectedTimeframe: string;
  setSelectedTimeframe: (timeframe: string) => void;
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  orders: any[];
  positions: any[];
}

const TradingContext = createContext<TradingContextType | undefined>(undefined);

interface TradingProviderProps {
  children: ReactNode;
}

export function TradingProvider({ children }: TradingProviderProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [isConnected, setIsConnected] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [positions, setPositions] = useState<any[]>([]);

  const value: TradingContextType = {
    selectedSymbol,
    setSelectedSymbol,
    selectedTimeframe,
    setSelectedTimeframe,
    isConnected,
    setIsConnected,
    orders,
    positions,
  };

  return (
    <TradingContext.Provider value={value}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const context = useContext(TradingContext);
  if (context === undefined) {
    throw new Error('useTrading must be used within a TradingProvider');
  }
  return context;
}