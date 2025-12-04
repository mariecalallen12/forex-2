import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/lib/middleware/auth';
import { roleAuthMiddleware } from '@/lib/middleware/role-auth';
import { errorHandlingMiddleware } from '@/lib/middleware/error-handling';
import { firestore } from '@/lib/firebase';
import { Order, IcebergOrder, OrderType, OrderSide } from '@/../../shared/types';

// Apply middleware chain
const handler = errorHandlingMiddleware(
  roleAuthMiddleware(['user', 'admin', 'superadmin'])(
    authMiddleware(async (request: NextRequest, { user }) => {
      const { method } = request;

      try {
        switch (method) {
          case 'POST':
            return await createIcebergOrder(request, user.uid);
          case 'GET':
            return await getIcebergOrders(request, user.uid);
          case 'PATCH':
            return await updateIcebergOrder(request, user.uid);
          default:
            return NextResponse.json(
              { error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' } },
              { status: 405 }
            );
        }
      } catch (error) {
        console.error('Iceberg Orders API Error:', error);
        throw error;
      }
    })
  )
);

// POST /api/trading/orders/iceberg - Create Iceberg Order
async function createIcebergOrder(request: NextRequest, userId: string) {
  const body = await request.json();
  const {
    symbol,
    side, // 'BUY' or 'SELL'
    totalQuantity,
    visibleQuantity,
    price,
    timeInForce = 'GTC' as const,
    maxSlices // Optional: limit number of slices
  } = body;

  // Validate input
  if (!symbol || !side || !totalQuantity || !visibleQuantity) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Missing required parameters' } },
      { status: 400 }
    );
  }

  if (totalQuantity <= 0 || visibleQuantity <= 0 || visibleQuantity > totalQuantity) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Invalid quantity values' } },
      { status: 400 }
    );
  }

  // Validate slice size
  if (visibleQuantity < (totalQuantity * 0.01)) { // At least 1% per slice
    return NextResponse.json(
      { error: { code: 'ICEBERG_SLICE_TOO_SMALL', message: 'Visible quantity too small for total quantity' } },
      { status: 400 }
    );
  }

  if (visibleQuantity > (totalQuantity * 0.5)) { // Max 50% visible per slice
    return NextResponse.json(
      { error: { code: 'ICEBERG_SLICE_TOO_LARGE', message: 'Visible quantity too large for total quantity' } },
      { status: 400 }
    );
  }

  // For limit orders, validate price
  const orderType = price ? 'LIMIT' : 'MARKET';
  if (orderType === 'LIMIT' && (!price || price <= 0)) {
    return NextResponse.json(
      { error: { code: 'INVALID_PRICE', message: 'Valid price required for limit orders' } },
      { status: 400 }
    );
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

    // Calculate required funds
    const orderValue = orderType === 'MARKET' 
      ? totalQuantity * 1000 // Assume market price for calculation
      : totalQuantity * price;
    
    const requiredMargin = orderValue * 0.1; // 10% margin requirement
    const availableBalance = userData.balance?.available || 0;
    
    if (availableBalance < requiredMargin) {
      return NextResponse.json(
        { error: { code: 'INSUFFICIENT_BALANCE', message: 'Insufficient balance for iceberg order' } },
        { status: 400 }
      );
    }

    // Create iceberg order
    const icebergOrderId = `ICEBERG_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const parentOrderId = `PARENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const icebergOrder: IcebergOrder = {
      orderId: icebergOrderId,
      userId,
      symbol,
      side,
      totalQuantity,
      visibleQuantity,
      remainingQuantity: totalQuantity,
      filledQuantity: 0,
      executedSlices: 0,
      maxSlices: maxSlices || Math.ceil(totalQuantity / visibleQuantity),
      status: 'PENDING',
      timeInForce,
      price,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Create parent order
    const parentOrder: Order = {
      orderId: parentOrderId,
      userId,
      symbol,
      side,
      type: orderType as OrderType,
      quantity: totalQuantity,
      filledQuantity: 0,
      remainingQuantity: totalQuantity,
      price,
      timeInForce,
      parentOrderId: icebergOrderId,
      status: 'PENDING',
      metadata: {
        orderType: 'ICEBERG',
        icebergData: icebergOrder
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save to Firestore
    const batch = firestore.batch();
    
    // Save iceberg order
    batch.set(
      firestore.collection('iceberg_orders').doc(icebergOrderId),
      icebergOrder
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

    // Execute first slice
    await executeIcebergSlice(icebergOrderId, visibleQuantity);

    // Broadcast to WebSocket
    const wsService = (global as any).websocketService;
    if (wsService) {
      wsService.broadcastToUser(userId, 'ORDER_UPDATE', {
        type: 'ICEBERG_CREATED',
        data: icebergOrder
      });
    }

    return NextResponse.json({
      success: true,
      data: icebergOrder,
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Create Iceberg Order Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'ORDER_CREATION_FAILED', 
          message: 'Failed to create iceberg order',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// GET /api/trading/orders/iceberg - Get Iceberg Orders
async function getIcebergOrders(request: NextRequest, userId: string) {
  try {
    const url = new URL(request.url);
    const symbol = url.searchParams.get('symbol');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const page = parseInt(url.searchParams.get('page') || '1');

    // Build query
    let query = firestore.collection('iceberg_orders').where('userId', '==', userId);

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

    const icebergOrders: IcebergOrder[] = [];
    snap.forEach(doc => {
      icebergOrders.push({
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate()
      } as IcebergOrder);
    });

    // Get total count
    const totalCountQuery = firestore.collection('iceberg_orders').where('userId', '==', userId);
    const totalSnap = await totalCountQuery.get();
    const total = totalSnap.size;

    return NextResponse.json({
      success: true,
      data: icebergOrders,
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
    console.error('Get Iceberg Orders Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'FETCH_ORDERS_FAILED', 
          message: 'Failed to fetch iceberg orders',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// PATCH /api/trading/orders/iceberg - Update Iceberg Order
async function updateIcebergOrder(request: NextRequest, userId: string) {
  const body = await request.json();
  const {
    orderId,
    visibleQuantity,
    maxSlices
  } = body;

  if (!orderId) {
    return NextResponse.json(
      { error: { code: 'INVALID_PARAMETERS', message: 'Order ID is required' } },
      { status: 400 }
    );
  }

  try {
    const orderDoc = await firestore.collection('iceberg_orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: { code: 'ORDER_NOT_FOUND', message: 'Iceberg order not found' } },
        { status: 404 }
      );
    }

    const orderData = orderDoc.data() as IcebergOrder;

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

    const updateData: Partial<IcebergOrder> = {
      updatedAt: new Date()
    };

    if (visibleQuantity && visibleQuantity > 0 && visibleQuantity <= orderData.remainingQuantity) {
      updateData.visibleQuantity = visibleQuantity;
    }

    if (maxSlices && maxSlices > orderData.executedSlices) {
      updateData.maxSlices = maxSlices;
    }

    await firestore.collection('iceberg_orders').doc(orderId).update(updateData);

    return NextResponse.json({
      success: true,
      data: { orderId, ...updateData },
      metadata: {
        timestamp: new Date(),
        requestId: request.headers.get('x-request-id') || ''
      }
    });
  } catch (error) {
    console.error('Update Iceberg Order Error:', error);
    return NextResponse.json(
      { 
        error: { 
          code: 'ORDER_UPDATE_FAILED', 
          message: 'Failed to update iceberg order',
          details: error.message 
        } 
      },
      { status: 500 }
    );
  }
}

// Helper function to execute iceberg slices
async function executeIcebergSlice(icebergOrderId: string, quantity: number) {
  try {
    const orderDoc = await firestore.collection('iceberg_orders').doc(icebergOrderId).get();
    const orderData = orderDoc.data() as IcebergOrder;

    if (!orderData || orderData.remainingQuantity <= 0) {
      return;
    }

    const sliceQuantity = Math.min(quantity, orderData.remainingQuantity);
    const parentOrderId = await getParentOrderId(icebergOrderId);

    if (!parentOrderId) {
      return;
    }

    // Create slice order
    const sliceOrderId = `SLICE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sliceOrder: Order = {
      orderId: sliceOrderId,
      userId: orderData.userId,
      symbol: orderData.symbol,
      side: orderData.side,
      type: 'MARKET', // Iceberg orders typically use market execution
      quantity: sliceQuantity,
      filledQuantity: 0,
      remainingQuantity: sliceQuantity,
      timeInForce: orderData.timeInForce,
      parentOrderId: icebergOrderId,
      status: 'PENDING',
      metadata: {
        orderType: 'NORMAL',
        strategy: 'ICEBERG_SLICE'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Save slice order
    await firestore.collection('orders').doc(sliceOrderId).set(sliceOrder);

    // Execute market order (in real implementation, this would integrate with exchange API)
    await executeMarketOrder(sliceOrder);

  } catch (error) {
    console.error('Execute Iceberg Slice Error:', error);
  }
}

// Helper function to get parent order ID
async function getParentOrderId(icebergOrderId: string): Promise<string | null> {
  try {
    const query = await firestore.collection('orders')
      .where('parentOrderId', '==', icebergOrderId)
      .limit(1)
      .get();

    if (!query.empty) {
      return query.docs[0].id;
    }
    return null;
  } catch (error) {
    console.error('Get Parent Order ID Error:', error);
    return null;
  }
}

// Helper function to execute market order (simplified)
async function executeMarketOrder(order: Order) {
  try {
    // This would integrate with actual exchange API
    // For now, simulate execution
    
    const updatedOrder: Order = {
      ...order,
      filledQuantity: order.quantity,
      remainingQuantity: 0,
      status: 'FILLED',
      updatedAt: new Date()
    };

    await firestore.collection('orders').doc(order.orderId).update(updatedOrder);

    // Update iceberg order
    const icebergDoc = await firestore.collection('iceberg_orders').doc(order.parentOrderId!).get();
    const icebergData = icebergDoc.data() as IcebergOrder;

    if (icebergData) {
      const newFilledQuantity = icebergData.filledQuantity + order.quantity;
      const newRemainingQuantity = icebergData.remainingQuantity - order.quantity;
      const newExecutedSlices = icebergData.executedSlices + 1;

      let newStatus = icebergData.status;
      if (newRemainingQuantity <= 0) {
        newStatus = 'FILLED';
      } else if (newExecutedSlices >= (icebergData.maxSlices || Infinity)) {
        newStatus = 'PARTIALLY_FILLED';
      }

      await firestore.collection('iceberg_orders').doc(order.parentOrderId!).update({
        filledQuantity: newFilledQuantity,
        remainingQuantity: newRemainingQuantity,
        executedSlices: newExecutedSlices,
        status: newStatus,
        updatedAt: new Date()
      });

      // If there are more slices to execute, schedule next slice
      if (newRemainingQuantity > 0 && newExecutedSlices < (icebergData.maxSlices || Infinity)) {
        setTimeout(() => {
          executeIcebergSlice(order.parentOrderId!, icebergData.visibleQuantity);
        }, 1000); // 1 second delay between slices
      }
    }

  } catch (error) {
    console.error('Execute Market Order Error:', error);
  }
}

export { handler as GET, handler as POST, handler as PATCH };