import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { roleAuthMiddleware } from '@/lib/middleware/role-auth';
import { errorHandlingMiddleware } from '@/lib/middleware/error-handling';
import { firestore } from '@/lib/firebase';
import { PortfolioMetrics, Position, Order, TransactionType } from '@/../../shared/types';

// Apply middleware chain
const handler = errorHandlingMiddleware(
  roleAuthMiddleware(['user', 'admin', 'superadmin'])(
    authMiddleware(async (request: NextRequest, { user }) => {
      const { method } = request;

      try {
        switch (method) {
          case 'GET':
            return await getPortfolioMetrics(request, user.uid);
          case 'POST':
            return await recalculatePortfolioMetrics(request, user.uid);
          default:
            return NextResponse.json(
              { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } },
              { status: 405 }
            );
        }
      } catch (error) {
        console.error('Portfolio Metrics API Error:', error);
        throw error;
      }
    })
  )
);

// GET /api/portfolio/metrics - Get Portfolio Metrics
async function getPortfolioMetrics(request: NextRequest, userId: string) {
  try {
    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Try to get cached metrics first
    const cachedMetricsDoc = await firestore
      .collection('portfolio_metrics')
      .doc(userId)
      .get();

    if (cachedMetricsDoc.exists && isMetricsCacheValid(cachedMetricsDoc.data()?.updatedAt)) {
      const cachedMetrics = cachedMetricsDoc.data();
      
      return NextResponse.json({
        success: true,
        data: {
          ...cachedMetrics,
          updatedAt: cachedMetrics.updatedAt.toDate()
        },
        metadata: {
          timestamp: new Date(),
          requestId: request.headers.get('x-request-id') || '',
          source: 'cache'
        }
      });
    }

    // Calculate fresh metrics
    const metrics = await calculatePortfolioMetrics(userId, userData);

    // Cache the metrics
    await firestore.collection('portfolio_metrics').doc(userId).set({
      ...metrics,
      updatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      data: metrics,
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || '',
        source: 'calculated'
      }
    });
  } catch (error) {
    console.error('Get Portfolio Metrics Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'PORTFOLIO_METRICS_FAILED', 
          message: 'Failed to get portfolio metrics',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// POST /api/portfolio/metrics/recalculate - Recalculate Portfolio Metrics
async function recalculatePortfolioMetrics(request: NextRequest, userId: string) {
  try {
    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      return NextResponse.json(
        { error: { code: 'USER_NOT_FOUND', message: 'User not found' } },
        { status: 404 }
      );
    }

    // Force recalculation (ignore cache)
    const metrics = await calculatePortfolioMetrics(userId, userData, true);

    // Update cache
    await firestore.collection('portfolio_metrics').doc(userId).set({
      ...metrics,
      updatedAt: new Date()
    });

    // Broadcast update via WebSocket
    const wsService = (global as any).websocketService;
    if (wsService) {
      wsService.broadcastToUser(userId, 'PORTFOLIO_UPDATE', {
        type: 'METRICS_UPDATED',
        data: metrics
      });
    }

    return NextResponse.json({
      success: true,
      data: metrics,
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Recalculate Portfolio Metrics Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'PORTFOLIO_RECALCULATION_FAILED', 
          message: 'Failed to recalculate portfolio metrics',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// Calculate comprehensive portfolio metrics
async function calculatePortfolioMetrics(userId: string, userData: any, forceRecalculation = false): Promise<PortfolioMetrics> {
  try {
    // Get current positions
    const positionsSnap = await firestore
      .collection('positions')
      .where('userId', '==', userId)
      .where('status', '==', 'OPEN')
      .get();

    const positions: Position[] = [];
    positionsSnap.forEach(doc => {
      const data = doc.data();
      positions.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Position);
    });

    // Get recent orders for performance calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const ordersSnap = await firestore
      .collection('orders')
      .where('userId', '==', userId)
      .where('createdAt', '>=', thirtyDaysAgo)
      .orderBy('createdAt', 'desc')
      .limit(1000)
      .get();

    const recentOrders: Order[] = [];
    ordersSnap.forEach(doc => {
      const data = doc.data();
      recentOrders.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      } as Order);
    });

    // Get transactions for cash flow analysis
    const transactionsSnap = await firestore
      .collection('transactions')
      .where('userId', '==', userId)
      .where('createdAt', '>=', thirtyDaysAgo)
      .orderBy('createdAt', 'desc')
      .limit(1000)
      .get();

    // Calculate balances
    const availableBalance = userData.balance?.available || 0;
    const lockedBalance = userData.balance?.locked || 0;
    const totalBalance = availableBalance + lockedBalance;

    // Calculate position values and P&L
    const assetBreakdown: { [symbol: string]: any } = {};
    let totalUnrealizedPnl = 0;
    let totalRealizedPnl = 0;
    let totalUsedMargin = 0;
    let totalPositionValue = 0;

    // Mock current prices (in real implementation, fetch from market data API)
    const currentPrices: { [symbol: string]: number } = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 1.5,
      'DOTUSDT': 25,
      'LINKUSDT': 15
    };

    positions.forEach(position => {
      const currentPrice = currentPrices[position.symbol] || 100;
      const positionValue = position.size * currentPrice;
      const unrealizedPnl = positionSizeToValue(position, currentPrice);
      
      totalPositionValue += positionValue;
      totalUnrealizedPnl += unrealizedPnl;
      totalRealizedPnl += position.realizedPnl;
      totalUsedMargin += position.margin;

      // Asset breakdown
      if (!assetBreakdown[position.symbol]) {
        assetBreakdown[position.symbol] = {
          balance: 0,
          value: 0,
          pnl: 0,
          pnlPercent: 0,
          allocation: 0
        };
      }

      assetBreakdown[position.symbol].balance += position.size;
      assetBreakdown[position.symbol].value += positionValue;
      assetBreakdown[position.symbol].pnl += unrealizedPnl + position.realizedPnl;
    });

    // Calculate asset allocations and percentages
    const portfolioTotalValue = totalBalance + totalPositionValue;
    Object.keys(assetBreakdown).forEach(symbol => {
      const asset = assetBreakdown[symbol];
      asset.allocation = portfolioTotalValue > 0 ? (asset.value / portfolioTotalValue) * 100 : 0;
      asset.pnlPercent = asset.value > 0 ? (asset.pnl / (asset.value - asset.pnl)) * 100 : 0;
    });

    // Calculate daily P&L
    const dailyPnl = await calculateDailyPnL(userId, recentOrders);
    const dailyPnlPercent = totalBalance > 0 ? (dailyPnl / totalBalance) * 100 : 0;

    // Calculate total performance metrics
    const totalPnl = totalUnrealizedPnl + totalRealizedPnl;
    const totalPnlPercent = totalBalance > 0 ? (totalPnl / totalBalance) * 100 : 0;

    // Calculate risk metrics (simplified VaR)
    const riskMetrics = calculateRiskMetrics(recentOrders, totalBalance);

    // Calculate performance metrics
    const performanceMetrics = calculatePerformanceMetrics(recentOrders);

    // Compile portfolio metrics
    const portfolioMetrics: PortfolioMetrics = {
      totalBalance: portfolioTotalValue,
      availableBalance,
      usedMargin: totalUsedMargin,
      totalPnl,
      totalPnlPercent,
      dailyPnl,
      dailyPnlPercent,
      assets: assetBreakdown,
      performance: performanceMetrics,
      risk: riskMetrics,
      updatedAt: new Date()
    };

    return portfolioMetrics;
  } catch (error) {
    console.error('Calculate Portfolio Metrics Error:', error);
    throw error;
  }
}

// Helper function to convert position size to value
function positionSizeToValue(position: Position, currentPrice: number): number {
  // Simplified P&L calculation
  // In real implementation, this would consider leverage, entry price, etc.
  const positionValue = position.size * currentPrice;
  const costBasis = position.size * position.entryPrice;
  return positionValue - costBasis;
}

// Calculate daily P&L
async function calculateDailyPnL(userId: string, recentOrders: Order[]): Promise<number> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Get orders from yesterday and today
    const dailyOrders = recentOrders.filter(order => {
      const orderDate = new Date(order.createdAt);
      return orderDate >= yesterday && orderDate < today && order.status === 'FILLED';
    });

    // Calculate P&L from filled orders (simplified)
    let dailyPnl = 0;
    dailyOrders.forEach(order => {
      if (order.price && order.quantity) {
        // Simplified calculation - in reality would need more complex logic
        const orderValue = order.price * order.quantity;
        const estimatedPnl = order.side === 'BUY' ? -orderValue * 0.01 : orderValue * 0.01;
        dailyPnl += estimatedPnl;
      }
    });

    return dailyPnl;
  } catch (error) {
    console.error('Calculate Daily P&L Error:', error);
    return 0;
  }
}

// Calculate risk metrics
function calculateRiskMetrics(orders: Order[], totalBalance: number): any {
  try {
    // Simplified VaR calculation
    // In real implementation, would use historical data and statistical methods
    
    const filledOrders = orders.filter(order => order.status === 'FILLED');
    
    if (filledOrders.length < 10 || totalBalance <= 0) {
      return {
        var95: totalBalance * 0.05, // 5% of portfolio as placeholder
        var99: totalBalance * 0.10, // 10% of portfolio as placeholder
        beta: 1.0,
        correlation: {}
      };
    }

    // Calculate returns from order P&L (simplified)
    const returns = filledOrders.map(order => {
      if (order.price && order.quantity) {
        const orderValue = order.price * order.quantity;
        return order.side === 'BUY' ? -0.01 : 0.01; // Mock 1% return
      }
      return 0;
    });

    // Simplified VaR calculation
    const sortedReturns = returns.sort((a, b) => a - b);
    const var95Index = Math.floor(returns.length * 0.05);
    const var99Index = Math.floor(returns.length * 0.01);

    return {
      var95: Math.abs(sortedReturns[var95Index] || 0) * totalBalance,
      var99: Math.abs(sortedReturns[var99Index] || 0) * totalBalance,
      beta: 1.0, // Placeholder
      correlation: {} // Placeholder for asset correlations
    };
  } catch (error) {
    console.error('Calculate Risk Metrics Error:', error);
    return {
      var95: totalBalance * 0.05,
      var99: totalBalance * 0.10,
      beta: 1.0,
      correlation: {}
    };
  }
}

// Calculate performance metrics
function calculatePerformanceMetrics(orders: Order[]): any {
  try {
    const filledOrders = orders.filter(order => order.status === 'FILLED');
    
    if (filledOrders.length === 0) {
      return {
        totalReturn: 0,
        totalReturnPercent: 0,
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        sharpeRatio: 0,
        winRate: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0
      };
    }

    // Simplified performance calculations
    const winningTrades = filledOrders.filter(() => Math.random() > 0.4); // Mock 60% win rate
    const losingTrades = filledOrders.filter(() => Math.random() <= 0.4);

    const totalWin = winningTrades.length * 100; // Mock $100 win
    const totalLoss = Math.abs(losingTrades.length * 50); // Mock $50 loss

    const totalReturn = totalWin - totalLoss;
    const totalReturnPercent = filledOrders.length > 0 ? (totalReturn / (filledOrders.length * 100)) * 100 : 0;
    const winRate = filledOrders.length > 0 ? (winningTrades.length / filledOrders.length) * 100 : 0;
    const averageWin = winningTrades.length > 0 ? totalWin / winningTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? totalLoss / losingTrades.length : 0;
    const profitFactor = totalLoss > 0 ? totalWin / totalLoss : totalWin > 0 ? Infinity : 0;

    return {
      totalReturn,
      totalReturnPercent,
      maxDrawdown: Math.abs(totalReturn * 0.2), // Mock 20% max drawdown
      maxDrawdownPercent: 20,
      sharpeRatio: 1.2, // Mock Sharpe ratio
      winRate,
      averageWin,
      averageLoss,
      profitFactor
    };
  } catch (error) {
    console.error('Calculate Performance Metrics Error:', error);
    return {
      totalReturn: 0,
      totalReturnPercent: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0
    };
  }
}

// Check if cached metrics are still valid (less than 1 hour old)
function isMetricsCacheValid(lastUpdated: Date): boolean {
  if (!lastUpdated) return false;
  
  const oneHourAgo = new Date();
  oneHourAgo.setHours(oneHourAgo.getHours() - 1);
  
  return lastUpdated > oneHourAgo;
}

export { handler as GET, handler as POST };