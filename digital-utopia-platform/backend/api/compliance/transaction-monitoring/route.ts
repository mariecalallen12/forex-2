// Transaction Monitoring API
// Author: MiniMax Agent
// Date: 2025-12-05
// Purpose: Real-time transaction monitoring and suspicious activity detection

import { NextRequest, NextResponse } from 'next/server';
import {
  TransactionMonitoring,
  MonitoringFlag,
  SuspiciousActivity,
  ComplianceRule,
  ApiResponse,
  PaginatedResponse
} from '../../../../shared/types/risk-compliance';

// In-memory storage (in production, use database)
let transactionMonitorings: TransactionMonitoring[] = [];
let suspiciousActivities: SuspiciousActivity[] = [];
let complianceRules: ComplianceRule[] = [];

// Helper function to generate unique IDs
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Transaction pattern detection algorithms
const detectStructuring = (transactions: any[]): boolean => {
  // Check for multiple transactions just below reporting threshold
  const threshold = 10000;
  const dailyTransactions = transactions.filter(t => {
    const txDate = new Date(t.timestamp);
    const today = new Date();
    return txDate.toDateString() === today.toDateString();
  });
  
  const smallTransactions = dailyTransactions.filter(t => t.amount < threshold && t.amount > threshold * 0.8);
  const totalAmount = smallTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  return smallTransactions.length >= 3 && totalAmount >= threshold * 2;
};

const detectUnusualPattern = (transactions: any[]): boolean => {
  if (transactions.length < 10) return false;
  
  // Check for sudden increase in transaction frequency
  const recentTransactions = transactions.filter(t => {
    const txDate = new Date(t.timestamp);
    const daysAgo = 7;
    return txDate > new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
  });
  
  const historicalAverage = transactions.length / 30; // Assuming 30-day history
  return recentTransactions.length > historicalAverage * 5;
};

const detectRoundNumberPattern = (transactions: any[]): boolean => {
  // Check for excessive use of round numbers (possible money laundering indicator)
  const roundNumberThreshold = 1000;
  const roundNumberTx = transactions.filter(t => t.amount % roundNumberThreshold === 0);
  const roundNumberPercentage = roundNumberTx.length / transactions.length;
  
  return roundNumberPercentage > 0.7; // More than 70% round numbers
};

// Risk assessment based on transaction characteristics
const assessTransactionRisk = (transaction: any, userHistory: any[]): MonitoringFlag[] => {
  const flags: MonitoringFlag[] = [];
  
  // Amount-based flags
  if (transaction.amount >= 50000) {
    flags.push({
      id: generateId(),
      flagType: 'large_amount',
      severity: transaction.amount >= 100000 ? 'critical' : 'high',
      description: `Large transaction amount: $${transaction.amount.toLocaleString()}`,
      rule: 'LARGE_TRANSACTION_MONITORING',
      threshold: 50000,
      actualValue: transaction.amount,
      confidence: 90
    });
  }
  
  // Velocity-based flags
  const userTransactions = userHistory.filter(t => t.userId === transaction.userId);
  const recentTransactions = userTransactions.filter(t => {
    const txTime = new Date(t.timestamp).getTime();
    const currentTime = Date.now();
    return (currentTime - txTime) < (24 * 60 * 60 * 1000); // Last 24 hours
  });
  
  if (recentTransactions.length >= 20) {
    flags.push({
      id: generateId(),
      flagType: 'rapid_trading',
      severity: recentTransactions.length >= 50 ? 'critical' : 'high',
      description: `High transaction velocity: ${recentTransactions.length} transactions in 24h`,
      rule: 'HIGH_VELOCITY_MONITORING',
      threshold: 20,
      actualValue: recentTransactions.length,
      confidence: 85
    });
  }
  
  // Pattern-based flags
  if (transaction.amount % 1000 === 0 && transaction.amount >= 5000) {
    flags.push({
      id: generateId(),
      flagType: 'suspicious_behavior',
      severity: 'medium',
      description: 'Round number pattern detected',
      rule: 'ROUND_NUMBER_PATTERN',
      threshold: 1000,
      actualValue: transaction.amount,
      confidence: 70
    });
  }
  
  // Geographic risk flags
  const highRiskCountries = ['IR', 'KP', 'SY', 'CU', 'RU', 'AF', 'IQ', 'LY', 'SO', 'SS', 'YE'];
  if (highRiskCountries.includes(transaction.originCountry) || highRiskCountries.includes(transaction.destinationCountry)) {
    flags.push({
      id: generateId(),
      flagType: 'high_risk_jurisdiction',
      severity: 'critical',
      description: `High-risk jurisdiction: ${transaction.originCountry} → ${transaction.destinationCountry}`,
      rule: 'HIGH_RISK_JURISDICTION',
      actualValue: `${transaction.originCountry}/${transaction.destinationCountry}`,
      confidence: 100
    });
  }
  
  return flags;
};

// GET /api/compliance/transaction-monitoring - Get transaction monitoring status
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('user-id');
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const transactionId = searchParams.get('transactionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    let monitorings: TransactionMonitoring[];
    
    if (transactionId) {
      monitorings = transactionMonitorings.filter(m => m.transactionId === transactionId);
    } else {
      // Get user's transaction monitorings
      monitorings = transactionMonitorings.filter(m => m.userId === userId);
    }
    
    // Sort by creation date, newest first
    monitorings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedMonitorings = monitorings.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<TransactionMonitoring> = {
      data: paginatedMonitorings,
      pagination: {
        page,
        limit,
        total: monitorings.length,
        totalPages: Math.ceil(monitorings.length / limit),
        hasNext: endIndex < monitorings.length,
        hasPrevious: page > 1
      }
    };
    
    return NextResponse.json<ApiResponse<PaginatedResponse<TransactionMonitoring>>>({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Transaction monitoring GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve transaction monitoring data'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/compliance/transaction-monitoring - Start transaction monitoring
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('user-id');
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    const body = await request.json();
    const { 
      transactionId, 
      amount, 
      transactionType, 
      originCountry, 
      destinationCountry,
      currency,
      metadata 
    } = body;

    // Validate required fields
    if (!transactionId || !amount || !transactionType) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Transaction ID, amount, and transaction type are required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validate transaction amount
    if (amount <= 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Transaction amount must be greater than zero'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Get user's transaction history for pattern analysis
    const userHistory = transactionMonitorings
      .filter(m => m.userId === userId)
      .map(m => ({
        userId: m.userId,
        timestamp: m.createdAt,
        amount: m.flags.find(f => f.actualValue)?.actualValue || 0
      }));

    // Assess transaction risk
    const transaction = {
      userId,
      transactionId,
      amount,
      transactionType,
      originCountry: originCountry || 'US',
      destinationCountry: destinationCountry || 'US',
      currency: currency || 'USD'
    };

    const flags = assessTransactionRisk(transaction, userHistory);

    // Create monitoring record
    const monitoring: TransactionMonitoring = {
      id: generateId(),
      transactionId,
      userId,
      monitoringType: flags.some(f => f.severity === 'critical') ? 'enhanced' : 'real_time',
      status: flags.length === 0 ? 'clean' : 'flagged',
      riskScore: Math.min(100, flags.reduce((score, flag) => {
        const severityScore = flag.severity === 'critical' ? 25 : 
                            flag.severity === 'high' ? 15 : 
                            flag.severity === 'medium' ? 10 : 5;
        return score + severityScore;
      }, 0)),
      flags,
      reviewed: false,
      createdAt: new Date().toISOString()
    };

    transactionMonitorings.push(monitoring);

    // Check if any flags warrant immediate investigation
    const criticalFlags = flags.filter(f => f.severity === 'critical');
    if (criticalFlags.length > 0) {
      const suspiciousActivity: SuspiciousActivity = {
        id: generateId(),
        userId,
        activityType: 'money_laundering',
        description: `Critical risk indicators detected in transaction ${transactionId}: ${criticalFlags.map(f => f.flagType).join(', ')}`,
        evidence: {
          transactionId,
          amount,
          flags: criticalFlags,
          riskScore: monitoring.riskScore
        },
        riskLevel: 'critical',
        status: 'reported',
        reportedBy: 'AML System',
        reportedAt: new Date().toISOString(),
        investigationNotes: 'Auto-generated critical risk alert based on transaction monitoring rules'
      };
      
      suspiciousActivities.push(suspiciousActivity);
      
      // Update monitoring status
      monitoring.status = 'reported';
      monitoring.reviewed = false;
    }

    // Auto-review for low-risk transactions
    if (monitoring.riskScore < 20 && flags.length === 0) {
      monitoring.reviewed = true;
      monitoring.reviewedBy = 'Automated System';
      monitoring.reviewedAt = new Date().toISOString();
    }

    return NextResponse.json<ApiResponse<TransactionMonitoring>>({
      success: true,
      data: monitoring,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Transaction monitoring POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to process transaction monitoring'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PATCH /api/compliance/transaction-monitoring - Update monitoring status (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const userId = request.headers.get('user-id');
    const adminRole = request.headers.get('admin-role');
    
    if (!userId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'User authentication required'
        },
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin privileges required for updating monitoring status'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const body = await request.json();
    const { monitoringId, reviewed, reviewedBy, notes } = body;

    if (!monitoringId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Monitoring ID is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const monitoring = transactionMonitorings.find(m => m.id === monitoringId);
    
    if (!monitoring) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Transaction monitoring record not found'
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Update monitoring record
    if (typeof reviewed === 'boolean') {
      monitoring.reviewed = reviewed;
    }
    
    if (reviewedBy) {
      monitoring.reviewedBy = reviewedBy;
    }
    
    if (reviewed) {
      monitoring.reviewedAt = new Date().toISOString();
    }

    // If reviewing suspicious activity, update the related suspicious activity record
    if (monitoring.status === 'reported' && reviewed) {
      const suspiciousActivity = suspiciousActivities.find(s => 
        s.evidence?.transactionId === monitoring.transactionId
      );
      
      if (suspiciousActivity) {
        suspiciousActivity.status = 'investigating';
        suspiciousActivity.assignedTo = reviewedBy;
        suspiciousActivity.investigationNotes = notes;
      }
    }

    return NextResponse.json<ApiResponse<TransactionMonitoring>>({
      success: true,
      data: monitoring,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Transaction monitoring PATCH error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update transaction monitoring'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET /api/compliance/transaction-monitoring/suspicious-activities - Get suspicious activities (admin only)
export async function GET_suspicious(request: NextRequest) {
  try {
    const adminRole = request.headers.get('admin-role');
    
    if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin privileges required for viewing suspicious activities'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const riskLevel = searchParams.get('riskLevel');
    
    let filteredActivities = [...suspiciousActivities];
    
    // Apply filters
    if (status) {
      filteredActivities = filteredActivities.filter(s => s.status === status);
    }
    
    if (riskLevel) {
      filteredActivities = filteredActivities.filter(s => s.riskLevel === riskLevel);
    }
    
    // Sort by reported date, newest first
    filteredActivities.sort((a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime());
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedActivities = filteredActivities.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<SuspiciousActivity> = {
      data: paginatedActivities,
      pagination: {
        page,
        limit,
        total: filteredActivities.length,
        totalPages: Math.ceil(filteredActivities.length / limit),
        hasNext: endIndex < filteredActivities.length,
        hasPrevious: page > 1
      }
    };
    
    return NextResponse.json<ApiResponse<PaginatedResponse<SuspiciousActivity>>>({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Suspicious activities GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve suspicious activities'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}