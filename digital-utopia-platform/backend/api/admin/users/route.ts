import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firestore, firebaseAuth } from '@/lib/firebase';
import { verifyFirebaseToken } from '@/lib/middleware/auth';
import { requireRole } from '@/lib/middleware/role-auth';
import { sendEmail } from '@/lib/email/sendgrid';

const getUsersSchema = z.object({
  page: z.string().default('1').transform(Number),
  limit: z.string().default('20').transform(Number),
  search: z.string().optional(),
  role: z.enum(['user', 'admin', 'superadmin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'deleted']).optional(),
  kycStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
  sortBy: z.string().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const updateUserSchema = z.object({
  role: z.enum(['user', 'admin', 'superadmin']).optional(),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  kycStatus: z.enum(['pending', 'verified', 'rejected']).optional(),
  isActive: z.boolean().optional(),
  balance: z.object({
    usdt: z.number().nonnegative().optional(),
    btc: z.number().nonnegative().optional(),
    eth: z.number().nonnegative().optional(),
  }).optional(),
});

// GET /api/admin/users - Get all users (admin only)
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
    await requireRole(['admin', 'superadmin'])(request);

    const { searchParams } = new URL(request.url);
    const filters = getUsersSchema.parse({
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
      search: searchParams.get('search') || undefined,
      role: searchParams.get('role') || undefined,
      status: searchParams.get('status') || undefined,
      kycStatus: searchParams.get('kycStatus') || undefined,
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    let query = firestore.collection('users') as any;

    // Apply filters
    if (filters.search) {
      query = query.where('email', '>=', filters.search)
                  .where('email', '<=', filters.search + '\uf8ff');
    }
    if (filters.role) {
      query = query.where('role', '==', filters.role);
    }
    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }
    if (filters.kycStatus) {
      query = query.where('kycStatus', '==', filters.kycStatus);
    }

    // Apply pagination and sorting
    const offset = (filters.page - 1) * filters.limit;
    query = query.orderBy(filters.sortBy, filters.sortOrder)
                 .offset(offset)
                 .limit(filters.limit);

    const snapshot = await query.get();
    const users = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Get total count
    const countSnapshot = await firestore.collection('users').count().get();
    const totalUsers = countSnapshot.data().count;

    return NextResponse.json({
      success: true,
      data: {
        users,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: totalUsers,
          totalPages: Math.ceil(totalUsers / filters.limit),
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Get users error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Tham số không hợp lệ',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Không thể lấy danh sách người dùng',
    }, { status: 500 });
  }
}

// PUT /api/admin/users/:userId - Update user (admin only)
export async function PUT(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy token xác thực',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    await requireRole(['admin', 'superadmin'])(request);

    const body = await request.json();
    const updates = updateUserSchema.parse(body);

    const { userId } = params;
    
    // Check if user exists
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy người dùng',
      }, { status: 404 });
    }

    const userData = userDoc.data();

    // Add timestamp
    updates.updatedAt = new Date().toISOString();

    // Update user data in Firestore
    await firestore.collection('users').doc(userId).update(updates);

    // If KYC status changed, send notification email
    if (updates.kycStatus && updates.kycStatus !== userData.kycStatus) {
      const emailTemplates = {
        pending: 'kyc_pending',
        verified: 'kyc_approved',
        rejected: 'kyc_rejected',
      };

      await sendEmail({
        to: userData.email,
        template: emailTemplates[updates.kycStatus],
        subject: updates.kycStatus === 'verified' ? 'Xác minh KYC thành công' : 'Cập nhật trạng thái KYC',
        data: {
          displayName: userData.displayName,
          kycStatus: updates.kycStatus,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Cập nhật thông tin người dùng thành công',
      data: {
        updatedFields: Object.keys(updates).filter(key => key !== 'updatedAt'),
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Update user error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu đầu vào không hợp lệ',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Không thể cập nhật thông tin người dùng',
    }, { status: 500 });
  }
}

// DELETE /api/admin/users/:userId - Delete user (admin only)
export async function DELETE(request: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy token xác thực',
      }, { status: 401 });
    }

    const token = authHeader.substring(7);
    await requireRole(['admin', 'superadmin'])(request);

    const { userId } = params;
    
    // Check if user exists
    const userDoc = await firestore.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy người dùng',
      }, { status: 404 });
    }

    const userData = userDoc.data();

    // Check for active trades or pending transactions
    const activeTrades = await firestore.collection('trades')
      .where('userId', '==', userId)
      .where('status', 'in', ['pending', 'filled'])
      .limit(1)
      .get();

    if (!activeTrades.empty) {
      return NextResponse.json({
        success: false,
        error: 'Không thể xóa người dùng khi còn giao dịch chưa hoàn tất',
      }, { status: 400 });
    }

    // Soft delete - update status instead of actual deletion
    await firestore.collection('users').doc(userId).update({
      status: 'deleted',
      isActive: false,
      deletedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Disable Firebase Auth user
    try {
      await firebaseAuth.updateUser(userId, {
        disabled: true,
      });
    } catch (authError) {
      console.warn('Failed to disable Firebase user:', authError);
    }

    return NextResponse.json({
      success: true,
      message: 'Đã xóa người dùng thành công',
    }, { status: 200 });

  } catch (error) {
    console.error('Delete user error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể xóa người dùng',
    }, { status: 500 });
  }
}