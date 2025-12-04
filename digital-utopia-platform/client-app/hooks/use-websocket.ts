/**
 * WebSocket Hook for Real-Time Updates
 * 
 * Provides connection to WebSocket server and real-time event handling.
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketOptions {
  url?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  bid?: number;
  ask?: number;
}

interface OrderUpdate {
  orderId: string;
  status: string;
  message?: string;
  timestamp: number;
}

interface TradeUpdate {
  tradeId: string;
  symbol: string;
  side: string;
  status: string;
  pnl?: number;
  exitPrice?: number;
  timestamp: number;
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

export function useWebSocket(token?: string, options: WebSocketOptions = {}) {
  const {
    url = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3002',
    autoConnect = true,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [lastPriceUpdate, setLastPriceUpdate] = useState<PriceUpdate | null>(null);
  const [lastOrderUpdate, setLastOrderUpdate] = useState<OrderUpdate | null>(null);
  const [lastTradeUpdate, setLastTradeUpdate] = useState<TradeUpdate | null>(null);
  const [lastNotification, setLastNotification] = useState<Notification | null>(null);
  const [error, setError] = useState<string | null>(null);

  const socketRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Event listeners
  const priceListenersRef = useRef<Set<(update: PriceUpdate) => void>>(new Set());
  const orderListenersRef = useRef<Set<(update: OrderUpdate) => void>>(new Set());
  const tradeListenersRef = useRef<Set<(update: TradeUpdate) => void>>(new Set());
  const notificationListenersRef = useRef<Set<(notification: Notification) => void>>(new Set());

  const connect = useCallback(() => {
    if (socketRef.current?.connected) {
      return;
    }

    try {
      // Dynamic import of socket.io-client for client-side only
      import('socket.io-client').then(({ io }) => {
        socketRef.current = io(url, {
          transports: ['websocket', 'polling'],
          reconnection: true,
          reconnectionAttempts: reconnectAttempts,
          reconnectionDelay: reconnectInterval,
        });

        // Connection events
        socketRef.current.on('connect', () => {
          console.log('WebSocket connected');
          setIsConnected(true);
          setError(null);
          reconnectAttemptsRef.current = 0;

          // Authenticate if token is available
          if (token) {
            socketRef.current.emit('authenticate', token);
          }
        });

        socketRef.current.on('disconnect', () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          setIsAuthenticated(false);
        });

        socketRef.current.on('connect_error', (err: Error) => {
          console.error('WebSocket connection error:', err);
          setError(err.message);
          setIsConnected(false);
        });

        // Authentication events
        socketRef.current.on('authenticated', (data: any) => {
          console.log('WebSocket authenticated:', data);
          setIsAuthenticated(true);
        });

        socketRef.current.on('authentication_error', (data: any) => {
          console.error('WebSocket authentication error:', data);
          setError(data.error);
          setIsAuthenticated(false);
        });

        // Price updates
        socketRef.current.on('price:update', (update: PriceUpdate) => {
          setLastPriceUpdate(update);
          priceListenersRef.current.forEach(listener => listener(update));
        });

        // Order updates
        socketRef.current.on('order:update', (update: OrderUpdate) => {
          setLastOrderUpdate(update);
          orderListenersRef.current.forEach(listener => listener(update));
        });

        // Trade updates
        socketRef.current.on('trade:update', (update: TradeUpdate) => {
          setLastTradeUpdate(update);
          tradeListenersRef.current.forEach(listener => listener(update));
        });

        // Notifications
        socketRef.current.on('notification', (notification: Notification) => {
          setLastNotification(notification);
          notificationListenersRef.current.forEach(listener => listener(notification));
        });

        socketRef.current.on('admin:broadcast', (notification: Notification) => {
          setLastNotification(notification);
          notificationListenersRef.current.forEach(listener => listener(notification));
        });

        // Balance updates
        socketRef.current.on('balance:update', (data: { balance: number; timestamp: number }) => {
          console.log('Balance updated:', data);
        });

        // Pong response
        socketRef.current.on('pong', (data: { timestamp: number }) => {
          // Connection health check response
        });
      });
    } catch (err) {
      console.error('Failed to initialize WebSocket:', err);
      setError('Failed to initialize WebSocket connection');
    }
  }, [url, token, reconnectAttempts, reconnectInterval]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
  }, []);

  const subscribeToPrices = useCallback((symbols: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:prices', symbols);
    }
  }, []);

  const unsubscribeFromPrices = useCallback((symbols: string[]) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:prices', symbols);
    }
  }, []);

  const subscribeToUser = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:user');
    }
  }, []);

  const ping = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('ping');
    }
  }, []);

  // Event listener management
  const onPriceUpdate = useCallback((listener: (update: PriceUpdate) => void) => {
    priceListenersRef.current.add(listener);
    return () => {
      priceListenersRef.current.delete(listener);
    };
  }, []);

  const onOrderUpdate = useCallback((listener: (update: OrderUpdate) => void) => {
    orderListenersRef.current.add(listener);
    return () => {
      orderListenersRef.current.delete(listener);
    };
  }, []);

  const onTradeUpdate = useCallback((listener: (update: TradeUpdate) => void) => {
    tradeListenersRef.current.add(listener);
    return () => {
      tradeListenersRef.current.delete(listener);
    };
  }, []);

  const onNotification = useCallback((listener: (notification: Notification) => void) => {
    notificationListenersRef.current.add(listener);
    return () => {
      notificationListenersRef.current.delete(listener);
    };
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);

  // Ping interval for connection health
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      ping();
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, ping]);

  return {
    isConnected,
    isAuthenticated,
    error,
    lastPriceUpdate,
    lastOrderUpdate,
    lastTradeUpdate,
    lastNotification,
    connect,
    disconnect,
    subscribeToPrices,
    unsubscribeFromPrices,
    subscribeToUser,
    onPriceUpdate,
    onOrderUpdate,
    onTradeUpdate,
    onNotification,
    ping,
  };
}

export default useWebSocket;
