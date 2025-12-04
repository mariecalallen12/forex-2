import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { roleAuthMiddleware } from '@/lib/middleware/role-auth';
import { errorHandlingMiddleware } from '@/lib/middleware/error-handling';
import { firestore } from '@/lib/firebase';
import { TradingBot, TradingStrategy, Order } from '@/../../shared/types';

// Apply middleware chain
const handler = errorHandlingMiddleware(
  roleAuthMiddleware(['user', 'admin', 'superadmin'])(
    authMiddleware(async (request: NextRequest, { user }) => {
      const { method } = request;

      try {
        switch (method) {
          case 'GET':
            return await getTradingBots(request, user.uid);
          case 'POST':
            return await createTradingBot(request, user.uid);
          case 'PATCH':
            return await updateTradingBot(request, user.uid);
          case 'DELETE':
            return await deleteTradingBot(request, user.uid);
          default:
            return NextResponse.json(
              { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } },
              { status: 405 }
            );
        }
      } catch (error) {
        console.error('Trading Bots API Error:', error);
        throw error;
      }
    })
  )
);

// GET /api/portfolio/trading-bots - Get Trading Bots
async function getTradingBots(request: NextRequest, userId: string) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');

    // Build query
    let query = firestore.collection('trading_bots').where('userId', '==', userId);

    if (status) {
      query = query.where('status', '==', status);
    }

    // Order by creation date
    query = query.orderBy('createdAt', 'desc');

    // Apply pagination
    const offset = (page - 1) * limit;
    const snap = await query.offset(offset).limit(limit).get();

    const tradingBots: TradingBot[] = [];
    snap.forEach(doc => {
      const data = doc.data();
      tradingBots.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        logs: data.logs?.map((log: any) => ({
          ...log,
          timestamp: log.timestamp.toDate()
        })) || []
      } as TradingBot);
    });

    // Get total count
    const totalCountQuery = firestore.collection('trading_bots').where('userId', '==', userId);
    const totalSnap = await totalCountQuery.get();
    const total = totalSnap.size;

    return NextResponse.json({
      success: true,
      data: tradingBots,
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || '',
        pagination: {
          page,
          limit,
          total,
          hasNext: offset + limit < total,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Get Trading Bots Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_BOTS_FAILED', 
          message: 'Failed to fetch trading bots',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// POST /api/portfolio/trading-bots - Create Trading Bot
async function createTradingBot(request: NextRequest, userId: string) {
  const body = await request.json();
  const {
    name,
    strategy,
    config,
    startImmediately = false
  } = body;

  // Validate input
  if (!name || !strategy || !config) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Missing required parameters' } },
      { status: 400 }
    );
  }

  try {
    // Validate strategy
    if (!isValidStrategy(strategy)) {
      return NextResponse.json(
        { error: { code: 'INVALID_STRATEGY', message: 'Invalid strategy configuration' } },
        { status: 400 }
      );
    }

    // Validate config
    if (!isValidBotConfig(config)) {
      return NextResponse.json(
        { error: { code: 'INVALID_CONFIG', message: 'Invalid bot configuration' } },
        { status: 400 }
      );
    }

    // Check user balance
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData || userData.status !== 'active') {
      return NextResponse.json(
        { error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' } },
        { status: 403 }
      );
    }

    const availableBalance = userData.balance?.available || 0;
    if (availableBalance < config.baseAmount) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance for bot base amount' } },
        { status: 400 }
      );
    }

    // Create bot ID
    const botId = `BOT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const strategyId = `STRAT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create strategy
    const tradingStrategy: TradingStrategy = {
      strategyId,
      userId,
      name: strategy.name || `${name} Strategy`,
      description: strategy.description || 'Automated trading strategy',
      strategyType: strategy.strategyType || 'AUTOMATED',
      parameters: {
        timeframe: strategy.parameters?.timeframe || '1H',
        indicators: strategy.parameters?.indicators || ['RSI', 'MACD'],
        riskLevel: strategy.parameters?.riskLevel || 'MEDIUM',
        maxPositions: strategy.parameters?.maxPositions || 3,
        maxDrawdown: strategy.parameters?.maxDrawdown || 10,
        takeProfitPercent: strategy.parameters?.takeProfitPercent || 5,
        stopLossPercent: strategy.parameters?.stopLossPercent || 3
      },
      performance: {
        totalTrades: 0,
        winTrades: 0,
        lossTrades: 0,
        winRate: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        averageWin: 0,
        averageLoss: 0,
        profitFactor: 0,
        maxDrawdown: 0
      },
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create trading bot
    const tradingBot: TradingBot = {
      botId,
      userId,
      name,
      strategy: tradingStrategy,
      status: startImmediately ? 'STARTED' : 'PAUSED',
      config: {
        symbols: config.symbols || ['BTCUSDT', 'ETHUSDT'],
        baseAmount: config.baseAmount,
        leverage: config.leverage || 1,
        maxConcurrentOrders: config.maxConcurrentOrders || 5,
        riskManagement: {
          maxDailyLoss: config.riskManagement?.maxDailyLoss || config.baseAmount * 0.05,
          maxDrawdown: config.riskManagement?.maxDrawdown || config.baseAmount * 0.10,
          stopLossPercent: config.riskManagement?.stopLossPercent || 3,
          takeProfitPercent: config.riskManagement?.takeProfitPercent || 5
        }
      },
      performance: {
        totalTrades: 0,
        successRate: 0,
        totalPnl: 0,
        totalPnlPercent: 0,
        averageTradeTime: 0,
        maxDrawdown: 0
      },
      logs: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to Firestore
    const batch = firestore.batch();
    
    // Save trading bot
    batch.set(
      firestore.collection('trading_bots').doc(botId),
      tradingBot
    );
    
    // Save strategy
    batch.set(
      firestore.collection('trading_strategies').doc(strategyId),
      tradingStrategy
    );

    await batch.commit();

    // Start bot if requested
    if (startImmediately) {
      await startBotExecution(botId);
    }

    // Add initial log
    await addBotLog(botId, 'INFO', `Bot ${name} created${startImmediately ? ' and started' : ''}`);

    // Broadcast to WebSocket
    const wsService = (global as any).websocketService;
    if (wsService) {
      wsService.broadcastToUser(userId, 'PORTFOLIO_UPDATE', {
        type: 'TRADING_BOT_CREATED',
        data: tradingBot
      });
    }

    return NextResponse.json({
      success: true,
      data: tradingBot,
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Create Trading Bot Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'BOT_CREATION_FAILED', 
          message: 'Failed to create trading bot',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/portfolio/trading-bots - Update Trading Bot
async function updateTradingBot(request: NextRequest, userId: string) {
  const body = await request.json();
  const {
    botId,
    name,
    status,
    config,
    strategy
  } = body;

  if (!botId) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Bot ID is required' } },
      { status: 400 }
    );
  }

  try {
    const botDoc = await firestore.collection('trading_bots').doc(botId).get();
    
    if (!botDoc.exists) {
      return NextResponse.json(
        { error: { code: 'BOT_NOT_FOUND', message: 'Trading bot not found' } },
        { status: 404 }
      );
    }

    const botData = botDoc.data() as TradingBot;

    // Verify ownership
    if (botData.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authorized to modify this bot' } },
        { status: 403 }
      );
    }

    const updateData: Partial<TradingBot> = {
      updatedAt: new Date()
    };

    // Update basic properties
    if (name) updateData.name = name;
    if (status && ['STARTED', 'PAUSED', 'STOPPED'].includes(status)) {
      updateData.status = status as any;
      
      // Handle status changes
      if (status === 'STARTED' && botData.status !== 'STARTED') {
        await startBotExecution(botId);
        await addBotLog(botId, 'INFO', `Bot ${botData.name} started`);
      } else if (status === 'STOPPED' && botData.status !== 'STOPPED') {
        await stopBotExecution(botId);
        await addBotLog(botId, 'INFO', `Bot ${botData.name} stopped`);
      } else if (status === 'PAUSED' && botData.status === 'STARTED') {
        await pauseBotExecution(botId);
        await addBotLog(botId, 'INFO', `Bot ${botData.name} paused`);
      }
    }

    // Update config
    if (config) {
      if (config.symbols) updateData.config = { ...botData.config, symbols: config.symbols };
      if (config.baseAmount) updateData.config = { ...botData.config, baseAmount: config.baseAmount };
      if (config.leverage) updateData.config = { ...botData.config, leverage: config.leverage };
      if (config.maxConcurrentOrders) updateData.config = { ...botData.config, maxConcurrentOrders: config.maxConcurrentOrders };
      if (config.riskManagement) updateData.config = { 
        ...botData.config, 
        riskManagement: { ...botData.config.riskManagement, ...config.riskManagement }
      };
    }

    // Update strategy
    if (strategy) {
      if (strategy.name) updateData.strategy = { ...botData.strategy, name: strategy.name };
      if (strategy.description) updateData.strategy = { ...botData.strategy, description: strategy.description };
      if (strategy.parameters) {
        updateData.strategy = {
          ...botData.strategy,
          parameters: { ...botData.strategy.parameters, ...strategy.parameters }
        };
      }
      updateData.strategy.updatedAt = new Date();
    }

    // Update bot
    await firestore.collection('trading_bots').doc(botId).update(updateData);

    // Update strategy in separate collection
    if (strategy) {
      await firestore.collection('trading_strategies').doc(botData.strategy.strategyId).update({
        ...updateData.strategy,
        updatedAt: new Date()
      });
    }

    // Broadcast to WebSocket
    const wsService = (global as any).websocketService;
    if (wsService) {
      wsService.broadcastToUser(userId, 'PORTFOLIO_UPDATE', {
        type: 'TRADING_BOT_UPDATED',
        data: { botId, ...updateData }
      });
    }

    return NextResponse.json({
      success: true,
      data: { botId, ...updateData },
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Update Trading Bot Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'BOT_UPDATE_FAILED', 
          message: 'Failed to update trading bot',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/portfolio/trading-bots - Delete Trading Bot
async function deleteTradingBot(request: NextRequest, userId: string) {
  const body = await request.json();
  const { botId } = body;

  if (!botId) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Bot ID is required' } },
      { status: 400 }
    );
  }

  try {
    const botDoc = await firestore.collection('trading_bots').doc(botId).get();
    
    if (!botDoc.exists) {
      return NextResponse.json(
        { error: { code: 'BOT_NOT_FOUND', message: 'Trading bot not found' } },
        { status: 404 }
      );
    }

    const botData = botDoc.data() as TradingBot;

    // Verify ownership
    if (botData.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authorized to delete this bot' } },
        { status: 403 }
      );
    }

    // Stop bot execution before deletion
    if (botData.status === 'STARTED') {
      await stopBotExecution(botId);
    }

    // Add final log
    await addBotLog(botId, 'INFO', `Bot ${botData.name} deleted`);

    // Delete bot and related data
    const batch = firestore.batch();
    
    // Delete bot
    batch.delete(firestore.collection('trading_bots').doc(botId));
    
    // Delete strategy
    batch.delete(firestore.collection('trading_strategies').doc(botData.strategy.strategyId));

    await batch.commit();

    // Broadcast to WebSocket
    const wsService = (global as any).websocketService;
    if (wsService) {
      wsService.broadcastToUser(userId, 'PORTFOLIO_UPDATE', {
        type: 'TRADING_BOT_DELETED',
        data: { botId }
      });
    }

    return NextResponse.json({
      success: true,
      data: { botId, status: 'DELETED' },
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Delete Trading Bot Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'BOT_DELETION_FAILED', 
          message: 'Failed to delete trading bot',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// Helper functions

function isValidStrategy(strategy: any): boolean {
  if (!strategy.name && !strategy.description && !strategy.parameters) {
    return false;
  }

  // Validate required fields
  if (strategy.parameters) {
    const required = ['timeframe', 'riskLevel'];
    const missing = required.filter(field => !strategy.parameters[field]);
    if (missing.length > 0) {
      return false;
    }
  }

  return true;
}

function isValidBotConfig(config: any): boolean {
  if (!config.baseAmount || config.baseAmount <= 0) {
    return false;
  }

  if (config.symbols && (!Array.isArray(config.symbols) || config.symbols.length === 0)) {
    return false;
  }

  if (config.riskManagement) {
    const required = ['maxDailyLoss', 'maxDrawdown', 'stopLossPercent', 'takeProfitPercent'];
    const missing = required.filter(field => config.riskManagement[field] === undefined);
    if (missing.length > 0) {
      return false;
    }
  }

  return true;
}

async function startBotExecution(botId: string) {
  try {
    // In real implementation, this would start the bot's execution loop
    // For now, we'll simulate with a setTimeout that logs activity
    
    console.log(`Starting bot execution for ${botId}`);
    
    // Simulate bot execution with periodic updates
    setInterval(async () => {
      await simulateBotActivity(botId);
    }, 30000); // Every 30 seconds
  } catch (error) {
    console.error('Start Bot Execution Error:', error);
    await addBotLog(botId, 'ERROR', `Failed to start bot execution: ${error.message}`);
  }
}

async function stopBotExecution(botId: string) {
  try {
    console.log(`Stopping bot execution for ${botId}`);
    // In real implementation, this would stop the bot's execution loop
  } catch (error) {
    console.error('Stop Bot Execution Error:', error);
  }
}

async function pauseBotExecution(botId: string) {
  try {
    console.log(`Pausing bot execution for ${botId}`);
    // In real implementation, this would pause the bot's execution loop
  } catch (error) {
    console.error('Pause Bot Execution Error:', error);
  }
}

async function simulateBotActivity(botId: string) {
  try {
    // Get bot data
    const botDoc = await firestore.collection('trading_bots').doc(botId).get();
    
    if (!botDoc.exists) {
      return;
    }

    const botData = botDoc.data() as TradingBot;
    
    // Skip if bot is not started
    if (botData.status !== 'STARTED') {
      return;
    }

    // Simulate market analysis
    const marketAnalysis = await analyzeMarket(botData.config.symbols);
    
    // Generate trading signals based on strategy
    const signals = generateTradingSignals(marketAnalysis, botData.strategy);
    
    // Execute signals
    for (const signal of signals) {
      await executeBotTrade(botId, signal);
    }

    // Update bot performance
    await updateBotPerformance(botId);

    // Add activity log
    await addBotLog(botId, 'INFO', `Analyzed market and generated ${signals.length} signals`);
  } catch (error) {
    console.error('Simulate Bot Activity Error:', error);
    await addBotLog(botId, 'ERROR', `Activity simulation failed: ${error.message}`);
  }
}

async function analyzeMarket(symbols: string[]) {
  // Mock market analysis
  const analysis: { [symbol: string]: any } = {};
  
  symbols.forEach(symbol => {
    analysis[symbol] = {
      price: Math.random() * 100 + 100, // Random price
      rsi: Math.random() * 100,
      macd: Math.random() * 10 - 5,
      trend: Math.random() > 0.5 ? 'BULLISH' : 'BEARISH',
      volatility: Math.random() * 10
    };
  });

  return analysis;
}

function generateTradingSignals(marketAnalysis: any, strategy: TradingStrategy) {
  const signals = [];
  
  Object.keys(marketAnalysis).forEach(symbol => {
    const data = marketAnalysis[symbol];
    
    // Simple signal generation based on RSI and trend
    if (data.rsi < 30 && data.trend === 'BULLISH') {
      signals.push({
        symbol,
        action: 'BUY',
        confidence: 0.7 + Math.random() * 0.3,
        reason: 'Oversold condition with bullish trend'
      });
    } else if (data.rsi > 70 && data.trend === 'BEARISH') {
      signals.push({
        symbol,
        action: 'SELL',
        confidence: 0.7 + Math.random() * 0.3,
        reason: 'Overbought condition with bearish trend'
      });
    }
  });

  return signals.slice(0, strategy.parameters.maxPositions);
}

async function executeBotTrade(botId: string, signal: any) {
  try {
    const botDoc = await firestore.collection('trading_bots').doc(botId).get();
    const botData = botDoc.data() as TradingBot;

    if (!botData) return;

    // Create market order
    const orderId = `BOT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const order: Order = {
      orderId,
      userId: botData.userId,
      symbol: signal.symbol,
      side: signal.action as any,
      type: 'MARKET' as any,
      quantity: botData.config.baseAmount / 1000, // Simplified quantity calculation
      filledQuantity: 0,
      remainingQuantity: botData.config.baseAmount / 1000,
      timeInForce: 'IOC' as any,
      status: 'PENDING',
      metadata: {
        orderType: 'NORMAL',
        strategy: 'BOT_AUTOMATED',
        tags: ['BOT', 'AUTOMATED']
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save order
    await firestore.collection('orders').doc(orderId).set(order);

    // Simulate order execution
    setTimeout(async () => {
      await firestore.collection('orders').doc(orderId).update({
        filledQuantity: order.quantity,
        remainingQuantity: 0,
        status: 'FILLED',
        updatedAt: new Date()
      });
    }, 1000);

    await addBotLog(botId, 'INFO', `Executed ${signal.action} order for ${signal.symbol} (${signal.reason})`);
  } catch (error) {
    console.error('Execute Bot Trade Error:', error);
    await addBotLog(botId, 'ERROR', `Trade execution failed: ${error.message}`);
  }
}

async function updateBotPerformance(botId: string) {
  try {
    // Get bot and recent orders
    const botDoc = await firestore.collection('trading_bots').doc(botId).get();
    const botData = botDoc.data() as TradingBot;

    if (!botData) return;

    // Get recent orders from this bot
    const recentOrdersSnap = await firestore
      .collection('orders')
      .where('metadata.strategy', '==', 'BOT_AUTOMATED')
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get();

    const recentOrders = [];
    recentOrdersSnap.forEach(doc => {
      const data = doc.data();
      recentOrders.push({
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate()
      });
    });

    // Calculate performance metrics
    const filledOrders = recentOrders.filter(order => order.status === 'FILLED');
    const totalTrades = filledOrders.length;
    const winTrades = filledOrders.filter(() => Math.random() > 0.4).length; // Mock 60% win rate
    const successRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
    const totalPnl = filledOrders.reduce((sum, order) => {
      return sum + (order.side === 'BUY' ? -order.price! * order.quantity * 0.01 : order.price! * order.quantity * 0.01);
    }, 0);

    // Update bot performance
    await firestore.collection('trading_bots').doc(botId).update({
      performance: {
        totalTrades,
        successRate,
        totalPnl,
        totalPnlPercent: botData.config.baseAmount > 0 ? (totalPnl / botData.config.baseAmount) * 100 : 0,
        averageTradeTime: 3600, // Mock 1 hour average
        maxDrawdown: Math.abs(totalPnl * 0.2) // Mock drawdown
      },
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Update Bot Performance Error:', error);
  }
}

async function addBotLog(botId: string, level: 'INFO' | 'WARNING' | 'ERROR', message: string, data?: any) {
  try {
    const log = {
      timestamp: new Date(),
      level,
      message,
      data
    };

    // Get current bot
    const botDoc = await firestore.collection('trading_bots').doc(botId).get();
    const botData = botDoc.data() as TradingBot;

    if (!botData) return;

    // Add log and keep only last 50 logs
    const updatedLogs = [...(botData.logs || []), log].slice(-50);

    await firestore.collection('trading_bots').doc(botId).update({
      logs: updatedLogs,
      updatedAt: new Date()
    });
  } catch (error) {
    console.error('Add Bot Log Error:', error);
  }
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };