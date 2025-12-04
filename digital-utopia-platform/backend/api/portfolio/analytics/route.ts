import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { roleAuthMiddleware } from '@/lib/middleware/role-auth';
import { errorHandlingMiddleware } from '@/lib/middleware/error-handling';
import { firestore } from '@/lib/firebase';
import { PortfolioAnalytics, PortfolioMetrics } from '@/../../shared/types';

// Apply middleware chain
const handler = errorHandlingMiddleware(
  roleAuthMiddleware(['user', 'admin', 'superadmin'])(
    authMiddleware(async (request: NextRequest, { user }) => {
      const { method } = request;

      try {
        switch (method) {
          case 'GET':
            return await getPortfolioAnalytics(request, user.uid);
          case 'POST':
            return await generatePortfolioReport(request, user.uid);
          default:
            return NextResponse.json(
              { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } },
              { status: 405 }
            );
        }
      } catch (error) {
        console.error('Portfolio Analytics API Error:', error);
        throw error;
      }
    })
  )
);

// GET /api/portfolio/analytics - Get Portfolio Analytics
async function getPortfolioAnalytics(request: NextRequest, userId: string) {
  try {
    const url = new URL(request.url);
    const period = url.searchParams.get('period') as '1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL' || '30D';

    // Calculate date range based on period
    const { startDate, endDate } = calculateDateRange(period);

    // Get existing analytics data
    const analyticsDoc = await firestore
      .collection('portfolio_analytics')
      .doc(`${userId}_${period}`)
      .get();

    if (analyticsDoc.exists && isAnalyticsCacheValid(analyticsDoc.data()?.updatedAt)) {
      const cachedAnalytics = analyticsDoc.data();
      
      return NextResponse.json({
        success: true,
        data: {
          ...cachedAnalytics,
          createdAt: cachedAnalytics.createdAt.toDate(),
          updatedAt: cachedAnalytics.updatedAt.toDate()
        },
        metadata: {
          timestamp: new Date(),
          requestId: request.headers.get('x-request-id') || '',
          source: 'cache',
          period
        }
      });
    }

    // Generate fresh analytics data
    const analytics = await generatePortfolioAnalytics(userId, period, startDate, endDate);

    // Save to Firestore
    await firestore.collection('portfolio_analytics').doc(`${userId}_${period}`).set({
      ...analytics,
      updatedAt: new Date(),
      createdAt: analytics.createdAt || new Date()
    });

    return NextResponse.json({
      success: true,
      data: analytics,
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || '',
        source: 'calculated',
        period
      }
    });
  } catch (error) {
    console.error('Get Portfolio Analytics Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'PORTFOLIO_ANALYTICS_FAILED', 
          message: 'Failed to get portfolio analytics',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// POST /api/portfolio/analytics/report - Generate Portfolio Report
async function generatePortfolioReport(request: NextRequest, userId: string) {
  try {
    const body = await request.json();
    const {
      period = '30D',
      includeCharts = true,
      includeRecommendations = true,
      format = 'json'
    } = body;

    // Calculate date range
    const { startDate, endDate } = calculateDateRange(period);

    // Generate comprehensive report
    const report = await generateComprehensiveReport(userId, period, startDate, endDate, {
      includeCharts,
      includeRecommendations
    });

    if (format === 'pdf') {
      // In real implementation, generate PDF report
      // For now, return JSON with PDF generation instructions
      return NextResponse.json({
        success: true,
        data: {
          ...report,
          pdfGeneration: {
            status: 'pending',
            downloadUrl: `/api/portfolio/analytics/report/${report.reportId}/pdf`,
            expiresAt: new Date(Date.now() + 3600000) // 1 hour
          }
        },
        metadata: {
          timestamp: new Date(),
          requestId: request.headers.get('x-request-id') || ''
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: report,
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Generate Portfolio Report Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'REPORT_GENERATION_FAILED', 
          message: 'Failed to generate portfolio report',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// Generate portfolio analytics for specific period
async function generatePortfolioAnalytics(
  userId: string,
  period: '1D' | '7D' | '30D' | '90D' | '1Y' | 'ALL',
  startDate: Date,
  endDate: Date
): Promise<PortfolioAnalytics> {
  try {
    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData) {
      throw new Error('User not found');
    }

    // Get portfolio metrics
    const metricsDoc = await firestore.collection('portfolio_metrics').doc(userId).get();
    const metrics = metricsDoc.exists ? metricsDoc.data() as PortfolioMetrics : null;

    // Get orders within period
    const ordersSnap = await firestore
      .collection('orders')
      .where('userId', '==', userId)
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt', 'asc')
      .get();

    const orders = [];
    ordersSnap.forEach(doc => {
      const data = doc.data();
      orders.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      });
    });

    // Generate balance history
    const balanceHistory = await generateBalanceHistory(userId, startDate, endDate, orders);

    // Generate allocation history
    const allocationHistory = await generateAllocationHistory(userId, startDate, endDate);

    // Generate performance metrics
    const performanceMetrics = calculatePeriodPerformance(orders, period);

    const analytics: PortfolioAnalytics = {
      portfolioId: `portfolio_${userId}_${period}`,
      userId,
      period,
      metrics: metrics || getDefaultMetrics(),
      balanceHistory,
      allocationHistory,
      performanceMetrics,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return analytics;
  } catch (error) {
    console.error('Generate Portfolio Analytics Error:', error);
    throw error;
  }
}

// Calculate date range based on period
function calculateDateRange(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  const startDate = new Date();

  switch (period) {
    case '1D':
      startDate.setDate(endDate.getDate() - 1);
      break;
    case '7D':
      startDate.setDate(endDate.getDate() - 7);
      break;
    case '30D':
      startDate.setDate(endDate.getDate() - 30);
      break;
    case '90D':
      startDate.setDate(endDate.getDate() - 90);
      break;
    case '1Y':
      startDate.setFullYear(endDate.getFullYear() - 1);
      break;
    case 'ALL':
      startDate.setFullYear(endDate.getFullYear() - 5); // Last 5 years
      break;
    default:
      startDate.setDate(endDate.getDate() - 30);
  }

  return { startDate, endDate };
}

// Generate balance history for charting
async function generateBalanceHistory(
  userId: string,
  startDate: Date,
  endDate: Date,
  orders: any[]
): Promise<{ timestamp: Date; balance: number; pnl: number }[]> {
  try {
    const history = [];
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();

    const currentBalance = (userData?.balance?.available || 0) + (userData?.balance?.locked || 0);
    
    // Generate daily snapshots
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Calculate running balance and P&L
      const dayOrders = orders.filter(order => {
        const orderDate = new Date(order.createdAt);
        return orderDate <= date && order.status === 'FILLED';
      });

      const dailyPnl = calculateDailyPnLFromOrders(dayOrders);
      const adjustedBalance = currentBalance + dailyPnl;

      history.push({
        timestamp: date,
        balance: adjustedBalance,
        pnl: dailyPnl
      });
    }

    return history;
  } catch (error) {
    console.error('Generate Balance History Error:', error);
    return [];
  }
}

// Generate allocation history
async function generateAllocationHistory(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ timestamp: Date; assets: { symbol: string; allocation: number }[] }[]> {
  try {
    const history = [];
    
    // Get positions data
    const positionsSnap = await firestore
      .collection('positions')
      .where('userId', '==', userId)
      .where('status', '==', 'OPEN')
      .get();

    const positions = [];
    positionsSnap.forEach(doc => {
      const data = doc.data();
      positions.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      });
    });

    // Mock prices for allocation calculation
    const prices: { [symbol: string]: number } = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 1.5,
      'DOTUSDT': 25,
      'LINKUSDT': 15
    };

    // Calculate total portfolio value
    const totalValue = positions.reduce((sum, pos) => {
      const price = prices[pos.symbol] || 100;
      return sum + (pos.size * price);
    }, 0);

    // Generate daily allocations (simplified)
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      const assets = positions.map(pos => {
        const price = prices[pos.symbol] || 100;
        const value = pos.size * price;
        const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;

        return {
          symbol: pos.symbol,
          allocation: Math.round(allocation * 100) / 100
        };
      });

      history.push({
        timestamp: date,
        assets
      });
    }

    return history;
  } catch (error) {
    console.error('Generate Allocation History Error:', error);
    return [];
  }
}

// Calculate performance metrics for period
function calculatePeriodPerformance(orders: any[], period: string) {
  try {
    const filledOrders = orders.filter(order => order.status === 'FILLED');
    
    if (filledOrders.length === 0) {
      return {
        return: 0,
        returnPercent: 0,
        maxDrawdown: 0,
        sharpeRatio: 0
      };
    }

    // Simplified performance calculations
    let totalReturn = 0;
    let maxDrawdown = 0;
    
    filledOrders.forEach(order => {
      if (order.price && order.quantity) {
        const orderValue = order.price * order.quantity;
        const return_ = order.side === 'BUY' ? -orderValue * 0.01 : orderValue * 0.01; // Mock 1% returns
        totalReturn += return_;
        
        // Track drawdown (simplified)
        maxDrawdown = Math.max(maxDrawdown, Math.abs(return_) * 0.2);
      }
    });

    const returnPercent = filledOrders.length > 0 ? (totalReturn / (filledOrders.length * 100)) * 100 : 0;

    return {
      period,
      return: Math.round(totalReturn * 100) / 100,
      returnPercent: Math.round(returnPercent * 100) / 100,
      maxDrawdown: Math.round(maxDrawdown * 100) / 100,
      sharpeRatio: 1.2 // Mock Sharpe ratio
    };
  } catch (error) {
    console.error('Calculate Period Performance Error:', error);
    return {
      return: 0,
      returnPercent: 0,
      maxDrawdown: 0,
      sharpeRatio: 0
    };
  }
}

// Calculate P&L from orders
function calculateDailyPnLFromOrders(orders: any[]): number {
  return orders.reduce((total, order) => {
    if (order.price && order.quantity) {
      const orderValue = order.price * order.quantity;
      const pnl = order.side === 'BUY' ? -orderValue * 0.01 : orderValue * 0.01; // Mock P&L
      return total + pnl;
    }
    return total;
  }, 0);
}

// Get default metrics when no data available
function getDefaultMetrics(): PortfolioMetrics {
  return {
    totalBalance: 0,
    availableBalance: 0,
    usedMargin: 0,
    totalPnl: 0,
    totalPnlPercent: 0,
    dailyPnl: 0,
    dailyPnlPercent: 0,
    assets: {},
    performance: {
      totalReturn: 0,
      totalReturnPercent: 0,
      maxDrawdown: 0,
      maxDrawdownPercent: 0,
      sharpeRatio: 0,
      winRate: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0
    },
    risk: {
      var95: 0,
      var99: 0,
      beta: 1.0,
      correlation: {}
    },
    updatedAt: new Date()
  };
}

// Generate comprehensive report
async function generateComprehensiveReport(
  userId: string,
  period: string,
  startDate: Date,
  endDate: Date,
  options: { includeCharts: boolean; includeRecommendations: boolean }
) {
  try {
    // Get current analytics
    const analytics = await generatePortfolioAnalytics(userId, period, startDate, endDate);
    
    // Generate report ID
    const reportId = `report_${userId}_${Date.now()}`;
    
    // Build comprehensive report
    const report = {
      reportId,
      userId,
      period,
      generatedAt: new Date(),
      
      // Summary
      summary: {
        totalReturn: analytics.performanceMetrics.return,
        totalReturnPercent: analytics.performanceMetrics.returnPercent,
        maxDrawdown: analytics.performanceMetrics.maxDrawdown,
        sharpeRatio: analytics.performanceMetrics.sharpeRatio,
        winRate: analytics.metrics.performance.winRate,
        totalTrades: analytics.balanceHistory.length * 10 // Mock trade count
      },
      
      // Analytics data
      analytics,
      
      // Charts data (if requested)
      charts: options.includeCharts ? {
        balanceHistory: analytics.balanceHistory,
        allocationHistory: analytics.allocationHistory,
        performanceBreakdown: {
          dailyReturns: analytics.balanceHistory.map(h => ({
            date: h.timestamp,
            return: h.pnl
          })),
          assetAllocation: Object.entries(analytics.metrics.assets).map(([symbol, data]) => ({
            symbol,
            allocation: data.allocation,
            value: data.value
          }))
        }
      } : null,
      
      // Recommendations (if requested)
      recommendations: options.includeRecommendations ? generateRecommendations(analytics) : null,
      
      // Metadata
      metadata: {
        period,
        dateRange: {
          start: startDate,
          end: endDate
        },
        dataPoints: {
          balanceHistory: analytics.balanceHistory.length,
          allocationHistory: analytics.allocationHistory.length,
          orders: analytics.balanceHistory.length * 5 // Mock order count
        }
      }
    };

    return report;
  } catch (error) {
    console.error('Generate Comprehensive Report Error:', error);
    throw error;
  }
}

// Generate investment recommendations based on analytics
function generateRecommendations(analytics: PortfolioAnalytics) {
  try {
    const recommendations = [];
    const metrics = analytics.metrics;
    
    // Risk recommendations
    if (metrics.risk.var95 > metrics.totalBalance * 0.1) {
      recommendations.push({
        type: 'risk',
        priority: 'high',
        title: 'High Portfolio Risk',
        description: 'Your Value at Risk (VaR) exceeds 10% of your portfolio. Consider reducing position sizes or diversifying.',
        actionItems: [
          'Reduce individual position sizes',
          'Diversify across more assets',
          'Consider lower leverage'
        ]
      });
    }

    // Allocation recommendations
    const dominantAsset = Object.entries(metrics.assets)
      .sort(([,a], [,b]) => b.allocation - a.allocation)[0];

    if (dominantAsset && dominantAsset[1].allocation > 60) {
      recommendations.push({
        type: 'allocation',
        priority: 'medium',
        title: 'Concentrated Portfolio',
        description: `${dominantAsset[0]} represents ${Math.round(dominantAsset[1].allocation)}% of your portfolio. Consider diversification.`,
        actionItems: [
          'Reduce position in dominant asset',
          'Add uncorrelated assets',
          'Rebalance portfolio weights'
        ]
      });
    }

    // Performance recommendations
    if (metrics.performance.sharpeRatio < 1.0) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Low Risk-Adjusted Returns',
        description: 'Your Sharpe ratio is below 1.0, indicating poor risk-adjusted performance.',
        actionItems: [
          'Review stop-loss strategies',
          'Optimize entry/exit timing',
          'Consider momentum indicators'
        ]
      });
    }

    return recommendations;
  } catch (error) {
    console.error('Generate Recommendations Error:', error);
    return [];
  }
}

// Check if analytics cache is valid (less than 2 hours old)
function isAnalyticsCacheValid(lastUpdated: Date): boolean {
  if (!lastUpdated) return false;
  
  const twoHoursAgo = new Date();
  twoHoursAgo.setHours(twoHoursAgo.getHours() - 2);
  
  return lastUpdated > twoHoursAgo;
}

export { handler as GET, handler as POST };