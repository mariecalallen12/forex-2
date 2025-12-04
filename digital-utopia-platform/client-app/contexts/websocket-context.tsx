'use client';

/**
 * WebSocket Context
 * 
 * Manages WebSocket connection and real-time data.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { WEBSOCKET_CONFIG } from '@/lib/config';

interface WebSocketContextType {
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  send: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: ReactNode;
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const connect = () => {
    try {
      const ws = new WebSocket(WEBSOCKET_CONFIG.URL);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setSocket(ws);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        setSocket(null);
        
        // Reconnect after delay
        setTimeout(() => {
          if (!isConnected) {
            connect();
          }
        }, WEBSOCKET_CONFIG.RECONNECT_INTERVAL);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Handle incoming messages
          console.log('WebSocket message:', data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
    }
  };

  const disconnect = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
  };

  const subscribe = (channel: string) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        action: 'subscribe',
        channel,
      }));
    }
  };

  const unsubscribe = (channel: string) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify({
        action: 'unsubscribe',
        channel,
      }));
    }
  };

  const send = (message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message));
    }
  };

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
}