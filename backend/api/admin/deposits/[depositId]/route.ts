import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firestore } from '@/lib/firebase';
import { verifyFirebaseToken } from '@/lib/middleware/auth';
import { requireRole } from '@/lib/middleware/role-auth';

const approveDepositSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
  processedBy: z.string().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: { depositId: string } }) {
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

    const { depositId } = params;
    const body = await request.json();
    const approvalData = approveDepositSchema.parse(body);

    // Get deposit data
    const depositDoc = await firestore.collection('deposits').doc(depositId).get();
    if (!depositDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy yêu cầu nạp tiền',
      }, { status: 404 });
    }

    const deposit = depositDoc.data()!;

    // Check if deposit is already processed
    if (deposit.status !== 'pending') {
      return NextResponse.json({
        success: false,
        error: `Yêu cầu nạp tiền đã được xử lý với trạng thái ${deposit.status}`,
      }, { status: 400 });
    }

    const processedAt = new Date().toISOString();
    const updateData: any = {
      status: approvalData.status,
      processedAt,
      processedBy: approvalData.processedBy || authHeader.substring(7),
      notes: approvalData.notes || null,
      rejectionReason: approvalData.rejectionReason || null,
      updatedAt: processedAt,
    };

    // Update deposit status
    await firestore.collection('deposits').doc(depositId).update(updateData);

    // If approved, add funds to user's balance
    if (approvalData.status === 'approved') {
      const userDoc = await firestore.collection('users').doc(deposit.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data()!;
        const currentBalance = userData.balance[deposit.currency] || 0;
        const newBalance = currentBalance + deposit.amount;

        await firestore.collection('users').doc(deposit.userId).update({
          [`balance.${deposit.currency}`]: newBalance,
          'statistics.totalDeposit': userData.statistics.totalDeposit + deposit.amount,
          updatedAt: processedAt,
        });

        // Update invoice status
        const invoiceId = `invoice_${depositId}`;
        await firestore.collection('invoices').doc(invoiceId).update({
          status: 'paid',
          processedAt,
          updatedAt: processedAt,
        });
      }
    } else {
      // Update invoice status if rejected
      const invoiceId = `invoice_${depositId}`;
      await firestore.collection('invoices').doc(invoiceId).update({
        status: 'rejected',
        rejectionReason: approvalData.rejectionReason,
        processedAt,
        updatedAt: processedAt,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Đã ${approvalData.status === 'approved' ? 'phê duyệt' : 'từ chối'} yêu cầu nạp tiền`,
      data: {
        depositId,
        status: approvalData.status,
        processedAt,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Process deposit error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu đầu vào không hợp lệ',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Không thể xử lý yêu cầu nạp tiền',
    }, { status: 500 });
  }
}

// GET /api/admin/deposits - Get all deposits for admin review
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const currency = searchParams.get('currency');
    const userId = searchParams.get('userId');

    let query = firestore.collection('deposits');

    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    if (currency) {
      query = query.where('currency', '==', currency);
    }
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    // Apply pagination and sorting
    const offset = (page - 1) * limit;
    query = query.orderBy('createdAt', 'desc')
                 .offset(offset)
                 .limit(limit);

    const snapshot = await query.get();
    const deposits = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        deposits,
        pagination: {
          page,
          limit,
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Get admin deposits error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể lấy danh sách yêu cầu nạp tiền',
    }, { status: 500 });
  }
}