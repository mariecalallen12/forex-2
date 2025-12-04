/**
 * Admin Trade Management API
 * 
 * Allows admins to view, manage, and control trade outcomes.
 * Core admin functionality for managing win/loss ratios and trade results.
 * 
 * @author Digital Utopia Platform
 * @version 1.0
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firestore } from '@/lib/firebase';
import { roleAuthMiddleware } from '@/lib/middleware/role-auth';
import { errorHandlingMiddleware, ErrorTypes, validateRequestBody } from '@/lib/middleware/error-handling';
import { rateLimitMiddleware, RateLimitPresets } from '@/lib/middleware/rate-limit';

// Validation schemas
const updateTradeSchema = z.object({
  outcome: z.enum(['win', 'loss']).optional(),
  profit: z.number().optional(),
  exitPrice: z.number().positive().optional(),
  closeReason: z.enum(['manual', 'stop-loss', 'take-profit', 'margin-call', 'admin']).optional(),
});

const setWinRateSchema = z.object({
  userId: z.string(),
  winRate: z.number().min(0).max(100),
  duration: z.enum(['session', 'day', 'week', 'month', 'permanent']).default('session'),
});

const tradingParametersSchema = z.object({
  defaultSpread: z.number().min(0).max(1).optional(),
  defaultSlippage: z.number().min(0).max(1).optional(),
  maxLeverage: z.number().min(1).max(500).optional(),
  commissionRate: z.number().min(0).max(10).optional(),
  volatility: z.number().min(0).max(10).optional(),
});

/**
 * GET /api/admin/trades - Get all trades
 */
async function handleGetTrades(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const status = searchParams.get('status') as 'open' | 'closed' | null;
  const symbol = searchParams.get('symbol');
  const limit = parseInt(searchParams.get('limit') || '50');
  const offset = parseInt(searchParams.get('offset') || '0');

  let query = firestore.collection('trades').orderBy('openedAt', 'desc');

  // Apply filters
  if (userId) {
    query = query.where('userId', '==', userId) as any;
  }
  if (status) {
    query = query.where('status', '==', status) as any;
  }
  if (symbol) {
    query = query.where('symbol', '==', symbol) as any;
  }

  // Pagination
  query = query.limit(limit).offset(offset) as any;

  const snapshot = await query.get();
  const trades = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  // Get total count
  let countQuery = firestore.collection('trades');
  if (userId) countQuery = countQuery.where('userId', '==', userId) as any;
  if (status) countQuery = countQuery.where('status', '==', status) as any;
  if (symbol) countQuery = countQuery.where('symbol', '==', symbol) as any;
  
  const countSnapshot = await countQuery.count().get();
  const total = countSnapshot.data().count;

  return NextResponse.json({
    success: true,
    data: {
      trades,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + trades.length < total,
      },
    },
    timestamp: new Date().toISOString(),
  });
}

/**
 * PUT /api/admin/trades/[tradeId] - Update trade result
 * Admin can override trade outcome, profit, and exit price
 */
async function handleUpdateTrade(request: NextRequest, tradeId: string) {
  const body = await validateRequestBody(request, updateTradeSchema);

  // Get existing trade
  const tradeDoc = await firestore.collection('trades').doc(tradeId).get();
  
  if (!tradeDoc.exists) {
    throw ErrorTypes.NOT_FOUND('Trade not found');
  }

  const trade = tradeDoc.data();
  const updates: any = {
    updatedAt: Date.now(),
    adminModified: true,
    adminModifiedAt: Date.now(),
  };

  // Handle outcome override
  if (body.outcome) {
    if (body.outcome === 'win') {
      // Force trade to win
      const profit = body.profit || Math.abs(trade.pnl || 0);
      updates.pnl = profit;
      updates.pnlPercent = (profit / (trade.entryPrice * trade.quantity / trade.leverage)) * 100;
      updates.exitPrice = body.exitPrice || 
        (trade.side === 'buy' ? trade.entryPrice * 1.02 : trade.entryPrice * 0.98);
    } else {
      // Force trade to loss
      const loss = body.profit || Math.abs(trade.pnl || 0);
      updates.pnl = -loss;
      updates.pnlPercent = (-loss / (trade.entryPrice * trade.quantity / trade.leverage)) * 100;
      updates.exitPrice = body.exitPrice || 
        (trade.side === 'buy' ? trade.entryPrice * 0.98 : trade.entryPrice * 1.02);
    }
    updates.status = 'closed';
    updates.closedAt = Date.now();
    updates.closeReason = 'admin';
  }

  // Apply custom exit price
  if (body.exitPrice && !body.outcome) {
    const priceDiff = trade.side === 'buy' 
      ? body.exitPrice - trade.entryPrice
      : trade.entryPrice - body.exitPrice;
    const grossPnL = priceDiff * trade.quantity * trade.leverage;
    updates.exitPrice = body.exitPrice;
    updates.pnl = grossPnL - (trade.commission * 2);
    updates.pnlPercent = (updates.pnl / (trade.entryPrice * trade.quantity / trade.leverage)) * 100;
  }

  // Apply custom close reason
  if (body.closeReason) {
    updates.closeReason = body.closeReason;
  }

  // Update trade
  await firestore.collection('trades').doc(tradeId).update(updates);

  // Update user balance if trade closed
  if (updates.status === 'closed' && updates.pnl !== undefined) {
    const userDoc = await firestore.collection('users').doc(trade.userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      const currentBalance = userData.balance || 0;
      const newBalance = currentBalance + updates.pnl;
      
      await firestore.collection('users').doc(trade.userId).update({
        balance: newBalance,
        updatedAt: Date.now(),
      });
    }
  }

  const updatedTrade = await firestore.collection('trades').doc(tradeId).get();

  return NextResponse.json({
    success: true,
    data: {
      id: updatedTrade.id,
      ...updatedTrade.data(),
    },
    message: 'Trade updated successfully',
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/admin/trades/win-rate - Set user win rate
 * Control win rate for testing or promotional purposes
 */
async function handleSetWinRate(request: NextRequest) {
  const body = await validateRequestBody(request, setWinRateSchema);

  // Store win rate configuration
  const winRateConfig = {
    userId: body.userId,
    winRate: body.winRate,
    duration: body.duration,
    createdAt: Date.now(),
    expiresAt: calculateExpirationTime(body.duration),
    active: true,
  };

  await firestore.collection('trading_configs').doc(body.userId).set({
    winRateOverride: winRateConfig,
    updatedAt: Date.now(),
  }, { merge: true });

  return NextResponse.json({
    success: true,
    data: winRateConfig,
    message: `Win rate set to ${body.winRate}% for user ${body.userId}`,
    timestamp: new Date().toISOString(),
  });
}

/**
 * POST /api/admin/trades/parameters - Set global trading parameters
 * Control spread, slippage, volatility, etc.
 */
async function handleSetTradingParameters(request: NextRequest) {
  const body = await validateRequestBody(request, tradingParametersSchema);

  // Store global trading parameters
  await firestore.collection('system_config').doc('trading_parameters').set({
    ...body,
    updatedAt: Date.now(),
  }, { merge: true });

  return NextResponse.json({
    success: true,
    data: body,
    message: 'Trading parameters updated successfully',
    timestamp: new Date().toISOString(),
  });
}

/**
 * GET /api/admin/trades/statistics - Get trading statistics
 */
async function handleGetStatistics(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const timeframe = searchParams.get('timeframe') || '24h';

  const startTime = calculateStartTime(timeframe);

  let query = firestore.collection('trades')
    .where('openedAt', '>=', startTime);

  if (userId) {
    query = query.where('userId', '==', userId) as any;
  }

  const snapshot = await query.get();
  const trades = snapshot.docs.map(doc => doc.data());

  // Calculate statistics
  const totalTrades = trades.length;
  const closedTrades = trades.filter(t => t.status === 'closed');
  const winningTrades = closedTrades.filter(t => t.pnl > 0);
  const losingTrades = closedTrades.filter(t => t.pnl < 0);

  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
  const totalVolume = trades.reduce((sum, t) => sum + (t.entryPrice * t.quantity), 0);
  
  const winRate = closedTrades.length > 0 
    ? (winningTrades.length / closedTrades.length) * 100 
    : 0;

  return NextResponse.json({
    success: true,
    data: {
      totalTrades,
      openTrades: totalTrades - closedTrades.length,
      closedTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      winRate: parseFloat(winRate.toFixed(2)),
      totalProfit: parseFloat(totalProfit.toFixed(2)),
      totalVolume: parseFloat(totalVolume.toFixed(2)),
      averageProfit: closedTrades.length > 0 
        ? parseFloat((totalProfit / closedTrades.length).toFixed(2))
        : 0,
      timeframe,
    },
    timestamp: new Date().toISOString(),
  });
}

// Helper functions
function calculateExpirationTime(duration: string): number | null {
  const now = Date.now();
  switch (duration) {
    case 'session':
      return now + 4 * 60 * 60 * 1000; // 4 hours
    case 'day':
      return now + 24 * 60 * 60 * 1000;
    case 'week':
      return now + 7 * 24 * 60 * 60 * 1000;
    case 'month':
      return now + 30 * 24 * 60 * 60 * 1000;
    case 'permanent':
      return null;
    default:
      return now + 4 * 60 * 60 * 1000;
  }
}

function calculateStartTime(timeframe: string): number {
  const now = Date.now();
  switch (timeframe) {
    case '1h':
      return now - 60 * 60 * 1000;
    case '24h':
      return now - 24 * 60 * 60 * 1000;
    case '7d':
      return now - 7 * 24 * 60 * 60 * 1000;
    case '30d':
      return now - 30 * 24 * 60 * 60 * 1000;
    default:
      return now - 24 * 60 * 60 * 1000;
  }
}

// Main route handler
export async function GET(request: NextRequest) {
  return errorHandlingMiddleware(
    rateLimitMiddleware(RateLimitPresets.API_GENERAL)(
      roleAuthMiddleware(['admin', 'superadmin'])(
        async (req) => {
          const { searchParams } = new URL(req.url);
          
          if (searchParams.has('statistics')) {
            return handleGetStatistics(req);
          }
          
          return handleGetTrades(req);
        }
      )
    )
  )(request);
}

export async function POST(request: NextRequest) {
  return errorHandlingMiddleware(
    rateLimitMiddleware(RateLimitPresets.API_GENERAL)(
      roleAuthMiddleware(['admin', 'superadmin'])(
        async (req) => {
          const { searchParams } = new URL(req.url);
          
          if (searchParams.has('win-rate')) {
            return handleSetWinRate(req);
          }
          
          if (searchParams.has('parameters')) {
            return handleSetTradingParameters(req);
          }
          
          throw ErrorTypes.VALIDATION_ERROR('Invalid action');
        }
      )
    )
  )(request);
}

export async function PUT(request: NextRequest) {
  return errorHandlingMiddleware(
    rateLimitMiddleware(RateLimitPresets.API_GENERAL)(
      roleAuthMiddleware(['admin', 'superadmin'])(
        async (req) => {
          const { searchParams } = new URL(req.url);
          const tradeId = searchParams.get('tradeId');
          
          if (!tradeId) {
            throw ErrorTypes.VALIDATION_ERROR('Trade ID is required');
          }
          
          return handleUpdateTrade(req, tradeId);
        }
      )
    )
  )(request);
}
