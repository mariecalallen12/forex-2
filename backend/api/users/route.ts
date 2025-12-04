import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firestore } from '@/lib/firebase';
import { verifyFirebaseToken } from '@/lib/middleware/auth';
import { requireRole } from '@/lib/middleware/role-auth';

const updateProfileSchema = z.object({
  displayName: z.string().min(2).optional(),
  phoneNumber: z.string().optional(),
  avatar: z.string().url().optional(),
});

// GET /api/users - Get user profile
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

    // Get user data from Firestore
    const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy thông tin người dùng',
      }, { status: 404 });
    }

    const userData = userDoc.data();

    return NextResponse.json({
      success: true,
      data: {
        user: {
          ...userData,
          id: userDoc.id,
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Get user profile error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể lấy thông tin người dùng',
    }, { status: 500 });
  }
}

// PUT /api/users - Update user profile
export async function PUT(request: NextRequest) {
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
    const updates = updateProfileSchema.parse(body);

    // Add timestamp
    updates.updatedAt = new Date().toISOString();

    // Update user data in Firestore
    await firestore.collection('users').doc(decodedToken.uid).update(updates);

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin thành công',
      data: {
        updatedFields: Object.keys(updates).filter(key => key !== 'updatedAt'),
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Update user profile error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu đầu vào không hợp lệ',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Không thể cập nhật thông tin',
    }, { status: 500 });
  }
}

// DELETE /api/users - Delete user account
export async function DELETE(request: NextRequest) {
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

    // Check if user has any active trades or pending transactions
    const activeTrades = await firestore.collection('trades')
      .where('userId', '==', decodedToken.uid)
      .where('status', 'in', ['pending', 'filled'])
      .limit(1)
      .get();

    if (!activeTrades.empty) {
      return NextResponse.json({
        success: false,
        error: 'Không thể xóa tài khoản khi còn giao dịch chưa hoàn tất',
      }, { status: 400 });
    }

    // Update user status to deleted instead of actually deleting
    await firestore.collection('users').doc(decodedToken.uid).update({
      status: 'deleted',
      isActive: false,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Tài khoản đã được xóa thành công',
    }, { status: 200 });

  } catch (error) {
    console.error('Delete user account error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể xóa tài khoản',
    }, { status: 500 });
  }
}