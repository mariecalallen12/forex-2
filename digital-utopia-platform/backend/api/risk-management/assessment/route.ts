// Risk Management API - Risk Assessment
// Phase 5: Risk Management & Compliance
// Author: MiniMax Agent
// Date: 2025-12-05

import { NextRequest, NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { 
  RiskAssessmentResponse, 
  PortfolioRisk, 
  RiskExposure, 
  ApiResponse 
} from '@/shared/types';

const riskCache = new Map<string, { data: RiskAssessmentResponse; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Initialize Firebase Admin
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

// Helper function to calculate portfolio risk metrics
async function calculatePortfolioRisk(userId: string): Promise<PortfolioRisk> {
  try {
    // Get all positions for the user
    const positionsSnapshot = await db.collection('positions')
      .where('userId', '==', userId)
      .where('status', '==', 'open')
      .get();

    const positions = positionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate total exposure and portfolio value
    let totalExposure = 0;
    let totalPortfolioValue = 0;
    const symbolExposure: Record<string, number> = {};

    positions.forEach(position => {
      const positionValue = position.quantity * position.currentPrice;
      totalExposure += Math.abs(positionValue);
      totalPortfolioValue += positionValue;
      
      if (symbolExposure[position.symbol]) {
        symbolExposure[position.symbol] += Math.abs(positionValue);
      } else {
        symbolExposure[position.symbol] = Math.abs(positionValue);
      }
    });

    // Calculate exposure percentage
    const exposurePercentage = totalPortfolioValue > 0 ? 
      (totalExposure / Math.abs(totalPortfolioValue)) * 100 : 0;

    // Calculate risk score (0-100)
    let riskScore = 0;
    
    // Concentration risk (top symbol exposure %)
    const maxSymbolExposure = Math.max(...Object.values(symbolExposure));
    const concentrationRisk = totalExposure > 0 ? 
      (maxSymbolExposure / totalExposure) * 100 : 0;
    riskScore += Math.min(concentrationRisk * 0.4, 40); // Max 40 points

    // Leverage risk
    const leveragedPositions = positions.filter(p => p.leverage > 1);
    const leverageRatio = positions.length > 0 ? 
      leveragedPositions.length / positions.length : 0;
    riskScore += Math.min(leverageRatio * 30, 30); // Max 30 points

    // Diversification risk
    const symbolCount = Object.keys(symbolExposure).length;
    const diversificationScore = Math.max(0, (10 - symbolCount) / 10 * 20); // Max 20 points
    riskScore += diversificationScore;

    // Volatility risk (simplified calculation)
    const volatilityRisk = Math.min(totalExposure / 100000 * 10, 10); // Max 10 points
    riskScore += volatilityRisk;

    riskScore = Math.min(Math.max(riskScore, 0), 100); // Clamp between 0-100

    // Calculate Value at Risk (simplified 95% VaR)
    const volatility = Math.sqrt(symbolCount > 1 ? 0.02 : 0.05); // Simplified volatility
    const var95 = totalExposure * volatility * 1.645; // 95% confidence level
    const var99 = totalExposure * volatility * 2.326; // 99% confidence level

    // Calculate max drawdown (simplified)
    const maxDrawdown = Math.min(riskScore / 100 * 0.2, 0.2); // Max 20%

    // Calculate Sharpe ratio (simplified - would need historical data for accurate calculation)
    const expectedReturn = 0.08; // 8% annual return assumption
    const sharpeRatio = totalExposure > 0 ? expectedReturn / volatility : 0;

    const portfolioRisk: PortfolioRisk = {
      totalExposure,
      totalPortfolioValue,
      exposurePercentage,
      riskScore,
      maxDrawdown,
      sharpeRatio,
      var95,
      var99,
      concentrationRisk,
      correlationRisk: concentrationRisk * 0.6, // Simplified correlation risk
      liquidityRisk: Math.min(symbolCount < 3 ? 0.1 : 0, 0.1), // Simplified liquidity risk
      marketRisk: volatilityRisk * 10, // Simplified market risk
      calculatedAt: new Date().toISOString(),
    };

    return portfolioRisk;
  } catch (error) {
    console.error('Error calculating portfolio risk:', error);
    
    // Return default risk metrics if calculation fails
    return {
      totalExposure: 0,
      totalPortfolioValue: 0,
      exposurePercentage: 0,
      riskScore: 50, // Neutral risk score
      maxDrawdown: 0,
      sharpeRatio: 0,
      var95: 0,
      var99: 0,
      concentrationRisk: 0,
      correlationRisk: 0,
      liquidityRisk: 0,
      marketRisk: 0,
      calculatedAt: new Date().toISOString(),
    };
  }
}

// Helper function to calculate position risks
async function calculatePositionRisks(userId: string): Promise<RiskExposure[]> {
  try {
    const positionsSnapshot = await db.collection('positions')
      .where('userId', '==', userId)
      .where('status', '==', 'open')
      .get();

    const risks: RiskExposure[] = [];

    for (const doc of positionsSnapshot.docs) {
      const position = doc.data();
      const positionValue = position.quantity * position.currentPrice;
      const exposurePercentage = Math.abs(positionValue);
      const riskScore = Math.min(
        (position.leverage - 1) * 10 + 
        (exposurePercentage > 10000 ? 20 : 0) + 
        Math.abs(position.unrealizedPnl / positionValue * 100), 
        100
      );

      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (riskScore > 80) riskLevel = 'critical';
      else if (riskScore > 60) riskLevel = 'high';
      else if (riskScore > 30) riskLevel = 'medium';

      risks.push({
        id: doc.id,
        userId,
        symbol: position.symbol,
        positionValue: Math.abs(positionValue),
        exposurePercentage: Math.abs(positionValue) / 100000 * 100, // Simplified percentage
        riskScore,
        leverageUsed: position.leverage,
        marginUsed: position.marginUsed,
        availableMargin: position.marginAvailable,
        riskLevel,
        calculatedAt: new Date().toISOString(),
      });
    }

    return risks;
  } catch (error) {
    console.error('Error calculating position risks:', error);
    return [];
  }
}

// Helper function to generate recommendations
function generateRecommendations(
  portfolioRisk: PortfolioRisk, 
  positionRisks: RiskExposure[]
): string[] {
  const recommendations: string[] = [];

  // Portfolio-level recommendations
  if (portfolioRisk.riskScore > 80) {
    recommendations.push('Your portfolio risk is critically high. Consider reducing position sizes or closing some positions.');
  } else if (portfolioRisk.riskScore > 60) {
    recommendations.push('Your portfolio risk is elevated. Monitor positions closely and consider risk reduction strategies.');
  }

  if (portfolioRisk.concentrationRisk > 50) {
    recommendations.push('Your portfolio is highly concentrated. Consider diversifying across more symbols.');
  }

  if (portfolioRisk.exposurePercentage > 200) {
    recommendations.push('Your exposure ratio is very high. Consider reducing leverage or position sizes.');
  }

  // Position-level recommendations
  positionRisks.forEach(risk => {
    if (risk.riskLevel === 'critical') {
      recommendations.push(`Position in ${risk.symbol} has critical risk level. Immediate action recommended.`);
    } else if (risk.riskLevel === 'high' && risk.leverageUsed > 5) {
      recommendations.push(`High leverage detected in ${risk.symbol}. Consider reducing leverage.`);
    }
  });

  if (recommendations.length === 0) {
    recommendations.push('Your risk levels appear to be within acceptable ranges. Continue monitoring.');
  }

  return recommendations;
}

// GET /api/risk-management/assessment - Get comprehensive risk assessment
export async function GET(request: NextRequest) {
  try {
    const userIdOrResponse = await verifyAuth(request);
    if (userIdOrResponse instanceof NextResponse) return userIdOrResponse;
    const userId = userIdOrResponse;

    // Check cache first
    const cached = riskCache.get(userId);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      const response: ApiResponse<RiskAssessmentResponse> = {
        success: true,
        data: cached.data,
        timestamp: new Date().toISOString(),
      };
      return NextResponse.json(response);
    }

    // Get user's current positions and balances
    const [portfolioRisk, positionRisks] = await Promise.all([
      calculatePortfolioRisk(userId),
      calculatePositionRisks(userId)
    ]);

    // Determine overall risk level
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    if (portfolioRisk.riskScore > 80) riskLevel = 'critical';
    else if (portfolioRisk.riskScore > 60) riskLevel = 'high';
    else if (portfolioRisk.riskScore > 30) riskLevel = 'medium';

    // Generate recommendations
    const recommendations = generateRecommendations(portfolioRisk, positionRisks);

    // Determine if action is required
    const actionRequired = riskLevel === 'critical' || 
      portfolioRisk.riskScore > 70 ||
      positionRisks.some(r => r.riskLevel === 'critical');

    const assessment: RiskAssessmentResponse = {
      userId,
      riskLevel,
      riskScore: portfolioRisk.riskScore,
      portfolioRisk,
      positionRisks,
      recommendations,
      actionRequired,
      calculatedAt: new Date().toISOString(),
    };

    // Cache the result
    riskCache.set(userId, {
      data: assessment,
      timestamp: Date.now()
    });

    // Log the assessment
    await db.collection('risk_events').add({
      type: 'risk_assessment',
      userId,
      riskLevel,
      riskScore: portfolioRisk.riskScore,
      timestamp: new Date(),
      details: {
        totalExposure: portfolioRisk.totalExposure,
        positionCount: positionRisks.length,
        actionRequired,
      },
    });

    const response: ApiResponse<RiskAssessmentResponse> = {
      success: true,
      data: assessment,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error performing risk assessment:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'ASSESSMENT_ERROR',
        message: 'Failed to perform risk assessment',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// POST /api/risk-management/assessment/stress-test - Perform stress testing
export async function POST(request: NextRequest) {
  try {
    const userIdOrResponse = await verifyAuth(request);
    if (userIdOrResponse instanceof NextResponse) return userIdOrResponse;
    const userId = userIdOrResponse;

    const body = await request.json();
    const { scenario, shockPercentage } = body;

    if (!scenario || typeof shockPercentage !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Scenario and shockPercentage are required',
          },
        },
        { status: 400 }
      );
    }

    // Get current portfolio
    const positionsSnapshot = await db.collection('positions')
      .where('userId', '==', userId)
      .where('status', '==', 'open')
      .get();

    const positions = positionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Calculate stress test results
    let totalStressLoss = 0;
    const stressResults = positions.map(position => {
      const originalValue = position.quantity * position.currentPrice;
      const stressedPrice = position.currentPrice * (1 - shockPercentage / 100);
      const stressedValue = position.quantity * stressedPrice;
      const loss = stressedValue - originalValue;
      totalStressLoss += loss;

      return {
        symbol: position.symbol,
        originalValue,
        stressedValue,
        loss,
        lossPercentage: (loss / Math.abs(originalValue)) * 100,
      };
    });

    const totalPortfolioValue = positions.reduce((sum, p) => 
      sum + (p.quantity * p.currentPrice), 0);

    const stressTestResult = {
      scenario,
      shockPercentage,
      totalStressLoss,
      stressLossPercentage: totalPortfolioValue > 0 ? 
        (totalStressLoss / Math.abs(totalPortfolioValue)) * 100 : 0,
      positionResults: stressResults,
      testedAt: new Date().toISOString(),
    };

    // Log the stress test
    await db.collection('risk_events').add({
      type: 'stress_test',
      userId,
      scenario,
      shockPercentage,
      totalStressLoss,
      timestamp: new Date(),
    });

    const response: ApiResponse<typeof stressTestResult> = {
      success: true,
      data: stressTestResult,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error performing stress test:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'STRESS_TEST_ERROR',
        message: 'Failed to perform stress test',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}

// Utility function to clear cache (for testing)
export async function DELETE(request: NextRequest) {
  try {
    const userIdOrResponse = await verifyAuth(request);
    if (userIdOrResponse instanceof NextResponse) return userIdOrResponse;
    const userId = userIdOrResponse;

    riskCache.delete(userId);

    const response: ApiResponse<{ cacheCleared: boolean }> = {
      success: true,
      data: { cacheCleared: true },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error clearing cache:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: {
        code: 'CACHE_ERROR',
        message: 'Failed to clear cache',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, { status: 500 });
  }
}