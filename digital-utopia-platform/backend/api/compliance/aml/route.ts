// AML Screening API
// Author: MiniMax Agent
// Date: 2025-12-05
// Purpose: Anti-Money Laundering (AML) screening and transaction monitoring system

import { NextRequest, NextResponse } from 'next/server';
import {
  AMLScreening,
  AMLFinding,
  TransactionMonitoring,
  MonitoringFlag,
  SuspiciousActivity,
  ComplianceRule,
  ComplianceMetrics,
  ApiResponse,
  PaginatedResponse
} from '../../../../shared/types/risk-compliance';

// In-memory storage (in production, use database)
let amlScreenings: AMLScreening[] = [];
let transactionMonitorings: TransactionMonitoring[] = [];
let suspiciousActivities: SuspiciousActivity[] = [];
let complianceRules: ComplianceRule[] = [];
let monitoringFlags: MonitoringFlag[] = [];

// Simulated watchlists and risk databases
const SANCTIONS_LIST = [
  { name: 'John Doe', country: 'US', riskLevel: 'high' },
  { name: 'Jane Smith', country: 'UK', riskLevel: 'medium' },
  { name: 'Corporate Entity A', country: 'RU', riskLevel: 'critical' }
];

const PEP_LIST = [
  { name: 'Politician X', position: 'Minister', country: 'CN', riskLevel: 'high' },
  { name: 'Official Y', position: 'Governor', country: 'BR', riskLevel: 'medium' }
];

const HIGH_RISK_JURISDICTIONS = ['IR', 'KP', 'SY', 'CU', 'RU'];

// Helper function to generate unique IDs
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to check sanctions list
const checkSanctionsList = (name: string): AMLFinding[] => {
  const findings: AMLFinding[] = [];
  
  for (const entry of SANCTIONS_LIST) {
    if (name.toLowerCase().includes(entry.name.toLowerCase())) {
      findings.push({
        category: 'sanctions',
        source: 'OFAC Sanctions List',
        description: `Name match found in sanctions list: ${entry.name}`,
        severity: entry.riskLevel === 'critical' ? 'high' : 'medium',
        confidence: 85,
        actionTaken: 'Flagged for review',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return findings;
};

// Helper function to check PEP list
const checkPEPList = (name: string): AMLFinding[] => {
  const findings: AMLFinding[] = [];
  
  for (const entry of PEP_LIST) {
    if (name.toLowerCase().includes(entry.name.toLowerCase())) {
      findings.push({
        category: 'pep',
        source: 'PEP Database',
        description: `Politically Exposed Person found: ${entry.name} (${entry.position})`,
        severity: 'medium',
        confidence: 90,
        actionTaken: 'Enhanced due diligence required',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return findings;
};

// Helper function to check adverse media
const checkAdverseMedia = (name: string): AMLFinding[] => {
  // Simulate adverse media screening
  const findings: AMLFinding[] = [];
  
  // Random chance of finding adverse media (simulation)
  if (Math.random() < 0.1) {
    findings.push({
      category: 'adverse_media',
      source: 'Media Monitoring',
      description: `Negative news found for ${name}: Allegations of financial misconduct`,
      severity: 'medium',
      confidence: 60,
      actionTaken: 'Investigated further',
      timestamp: new Date().toISOString()
    });
  }
  
  return findings;
};

// Helper function to assess transaction risk
const assessTransactionRisk = (transaction: any): MonitoringFlag[] => {
  const flags: MonitoringFlag[] = [];
  
  // Large amount flag
  if (transaction.amount > 100000) {
    flags.push({
      id: generateId(),
      flagType: 'large_amount',
      severity: 'high',
      description: 'Transaction amount exceeds $100,000 threshold',
      rule: 'LARGE_TRANSACTION_THRESHOLD',
      threshold: 100000,
      actualValue: transaction.amount,
      confidence: 95
    });
  }
  
  // Rapid trading pattern
  if (transaction.frequency && transaction.frequency > 100) {
    flags.push({
      id: generateId(),
      flagType: 'rapid_trading',
      severity: 'medium',
      description: 'Unusually high trading frequency detected',
      rule: 'RAPID_TRADING_PATTERN',
      threshold: 100,
      actualValue: transaction.frequency,
      confidence: 80
    });
  }
  
  // Structuring detection (multiple smaller transactions)
  if (transaction.structuringPattern) {
    flags.push({
      id: generateId(),
      flagType: 'structuring',
      severity: 'critical',
      description: 'Possible structuring pattern detected',
      rule: 'STRUCTURING_DETECTION',
      confidence: 90
    });
  }
  
  // High-risk jurisdiction
  if (HIGH_RISK_JURISDICTIONS.includes(transaction.originCountry)) {
    flags.push({
      id: generateId(),
      flagType: 'high_risk_jurisdiction',
      severity: 'high',
      description: `Transaction from high-risk jurisdiction: ${transaction.originCountry}`,
      rule: 'HIGH_RISK_JURISDICTION',
      actualValue: transaction.originCountry,
      confidence: 100
    });
  }
  
  return flags;
};

// GET /api/compliance/aml - Get AML screening status
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

    // Find latest AML screening for user
    let amlScreening = amlScreenings
      .filter(screening => screening.userId === userId)
      .sort((a, b Date(b.lastChecked) => new).getTime() - new Date(a.lastChecked).getTime())[0];

    if (!amlScreening) {
      // Create initial AML screening
      amlScreening = {
        id: generateId(),
        userId,
        screeningType: 'initial',
        status: 'clean',
        riskLevel: 'low',
        findings: [],
        lastChecked: new Date().toISOString(),
        nextReview: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
      };
      
      amlScreenings.push(amlScreening);
    }

    return NextResponse.json<ApiResponse<AMLScreening>>({
      success: true,
      data: amlScreening,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AML GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve AML screening information'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/compliance/aml - Perform AML screening
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
      screeningType = 'initial', 
      personalInfo, 
      transactionData,
      enhancedDueDiligence = false 
    } = body;

    // Validate required data
    if (!personalInfo || !personalInfo.name) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Personal information with name is required for AML screening'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const allFindings: AMLFinding[] = [];

    // Perform sanctions screening
    const sanctionsFindings = checkSanctionsList(personalInfo.name);
    allFindings.push(...sanctionsFindings);

    // Perform PEP screening
    const pepFindings = checkPEPList(personalInfo.name);
    allFindings.push(...pepFindings);

    // Perform adverse media screening
    const adverseFindings = checkAdverseMedia(personalInfo.name);
    allFindings.push(...adverseFindings);

    // Check nationality against high-risk jurisdictions
    if (personalInfo.nationalityK_JURISD && HIGH_RISICTIONS.includes(personalInfo.nationality)) {
      allFindings.push({
        category: 'sanctions',
        source: 'Risk Assessment',
        description: `Nationality from high-risk jurisdiction: ${personalInfo.nationality}`,
        severity: 'high',
        confidence: 100,
        actionTaken: 'Enhanced screening applied',
        timestamp: new Date().toISOString()
      });
    }

    // Enhanced Due Diligence checks
    if (enhancedDueDiligence || screeningType === 'enhanced_due_diligence') {
      // Additional checks for high-risk cases
      if (allFindings.length > 0) {
        allFindings.push({
          category: 'suspicious_activity',
          source: 'Enhanced Due Diligence',
          description: 'Multiple risk indicators detected - enhanced monitoring required',
          severity: 'high',
          confidence: 85,
          actionTaken: 'Enhanced due diligence triggered',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Determine overall risk level and status
    let riskLevel: AMLScreening['riskLevel'] = 'low';
    let status: AMLScreening['status'] = 'clean';

    const highSeverityFindings = allFindings.filter(f => f.severity === 'high');
    const criticalFindings = allFindings.filter(f => f.category === 'sanctions' && f.severity === 'high');

    if (criticalFindings.length > 0) {
      riskLevel = 'critical';
      status = 'reported';
    } else if (highSeverityFindings.length > 0) {
      riskLevel = 'high';
      status = 'flagged';
    } else if (allFindings.length > 0) {
      riskLevel = 'medium';
      status = 'flagged';
    }

    // Create or update AML screening record
    let amlScreening = amlScreenings.find(s => s.userId === userId);
    
    if (!amlScreening) {
      amlScreening = {
        id: generateId(),
        userId,
        screeningType,
        status,
        riskLevel,
        findings: allFindings,
        lastChecked: new Date().toISOString(),
        nextReview: new Date(Date.now() + (riskLevel === 'low' ? 90 : 30) * 24 * 60 * 60 * 1000).toISOString()
      };
      amlScreenings.push(amlScreening);
    } else {
      amlScreening.screeningType = screeningType;
      amlScreening.status = status;
      amlScreening.riskLevel = riskLevel;
      amlScreening.findings = allFindings;
      amlScreening.lastChecked = new Date().toISOString();
      amlScreening.nextReview = new Date(Date.now() + (riskLevel === 'low' ? 90 : 30) * 24 * 60 * 60 * 1000).toISOString();
      
      if (status === 'reported') {
        amlScreening.reportedAt = new Date().toISOString();
        amlScreening.reportReference = `AML-${Date.now()}`;
      }
    }

    return NextResponse.json<ApiResponse<AMLScreening>>({
      success: true,
      data: amlScreening,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AML POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to perform AML screening'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/compliance/aml/monitor - Monitor transaction for AML compliance
export async function POST_monitor(request: NextRequest) {
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
    const { transactionId, amount, frequency, originCountry, destinationCountry, structuringPattern } = body;

    if (!transactionId || !amount) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Transaction ID and amount are required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Assess transaction risk
    const transactionData = {
      amount,
      frequency: frequency || 0,
      originCountry: originCountry || 'US',
      destinationCountry: destinationCountry || 'US',
      structuringPattern
    };

    const flags = assessTransactionRisk(transactionData);

    // Create monitoring record
    const monitoring: TransactionMonitoring = {
      id: generateId(),
      transactionId,
      userId,
      monitoringType: flags.some(f => f.severity === 'critical') ? 'enhanced' : 'real_time',
      status: flags.length === 0 ? 'clean' : 'flagged',
      riskScore: flags.reduce((score, flag) => score + (flag.severity === 'critical' ? 25 : flag.severity === 'high' ? 15 : flag.severity === 'medium' ? 10 : 5), 0),
      flags,
      reviewed: false,
      createdAt: new Date().toISOString()
    };

    transactionMonitorings.push(monitoring);
    monitoringFlags.push(...flags);

    // Create suspicious activity record if critical flags found
    const criticalFlags = flags.filter(f => f.severity === 'critical');
    if (criticalFlags.length > 0) {
      const suspiciousActivity: SuspiciousActivity = {
        id: generateId(),
        userId,
        activityType: 'money_laundering',
        description: `Suspicious transaction patterns detected: ${criticalFlags.map(f => f.flagType).join(', ')}`,
        evidence: { transactionId, flags: criticalFlags },
        riskLevel: 'critical',
        status: 'reported',
        reportedBy: 'AML System',
        reportedAt: new Date().toISOString(),
        investigationNotes: 'Auto-generated suspicious activity report based on AML rules'
      };
      
      suspiciousActivities.push(suspiciousActivity);
      
      // Update screening status to reported
      const userScreening = amlScreenings.find(s => s.userId === userId);
      if (userScreening) {
        userScreening.status = 'reported';
        userScreening.riskLevel = 'critical';
      }
    }

    return NextResponse.json<ApiResponse<TransactionMonitoring>>({
      success: true,
      data: monitoring,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AML monitor error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to monitor transaction'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PATCH /api/compliance/aml - Update AML screening (admin only)
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
          message: 'Admin privileges required for AML status updates'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const body = await request.json();
    const { targetUserId, status, riskLevel, additionalFindings } = body;

    if (!targetUserId || !status) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Target user ID and status are required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const amlScreening = amlScreenings.find(s => s.userId === targetUserId);
    
    if (!amlScreening) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'AML screening record not found'
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Update screening
    amlScreening.status = status;
    
    if (riskLevel) {
      const validRiskLevels: AMLScreening['riskLevel'][] = ['low', 'medium', 'high', 'critical'];
      if (validRiskLevels.includes(riskLevel)) {
        amlScreening.riskLevel = riskLevel;
      }
    }

    if (additionalFindings && Array.isArray(additionalFindings)) {
      amlScreening.findings.push(...additionalFindings);
    }

    amlScreening.lastChecked = new Date().toISOString();

    return NextResponse.json<ApiResponse<AMLScreening>>({
      success: true,
      data: amlScreening,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AML PATCH error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update AML screening'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET /api/compliance/aml/metrics - Get compliance metrics (admin only)
export async function GET_metrics(request: NextRequest) {
  try {
    const adminRole = request.headers.get('admin-role');
    
    if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin privileges required for compliance metrics'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    // Calculate compliance metrics
    const totalScreenings = amlScreenings.length;
    const flaggedScreenings = amlScreenings.filter(s => s.status === 'flagged').length;
    const reportedScreenings = amlScreenings.filter(s => s.status === 'reported').length;
    
    const highRiskScreenings = amlScreenings.filter(s => s.riskLevel === 'high' || s.riskLevel === 'critical').length;
    const flaggedTransactions = transactionMonitorings.filter(m => m.status === 'flagged').length;
    const suspiciousActivityCount = suspiciousActivities.length;

    // Calculate average processing time (simulated)
    const averageProcessingTime = 2.5; // hours

    // Calculate compliance score
    const complianceScore = Math.max(0, 100 - (flaggedScreenings + reportedScreenings) * 2 - highRiskScreenings * 5);

    const metrics: ComplianceMetrics = {
      totalReports: totalScreenings,
      reportsByType: {
        initial: amlScreenings.filter(s => s.screeningType === 'initial').length,
        periodic: amlScreenings.filter(s => s.screeningType === 'periodic').length,
        transaction: amlScreenings.filter(s => s.screeningType === 'transaction').length,
        enhanced_due_diligence: amlScreenings.filter(s => s.screeningType === 'enhanced_due_diligence').length
      },
      reportsByStatus: {
        clean: amlScreenings.filter(s => s.status === 'clean').length,
        flagged: flaggedScreenings,
        investigating: amlScreenings.filter(s => s.status === 'investigating').length,
        reported: reportedScreenings
      },
      averageProcessingTime,
      complianceScore,
      riskMetrics: {
        highRiskUsers: highRiskScreenings,
        flaggedTransactions,
        suspiciousActivities: suspiciousActivityCount,
        kycCompletionRate: 95 // Simulated
      },
      auditFindings: [], // Would be populated from audit system
      calculatedAt: new Date().toISOString()
    };

    return NextResponse.json<ApiResponse<ComplianceMetrics>>({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AML metrics error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve compliance metrics'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}