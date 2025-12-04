import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { roleAuthMiddleware } from '@/lib/middleware/role-auth';
import { errorHandlingMiddleware } from '@/lib/middleware/error-handling';
import { firestore } from '@/lib/firebase';
import { Order, OcoOrder, OrderType, OrderSide } from '@/../../shared/types';

// Apply middleware chain
const handler = errorHandlingMiddleware(
  roleAuthMiddleware(['user', 'admin', 'superadmin'])(
    authMiddleware(async (request: NextRequest, { user }) => {
      const { method } = request;

      try {
        switch (method) {
          case 'POST':
            return await createOcoOrder(request, user.uid);
          case 'GET':
            return await getOcoOrders(request, user.uid);
          default:
            return NextResponse.json(
              { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } },
              { status: 405 }
            );
        }
      } catch (error) {
        console.error('OCO Orders API Error:', error);
        throw error;
      }
    })
  )
);

// POST /api/trading/orders/oco - Create OCO Order
async function createOcoOrder(request: NextRequest, userId: string) {
  const body = await request.json();
  const {
    symbol,
    side, // 'BUY' or 'SELL'
    quantity,
    takeProfitPrice,
    stopLossPrice,
    timeInForce = 'GTC' as const
  } = body;

  // Validate input
  if (!symbol || !side || !quantity || !takeProfitPrice || !stopLossPrice) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Missing required parameters' } },
      { status: 400 }
    );
  }

  if (quantity <= 0 || takeProfitPrice <= 0 || stopLossPrice <= 0) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Invalid parameter values' } },
      { status: 400 }
    );
  }

  // Validate OCO logic
  if (side === 'BUY') {
    // For BUY orders: stop loss should be below entry, take profit above entry
    if (stopLossPrice >= takeProfitPrice) {
      return NextResponse.json(
        { error: { code: 'OCO_VALIDATION_FAILED', message: 'For BUY orders: stop loss must be below take profit' } },
        { status: 400 }
      );
    }
  } else {
    // For SELL orders: take profit should be below entry, stop loss above entry
    if (takeProfitPrice >= stopLossPrice) {
      return NextResponse.json(
        { error: { code: 'OCO_VALIDATION_FAILED', message: 'For SELL orders: take profit must be below stop loss' } },
        { status: 400 }
      );
    }
  }

  try {
    // Check user balance
    const userDoc = await firestore.collection('users').doc(userId).get();
    const userData = userDoc.data();
    
    if (!userData || userData.status !== 'active') {
      return NextResponse.json(
        { error: { code: 'ACCOUNT_INACTIVE', message: 'Account is not active' } },
        { status: 403 }
      );
    }

    // Check balance for margin requirements
    const requiredMargin = side === 'BUY' ? quantity * takeProfitPrice : quantity * stopLossPrice;
    const availableBalance = userData.balance?.available || 0;
    
    if (availableBalance < requiredMargin) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance for OCO order' } },
        { status: 400 }
      );
    }

    // Create order group ID
    const orderGroupId = `oco_${Date.now()}_${userId}`;
    const ocoOrderId = `OCO_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create take profit order
    const takeProfitOrder: Order = {
      orderId: `TP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      symbol,
      side,
      type: 'LIMIT' as OrderType,
      quantity,
      filledQuantity: 0,
      remainingQuantity: quantity,
      price: takeProfitPrice,
      timeInForce,
      parentOrderId: ocoOrderId,
      orderGroupId,
      status: 'PENDING',
      metadata: {
        orderType: 'NORMAL',
        strategy: 'OCO_TAKE_PROFIT'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create stop loss order
    const stopLossOrder: Order = {
      orderId: `SL_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      symbol,
      side,
      type: 'STOP' as OrderType,
      quantity,
      filledQuantity: 0,
      remainingQuantity: quantity,
      stopPrice: stopLossPrice,
      timeInForce,
      parentOrderId: ocoOrderId,
      orderGroupId,
      status: 'PENDING',
      metadata: {
        orderType: 'NORMAL',
        strategy: 'OCO_STOP_LOSS'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create OCO wrapper
    const ocoOrder: OcoOrder = {
      orderId: ocoOrderId,
      userId,
      symbol,
      orders: {
        takeProfit: takeProfitOrder,
        stopLoss: stopLossOrder
      },
      status: 'ACTIVE',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to Firestore in a batch
    const batch = firestore.batch();
    
    // Save OCO order
    batch.set(
      firestore.collection('oco_orders').doc(ocoOrderId),
      ocoOrder
    );
    
    // Save individual orders
    batch.set(
      firestore.collection('orders').doc(takeProfitOrder.orderId),
      takeProfitOrder
    );
    
    batch.set(
      firestore.collection('orders').doc(stopLossOrder.orderId),
      stopLossOrder
    );

    // Update user balance (hold margin)
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

    // Broadcast to WebSocket
    const wsService = (global as any).websocketService;
    if (wsService) {
      wsService.broadcastToUser(userId, 'ORDER_UPDATE', {
        type: 'OCO_CREATED',
        data: ocoOrder
      });
    }

    return NextResponse.json({
      success: true,
      data: ocoOrder,
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Create OCO Order Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'ORDER_CREATION_FAILED', 
          message: 'Failed to create OCO order',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// GET /api/trading/orders/oco - Get OCO Orders
async function getOcoOrders(request: NextRequest, userId: string) {
  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');

    // Build query
    let query = firestore.collection('oco_orders').where('userId', '==', userId);

    if (symbol) {
      query = query.where('symbol', '==', symbol);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    // Order by creation date (newest first)
    query = query.orderBy('createdAt', 'desc');

    // Apply pagination
    const offset = (page - 1) * limit;
    const snap = await query.offset(offset).limit(limit).get();

    const ocoOrders: OcoOrder[] = [];
    snap.forEach(doc => {
      ocoOrders.push({ 
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
        orders: {
          takeProfit: {
            ...doc.data().orders.takeProfit,
            createdAt: doc.data().orders.takeProfit.createdAt.toDate(),
            updatedAt: doc.data().orders.takeProfit.updatedAt.toDate()
          },
          stopLoss: {
            ...doc.data().orders.stopLoss,
            createdAt: doc.data().orders.stopLoss.createdAt.toDate(),
            updatedAt: doc.data().orders.stopLoss.updatedAt.toDate()
          }
        }
      } as OcoOrder);
    });

    // Get total count for pagination
    const totalCountQuery = firestore.collection('oco_orders').where('userId', '==', userId);
    const totalSnap = await totalCountQuery.get();
    const total = totalSnap.size;

    return NextResponse.json({
      success: true,
      data: ocoOrders,
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
    console.error('Get OCO Orders Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_ORDERS_FAILED', 
          message: 'Failed to fetch OCO orders',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

export { handler as GET, handler as POST };