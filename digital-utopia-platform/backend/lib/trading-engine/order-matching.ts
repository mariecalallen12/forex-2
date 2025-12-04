/**
 * Order Matching Engine
 * 
 * Simulates order execution with realistic slippage and market impact.
 * Supports market orders, limit orders, and stop orders.
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

import { getMarketDataService } from './price-generator';

export interface Order {
  id: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop-limit';
  quantity: number;
  price?: number; // For limit orders
  stopPrice?: number; // For stop orders
  leverage?: number;
  stopLoss?: number;
  takeProfit?: number;
  status: 'pending' | 'open' | 'filled' | 'cancelled' | 'rejected';
  createdAt: number;
  updatedAt: number;
}

export interface Trade {
  id: string;
  orderId: string;
  userId: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  entryPrice: number;
  currentPrice?: number;
  exitPrice?: number;
  pnl?: number;
  pnlPercent?: number;
  leverage: number;
  stopLoss?: number;
  takeProfit?: number;
  commission: number;
  status: 'open' | 'closed';
  openedAt: number;
  closedAt?: number;
  closeReason?: 'manual' | 'stop-loss' | 'take-profit' | 'margin-call' | 'admin';
}

export interface ExecutionResult {
  success: boolean;
  trade?: Trade;
  error?: string;
  executionPrice: number;
  slippage: number;
}

export interface TradingParameters {
  defaultSpread: number; // Spread in percentage (e.g., 0.01 = 0.01%)
  defaultSlippage: number; // Slippage range (e.g., 0.0001 = 0.01%)
  maxLeverage: number; // Maximum allowed leverage
  commissionRate: number; // Commission percentage (e.g., 0.1 = 0.1%)
  volatilityFactor: number; // Market volatility multiplier
}

/**
 * Order Matching Engine
 */
export class OrderMatchingEngine {
  private marketData = getMarketDataService();
  private parameters: TradingParameters;

  constructor(parameters?: Partial<TradingParameters>) {
    this.parameters = {
      defaultSpread: 0.01, // 0.01%
      defaultSlippage: 0.0001, // 0.01% max slippage
      maxLeverage: 100,
      commissionRate: 0.1, // 0.1%
      volatilityFactor: 1.0,
      ...parameters,
    };
  }

  /**
   * Execute market order immediately at current price
   */
  executeMarketOrder(order: Order): ExecutionResult {
    const currentPrice = this.marketData.getCurrentPrice(order.symbol);
    
    if (!currentPrice) {
      return {
        success: false,
        error: `Market data not available for ${order.symbol}`,
        executionPrice: 0,
        slippage: 0,
      };
    }

    // Calculate slippage (realistic random slippage within range)
    const slippagePercent =
      (Math.random() * this.parameters.defaultSlippage * this.parameters.volatilityFactor);
    const slippage = currentPrice * slippagePercent;

    // Apply slippage based on order side
    const executionPrice =
      order.side === 'buy'
        ? currentPrice + slippage // Buy at higher price
        : currentPrice - slippage; // Sell at lower price

    // Create trade from order
    const trade = this.createTradeFromOrder(order, executionPrice);

    return {
      success: true,
      trade,
      executionPrice,
      slippage: slippagePercent * 100, // Convert to percentage
    };
  }

  /**
   * Check if limit order can be executed
   */
  checkLimitOrder(order: Order): ExecutionResult | null {
    if (!order.price) {
      return {
        success: false,
        error: 'Limit order requires price',
        executionPrice: 0,
        slippage: 0,
      };
    }

    const currentPrice = this.marketData.getCurrentPrice(order.symbol);
    
    if (!currentPrice) {
      return null; // Market data not available yet
    }

    // Check if limit order conditions are met
    let shouldExecute = false;
    
    if (order.side === 'buy' && currentPrice <= order.price) {
      shouldExecute = true; // Buy when price drops to limit
    } else if (order.side === 'sell' && currentPrice >= order.price) {
      shouldExecute = true; // Sell when price rises to limit
    }

    if (!shouldExecute) {
      return null; // Order not ready to execute
    }

    // Execute at limit price (better price for user)
    const trade = this.createTradeFromOrder(order, order.price);

    return {
      success: true,
      trade,
      executionPrice: order.price,
      slippage: 0, // No slippage on limit orders
    };
  }

  /**
   * Check if stop order should be triggered
   */
  checkStopOrder(order: Order): ExecutionResult | null {
    if (!order.stopPrice) {
      return {
        success: false,
        error: 'Stop order requires stop price',
        executionPrice: 0,
        slippage: 0,
      };
    }

    const currentPrice = this.marketData.getCurrentPrice(order.symbol);
    
    if (!currentPrice) {
      return null;
    }

    // Check if stop conditions are met
    let shouldTrigger = false;
    
    if (order.side === 'buy' && currentPrice >= order.stopPrice) {
      shouldTrigger = true; // Buy stop: buy when price rises
    } else if (order.side === 'sell' && currentPrice <= order.stopPrice) {
      shouldTrigger = true; // Sell stop: sell when price falls
    }

    if (!shouldTrigger) {
      return null;
    }

    // Execute as market order after trigger
    return this.executeMarketOrder({ ...order, type: 'market' });
  }

  /**
   * Check stop-loss and take-profit for open trade
   */
  checkTradeStopLevels(trade: Trade): {
    shouldClose: boolean;
    reason?: 'stop-loss' | 'take-profit';
    exitPrice?: number;
  } {
    const currentPrice = this.marketData.getCurrentPrice(trade.symbol);
    
    if (!currentPrice) {
      return { shouldClose: false };
    }

    // Calculate current P&L
    const pnl = this.calculatePnL(trade, currentPrice);

    // Check stop-loss
    if (trade.stopLoss) {
      if (trade.side === 'buy' && currentPrice <= trade.stopLoss) {
        return {
          shouldClose: true,
          reason: 'stop-loss',
          exitPrice: trade.stopLoss,
        };
      } else if (trade.side === 'sell' && currentPrice >= trade.stopLoss) {
        return {
          shouldClose: true,
          reason: 'stop-loss',
          exitPrice: trade.stopLoss,
        };
      }
    }

    // Check take-profit
    if (trade.takeProfit) {
      if (trade.side === 'buy' && currentPrice >= trade.takeProfit) {
        return {
          shouldClose: true,
          reason: 'take-profit',
          exitPrice: trade.takeProfit,
        };
      } else if (trade.side === 'sell' && currentPrice <= trade.takeProfit) {
        return {
          shouldClose: true,
          reason: 'take-profit',
          exitPrice: trade.takeProfit,
        };
      }
    }

    return { shouldClose: false };
  }

  /**
   * Close an open trade
   */
  closeTrade(trade: Trade, exitPrice?: number, reason: string = 'manual'): Trade {
    const currentPrice = exitPrice || this.marketData.getCurrentPrice(trade.symbol) || trade.entryPrice;
    
    const pnl = this.calculatePnL(trade, currentPrice);
    const pnlPercent = (pnl / (trade.entryPrice * trade.quantity / trade.leverage)) * 100;

    return {
      ...trade,
      exitPrice: currentPrice,
      currentPrice,
      pnl,
      pnlPercent,
      status: 'closed',
      closedAt: Date.now(),
      closeReason: reason as any,
    };
  }

  /**
   * Calculate P&L for a trade
   */
  private calculatePnL(trade: Trade, currentPrice: number): number {
    const priceDiff =
      trade.side === 'buy'
        ? currentPrice - trade.entryPrice
        : trade.entryPrice - currentPrice;

    const grossPnL = priceDiff * trade.quantity * trade.leverage;
    
    // Subtract commission (paid on both entry and exit)
    const totalCommission = trade.commission * 2; // Entry + exit
    
    return grossPnL - totalCommission;
  }

  /**
   * Create trade object from order
   */
  private createTradeFromOrder(order: Order, executionPrice: number): Trade {
    const leverage = Math.min(order.leverage || 1, this.parameters.maxLeverage);
    const commission = this.calculateCommission(
      executionPrice * order.quantity,
      this.parameters.commissionRate
    );

    return {
      id: `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      orderId: order.id,
      userId: order.userId,
      symbol: order.symbol,
      side: order.side,
      quantity: order.quantity,
      entryPrice: executionPrice,
      currentPrice: executionPrice,
      leverage,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      commission,
      status: 'open',
      openedAt: Date.now(),
    };
  }

  /**
   * Calculate commission
   */
  private calculateCommission(notionalValue: number, commissionRate: number): number {
    return notionalValue * (commissionRate / 100);
  }

  /**
   * Update trading parameters
   */
  setTradingParameters(params: Partial<TradingParameters>): void {
    this.parameters = { ...this.parameters, ...params };
  }

  /**
   * Get current trading parameters
   */
  getTradingParameters(): TradingParameters {
    return { ...this.parameters };
  }

  /**
   * Calculate required margin
   */
  calculateRequiredMargin(
    symbol: string,
    quantity: number,
    leverage: number
  ): number {
    const price = this.marketData.getCurrentPrice(symbol) || 0;
    const notionalValue = price * quantity;
    return notionalValue / leverage;
  }

  /**
   * Validate order before execution
   */
  validateOrder(order: Order, accountBalance: number): {
    valid: boolean;
    error?: string;
  } {
    // Check if market data available
    const currentPrice = this.marketData.getCurrentPrice(order.symbol);
    if (!currentPrice) {
      return {
        valid: false,
        error: `Market data not available for ${order.symbol}`,
      };
    }

    // Validate leverage
    const leverage = order.leverage || 1;
    if (leverage > this.parameters.maxLeverage) {
      return {
        valid: false,
        error: `Maximum leverage is ${this.parameters.maxLeverage}x`,
      };
    }

    // Calculate required margin
    const requiredMargin = this.calculateRequiredMargin(
      order.symbol,
      order.quantity,
      leverage
    );

    // Check account balance
    if (requiredMargin > accountBalance) {
      return {
        valid: false,
        error: 'Insufficient balance',
      };
    }

    return { valid: true };
  }
}

// Singleton instance
let orderMatchingEngineInstance: OrderMatchingEngine | null = null;

/**
 * Get order matching engine instance
 */
export function getOrderMatchingEngine(): OrderMatchingEngine {
  if (!orderMatchingEngineInstance) {
    orderMatchingEngineInstance = new OrderMatchingEngine();
  }
  return orderMatchingEngineInstance;
}
