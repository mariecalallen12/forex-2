import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { firebaseAuth } from '@/lib/firebase';
import { verifyFirebaseToken } from '@/lib/middleware/auth';
import { rateLimit } from '@/lib/middleware/rate-limit';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

export async function POST(request: NextRequest) {
  try {
    // Apply rate limiting
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    await rateLimit(clientIP, 'login');

    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Firebase authentication
    const userCredential = await firebaseAuth.signInWithEmailAndPassword(email, password);
    const idToken = await userCredential.user.getIdToken(true);
    
    // Get user details from Firebase
    const userDoc = await firebaseAuth.getUser(userCredential.user.uid);
    const userData = {
      uid: userCredential.user.uid,
      email: userDoc.email,
      emailVerified: userDoc.emailVerified,
      displayName: userDoc.displayName,
      photoURL: userDoc.photoURL,
      disabled: userDoc.disabled,
    };

    // Update last login
    await firebaseAuth.updateUser(userCredential.user.uid, {
      lastLoginAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Đăng nhập thành công',
      data: {
        user: userData,
        token: idToken,
        expiresIn: '1h',
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Dữ liệu đầu vào không hợp lệ',
        details: error.errors,
      }, { status: 400 });
    }

    // Firebase auth errors
    const firebaseError = error as any;
    let errorMessage = 'Đăng nhập thất bại';
    
    if (firebaseError.code === 'auth/user-not-found') {
      errorMessage = 'Tài khoản không tồn tại';
    } else if (firebaseError.code === 'auth/wrong-password') {
      errorMessage = 'Mật khẩu không đúng';
    } else if (firebaseError.code === 'auth/too-many-requests') {
      errorMessage = 'Quá nhiều lần đăng nhập thất bại. Vui lòng thử lại sau';
      await rateLimit(clientIP, 'login-failed');
    }

    return NextResponse.json({
      success: false,
      error: errorMessage,
    }, { status: 401 });
  }
}

// Verify token endpoint
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
    const userDoc = await firebaseAuth.getUser(decodedToken.uid);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          uid: decodedToken.uid,
          email: userDoc.email,
          emailVerified: userDoc.emailVerified,
          displayName: userDoc.displayName,
          photoURL: userDoc.photoURL,
          disabled: userDoc.disabled,
        },
      },
    });

  } catch (error) {
    console.error('Token verification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Token không hợp lệ',
    }, { status: 401 });
  }
}