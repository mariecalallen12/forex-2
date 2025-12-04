// ===== CORE TYPES =====

// Basic trading types
export type OrderType = 'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT' | 'TRAILING_STOP';
export type OrderSide = 'BUY' | 'SELL';
export type OrderStatus = 'PENDING' | 'PARTIALLY_FILLED' | 'FILLED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';
export type TimeInForce = 'GTC' | 'IOC' | 'FOK'; // Good Till Cancel, Immediate Or Cancel, Fill Or Kill

// Position types
export type PositionSide = 'LONG' | 'SHORT' | 'BOTH';
export type PositionStatus = 'OPEN' | 'CLOSING' | 'CLOSED';

// User types
export type UserRole = 'user' | 'admin' | 'superadmin';
export type UserStatus = 'active' | 'suspended' | 'pending_verification' | 'banned';
export type KycStatus = 'pending' | 'verified' | 'rejected' | 'not_required';

// Financial types
export type DepositStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type WithdrawalStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'rejected';
export type TransactionType = 'deposit' | 'withdrawal' | 'trade' | 'fee' | 'rebate';

// ===== ADVANCED ORDER TYPES =====

// OCO (One-Cancels-Other) Order
export interface OcoOrder {
  orderId: string;
  userId: string;
  symbol: string;
  orders: {
    takeProfit: Order; // Take profit order
    stopLoss: Order;   // Stop loss order
  };
  status: 'ACTIVE' | 'TRIGGERED' | 'CANCELLED' | 'EXPIRED';
  createdAt: Date;
  updatedAt: Date;
}

// Iceberg Order
export interface IcebergOrder {
  orderId: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  totalQuantity: number;
  visibleQuantity: number; // Each slice size
  remainingQuantity: number;
  filledQuantity: number;
  executedSlices: number;
  maxSlices?: number; // Optional limit on slices
  status: OrderStatus;
  timeInForce: TimeInForce;
  price?: number; // For limit orders
  createdAt: Date;
  updatedAt: Date;
}

// Trailing Stop Order
export interface TrailingStopOrder {
  orderId: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  quantity: number;
  trailingType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  trailValue: number; // Percentage or fixed amount
  currentTrailValue?: number; // Current trailing distance
  stopPrice: number;
  activationPrice?: number; // Price at which trailing stop activates
  status: OrderStatus;
  timeInForce: TimeInForce;
  createdAt: Date;
  updatedAt: Date;
}

// ===== ENHANCED ORDER INTERFACE =====

export interface Order {
  orderId: string;
  userId: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  filledQuantity: number;
  remainingQuantity: number;
  price?: number;
  stopPrice?: number;
  
  // Enhanced fields for advanced orders
  timeInForce: TimeInForce;
  parentOrderId?: string; // For linked orders (OCO, Iceberg)
  orderGroupId?: string; // Group ID for related orders
  
  // Advanced order metadata
  metadata?: {
    orderType: 'NORMAL' | 'OCO' | 'ICEBERG' | 'TRAILING_STOP';
    ocoData?: OcoOrder;
    icebergData?: IcebergOrder;
    trailingStopData?: TrailingStopOrder;
    strategy?: string; // Trading strategy used
    tags?: string[]; // Custom tags
  };
  
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
}

// ===== POSITION MANAGEMENT =====

export interface Position {
  positionId: string;
  userId: string;
  symbol: string;
  side: PositionSide;
  size: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
  leverage?: number;
  margin: number;
  liquidationPrice?: number;
  takeProfit?: number;
  stopLoss?: number;
  status: PositionStatus;
  orders: string[]; // Related order IDs
  createdAt: Date;
  updatedAt: Date;
}

// ===== PORTFOLIO TYPES =====

export interface PortfolioMetrics {
  totalBalance: number;
  availableBalance: number;
  usedMargin: number;
  totalPnl: number;
  totalPnlPercent: number;
  dailyPnl: number;
  dailyPnlPercent: number;
  
  // Asset breakdown
  assets: {
    [symbol: string]: {
      balance: number;
      value: number;
      pnl: number;
      pnlPercent: number;
      allocation: number; // Portfolio percentage
    };
  };
  
  // Performance metrics
  performance: {
    totalReturn: number;
    totalReturnPercent: number;
    maxDrawdown: number;
    maxDrawdownPercent: number;
    sharpeRatio?: number;
    winRate?: number;
    averageWin?: number;
    averageLoss?: number;
    profitFactor?: number;
  };
  
  // Risk metrics
  risk: {
    var95: number; // Value at Risk (95%)
    var99: number; // Value at Risk (99%)
    beta?: number; // Portfolio beta
    correlation?: { [symbol: string]: number };
  };
  
  updatedAt: Date;
}

// Portfolio Analytics
export interface PortfolioAnalytics {
  portfolioId: string;
  userId: string;
  period: '1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL';
  
  metrics: PortfolioMetrics;
  
  // Chart data
  balanceHistory: {
    timestamp: Date;
    balance: number;
    pnl: number;
  }[];
  
  allocationHistory: {
    timestamp: Date;
    assets: {
      symbol: string;
      allocation: number;
    }[];
  }[];
  
  performanceMetrics: {
    period: string;
    return: number;
    returnPercent: number;
    maxDrawdown: number;
    sharpeRatio?: number;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

// ===== TRADING STRATEGY TYPES =====

export interface TradingStrategy {
  strategyId: string;
  userId: string;
  name: string;
  description: string;
  strategyType: 'MANUAL' | 'AUTOMATED' | 'SIGNAL_BASED';
  
  // Strategy parameters
  parameters: {
    timeframe: '1M' | '5M' | '15M' | '1H' | '4H' | '1D';
    indicators: string[]; // Technical indicators used
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    maxPositions: number;
    maxDrawdown: number; // Maximum acceptable drawdown %
    takeProfitPercent: number;
    stopLossPercent: number;
  };
  
  // Performance tracking
  performance: {
    totalTrades: number;
    winTrades: number;
    lossTrades: number;
    winRate: number;
    totalPnl: number;
    totalPnlPercent: number;
    averageWin: number;
    averageLoss: number;
    profitFactor: number;
    maxDrawdown: number;
  };
  
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  createdAt: Date;
  updatedAt: Date;
}

// ===== API RESPONSE TYPES =====

// Standard API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: Date;
    requestId: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// ===== WEBSOCKET MESSAGE TYPES =====

export interface WebSocketMessage {
  type: 'ORDER_UPDATE' | 'PRICE_UPDATE' | 'POSITION_UPDATE' | 'PORTFOLIO_UPDATE' | 'TRADE_UPDATE';
  channel: string;
  data: any;
  timestamp: Date;
}

// ===== TRADING BOT TYPES =====

export interface TradingBot {
  botId: string;
  userId: string;
  name: string;
  strategy: TradingStrategy;
  status: 'STARTED' | 'PAUSED' | 'STOPPED' | 'ERROR';
  
  // Bot configuration
  config: {
    symbols: string[];
    baseAmount: number;
    leverage: number;
    maxConcurrentOrders: number;
    riskManagement: {
      maxDailyLoss: number;
      maxDrawdown: number;
      stopLossPercent: number;
      takeProfitPercent: number;
    };
  };
  
  // Performance metrics
  performance: {
    totalTrades: number;
    successRate: number;
    totalPnl: number;
    totalPnlPercent: number;
    averageTradeTime: number;
    maxDrawdown: number;
  };
  
  // Logs and monitoring
  logs: {
    timestamp: Date;
    level: 'INFO' | 'WARNING' | 'ERROR';
    message: string;
    data?: any;
  }[];
  
  createdAt: Date;
  updatedAt: Date;
}

// ===== RISK MANAGEMENT TYPES =====

export interface RiskMetrics {
  userId: string;
  
  // Position limits
  maxPositions: number;
  maxOrderSize: number;
  maxDailyVolume: number;
  maxLeverage: number;
  
  // Risk alerts
  alerts: {
    drawdownAlert: number; // Alert at X% drawdown
    dailyLossAlert: number; // Alert at X daily loss
    concentrationAlert: number; // Alert at X% single asset concentration
  };
  
  // Current risk state
  currentRisk: {
    activePositions: number;
    totalExposure: number;
    portfolioConcentration: number;
    currentDrawdown: number;
    dailyPnl: number;
    unrealizedPnl: number;
  };
  
  // Compliance flags
  compliance: {
    marginLevel: number;
    maintenanceMargin: number;
    liquidationRisk: number;
    regulatoryLimits: boolean;
  };
  
  updatedAt: Date;
}

// ===== SOCIAL TRADING TYPES =====

export interface CopyTrader {
  traderId: string;
  userId: string;
  username: string;
  displayName: string;
  
  // Performance metrics
  performance: {
    totalReturn: number;
    totalReturnPercent: number;
    maxDrawdown: number;
    sharpeRatio: number;
    winRate: number;
    totalTrades: number;
    averageTradeDuration: number;
  };
  
  // Following information
  followers: number;
  following: number;
  totalAum: number; // Assets Under Management
  
  // Status and verification
  status: 'VERIFIED' | 'PENDING' | 'SUSPENDED';
  verification: {
    identity: boolean;
    trading: boolean;
    social: boolean;
  };
  
  // Risk management
  riskSettings: {
    maxDrawdown: number;
    maxDailyAllocation: number;
    autoStop: boolean;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

export interface CopyTrade {
  copyTradeId: string;
  copyTraderId: string; // Who we're copying
  followerId: string; // Who is copying
  traderId: string; // Trader ID (traderId = followerId for self-trades)
  
  // Copy settings
  settings: {
    allocation: number; // Amount to allocate
    leverage: number;
    maxDrawdown: number; // Stop copying if drawdown exceeds this
    autoStop: boolean;
  };
  
  // Performance tracking
  performance: {
    copiedTrades: number;
    totalPnl: number;
    totalReturn: number;
    avgCopyDelay: number; // Average delay in copying trades
  };
  
  status: 'ACTIVE' | 'PAUSED' | 'STOPPED';
  createdAt: Date;
  updatedAt: Date;
}

// ===== MARKET DATA TYPES =====

export interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: Date;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
}

export interface OrderBook {
  symbol: string;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  timestamp: Date;
}

export interface TradeData {
  tradeId: string;
  symbol: string;
  price: number;
  quantity: number;
  side: OrderSide;
  timestamp: Date;
}

// ===== NOTIFICATION TYPES =====

export interface Notification {
  notificationId: string;
  userId: string;
  type: 'ORDER' | 'TRADE' | 'PORTFOLIO' | 'SYSTEM' | 'RISK' | 'MARKET';
  title: string;
  message: string;
  data?: any;
  
  // Notification preferences
  channels: {
    push: boolean;
    email: boolean;
    sms: boolean;
    inApp: boolean;
  };
  
  // Delivery tracking
  deliveryStatus: {
    push: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
    email: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
    sms: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
    inApp: 'PENDING' | 'READ' | 'UNREAD';
  };
  
  createdAt: Date;
  readAt?: Date;
}

// ===== ADMIN TYPES =====

export interface AdminUser {
  userId: string;
  email: string;
  roles: UserRole[];
  permissions: string[];
  
  // Admin specific data
  adminData: {
    lastLoginAt: Date;
    loginCount: number;
    actionsPerformed: number;
    lastAction?: string;
  };
  
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminAction {
  actionId: string;
  adminId: string;
  targetUserId?: string;
  action: string;
  description: string;
  metadata?: any;
  ipAddress: string;
  userAgent: string;
  
  createdAt: Date;
}

// ===== ERROR TYPES =====

export interface TradingError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  requestId?: string;
}

// Trading error codes
export const TradingErrorCodes = {
  // Order related
  INVALID_SYMBOL: 'INVALID_SYMBOL',
  INSUFFICIENT_BALANCE: 'INSUFFICIENT_BALANCE',
  INVALID_ORDER_TYPE: 'INVALID_ORDER_TYPE',
  INVALID_QUANTITY: 'INVALID_QUANTITY',
  INVALID_PRICE: 'INVALID_PRICE',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_CANCELLED: 'ORDER_ALREADY_CANCELLED',
  
  // Position related
  POSITION_NOT_FOUND: 'POSITION_NOT_FOUND',
  INVALID_LEVERAGE: 'INVALID_LEVERAGE',
  MARGIN_INSUFFICIENT: 'MARGIN_INSUFFICIENT',
  LIQUIDATION_RISK: 'LIQUIDATION_RISK',
  
  // Portfolio related
  PORTFOLIO_NOT_FOUND: 'PORTFOLIO_NOT_FOUND',
  INVALID_ALLOCATION: 'INVALID_ALLOCATION',
  
  // Risk management
  RISK_LIMIT_EXCEEDED: 'RISK_LIMIT_EXCEEDED',
  DRAWDOWN_EXCEEDED: 'DRAWDOWN_EXCEEDED',
  DAILY_LOSS_EXCEEDED: 'DAILY_LOSS_EXCEEDED',
  
  // Advanced orders
  OCO_VALIDATION_FAILED: 'OCO_VALIDATION_FAILED',
  ICEBERG_SLICE_TOO_LARGE: 'ICEBERG_SLICE_TOO_LARGE',
  TRAILING_STOP_INVALID: 'TRAILING_STOP_INVALID',
  
  // System
  MARKET_CLOSED: 'MARKET_CLOSED',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
} as const;

// ===== CONFIGURATION TYPES =====

export interface PlatformConfig {
  // Trading configuration
  trading: {
    minOrderSize: number;
    maxOrderSize: number;
    maxLeverage: number;
    defaultLeverage: number;
    supportedSymbols: string[];
    supportedTimeframes: TimeInForce[];
  };
  
  // Risk management configuration
  risk: {
    maxDailyLoss: number;
    maxDrawdown: number;
    maxPositions: number;
    marginCallLevel: number;
    liquidationLevel: number;
  };
  
  // Notification configuration
  notifications: {
    enabled: boolean;
    channels: string[];
    rateLimits: {
      [channel: string]: {
        maxPerHour: number;
        maxPerDay: number;
      };
    };
  };
  
  updatedAt: Date;
}

// Export all types for easy importing
export type {
  OrderType,
  OrderSide,
  OrderStatus,
  TimeInForce,
  PositionSide,
  PositionStatus,
  UserRole,
  UserStatus,
  KycStatus,
  DepositStatus,
  WithdrawalStatus,
  TransactionType
};