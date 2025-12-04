import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firebaseAuth, firestore } from '@/lib/firebase';
import { rateLimit } from '@/lib/middleware/rate-limit';
import { sendEmail } from '@/lib/email/sendgrid';

const registerSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  displayName: z.string().min(2, 'Tên hiển thị phải có ít nhất 2 ký tự'),
  phoneNumber: z.string().optional(),
  agreeToTerms: z.boolean().refine(val => val === true, 'Phải đồng ý với điều khoản sử dụng'),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    await rateLimit(clientIP, 'register');

    const body = await request.json();
    const { email, password, displayName, phoneNumber, agreeToTerms } = registerSchema.parse(body);

    // Create Firebase user
    const userCredential = await firebaseAuth.createUserWithEmailAndPassword(email, password);
    
    // Update user profile
    await firebaseAuth.updateUser(userCredential.user.uid, {
      displayName,
      emailVerified: false,
      lastLoginAt: new Date().toISOString(),
    });

    // Create user document in Firestore
    const userData = {
      uid: userCredential.user.uid,
      email,
      displayName,
      phoneNumber: phoneNumber || null,
      avatar: null,
      role: 'user', // default role
      status: 'active',
      isActive: true,
      isEmailVerified: false,
      isPhoneVerified: false,
      kycStatus: 'pending',
      balance: {
        usdt: 0,
        btc: 0,
        eth: 0,
      },
      tradingSettings: {
        preferredLanguage: 'vi',
        theme: 'dark',
        notifications: {
          email: true,
          push: true,
          sms: false,
        },
      },
      statistics: {
        totalDeposit: 0,
        totalWithdraw: 0,
        totalTradingVolume: 0,
        totalTrades: 0,
        winRate: 0,
        profitLoss: 0,
      },
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await firestore.collection('users').doc(userCredential.user.uid).set(userData);

    // Send verification email
    const verificationLink = await userCredential.user.getIdTokenResult()
      .then(token => `https://digital-utopia.app/verify-email?token=${token.token}`);

    await sendEmail({
      to: email,
      template: 'welcome',
      subject: 'Chào mừng đến với Digital Utopia',
      data: {
        displayName,
        verificationLink,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản',
      data: {
        user: {
          uid: userCredential.user.uid,
          email,
          displayName,
        },
      },
    }, { status: 201 });

  } catch (error) {
    console.error('Register error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu đầu vào không hợp lệ',
        details: error.errors,
      }, { status: 400 });
    }

    // Firebase auth errors
    const firebaseError = error as any;
    let errorMessage = 'Đăng ký thất bại';
    
    if (firebaseError.code === 'auth/email-already-in-use') {
      errorMessage = 'Email đã được sử dụng';
    } else if (firebaseError.code === 'auth/invalid-email') {
      errorMessage = 'Email không hợp lệ';
    } else if (firebaseError.code === 'auth/weak-password') {
      errorMessage = 'Mật khẩu quá yếu';
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 400 });
  }
}