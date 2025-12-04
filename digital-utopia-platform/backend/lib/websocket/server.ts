/**
 * WebSocket Server for Real-Time Updates
 * 
 * Provides real-time price updates, order notifications, and admin broadcasts
 * using Socket.IO for bidirectional communication.
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { getMarketDataService } from '../trading-engine/price-generator';
import { verifyIdToken } from '../firebase';

export interface WebSocketUser {
  userId: string;
  socketId: string;
  email?: string;
  role?: string;
  connectedAt: number;
}

export interface PriceUpdateEvent {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  timestamp: number;
  bid?: number;
  ask?: number;
}

export interface OrderUpdateEvent {
  orderId: string;
  userId: string;
  status: 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected';
  message?: string;
  timestamp: number;
}

export interface TradeUpdateEvent {
  tradeId: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  status: 'open' | 'closed';
  pnl?: number;
  exitPrice?: number;
  timestamp: number;
}

export interface NotificationEvent {
  id: string;
  userId?: string; // If undefined, broadcast to all
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: number;
}

/**
 * WebSocket Server Class
 */
export class WebSocketServer {
  private io: SocketIOServer;
  private connectedUsers: Map<string, WebSocketUser> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> socketIds
  private marketData = getMarketDataService();
  private priceUpdateInterval?: NodeJS.Timeout;

  constructor(httpServer: HTTPServer) {
    // Initialize Socket.IO
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    this.startPriceBroadcasting();
  }

  /**
   * Setup Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', async (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Handle authentication
      socket.on('authenticate', async (token: string) => {
        try {
          const decodedToken = await verifyIdToken(token);
          
          const user: WebSocketUser = {
            userId: decodedToken.uid,
            socketId: socket.id,
            email: decodedToken.email,
            role: decodedToken.role || 'user',
            connectedAt: Date.now(),
          };

          // Store user connection
          this.connectedUsers.set(socket.id, user);
          
          // Track user sockets (one user can have multiple connections)
          if (!this.userSockets.has(user.userId)) {
            this.userSockets.set(user.userId, new Set());
          }
          this.userSockets.get(user.userId)!.add(socket.id);

          // Join user-specific room
          socket.join(`user:${user.userId}`);
          
          // Join role-specific rooms
          socket.join(`role:${user.role}`);

          // Send authentication success
          socket.emit('authenticated', {
            success: true,
            userId: user.userId,
            role: user.role,
          });

          console.log(`User authenticated: ${user.userId} (${user.role})`);
        } catch (error) {
          socket.emit('authentication_error', {
            success: false,
            error: 'Invalid token',
          });
          socket.disconnect();
        }
      });

      // Subscribe to price updates for specific symbols
      socket.on('subscribe:prices', (symbols: string[]) => {
        symbols.forEach((symbol) => {
          socket.join(`price:${symbol}`);
        });
        socket.emit('subscribed:prices', { symbols });
      });

      // Unsubscribe from price updates
      socket.on('unsubscribe:prices', (symbols: string[]) => {
        symbols.forEach((symbol) => {
          socket.leave(`price:${symbol}`);
        });
        socket.emit('unsubscribed:prices', { symbols });
      });

      // Subscribe to user-specific updates
      socket.on('subscribe:user', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          socket.join(`user:${user.userId}`);
          socket.emit('subscribed:user', { userId: user.userId });
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        const user = this.connectedUsers.get(socket.id);
        if (user) {
          const userSocketSet = this.userSockets.get(user.userId);
          if (userSocketSet) {
            userSocketSet.delete(socket.id);
            if (userSocketSet.size === 0) {
              this.userSockets.delete(user.userId);
            }
          }
          this.connectedUsers.delete(socket.id);
          console.log(`User disconnected: ${user.userId}`);
        } else {
          console.log(`Client disconnected: ${socket.id}`);
        }
      });

      // Ping/Pong for connection health
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });
    });
  }

  /**
   * Start broadcasting price updates
   */
  private startPriceBroadcasting(): void {
    // Broadcast price updates every second
    this.priceUpdateInterval = setInterval(() => {
      const symbols = this.marketData.getActiveSymbols();
      
      symbols.forEach((symbol) => {
        const price = this.marketData.getCurrentPrice(symbol);
        const bidAsk = this.marketData.getBidAsk(symbol);
        
        if (price && bidAsk) {
          const priceUpdate: PriceUpdateEvent = {
            symbol,
            price: bidAsk.ask,
            change: 0, // Calculate from previous price if needed
            changePercent: 0,
            timestamp: Date.now(),
            bid: bidAsk.bid,
            ask: bidAsk.ask,
          };

          // Broadcast to subscribers of this symbol
          this.io.to(`price:${symbol}`).emit('price:update', priceUpdate);
        }
      });
    }, 1000); // Update every second
  }

  /**
   * Broadcast price update to all subscribers
   */
  public broadcastPriceUpdate(priceUpdate: PriceUpdateEvent): void {
    this.io.to(`price:${priceUpdate.symbol}`).emit('price:update', priceUpdate);
  }

  /**
   * Send order update to specific user
   */
  public sendOrderUpdate(userId: string, orderUpdate: OrderUpdateEvent): void {
    this.io.to(`user:${userId}`).emit('order:update', orderUpdate);
  }

  /**
   * Send trade update to specific user
   */
  public sendTradeUpdate(userId: string, tradeUpdate: TradeUpdateEvent): void {
    this.io.to(`user:${userId}`).emit('trade:update', tradeUpdate);
  }

  /**
   * Send notification to specific user or broadcast
   */
  public sendNotification(notification: NotificationEvent): void {
    if (notification.userId) {
      // Send to specific user
      this.io.to(`user:${notification.userId}`).emit('notification', notification);
    } else {
      // Broadcast to all connected users
      this.io.emit('notification', notification);
    }
  }

  /**
   * Admin broadcast to all users
   */
  public adminBroadcast(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    const notification: NotificationEvent = {
      id: `admin_${Date.now()}`,
      type,
      title: 'System Announcement',
      message,
      timestamp: Date.now(),
    };
    this.io.emit('admin:broadcast', notification);
  }

  /**
   * Send balance update to user
   */
  public sendBalanceUpdate(userId: string, balance: number): void {
    this.io.to(`user:${userId}`).emit('balance:update', {
      balance,
      timestamp: Date.now(),
    });
  }

  /**
   * Get connected users count
   */
  public getConnectedUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Get all connected users
   */
  public getConnectedUsers(): WebSocketUser[] {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Check if user is connected
   */
  public isUserConnected(userId: string): boolean {
    return this.userSockets.has(userId);
  }

  /**
   * Disconnect user
   */
  public disconnectUser(userId: string, reason?: string): void {
    const socketIds = this.userSockets.get(userId);
    if (socketIds) {
      socketIds.forEach((socketId) => {
        const socket = this.io.sockets.sockets.get(socketId);
        if (socket) {
          socket.emit('force_disconnect', { reason });
          socket.disconnect(true);
        }
      });
    }
  }

  /**
   * Stop the WebSocket server
   */
  public stop(): void {
    if (this.priceUpdateInterval) {
      clearInterval(this.priceUpdateInterval);
    }
    this.io.close();
  }

  /**
   * Get Socket.IO instance
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

// Singleton instance
let webSocketServerInstance: WebSocketServer | null = null;

/**
 * Initialize WebSocket server
 */
export function initializeWebSocketServer(httpServer: HTTPServer): WebSocketServer {
  if (!webSocketServerInstance) {
    webSocketServerInstance = new WebSocketServer(httpServer);
    console.log('✅ WebSocket server initialized');
  }
  return webSocketServerInstance;
}

/**
 * Get WebSocket server instance
 */
export function getWebSocketServer(): WebSocketServer | null {
  return webSocketServerInstance;
}

export default WebSocketServer;
