// Risk Management API - Risk Limits Management
// Phase 5: Risk Management & Compliance
// Author: MiniMax Agent
// Date: 2025-12-05

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { RiskLimit, PositionLimit, DailyLimit, ApiResponse } from '@/shared/types';

const riskLimits = new Map<string, RiskLimit>();

// Initialize Firebase Admin (similar to other endpoints)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();
const auth = getAuth();

// Middleware to verify authentication
async function verifyAuth(request: NextRequest): Promise<string | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, error: { code: 'UNAUTHORIZED', message: 'No authorization token provided' } },
      { status: 401 }
    );
  }

  try {
    const token = authHeader.substring(7);
    const decodedToken = await auth.verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INVALID_TOKEN', message: 'Invalid authorization token' } },
      { status: 401 }
    );
  }
}

// GET /api/risk-management/limits - Get user's risk limits
export async function GET(request: NextRequest) {
  try {
    const userIdOrResponse = await verifyAuth(request);
    if (userIdOrResponse instanceof NextResponse) return userIdOrResponse;
    const userId = userIdOrResponse;

    const { searchParams } = new URL(request.url);
    const limitType = searchParams.get('limitType') as RiskLimit['limitType'] | null;
    const symbol = searchParams.get('symbol');

    let query = db.collection('risk_limits').where('userId', '==', userId);

    if (limitType) {
      query = query.where('limitType', '==', limitType);
    }

    if (symbol) {
      query = query.where('symbol', '==', symbol);
    }

    const snapshot = await query.get();
    const limits: RiskLimit[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      limits.push({
        id: doc.id,
        userId: data.userId,
        symbol: data.symbol,
        limitType: data.limitType,
        limitValue: data.limitValue,
        currentValue: data.currentValue || 0,
        status: data.status || 'active',
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
        autoClose: data.autoClose || false,
      });
    });

    const response: ApiResponse<RiskLimit[]> = {
      success: true,
      data: limits,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching risk limits:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'FETCH_ERROR',
        message: 'Failed to fetch risk limits',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/risk-management/limits - Create new risk limit
export async function POST(request: NextRequest) {
  try {
    const userIdOrResponse = await verifyAuth(request);
    if (userIdOrResponse instanceof NextResponse) return userIdOrResponse;
    const userId = userIdOrResponse;

    const body = await request.json();
    const { symbol, limitType, limitValue, autoClose = false } = body;

    // Validation
    if (!symbol || !limitType || typeof limitValue !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: symbol, limitType, limitValue',
          },
        },
        { status: 400 }
      );
    }

    if (limitValue <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LIMIT_VALUE',
            message: 'Limit value must be greater than 0',
          },
        },
        { status: 400 }
      );
    }

    const validLimitTypes: RiskLimit['limitType'][] = [
      'position_size', 'exposure', 'leverage', 'daily_loss', 'daily_volume'
    ];
    
    if (!validLimitTypes.includes(limitType)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_LIMIT_TYPE',
            message: `Invalid limit type. Must be one of: ${validLimitTypes.join(', ')}`,
          },
        },
        { status: 400 }
      );
    }

    // Check for existing limit of the same type and symbol
    const existingQuery = await db.collection('risk_limits')
      .where('userId', '==', userId)
      .where('symbol', '==', symbol)
      .where('limitType', '==', limitType)
      .where('status', '==', 'active')
      .get();

    if (!existingQuery.empty) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'LIMIT_EXISTS',
            message: 'An active limit already exists for this symbol and limit type',
          },
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const riskLimit: Omit<RiskLimit, 'id'> = {
      userId,
      symbol,
      limitType,
      limitValue,
      currentValue: 0, // Initialize to 0
      status: 'active',
      createdAt: now,
      updatedAt: now,
      autoClose,
    };

    const docRef = await db.collection('risk_limits').add(riskLimit);
    const createdLimit: RiskLimit = {
      id: docRef.id,
      ...riskLimit,
    };

    // Log the risk limit creation
    await db.collection('risk_events').add({
      type: 'limit_created',
      userId,
      symbol,
      limitType,
      limitValue,
      timestamp: new Date(),
      details: {
        riskLimitId: docRef.id,
        autoClose,
      },
    });

    const response: ApiResponse<RiskLimit> = {
      success: true,
      data: createdLimit,
      timestamp: now,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Error creating risk limit:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CREATE_ERROR',
        message: 'Failed to create risk limit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// PATCH /api/risk-management/limits - Update risk limit
export async function PATCH(request: NextRequest) {
  try {
    const userIdOrResponse = await verifyAuth(request);
    if (userIdOrResponse instanceof NextResponse) return userIdOrResponse;
    const userId = userIdOrResponse;

    const body = await request.json();
    const { id, limitValue, status, autoClose } = body;

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ID',
            message: 'Risk limit ID is required',
          },
        },
        { status: 400 }
      );
    }

    // Get the existing limit
    const docRef = db.collection('risk_limits').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Risk limit not found',
          },
        },
        { status: 404 }
      );
    }

    const data = doc.data()!;
    if (data.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only modify your own risk limits',
          },
        },
        { status: 403 }
      );
    }

    const updates: Partial<RiskLimit> = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof limitValue === 'number') {
      if (limitValue <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INVALID_LIMIT_VALUE',
              message: 'Limit value must be greater than 0',
            },
          },
          { status: 400 }
        );
      }
      updates.limitValue = limitValue;
    }

    if (status && ['active', 'breached', 'disabled'].includes(status)) {
      updates.status = status;
    }

    if (typeof autoClose === 'boolean') {
      updates.autoClose = autoClose;
    }

    await docRef.update(updates);

    // Log the risk limit update
    await db.collection('risk_events').add({
      type: 'limit_updated',
      userId,
      riskLimitId: id,
      updates,
      timestamp: new Date(),
    });

    const updatedLimit = { id, ...data, ...updates };

    const response: ApiResponse<RiskLimit> = {
      success: true,
      data: updatedLimit,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error updating risk limit:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'UPDATE_ERROR',
        message: 'Failed to update risk limit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// DELETE /api/risk-management/limits - Delete risk limit
export async function DELETE(request: NextRequest) {
  try {
    const userIdOrResponse = await verifyAuth(request);
    if (userIdOrResponse instanceof NextResponse) return userIdOrResponse;
    const userId = userIdOrResponse;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_ID',
            message: 'Risk limit ID is required',
          },
        },
        { status: 400 }
      );
    }

    const docRef = db.collection('risk_limits').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Risk limit not found',
          },
        },
        { status: 404 }
      );
    }

    const data = doc.data()!;
    if (data.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'You can only delete your own risk limits',
          },
        },
        { status: 403 }
      );
    }

    await docRef.delete();

    // Log the risk limit deletion
    await db.collection('risk_events').add({
      type: 'limit_deleted',
      userId,
      riskLimitId: id,
      symbol: data.symbol,
      limitType: data.limitType,
      timestamp: new Date(),
    });

    const response: ApiResponse<{ deleted: boolean }> = {
      success: true,
      data: { deleted: true },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error deleting risk limit:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'DELETE_ERROR',
        message: 'Failed to delete risk limit',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}