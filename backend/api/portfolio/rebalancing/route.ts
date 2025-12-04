import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { roleAuthMiddleware } from '@/lib/middleware/role-auth';
import { errorHandlingMiddleware } from '@/lib/middleware/error-handling';
import { firestore } from '@/lib/firebase';
import { Order, PortfolioMetrics, Position } from '@/../../shared/types';

// Apply middleware chain
const handler = errorHandlingMiddleware(
  roleAuthMiddleware(['user', 'admin', 'superadmin'])(
    authMiddleware(async (request: NextRequest, { user }) => {
      const { method } = request;

      try {
        switch (method) {
          case 'POST':
            return await createRebalancingOrder(request, user.uid);
          case 'GET':
            return await getRebalancingRecommendations(request, user.uid);
          default:
            return NextResponse.json(
              { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } },
              { status: 405 }
            );
        }
      } catch (error) {
        console.error('Portfolio Rebalancing API Error:', error);
        throw error;
      }
    })
  )
);

// POST /api/portfolio/rebalancing - Create Portfolio Rebalancing Order
async function createRebalancingOrder(request: NextRequest, userId: string) {
  const body = await request.json();
  const {
    targetAllocation, // { 'BTCUSDT': 30, 'ETHUSDT': 25, 'ADAUSDT': 15, ... }
    rebalanceThreshold = 5, // % deviation to trigger rebalancing
    maxTradeSize, // Maximum trade size in USDT
    tolerance = 1, // % tolerance for target allocation
    dryRun = false // If true, only calculate without executing
  } = body;

  // Validate input
  if (!targetAllocation || typeof targetAllocation !== 'object') {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Target allocation is required' } },
      { status: 400 }
    );
  }

  // Validate allocation percentages
  const totalAllocation = Object.values(targetAllocation).reduce((sum: number, alloc: any) => sum + alloc, 0);
  if (Math.abs(totalAllocation - 100) > 1) {
    return NextResponse.json(
      { error: { code: 'INVALID_ALLOCATION', message: 'Target allocation must sum to 100%' } },
      { status: 400 }
    );
  }

  try {
    // Get current portfolio state
    const portfolioState = await getCurrentPortfolioState(userId);
    const currentPrices = await getCurrentPrices(Object.keys(targetAllocation));

    // Calculate rebalancing requirements
    const rebalancingPlan = await calculateRebalancingPlan(
      portfolioState,
      targetAllocation,
      currentPrices,
      rebalanceThreshold,
      maxTradeSize,
      tolerance
    );

    if (dryRun) {
      return NextResponse.json({
        success: true,
        data: {
          plan: rebalancingPlan,
          summary: calculateRebalancingSummary(rebalancingPlan),
          execution: {
            dryRun: true,
            estimatedCost: 0,
            estimatedTime: 'N/A'
          }
        },
        metadata: {
          timestamp: new Date(),
          requestId: request.headers.get('x-request-id') || ''
        }
      });
    }

    // Execute rebalancing if not dry run
    const executionResult = await executeRebalancing(userId, rebalancingPlan);

    return NextResponse.json({
      success: true,
      data: {
        plan: rebalancingPlan,
        execution: executionResult
      },
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Create Rebalancing Order Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'REBALANCING_CREATION_FAILED', 
          message: 'Failed to create rebalancing order',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// GET /api/portfolio/rebalancing/recommendations - Get Rebalancing Recommendations
async function getRebalancingRecommendations(request: NextRequest, userId: string) {
  try {
    const url = new URL(request.url);
    const currentAllocation = url.searchParams.get('current');
    const targetAllocation = url.searchParams.get('target');

    // Get current portfolio state
    const portfolioState = await getCurrentPortfolioState(userId);

    // Generate recommendations based on current allocation
    const recommendations = await generateRebalancingRecommendations(portfolioState);

    return NextResponse.json({
      success: true,
      data: {
        currentState: portfolioState,
        recommendations,
        suggestedTargets: generateSuggestedAllocations(portfolioState),
        analysis: await analyzePortfolio(portfolioState)
      },
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Get Rebalancing Recommendations Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'RECOMMENDATIONS_FAILED', 
          message: 'Failed to get rebalancing recommendations',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// Get current portfolio state
async function getCurrentPortfolioState(userId: string) {
  try {
    // Get user data
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();

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

    // Get available balance for cash
    const availableBalance = userData?.balance?.available || 0;

    // Mock current prices
    const currentPrices: { [symbol: string]: number } = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 1.5,
      'DOTUSDT': 25,
      'LINKUSDT': 15
    };

    // Calculate portfolio composition
    const totalValue = availableBalance;
    const assetBreakdown: { [symbol: string]: any } = {};

    positions.forEach(position => {
      const price = currentPrices[position.symbol] || 100;
      const value = position.size * price;
      const allocation = totalValue > 0 ? (value / totalValue) * 100 : 0;

      if (!assetBreakdown[position.symbol]) {
        assetBreakdown[position.symbol] = {
          symbol: position.symbol,
          quantity: 0,
          value: 0,
          allocation: 0,
          price: price,
          position: null
        };
      }

      assetBreakdown[position.symbol].quantity += position.size;
      assetBreakdown[position.symbol].value += value;
      assetBreakdown[position.symbol].allocation += allocation;
      assetBreakdown[position.symbol].position = position;
    });

    // Add cash allocation
    const cashAllocation = totalValue > 0 ? (availableBalance / totalValue) * 100 : 100;
    if (availableBalance > 0) {
      assetBreakdown['CASH'] = {
        symbol: 'CASH',
        quantity: availableBalance,
        value: availableBalance,
        allocation: cashAllocation,
        price: 1,
        position: null
      };
    }

    return {
      totalValue,
      availableBalance,
      positions: positions.length,
      assetBreakdown,
      currentPrices
    };
  } catch (error) {
    console.error('Get Current Portfolio State Error:', error);
    throw error;
  }
}

// Calculate rebalancing plan
async function calculateRebalancingPlan(
  portfolioState: any,
  targetAllocation: { [symbol: string]: number },
  currentPrices: { [symbol: string]: number },
  threshold: number,
  maxTradeSize?: number,
  tolerance: number = 1
) {
  try {
    const trades = [];
    const totalValue = portfolioState.totalValue;

    // Calculate target values for each asset
    const targetValues: { [symbol: string]: number } = {};
    
    // Calculate cash target (will be calculated from remaining)
    let cashTargetPercent = 0;
    Object.keys(targetAllocation).forEach(symbol => {
      if (symbol !== 'CASH') {
        targetValues[symbol] = (targetAllocation[symbol] / 100) * totalValue;
      } else {
        cashTargetPercent = targetAllocation[symbol];
      }
    });
    
    targetValues['CASH'] = (cashTargetPercent / 100) * totalValue;

    // Calculate trades needed
    Object.keys(targetValues).forEach(symbol => {
      const currentValue = portfolioState.assetBreakdown[symbol]?.value || 0;
      const targetValue = targetValues[symbol];
      const difference = targetValue - currentValue;
      const deviationPercent = totalValue > 0 ? (difference / totalValue) * 100 : 0;

      // Only trade if deviation exceeds threshold
      if (Math.abs(deviationPercent) >= threshold) {
        const price = currentPrices[symbol] || 1;
        const quantity = Math.abs(difference) / price;
        
        // Apply max trade size limit
        let adjustedQuantity = quantity;
        if (maxTradeSize && Math.abs(difference) > maxTradeSize) {
          adjustedQuantity = maxTradeSize / price;
        }

        trades.push({
          symbol,
          action: difference > 0 ? 'BUY' : 'SELL',
          currentQuantity: portfolioState.assetBreakdown[symbol]?.quantity || 0,
          currentValue,
          targetValue,
          difference,
          deviationPercent: Math.round(deviationPercent * 100) / 100,
          quantity: Math.round(adjustedQuantity * 1000000) / 1000000, // 6 decimal places
          price,
          estimatedValue: Math.round(adjustedQuantity * price * 100) / 100
        });
      }
    });

    // Sort trades by impact (largest changes first)
    trades.sort((a, b) => Math.abs(b.estimatedValue) - Math.abs(a.estimatedValue));

    return {
      trades,
      totalTrades: trades.length,
      totalValue: totalValue,
      executionPlan: {
        strategy: 'sequential', // Can be 'sequential', 'parallel', or 'optimized'
        estimatedCost: calculateEstimatedCost(trades),
        estimatedTime: calculateEstimatedTime(trades),
        riskLevel: calculateRebalancingRisk(trades)
      }
    };
  } catch (error) {
    console.error('Calculate Rebalancing Plan Error:', error);
    throw error;
  }
}

// Execute rebalancing orders
async function executeRebalancing(userId: string, rebalancingPlan: any) {
  try {
    const executionResults = [];
    const executedOrders = [];

    for (const trade of rebalancingPlan.trades) {
      try {
        if (trade.symbol === 'CASH') {
          // Skip cash trades as they're just balance adjustments
          executionResults.push({
            symbol: trade.symbol,
            status: 'SKIPPED',
            reason: 'Cash adjustment handled by system',
            trade
          });
          continue;
        }

        // Create market order for rebalancing
        const orderData = {
          symbol: trade.symbol,
          side: trade.action,
          type: 'MARKET',
          quantity: trade.quantity,
          strategy: 'REBALANCING'
        };

        // In real implementation, this would call the order creation API
        // For now, simulate execution
        const mockOrderId = `REBAL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        const order: Order = {
          orderId: mockOrderId,
          userId,
          symbol: trade.symbol,
          side: trade.action as any,
          type: 'MARKET' as any,
          quantity: trade.quantity,
          filledQuantity: 0,
          remainingQuantity: trade.quantity,
          timeInForce: 'IOC' as any,
          status: 'PENDING',
          metadata: {
            orderType: 'NORMAL',
            strategy: 'REBALANCING',
            tags: ['REBALANCING', 'AUTO']
          },
          createdAt: new Date(),
          updatedAt: new Date()
        };

        // Save order to database
        await firestore.collection('orders').doc(mockOrderId).set(order);
        executedOrders.push(order);

        executionResults.push({
          symbol: trade.symbol,
          status: 'SUBMITTED',
          orderId: mockOrderId,
          trade
        });

        // Broadcast to WebSocket
        const wsService = (global as any).websocketService;
        if (wsService) {
          wsService.broadcastToUser(userId, 'ORDER_UPDATE', {
            type: 'REBALANCING_ORDER_SUBMITTED',
            data: {
              orderId: mockOrderId,
              symbol: trade.symbol,
              side: trade.action,
              quantity: trade.quantity,
              strategy: 'REBALANCING'
            }
          });
        }
      } catch (tradeError) {
        console.error(`Execute Trade Error for ${trade.symbol}:`, tradeError);
        executionResults.push({
          symbol: trade.symbol,
          status: 'FAILED',
          error: tradeError.message,
          trade
        });
      }
    }

    return {
      totalOrders: rebalancingPlan.trades.length,
      successfulOrders: executionResults.filter(r => r.status === 'SUBMITTED').length,
      failedOrders: executionResults.filter(r => r.status === 'FAILED').length,
      executionResults,
      orders: executedOrders,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Execute Rebalancing Error:', error);
    throw error;
  }
}

// Generate rebalancing recommendations
async function generateRebalancingRecommendations(portfolioState: any) {
  try {
    const recommendations = [];
    const assets = Object.values(portfolioState.assetBreakdown);

    // Check for over-concentration
    const dominantAssets = assets
      .filter((asset: any) => asset.allocation > 40)
      .sort((a: any, b: any) => b.allocation - a.allocation);

    if (dominantAssets.length > 0) {
      recommendations.push({
        type: 'concentration',
        priority: 'high',
        title: 'Portfolio Concentration Risk',
        description: `Your portfolio has high concentration in ${dominantAssets.map((a: any) => a.symbol).join(', ')}`,
        currentAllocation: dominantAssets.reduce((sum: number, asset: any) => sum + asset.allocation, 0),
        recommendedAction: 'Reduce concentration and diversify across multiple assets',
        estimatedImprovement: 'Reduce risk by 15-25%'
      });
    }

    // Check for missing key assets
    const keyAssets = ['BTCUSDT', 'ETHUSDT'];
    const missingAssets = keyAssets.filter(asset => !portfolioState.assetBreakdown[asset]);

    if (missingAssets.length > 0) {
      recommendations.push({
        type: 'diversification',
        priority: 'medium',
        title: 'Missing Core Assets',
        description: `Consider adding ${missingAssets.join(', ')} for better market exposure`,
        recommendedAllocation: { 'BTCUSDT': 30, 'ETHUSDT': 25 },
        estimatedImprovement: 'Improve correlation with broader market'
      });
    }

    // Check for cash allocation
    const cashAllocation = portfolioState.assetBreakdown['CASH']?.allocation || 0;
    if (cashAllocation > 20) {
      recommendations.push({
        type: 'cash',
        priority: 'low',
        title: 'High Cash Position',
        description: `${Math.round(cashAllocation)}% of portfolio is in cash`,
        recommendedAction: 'Consider deploying excess cash into market positions',
        potentialImprovement: 'Increase potential returns by 5-10%'
      });
    }

    return recommendations;
  } catch (error) {
    console.error('Generate Rebalancing Recommendations Error:', error);
    return [];
  }
}

// Generate suggested allocations
function generateSuggestedAllocations(portfolioState: any) {
  // Conservative allocation
  const conservative = {
    'BTCUSDT': 25,
    'ETHUSDT': 20,
    'ADAUSDT': 15,
    'DOTUSDT': 10,
    'LINKUSDT': 10,
    'CASH': 20
  };

  // Balanced allocation
  const balanced = {
    'BTCUSDT': 30,
    'ETHUSDT': 25,
    'ADAUSDT': 15,
    'DOTUSDT': 10,
    'LINKUSDT': 10,
    'CASH': 10
  };

  // Aggressive allocation
  const aggressive = {
    'BTCUSDT': 35,
    'ETHUSDT': 30,
    'ADAUSDT': 15,
    'DOTUSDT': 10,
    'LINKUSDT': 10
  };

  return {
    conservative,
    balanced,
    aggressive
  };
}

// Analyze portfolio composition
async function analyzePortfolio(portfolioState: any) {
  try {
    const assets = Object.values(portfolioState.assetBreakdown).filter((asset: any) => asset.symbol !== 'CASH');
    
    // Calculate diversification score (simplified)
    const totalAllocation = assets.reduce((sum: number, asset: any) => sum + asset.allocation, 0);
    const concentrationScore = assets.length > 0 ? (assets.length / 6) * 100 : 0; // 6 assets = optimal
    
    // Calculate risk score
    const highRiskAssets = assets.filter((asset: any) => 
      ['ADAUSDT', 'DOTUSDT', 'LINKUSDT'].includes(asset.symbol)
    );
    const riskScore = totalAllocation > 0 ? 
      (highRiskAssets.reduce((sum: number, asset: any) => sum + asset.allocation, 0) / totalAllocation) * 100 : 0;

    return {
      diversificationScore: Math.round(concentrationScore),
      riskScore: Math.round(riskScore),
      totalAssets: assets.length,
      optimalRange: '4-8 assets for optimal diversification',
      riskLevel: riskScore > 60 ? 'high' : riskScore > 40 ? 'medium' : 'low',
      recommendations: {
        diversification: concentrationScore < 70 ? 'Add more assets' : 'Well diversified',
        risk: riskScore > 60 ? 'Consider reducing altcoin exposure' : 'Risk level acceptable',
        cash: portfolioState.assetBreakdown['CASH']?.allocation > 20 ? 'Deploy excess cash' : 'Cash level appropriate'
      }
    };
  } catch (error) {
    console.error('Analyze Portfolio Error:', error);
    return {
      diversificationScore: 50,
      riskScore: 50,
      totalAssets: 0,
      optimalRange: '4-8 assets',
      riskLevel: 'unknown',
      recommendations: {}
    };
  }
}

// Helper functions
async function getCurrentPrices(symbols: string[]): Promise<{ [symbol: string]: number }> {
  const prices: { [symbol: string]: number } = {};
  symbols.forEach(symbol => {
    // Mock prices
    const mockPrices: { [symbol: string]: number } = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 1.5,
      'DOTUSDT': 25,
      'LINKUSDT': 15
    };
    prices[symbol] = mockPrices[symbol] || 100;
  });
  return prices;
}

function calculateRebalancingSummary(plan: any) {
  const totalBuyValue = plan.trades
    .filter((trade: any) => trade.action === 'BUY')
    .reduce((sum: number, trade: any) => sum + trade.estimatedValue, 0);

  const totalSellValue = plan.trades
    .filter((trade: any) => trade.action === 'SELL')
    .reduce((sum: number, trade: any) => sum + trade.estimatedValue, 0);

  return {
    totalBuyValue: Math.round(totalBuyValue * 100) / 100,
    totalSellValue: Math.round(totalSellValue * 100) / 100,
    netCashFlow: Math.round((totalBuyValue - totalSellValue) * 100) / 100,
    numberOfTrades: plan.trades.length,
    estimatedFees: Math.round((totalBuyValue + totalSellValue) * 0.001 * 100) / 100 // 0.1% fee
  };
}

function calculateEstimatedCost(trades: any[]): number {
  const totalValue = trades.reduce((sum: number, trade: any) => sum + trade.estimatedValue, 0);
  return Math.round(totalValue * 0.001 * 100) / 100; // 0.1% estimated fee
}

function calculateEstimatedTime(trades: any[]): string {
  if (trades.length === 0) return 'No trades needed';
  if (trades.length <= 3) return '2-5 minutes';
  if (trades.length <= 6) return '5-10 minutes';
  return '10-15 minutes';
}

function calculateRebalancingRisk(trades: any[]): 'low' | 'medium' | 'high' {
  const totalValue = trades.reduce((sum: number, trade: any) => sum + trade.estimatedValue, 0);
  const largeTrades = trades.filter((trade: any) => trade.estimatedValue > totalValue * 0.2);
  
  if (largeTrades.length > 2) return 'high';
  if (largeTrades.length > 0) return 'medium';
  return 'low';
}

export { handler as GET, handler as POST };