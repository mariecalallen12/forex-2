import { NextRequest, NextResponse } from 'next/server';
import { firebaseAuth } from '@/lib/firebase';
import { verifyFirebaseToken } from '@/lib/middleware/auth';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy token xác thực',
      }, { status: 401 });
    }

    const currentToken = authHeader.substring(7);
    
    // Verify current token
    const decodedToken = await verifyFirebaseToken(currentToken);
    
    // Refresh the token
    const newToken = await firebaseAuth.createCustomToken(decodedToken.uid);
    
    return NextResponse.json({
      success: true,
      message: 'Token đã được làm mới',
      data: {
        token: newToken,
        expiresIn: '1h',
        timestamp: new Date().toISOString(),
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Token refresh error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể làm mới token. Vui lòng đăng nhập lại',
    }, { status: 401 });
  }
}