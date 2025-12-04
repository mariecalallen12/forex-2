import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { roleAuthMiddleware } from '@/lib/middleware/role-auth';
import { errorHandlingMiddleware } from '@/lib/middleware/error-handling';
import { firestore } from '@/lib/firebase';
import { Order, TrailingStopOrder, OrderType, OrderSide } from '@/../../shared/types';

// Apply middleware chain
const handler = errorHandlingMiddleware(
  roleAuthMiddleware(['user', 'admin', 'superadmin'])(
    authMiddleware(async (request: NextRequest, { user }) => {
      const { method } = request;

      try {
        switch (method) {
          case 'POST':
            return await createTrailingStopOrder(request, user.uid);
          case 'GET':
            return await getTrailingStopOrders(request, user.uid);
          case 'PATCH':
            return await updateTrailingStopOrder(request, user.uid);
          case 'DELETE':
            return await cancelTrailingStopOrder(request, user.uid);
          default:
            return NextResponse.json(
              { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } },
              { status: 405 }
            );
        }
      } catch (error) {
        console.error('Trailing Stop Orders API Error:', error);
        throw error;
      }
    })
  )
);

// POST /api/trading/orders/trailing-stop - Create Trailing Stop Order
async function createTrailingStopOrder(request: NextRequest, userId: string) {
  const body = await request.json();
  const {
    symbol,
    side, // 'BUY' or 'SELL'
    quantity,
    trailingType, // 'PERCENTAGE' or 'FIXED_AMOUNT'
    trailValue, // percentage or fixed amount
    activationPrice, // Optional: activate only when price reaches this level
    timeInForce = 'GTC' as const
  } = body;

  // Validate input
  if (!symbol || !side || !quantity || !trailingType || !trailValue) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Missing required parameters' } },
      { status: 400 }
    );
  }

  if (quantity <= 0 || trailValue <= 0) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Invalid parameter values' } },
      { status: 400 }
    );
  }

  if (!['PERCENTAGE', 'FIXED_AMOUNT'].includes(trailingType)) {
    return NextResponse.json(
      { error: { code: 'INVALID_TRAILING_TYPE', message: 'Trailing type must be PERCENTAGE or FIXED_AMOUNT' } },
      { status: 400 }
    );
  }

  try {
    // Get current market price (simplified - in real implementation, get from market data API)
    const currentPrice = await getCurrentPrice(symbol);
    
    if (!currentPrice) {
      return NextResponse.json(
        { error: { code: 'PRICE_NOT_AVAILABLE', message: 'Current price not available for symbol' } },
        { status: 400 }
      );
    }

    // Validate activation price if provided
    if (activationPrice) {
      if (side === 'BUY' && activationPrice > currentPrice) {
        return NextResponse.json(
          { error: { code: 'ACTIVATION_PRICE_INVALID', message: 'For BUY orders, activation price should be below current price' } },
          { status: 400 }
        );
      } else if (side === 'SELL' && activationPrice < currentPrice) {
        return NextResponse.json(
          { error: { code: 'ACTIVATION_PRICE_INVALID', message: 'For SELL orders, activation price should be above current price' } },
          { status: 400 }
        );
      }
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

    // Calculate required margin
    const requiredMargin = currentPrice * quantity * 0.1; // 10% margin
    const availableBalance = userData.balance?.available || 0;
    
    if (availableBalance < requiredMargin) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance for trailing stop order' } },
        { status: 400 }
      );
    }

    // Calculate initial stop price
    let initialStopPrice: number;
    if (trailingType === 'PERCENTAGE') {
      const percentage = trailValue / 100;
      initialStopPrice = side === 'BUY' 
        ? currentPrice * (1 - percentage)
        : currentPrice * (1 + percentage);
    } else {
      initialStopPrice = side === 'BUY'
        ? currentPrice - trailValue
        : currentPrice + trailValue;
    }

    // Create trailing stop order
    const trailingStopOrderId = `TRAILING_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const parentOrderId = `PARENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const trailingStopOrder: TrailingStopOrder = {
      orderId: trailingStopOrderId,
      userId,
      symbol,
      side,
      quantity,
      trailingType,
      trailValue,
      currentTrailValue: trailValue,
      stopPrice: initialStopPrice,
      activationPrice,
      status: 'PENDING',
      timeInForce,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create parent order
    const parentOrder: Order = {
      orderId: parentOrderId,
      userId,
      symbol,
      side,
      type: 'TRAILING_STOP' as OrderType,
      quantity,
      filledQuantity: 0,
      remainingQuantity: quantity,
      stopPrice: initialStopPrice,
      timeInForce,
      parentOrderId: trailingStopOrderId,
      status: 'PENDING',
      metadata: {
        orderType: 'TRAILING_STOP',
        trailingStopData: trailingStopOrder
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to Firestore
    const batch = firestore.batch();
    
    // Save trailing stop order
    batch.set(
      firestore.collection('trailing_stop_orders').doc(trailingStopOrderId),
      trailingStopOrder
    );
    
    // Save parent order
    batch.set(
      firestore.collection('orders').doc(parentOrderId),
      parentOrder
    );

    // Update user balance
    batch.update(
      firestore.collection('users').doc(userId),
      {
        balance: {
          ...userData.balance,
          available: availableBalance - requiredMargin,
          locked: (userData.balance?.locked || 0) + requiredMargin
        },
        updatedAt: new Date()
      }
    );

    await batch.commit();

    // Start trailing stop monitoring
    await startTrailingStopMonitoring(trailingStopOrderId);

    // Broadcast to WebSocket
    const wsService = (global as any).websocketService;
    if (wsService) {
      wsService.broadcastToUser(userId, 'ORDER_UPDATE', {
        type: 'TRAILING_STOP_CREATED',
        data: trailingStopOrder
      });
    }

    return NextResponse.json({
      success: true,
      data: trailingStopOrder,
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Create Trailing Stop Order Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'ORDER_CREATION_FAILED', 
          message: 'Failed to create trailing stop order',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// GET /api/trading/orders/trailing-stop - Get Trailing Stop Orders
async function getTrailingStopOrders(request: NextRequest, userId: string) {
  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');

    // Build query
    let query = firestore.collection('trailing_stop_orders').where('userId', '==', userId);

    if (symbol) {
      query = query.where('symbol', '==', symbol);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    // Order by creation date
    query = query.orderBy('createdAt', 'desc');

    // Apply pagination
    const offset = (page - 1) * limit;
    const snap = await query.offset(offset).limit(limit).get();

    const trailingStopOrders: TrailingStopOrder[] = [];
    snap.forEach(doc => {
      trailingStopOrders.push({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      } as TrailingStopOrder);
    });

    // Get total count
    const totalCountQuery = firestore.collection('trailing_stop_orders').where('userId', '==', userId);
    const totalSnap = await totalCountQuery.get();
    const total = totalSnap.size;

    return NextResponse.json({
      success: true,
      data: trailingStopOrders,
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
    console.error('Get Trailing Stop Orders Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_ORDERS_FAILED', 
          message: 'Failed to fetch trailing stop orders',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/trading/orders/trailing-stop - Update Trailing Stop Order
async function updateTrailingStopOrder(request: NextRequest, userId: string) {
  const body = await request.json();
  const {
    orderId,
    trailValue,
    activationPrice,
    stopPrice // Allow manual stop price adjustment
  } = body;

  if (!orderId) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Order ID is required' } },
      { status: 400 }
    );
  }

  try {
    const orderDoc = await firestore.collection('trailing_stop_orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: { code: 'ORDER_NOT_FOUND', message: 'Trailing stop order not found' } },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data() as TrailingStopOrder;

    // Verify ownership
    if (orderData.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authorized to modify this order' } },
        { status: 403 }
      );
    }

    // Verify order is still active
    if (orderData.status !== 'PENDING') {
      return NextResponse.json(
        { error: { code: 'ORDER_NOT_MODIFIABLE', message: 'Order cannot be modified' } },
        { status: 400 }
      );
    }

    const updateData: Partial<TrailingStopOrder> = {
      updatedAt: new Date()
    };

    if (trailValue && trailValue > 0) {
      updateData.trailValue = trailValue;
      updateData.currentTrailValue = trailValue;
    }

    if (activationPrice !== undefined) {
      updateData.activationPrice = activationPrice;
    }

    if (stopPrice && stopPrice > 0) {
      updateData.stopPrice = stopPrice;
    }

    await firestore.collection('trailing_stop_orders').doc(orderId).update(updateData);

    return NextResponse.json({
      success: true,
      data: { orderId, ...updateData },
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Update Trailing Stop Order Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'ORDER_UPDATE_FAILED', 
          message: 'Failed to update trailing stop order',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// DELETE /api/trading/orders/trailing-stop - Cancel Trailing Stop Order
async function cancelTrailingStopOrder(request: NextRequest, userId: string) {
  const body = await request.json();
  const { orderId } = body;

  if (!orderId) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Order ID is required' } },
      { status: 400 }
    );
  }

  try {
    const orderDoc = await firestore.collection('trailing_stop_orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: { code: 'ORDER_NOT_FOUND', message: 'Trailing stop order not found' } },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data() as TrailingStopOrder;

    // Verify ownership
    if (orderData.userId !== userId) {
      return NextResponse.json(
        { error: { code: 'UNAUTHORIZED', message: 'Not authorized to cancel this order' } },
        { status: 403 }
      );
    }

    // Verify order is still pending
    if (orderData.status !== 'PENDING') {
      return NextResponse.json(
        { error: { code: 'ORDER_NOT_CANCELLABLE', message: 'Order cannot be cancelled' } },
        { status: 400 }
      );
    }

    // Update order status
    await firestore.collection('trailing_stop_orders').doc(orderId).update({
      status: 'CANCELLED',
      updatedAt: new Date()
    });

    // Cancel parent order
    const parentQuery = await firestore.collection('orders')
      .where('parentOrderId', '==', orderId)
      .limit(1)
      .get();

    if (!parentQuery.empty) {
      const parentOrder = parentQuery.docs[0];
      await firestore.collection('orders').doc(parentOrder.id).update({
        status: 'CANCELLED',
        updatedAt: new Date()
      });
    }

    // Return margin to user
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (userData?.balance) {
      const currentPrice = await getCurrentPrice(orderData.symbol);
      const margin = currentPrice * orderData.quantity * 0.1;
      
      await firestore.collection('users').doc(userId).update({
        balance: {
          ...userData.balance,
          available: userData.balance.available + margin,
          locked: userData.balance.locked - margin
        },
        updatedAt: new Date()
      });
    }

    // Broadcast to WebSocket
    const wsService = (global as any).websocketService;
    if (wsService) {
      wsService.broadcastToUser(userId, 'ORDER_UPDATE', {
        type: 'TRAILING_STOP_CANCELLED',
        data: { orderId, status: 'CANCELLED' }
      });
    }

    return NextResponse.json({
      success: true,
      data: { orderId, status: 'CANCELLED' },
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Cancel Trailing Stop Order Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'ORDER_CANCELLATION_FAILED', 
          message: 'Failed to cancel trailing stop order',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// Helper function to get current market price (simplified)
async function getCurrentPrice(symbol: string): Promise<number | null> {
  try {
    // In real implementation, fetch from market data API
    // For now, return mock price
    const mockPrices: { [key: string]: number } = {
      'BTCUSDT': 45000,
      'ETHUSDT': 3000,
      'ADAUSDT': 1.5,
      'DOTUSDT': 25,
      'LINKUSDT': 15
    };

    return mockPrices[symbol] || null;
  } catch (error) {
    console.error('Get Current Price Error:', error);
    return null;
  }
}

// Helper function to start trailing stop monitoring
async function startTrailingStopMonitoring(orderId: string) {
  try {
    // In real implementation, this would be a cron job or background worker
    // that checks prices periodically and updates trailing stop levels
    
    // For now, we'll simulate with a setTimeout
    setTimeout(async () => {
      await updateTrailingStopPrice(orderId);
    }, 5000); // Check every 5 seconds
  } catch (error) {
    console.error('Start Trailing Stop Monitoring Error:', error);
  }
}

// Helper function to update trailing stop price
async function updateTrailingStopPrice(orderId: string) {
  try {
    const orderDoc = await firestore.collection('trailing_stop_orders').doc(orderId).get();
    const orderData = orderDoc.data() as TrailingStopOrder;

    if (!orderData || orderData.status !== 'PENDING') {
      return;
    }

    const currentPrice = await getCurrentPrice(orderData.symbol);
    if (!currentPrice) {
      return;
    }

    // Check activation price if set
    if (orderData.activationPrice) {
      const isActivated = orderData.side === 'BUY' 
        ? currentPrice >= orderData.activationPrice
        : currentPrice <= orderData.activationPrice;

      if (!isActivated) {
        return; // Not activated yet, try again later
      }
    }

    // Calculate new stop price based on trailing logic
    let newStopPrice = orderData.stopPrice;

    if (orderData.trailingType === 'PERCENTAGE') {
      const percentage = orderData.trailValue / 100;
      if (orderData.side === 'BUY') {
        // For BUY: trail stop price up as price goes up
        const theoreticalStop = currentPrice * (1 - percentage);
        newStopPrice = Math.max(orderData.stopPrice, theoreticalStop);
      } else {
        // For SELL: trail stop price down as price goes down
        const theoreticalStop = currentPrice * (1 + percentage);
        newStopPrice = Math.min(orderData.stopPrice, theoreticalStop);
      }
    } else {
      // FIXED_AMOUNT
      if (orderData.side === 'BUY') {
        const theoreticalStop = currentPrice - orderData.trailValue;
        newStopPrice = Math.max(orderData.stopPrice, theoreticalStop);
      } else {
        const theoreticalStop = currentPrice + orderData.trailValue;
        newStopPrice = Math.min(orderData.stopPrice, theoreticalStop);
      }
    }

    // Update stop price if it changed
    if (newStopPrice !== orderData.stopPrice) {
      await firestore.collection('trailing_stop_orders').doc(orderId).update({
        stopPrice: newStopPrice,
        updatedAt: new Date()
      });

      // Broadcast update
      const wsService = (global as any).websocketService;
      if (wsService) {
        wsService.broadcastToUser(orderData.userId, 'ORDER_UPDATE', {
          type: 'TRAILING_STOP_UPDATED',
          data: { orderId, stopPrice: newStopPrice }
        });
      }
    }

    // Check if stop condition is met
    const shouldTrigger = orderData.side === 'BUY' 
      ? currentPrice <= newStopPrice
      : currentPrice >= newStopPrice;

    if (shouldTrigger) {
      await triggerTrailingStopOrder(orderId);
    } else {
      // Continue monitoring
      setTimeout(async () => {
        await updateTrailingStopPrice(orderId);
      }, 5000);
    }
  } catch (error) {
    console.error('Update Trailing Stop Price Error:', error);
  }
}

// Helper function to trigger trailing stop order
async function triggerTrailingStopOrder(orderId: string) {
  try {
    const orderDoc = await firestore.collection('trailing_stop_orders').doc(orderId).get();
    const orderData = orderDoc.data() as TrailingStopOrder;

    if (!orderData || orderData.status !== 'PENDING') {
      return;
    }

    // Update status to triggered
    await firestore.collection('trailing_stop_orders').doc(orderId).update({
      status: 'TRIGGERED',
      updatedAt: new Date()
    });

    // Execute market order
    const parentQuery = await firestore.collection('orders')
      .where('parentOrderId', '==', orderId)
      .limit(1)
      .get();

    if (!parentQuery.empty) {
      const parentOrderDoc = parentQuery.docs[0];
      await firestore.collection('orders').doc(parentOrderDoc.id).update({
        status: 'TRIGGERED',
        updatedAt: new Date()
      });
    }

    // Broadcast to WebSocket
    const wsService = (global as any).websocketService;
    if (wsService) {
      wsService.broadcastToUser(orderData.userId, 'ORDER_UPDATE', {
        type: 'TRAILING_STOP_TRIGGERED',
        data: { orderId, status: 'TRIGGERED' }
      });
    }
  } catch (error) {
    console.error('Trigger Trailing Stop Order Error:', error);
  }
}

export { handler as GET, handler as POST, handler as PATCH, handler as DELETE };