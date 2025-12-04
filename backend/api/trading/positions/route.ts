import { NextRequest, NextResponse } from 'next/server';
import { firestore } from '@/lib/firebase';
import { verifyFirebaseToken } from '@/lib/middleware/auth';

// GET /api/trading/positions - Get user's positions
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
    const symbol = searchParams.get('symbol');

    let query = firestore.collection('positions')
      .where('userId', '==', decodedToken.uid)
      .where('status', '==', 'open');

    if (symbol) {
      query = query.where('symbol', '==', symbol);
    }

    const snapshot = await query.get();
    const positions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate P&L for each position
    const positionsWithPnL = positions.map(position => {
      const currentPrice = 50000; // This should come from market data API
      const entryPrice = position.entryPrice;
      const quantity = position.quantity;
      const side = position.side;
      
      let unrealizedPnL = 0;
      if (side === 'buy') {
        unrealizedPnL = (currentPrice - entryPrice) * quantity;
      } else {
        unrealizedPnL = (entryPrice - currentPrice) * quantity;
      }

      const unrealizedPnLPercent = (unrealizedPnL / (entryPrice * quantity)) * 100;

      return {
        ...position,
        currentPrice,
        unrealizedPnL: Math.round(unrealizedPnL * 100) / 100,
        unrealizedPnLPercent: Math.round(unrealizedPnLPercent * 100) / 100,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        positions: positionsWithPnL,
        summary: {
          totalPositions: positions.length,
          totalUnrealizedPnL: positionsWithPnL.reduce((sum, pos) => sum + pos.unrealizedPnL, 0),
        },
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Get positions error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể lấy danh sách vị thế',
    }, { status: 500 });
  }
}

// POST /api/trading/positions/:positionId/close - Close a position
export async function POST(request: NextRequest, { params }: { params: { positionId: string } }) {
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

    const { positionId } = params;

    // Get position data
    const positionDoc = await firestore.collection('positions').doc(positionId).get();
    if (!positionDoc.exists) {
      return NextResponse.json({
        success: false,
        error: 'Không tìm thấy vị thế',
      }, { status: 404 });
    }

    const position = positionDoc.data()!;

    // Verify ownership
    if (position.userId !== decodedToken.uid) {
      return NextResponse.json({
        success: false,
        error: 'Không có quyền đóng vị thế này',
      }, { status: 403 });
    }

    // Close position
    const closeTime = new Date().toISOString();
    const exitPrice = 50000; // This should come from market data API
    
    await firestore.collection('positions').doc(positionId).update({
      status: 'closed',
      exitPrice,
      closeTime,
      realizedPnL: position.unrealizedPnL || 0,
      updateTime: closeTime,
    });

    // Update user's statistics
    const userDoc = await firestore.collection('users').doc(decodedToken.uid).get();
    if (userDoc.exists) {
      const userData = userDoc.data()!;
      await firestore.collection('users').doc(decodedToken.uid).update({
        'statistics.profitLoss': userData.statistics.profitLoss + (position.unrealizedPnL || 0),
        'statistics.totalTrades': userData.statistics.totalTrades + 1,
        updatedAt: closeTime,
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Đóng vị thế thành công',
      data: {
        positionId,
        exitPrice,
        realizedPnL: position.unrealizedPnL || 0,
        closeTime,
      },
    }, { status: 200 });

  } catch (error) {
    console.error('Close position error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Không thể đóng vị thế',
    }, { status: 500 });
  }
}