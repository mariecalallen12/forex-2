import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firestore } from '@/lib/firebase';
import { verifyFirebaseToken } from '@/lib/middleware/auth';

const placeOrderSchema = z.object({
  symbol: z.string().min(3, 'Mã giao dịch không hợp lệ'),
  side: z.enum(['buy', 'sell']),
  type: z.enum(['market', 'limit', 'stop-loss']),
  quantity: z.number().positive('Số lượng phải lớn hơn 0'),
  price: z.number().positive('Giá phải lớn hơn 0').optional(),
  stopPrice: z.number().positive('Giá dừng lỗ phải lớn hơn 0').optional(),
  leverage: z.number().min(1).max(100).default(1),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
  margin: z.number().positive().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy token xác thực',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyFirebaseToken(token);

    const body = await request.json();
    const orderData = placeOrderSchema.parse(body);

    // Get current user data
    const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy thông tin người dùng',
      }, { status: 404 });
    }

    const userData = userDoc.data()!;
    
    // Check if user is active and KYC verified
    if (!userData.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Tài khoản không hoạt động',
      }, { status: 403 });
    }

    if (userData.kycStatus !== 'verified') {
      return NextResponse.json({
        success: false,
        error: 'Vui lòng xác minh KYC trước khi giao dịch',
      }, { status: 403 });
    }

    // Validate order based on type
    if (orderData.type === 'limit' && !orderData.price) {
      return NextResponse.json({
        success: false,
        error: 'Giá khớp lệnh là bắt buộc cho lệnh giới hạn',
      }, { status: 400 });
    }

    if (orderData.type === 'stop-loss' && !orderData.stopPrice) {
      return NextResponse.json({
        success: false,
        error: 'Giá kích hoạt là bắt buộc cho lệnh stop-loss',
      }, { status: 400 });
    }

    // Check available balance
    const quoteCurrency = orderData.symbol.split('USDT')[0] || 'USDT';
    const requiredBalance = orderData.side === 'buy' ? 
      orderData.quantity * (orderData.price || 100) : orderData.quantity;

    if (userData.balance[quoteCurrency.toLowerCase()] < requiredBalance) {
      return NextResponse.json({
        success: false,
        error: `Số dư ${quoteCurrency} không đủ để thực hiện giao dịch`,
      }, { status: 400 });
    }

    // Create order
    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: decodedToken.uid,
      ...orderData,
      status: 'pending',
      executedQuantity: 0,
      executedPrice: 0,
      filledAmount: 0,
      fee: 0,
      filledTime: null,
      createTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
      isMaker: false,
    };

    // Save order to Firestore
    await firestore.collection('orders').doc(order.id).set(order);

    // Update user's trading statistics
    await firestore.collection('users').doc(decodedToken.uid).update({
      'statistics.totalTrades': userData.statistics.totalTrades + 1,
      'statistics.totalTradingVolume': userData.statistics.totalTradingVolume + (orderData.quantity * (orderData.price || 100)),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Đặt lệnh thành công',
      data: {
        order: {
          id: order.id,
          status: order.status,
          createTime: order.createTime,
        },
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Place order error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu đầu vào không hợp lệ',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Không thể đặt lệnh',
    }, { status: 500 });
  }
}

// GET /api/trading/orders - Get user's orders
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy token xác thực',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyFirebaseToken(token);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const symbol = searchParams.get('symbol');
    const status = searchParams.get('status');
    const side = searchParams.get('side');

    let query = firestore.collection('orders').where('userId', '==', decodedToken.uid);

    // Apply filters
    if (symbol) {
      query = query.where('symbol', '==', symbol);
    }
    if (status) {
      query = query.where('status', '==', status);
    }
    if (side) {
      query = query.where('side', '==', side);
    }

    // Apply pagination and sorting
    const offset = (page - 1) * limit;
    query = query.orderBy('createTime', 'desc')
                 .offset(offset)
                 .limit(limit);

    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        orders,
        pagination: {
          page,
          limit,
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Get orders error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể lấy danh sách lệnh',
    }, { status: 500 });
  }
}