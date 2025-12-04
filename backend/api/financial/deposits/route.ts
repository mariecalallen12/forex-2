import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firestore } from '@/lib/firebase';
import { verifyFirebaseToken } from '@/lib/middleware/auth';

const createDepositSchema = z.object({
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  currency: z.enum(['usdt', 'btc', 'eth']),
  method: z.enum(['bank_transfer', 'crypto_deposit', 'card']),
  bankAccount: z.object({
    accountNumber: z.string(),
    accountName: z.string(),
    bankName: z.string(),
  }).optional(),
  walletAddress: z.string().optional(),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
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
    const depositData = createDepositSchema.parse(body);

    // Get user data
    const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy thông tin người dùng',
      }, { status: 404 });
    }

    const userData = userDoc.data()!;

    // Create deposit record
    const deposit = {
      id: `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: decodedToken.uid,
      userEmail: userData.email,
      amount: depositData.amount,
      currency: depositData.currency,
      method: depositData.method,
      status: 'pending',
      fees: 0,
      netAmount: depositData.amount,
      bankAccount: depositData.bankAccount || null,
      walletAddress: depositData.walletAddress || null,
      transactionId: depositData.transactionId || null,
      notes: depositData.notes || null,
      processedBy: null,
      processedAt: null,
      rejectReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save deposit to Firestore
    await firestore.collection('deposits').doc(deposit.id).set(deposit);

    // Create invoice for the deposit
    const invoice = {
      id: `invoice_${deposit.id}`,
      userId: decodedToken.uid,
      userEmail: userData.email,
      type: 'deposit',
      status: 'pending',
      amount: depositData.amount,
      currency: depositData.currency,
      description: `Nạp tiền ${depositData.currency.toUpperCase()} ${depositData.amount}`,
      depositId: deposit.id,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firestore.collection('invoices').doc(invoice.id).set(invoice);

    return NextResponse.json({
      success: true,
      message: 'Tạo yêu cầu nạp tiền thành công',
      data: {
        deposit: {
          id: deposit.id,
          amount: deposit.amount,
          currency: deposit.currency,
          method: deposit.method,
          status: deposit.status,
        },
        invoice: {
          id: invoice.id,
          dueDate: invoice.dueDate,
        },
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Create deposit error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu đầu vào không hợp lệ',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Không thể tạo yêu cầu nạp tiền',
    }, { status: 500 });
  }
}

// GET /api/financial/deposits - Get user's deposits
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
    const status = searchParams.get('status');
    const currency = searchParams.get('currency');

    let query = firestore.collection('deposits').where('userId', '==', decodedToken.uid);

    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }
    if (currency) {
      query = query.where('currency', '==', currency);
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
    console.error('Get deposits error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể lấy danh sách nạp tiền',
    }, { status: 500 });
  }
}