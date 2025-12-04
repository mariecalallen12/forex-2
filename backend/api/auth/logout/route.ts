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

    const token = authHeader.substring(7);
    
    // Verify token before logout
    const decodedToken = await verifyFirebaseToken(token);
    
    // Sign out from Firebase
    await firebaseAuth.signOut();

    // Revoke refresh token to ensure complete logout
    try {
      await firebaseAuth.revokeRefreshToken(decodedToken.uid);
    } catch (revokeError) {
      // Continue logout even if token revocation fails
      console.warn('Token revocation failed:', revokeError);
    }

    return NextResponse.json({
      success: true,
      message: 'Đăng xuất thành công',
    }, { status: 200 });

  } catch (error) {
    console.error('Logout error:', error);
    
    return NextResponse.json({
      success: true,
      message: 'Đăng xuất thành công',
    }, { status: 200 });
  }
}