import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { verifyFirebaseToken } from '@/lib/middleware/auth';

export async function DELETE(request: NextRequest, { params }: { params: { orderId: string } }) {
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

    const { orderId } = params;

    // Get order data
    const orderDoc = await firestore.collection('orders').doc(orderId).get();
    if (!orderDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy lệnh',
      }, { status: 404 });
    }

    const order = orderDoc.data()!;

    // Verify ownership
    if (order.userId !== decodedToken.uid) {
      return NextResponse.json({
        success: false,
        error: 'Không có quyền hủy lệnh này',
      }, { status: 403 });
    }

    // Check if order can be cancelled
    if (!['pending', 'partially_filled'].includes(order.status)) {
      return NextResponse.json({
        success: false,
        error: `Không thể hủy lệnh có trạng thái ${order.status}`,
      }, { status: 400 });
    }

    // Update order status
    await firestore.collection('orders').doc(orderId).update({
      status: 'cancelled',
      cancelledTime: new Date().toISOString(),
      updateTime: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Hủy lệnh thành công',
      data: {
        orderId,
        cancelledTime: new Date().toISOString(),
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Cancel order error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể hủy lệnh',
    }, { status: 500 });
  }
}