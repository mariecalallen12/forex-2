/**
 * Trading Price Generator
 * 
 * Generates realistic price movements using Geometric Brownian Motion (GBM)
 * and market simulation algorithms.
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

export interface PriceConfig {
  symbol: string;
  initialPrice: number;
  drift: number; // μ - trend coefficient (e.g., 0.0001 for slight uptrend)
  volatility: number; // σ - volatility (e.g., 0.02 for 2% volatility)
  timeStep: number; // dt in seconds (default: 1)
  minPrice?: number; // Minimum allowed price
  maxPrice?: number; // Maximum allowed price
}

export interface PricePoint {
  timestamp: number;
  price: number;
  change: number;
  changePercent: number;
}

export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Price Generator using Geometric Brownian Motion
 * 
 * Formula: dS = μS dt + σS dW
 * where:
 * - S = current price
 * - μ = drift (trend)
 * - σ = volatility
 * - dW = Wiener process (random walk)
 */
export class PriceGenerator {
  private config: Required<PriceConfig>;
  private currentPrice: number;
  private priceHistory: PricePoint[] = [];
  private randomSeed: number = Math.random();

  constructor(config: PriceConfig) {
    this.config = {
      ...config,
      minPrice: config.minPrice || config.initialPrice * 0.5,
      maxPrice: config.maxPrice || config.initialPrice * 2,
    };
    this.currentPrice = config.initialPrice;
  }

  /**
   * Generate next price using GBM
   */
  generateNextPrice(): PricePoint {
    const previousPrice = this.currentPrice;
    
    // Geometric Brownian Motion formula
    const dt = this.config.timeStep;
    const drift = this.config.drift * this.currentPrice * dt;
    const randomShock =
      this.config.volatility *
      this.currentPrice *
      Math.sqrt(dt) *
      this.randomNormal();

    // Calculate new price
    let newPrice = this.currentPrice + drift + randomShock;

    // Apply price bounds
    newPrice = Math.max(this.config.minPrice, Math.min(this.config.maxPrice, newPrice));

    // Calculate change
    const change = newPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;

    // Update current price
    this.currentPrice = newPrice;

    const pricePoint: PricePoint = {
      timestamp: Date.now(),
      price: parseFloat(newPrice.toFixed(8)),
      change: parseFloat(change.toFixed(8)),
      changePercent: parseFloat(changePercent.toFixed(4)),
    };

    // Store in history (keep last 1000 points)
    this.priceHistory.push(pricePoint);
    if (this.priceHistory.length > 1000) {
      this.priceHistory.shift();
    }

    return pricePoint;
  }

  /**
   * Generate random number from normal distribution
   * Using Box-Muller transform
   */
  private randomNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Generate OHLCV candle for a given period
   * @param periodSeconds - Candle period in seconds (e.g., 60 for 1-minute candles)
   */
  generateCandle(periodSeconds: number): OHLCV {
    const startPrice = this.currentPrice;
    const numTicks = Math.ceil(periodSeconds / this.config.timeStep);
    
    let high = startPrice;
    let low = startPrice;
    let volume = 0;

    // Generate ticks for the period
    for (let i = 0; i < numTicks; i++) {
      const point = this.generateNextPrice();
      high = Math.max(high, point.price);
      low = Math.min(low, point.price);
      // Simulate volume based on price movement
      volume += Math.abs(point.change) * (Math.random() * 10000 + 5000);
    }

    return {
      timestamp: Date.now(),
      open: startPrice,
      high,
      low,
      close: this.currentPrice,
      volume: Math.round(volume),
    };
  }

  /**
   * Get current price
   */
  getCurrentPrice(): number {
    return this.currentPrice;
  }

  /**
   * Get price history
   */
  getPriceHistory(): PricePoint[] {
    return [...this.priceHistory];
  }

  /**
   * Set volatility dynamically (e.g., during news events)
   */
  setVolatility(volatility: number): void {
    this.config.volatility = volatility;
  }

  /**
   * Set drift dynamically (e.g., trend changes)
   */
  setDrift(drift: number): void {
    this.config.drift = drift;
  }

  /**
   * Reset to initial price
   */
  reset(): void {
    this.currentPrice = this.config.initialPrice;
    this.priceHistory = [];
  }
}

/**
 * Market Data Service
 * Manages multiple price generators for different symbols
 */
export class MarketDataService {
  private generators: Map<string, PriceGenerator> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize price feed for a symbol
   */
  initializeSymbol(config: PriceConfig): void {
    const generator = new PriceGenerator(config);
    this.generators.set(config.symbol, generator);
  }

  /**
   * Start auto-generating prices for a symbol
   */
  startPriceFeed(symbol: string, intervalMs: number = 1000): void {
    if (!this.generators.has(symbol)) {
      throw new Error(`Symbol ${symbol} not initialized`);
    }

    // Clear existing interval if any
    if (this.intervals.has(symbol)) {
      clearInterval(this.intervals.get(symbol)!);
    }

    // Start new interval
    const interval = setInterval(() => {
      const generator = this.generators.get(symbol)!;
      const pricePoint = generator.generateNextPrice();
      
      // Emit price update (can be picked up by WebSocket service)
      this.emitPriceUpdate(symbol, pricePoint);
    }, intervalMs);

    this.intervals.set(symbol, interval);
  }

  /**
   * Stop price feed for a symbol
   */
  stopPriceFeed(symbol: string): void {
    const interval = this.intervals.get(symbol);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(symbol);
    }
  }

  /**
   * Get current price for a symbol
   */
  getCurrentPrice(symbol: string): number | null {
    const generator = this.generators.get(symbol);
    return generator ? generator.getCurrentPrice() : null;
  }

  /**
   * Get bid/ask spread
   */
  getBidAsk(symbol: string, spreadPercent: number = 0.01): {
    bid: number;
    ask: number;
    spread: number;
  } | null {
    const currentPrice = this.getCurrentPrice(symbol);
    if (!currentPrice) return null;

    const spread = currentPrice * (spreadPercent / 100);
    return {
      bid: currentPrice - spread / 2,
      ask: currentPrice + spread / 2,
      spread,
    };
  }

  /**
   * Emit price update (override this to integrate with WebSocket)
   */
  protected emitPriceUpdate(symbol: string, pricePoint: PricePoint): void {
    // This will be overridden by WebSocket service
    console.log(`Price update for ${symbol}:`, pricePoint);
  }

  /**
   * Get all active symbols
   */
  getActiveSymbols(): string[] {
    return Array.from(this.generators.keys());
  }

  /**
   * Stop all price feeds
   */
  stopAll(): void {
    this.intervals.forEach((interval) => clearInterval(interval));
    this.intervals.clear();
  }
}

/**
 * Default trading pairs configuration
 */
export const DEFAULT_TRADING_PAIRS: PriceConfig[] = [
  {
    symbol: 'BTC/USDT',
    initialPrice: 42000,
    drift: 0.00005, // Slight uptrend
    volatility: 0.02, // 2% volatility
    timeStep: 1,
  },
  {
    symbol: 'ETH/USDT',
    initialPrice: 2200,
    drift: 0.0001,
    volatility: 0.025,
    timeStep: 1,
  },
  {
    symbol: 'EUR/USD',
    initialPrice: 1.08,
    drift: 0.00001,
    volatility: 0.005, // Lower volatility for forex
    timeStep: 1,
  },
  {
    symbol: 'GBP/USD',
    initialPrice: 1.27,
    drift: 0.00001,
    volatility: 0.006,
    timeStep: 1,
  },
  {
    symbol: 'XAU/USD',
    initialPrice: 2050,
    drift: 0.00003,
    volatility: 0.015,
    timeStep: 1,
  },
];

/**
 * Create and initialize market data service
 */
export function createMarketDataService(): MarketDataService {
  const service = new MarketDataService();
  
  // Initialize default trading pairs
  DEFAULT_TRADING_PAIRS.forEach((config) => {
    service.initializeSymbol(config);
  });

  return service;
}

// Singleton instance
let marketDataServiceInstance: MarketDataService | null = null;

/**
 * Get market data service instance
 */
export function getMarketDataService(): MarketDataService {
  if (!marketDataServiceInstance) {
    marketDataServiceInstance = createMarketDataService();
    
    // Start all price feeds
    DEFAULT_TRADING_PAIRS.forEach((config) => {
      marketDataServiceInstance!.startPriceFeed(config.symbol, 1000);
    });
  }

  return marketDataServiceInstance;
}
