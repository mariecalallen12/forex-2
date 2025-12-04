import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firestore } from '@/lib/firebase';
import { verifyFirebaseToken } from '@/lib/middleware/auth';

const createWithdrawalSchema = z.object({
  amount: z.number().positive('Số tiền phải lớn hơn 0'),
  currency: z.enum(['usdt', 'btc', 'eth']),
  method: z.enum(['bank_transfer', 'crypto_withdraw', 'card']),
  bankAccount: z.object({
    accountNumber: z.string(),
    accountName: z.string(),
    bankName: z.string(),
  }).optional(),
  walletAddress: z.string().optional(),
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
    const withdrawalData = createWithdrawalSchema.parse(body);

    // Get user data
    const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();
    if (!userDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy thông tin người dùng',
      }, { status: 404 });
    }

    const userData = userDoc.data()!;

    // Check KYC status
    if (userData.kycStatus !== 'verified') {
      return NextResponse.json({
        success: false,
        error: 'Vui lòng xác minh KYC trước khi rút tiền',
      }, { status: 403 });
    }

    // Check if user is active
    if (!userData.isActive) {
      return NextResponse.json({
        success: false,
        error: 'Tài khoản không hoạt động',
      }, { status: 403 });
    }

    // Check available balance
    const currency = withdrawalData.currency;
    const availableBalance = userData.balance[currency] || 0;
    
    // Calculate fees (2% for withdrawals)
    const feeRate = 0.02;
    const fee = withdrawalData.amount * feeRate;
    const requiredAmount = withdrawalData.amount + fee;

    if (availableBalance < requiredAmount) {
      return NextResponse.json({
        success: false,
        error: `Số dư ${currency.toUpperCase()} không đủ để rút tiền (cần ${requiredAmount} bao gồm phí)`,
      }, { status: 400 });
    }

    // Check withdrawal limits
    const withdrawalLimits = {
      daily: 10000,
      monthly: 100000,
    };

    // Get user's withdrawals for current period
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const monthlyWithdrawals = await firestore.collection('withdrawals')
      .where('userId', '==', decodedToken.uid)
      .where('currency', '==', currency)
      .where('status', '==', 'completed')
      .where('createdAt', '>=', startOfMonth.toISOString())
      .get();

    const dailyWithdrawals = await firestore.collection('withdrawals')
      .where('userId', '==', decodedToken.uid)
      .where('currency', '==', currency)
      .where('status', '==', 'completed')
      .where('createdAt', '>=', startOfDay.toISOString())
      .get();

    const monthlyTotal = monthlyWithdrawals.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);
    const dailyTotal = dailyWithdrawals.docs.reduce((sum, doc) => sum + (doc.data().amount || 0), 0);

    if (monthlyTotal + withdrawalData.amount > withdrawalLimits.monthly) {
      return NextResponse.json({
        success: false,
        error: 'Vượt quá hạn mức rút tiền hàng tháng',
      }, { status: 400 });
    }

    if (dailyTotal + withdrawalData.amount > withdrawalLimits.daily) {
      return NextResponse.json({
        success: false,
        error: 'Vượt quá hạn mức rút tiền hàng ngày',
      }, { status: 400 });
    }

    // Create withdrawal record
    const withdrawal = {
      id: `withdraw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: decodedToken.uid,
      userEmail: userData.email,
      amount: withdrawalData.amount,
      currency: withdrawalData.currency,
      method: withdrawalData.method,
      fee: fee,
      netAmount: withdrawalData.amount,
      status: 'pending',
      bankAccount: withdrawalData.bankAccount || null,
      walletAddress: withdrawalData.walletAddress || null,
      notes: withdrawalData.notes || null,
      processedBy: null,
      processedAt: null,
      rejectReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save withdrawal to Firestore
    await firestore.collection('withdrawals').doc(withdrawal.id).set(withdrawal);

    // Create invoice for the withdrawal
    const invoice = {
      id: `invoice_${withdrawal.id}`,
      userId: decodedToken.uid,
      userEmail: userData.email,
      type: 'withdrawal',
      status: 'pending',
      amount: withdrawalData.amount,
      currency: withdrawalData.currency,
      description: `Rút tiền ${withdrawalData.currency.toUpperCase()} ${withdrawalData.amount}`,
      withdrawalId: withdrawal.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firestore.collection('invoices').doc(invoice.id).set(invoice);

    return NextResponse.json({
      success: true,
      message: 'Tạo yêu cầu rút tiền thành công',
      data: {
        withdrawal: {
          id: withdrawal.id,
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          fee: withdrawal.fee,
          netAmount: withdrawal.netAmount,
          status: withdrawal.status,
        },
        invoice: {
          id: invoice.id,
        },
        limits: {
          remainingDaily: withdrawalLimits.daily - (dailyTotal + withdrawalData.amount),
          remainingMonthly: withdrawalLimits.monthly - (monthlyTotal + withdrawalData.amount),
        },
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Create withdrawal error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu đầu vào không hợp lệ',
        details: error.errors,
      }, { status: 400 });
    }

    return NextResponse.json({
      success: false,
      error: 'Không thể tạo yêu cầu rút tiền',
    }, { status: 500 });
  }
}

// GET /api/financial/withdrawals - Get user's withdrawals
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

    let query = firestore.collection('withdrawals').where('userId', '==', decodedToken.uid);

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
    const withdrawals = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      success: true,
      data: {
        withdrawals,
        pagination: {
          page,
          limit,
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Get withdrawals error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể lấy danh sách rút tiền',
    }, { status: 500 });
  }
}