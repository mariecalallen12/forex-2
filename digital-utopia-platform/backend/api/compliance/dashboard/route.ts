// Compliance Dashboard API
// Author: MiniMax Agent
// Date: 2025-12-05
// Purpose: Real-time compliance dashboard and risk monitoring interface

import { NextRequest, NextResponse } from 'next/server';
import {
  ComplianceMetrics,
  RiskAlert,
  ComplianceAlert,
  RiskLimit,
  AMLScreening,
  KYCProfile,
  TransactionMonitoring,
  SuspiciousActivity,
  RegulatoryReport,
  ApiResponse,
  PaginatedResponse
} from '../../../../shared/types/risk-compliance';

// In-memory storage (in production, use database)
let riskAlerts: RiskAlert[] = [];
let complianceAlerts: ComplianceAlert[] = [];
let riskLimits: RiskLimit[] = [];
let amlScreenings: AMLScreening[] = [];
let kycProfiles: KYCProfile[] = [];
let transactionMonitorings: TransactionMonitoring[] = [];
let suspiciousActivities: SuspiciousActivity[] = [];
let regulatoryReports: RegulatoryReport[] = [];

// Dashboard data aggregators
const getComplianceOverview = () => {
  const totalUsers = kycProfiles.length;
  const approvedKYC = kycProfiles.filter(k => k.status === 'approved').length;
  const pendingKYC = kycProfiles.filter(k => k.status === 'pending' || k.status === 'in_review').length;
  const rejectedKYC = kycProfiles.filter(k => k.status === 'rejected').length;
  
  const totalAMLScreenings = amlScreenings.length;
  const cleanAML = amlScreenings.filter(a => a.status === 'clean').length;
  const flaggedAML = amlScreenings.filter(a => a.status === 'flagged').length;
  const reportedAML = amlScreenings.filter(a => a.status === 'reported').length;
  
  const totalTransactions = transactionMonitorings.length;
  const flaggedTransactions = transactionMonitorings.filter(t => t.status === 'flagged').length;
  const reportedTransactions = transactionMonitorings.filter(t => t.status === 'reported').length;
  
  const totalSuspiciousActivities = suspiciousActivities.length;
  const criticalSuspiciousActivities = suspiciousActivities.filter(s => s.riskLevel === 'critical').length;
  
  const totalReports = regulatoryReports.length;
  const submittedReports = regulatoryReports.filter(r => r.status === 'submitted').length;
  const acceptedReports = regulatoryReports.filter(r => r.status === 'accepted').length;
  
  // Calculate compliance score
  const kycScore = totalUsers > 0 ? (approvedKYC / totalUsers) * 100 : 0;
  const amlScore = totalAMLScreenings > 0 ? (cleanAML / totalAMLScreenings) * 100 : 100;
  const transactionScore = totalTransactions > 0 ? ((totalTransactions - flaggedTransactions) / totalTransactions) * 100 : 100;
  const reportingScore = totalReports > 0 ? (acceptedReports / totalReports) * 100 : 100;
  
  const overallComplianceScore = (kycScore + amlScore + transactionScore + reportingScore) / 4;
  
  return {
    totalUsers,
    kycStats: {
      approved: approvedKYC,
      pending: pendingKYC,
      rejected: rejectedKYC,
      completionRate: totalUsers > 0 ? (approvedKYC / totalUsers) * 100 : 0
    },
    amlStats: {
      total: totalAMLScreenings,
      clean: cleanAML,
      flagged: flaggedAML,
      reported: reportedAML,
      cleanRate: totalAMLScreenings > 0 ? (cleanAML / totalAMLScreenings) * 100 : 100
    },
    transactionStats: {
      total: totalTransactions,
      flagged: flaggedTransactions,
      reported: reportedTransactions,
      cleanRate: totalTransactions > 0 ? ((totalTransactions - flaggedTransactions) / totalTransactions) * 100 : 100
    },
    suspiciousActivityStats: {
      total: totalSuspiciousActivities,
      critical: criticalSuspiciousActivities,
      high: suspiciousActivities.filter(s => s.riskLevel === 'high').length,
      medium: suspiciousActivities.filter(s => s.riskLevel === 'medium').length,
      low: suspiciousActivities.filter(s => s.riskLevel === 'low').length
    },
    reportingStats: {
      total: totalReports,
      submitted: submittedReports,
      accepted: acceptedReports,
      draft: regulatoryReports.filter(r => r.status === 'draft').length,
      acceptanceRate: totalReports > 0 ? (acceptedReports / totalReports) * 100 : 100
    },
    overallComplianceScore: Math.round(overallComplianceScore * 100) / 100,
    riskDistribution: {
      low: suspiciousActivities.filter(s => s.riskLevel === 'low').length,
      medium: suspiciousActivities.filter(s => s.riskLevel === 'medium').length,
      high: suspiciousActivities.filter(s => s.riskLevel === 'high').length,
      critical: suspiciousActivities.filter(s => s.riskLevel === 'critical').length
    }
  };
};

const getRiskMetrics = () => {
  const totalRiskLimits = riskLimits.length;
  const activeLimits = riskLimits.filter(r => r.status === 'active').length;
  const breachedLimits = riskLimits.filter(r => r.status === 'breached').length;
  const breachedPercentage = totalRiskLimits > 0 ? (breachedLimits / totalRiskLimits) * 100 : 0;
  
  const totalRiskAlerts = riskAlerts.length;
  const unreadAlerts = riskAlerts.filter(a => !a.isRead).length;
  const unresolvedAlerts = riskAlerts.filter(a => !a.isResolved).length;
  
  const totalComplianceAlerts = complianceAlerts.length;
  const openComplianceAlerts = complianceAlerts.filter(a => a.status === 'open').length;
  const criticalComplianceAlerts = complianceAlerts.filter(a => a.severity === 'critical').length;
  
  return {
    riskLimits: {
      total: totalRiskLimits,
      active: activeLimits,
      breached: breachedLimits,
      breachRate: Math.round(breachedPercentage * 100) / 100
    },
    riskAlerts: {
      total: totalRiskAlerts,
      unread: unreadAlerts,
      unresolved: unresolvedAlerts,
      resolutionRate: totalRiskAlerts > 0 ? ((totalRiskAlerts - unresolvedAlerts) / totalRiskAlerts) * 100 : 100
    },
    complianceAlerts: {
      total: totalComplianceAlerts,
      open: openComplianceAlerts,
      critical: criticalComplianceAlerts,
      inProgress: complianceAlerts.filter(a => a.status === 'in_progress').length,
      resolved: complianceAlerts.filter(a => a.status === 'resolved').length
    }
  };
};

// GET /api/compliance/dashboard - Get compliance dashboard overview
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
    const adminRole = request.headers.get('admin-role');
    const section = searchParams.get('section'); // 'overview', 'risks', 'alerts', 'reports'

    let dashboardData: any = {};

    switch (section) {
      case 'overview':
        dashboardData = getComplianceOverview();
        break;
        
      case 'risks':
        dashboardData = getRiskMetrics();
        break;
        
      case 'alerts':
        // Return recent alerts
        const recentAlerts = [
          ...riskAlerts.slice(-10),
          ...complianceAlerts.slice(-10)
        ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        
        dashboardData = {
          alerts: recentAlerts,
          summary: getRiskMetrics()
        };
        break;
        
      case 'reports':
        dashboardData = {
          reports: regulatoryReports.slice(-20),
          summary: {
            total: regulatoryReports.length,
            submitted: regulatoryReports.filter(r => r.status === 'submitted').length,
            accepted: regulatoryReports.filter(r => r.status === 'accepted').length,
            pending: regulatoryReports.filter(r => r.status === 'draft').length
          }
        };
        break;
        
      default:
        // Return full dashboard data
        dashboardData = {
          overview: getComplianceOverview(),
          risks: getRiskMetrics(),
          alerts: {
            recent: [
              ...riskAlerts.slice(-5),
              ...complianceAlerts.slice(-5)
            ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          },
          reports: {
            recent: regulatoryReports.slice(-5),
            summary: {
              total: regulatoryReports.length,
              pending: regulatoryReports.filter(r => r.status === 'draft').length
            }
          }
        };
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve dashboard data'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET /api/compliance/dashboard/metrics - Get detailed compliance metrics (admin only)
export async function GET_metrics(request: NextRequest) {
  try {
    const adminRole = request.headers.get('admin-role');
    
    if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin privileges required for detailed metrics'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30d'; // 7d, 30d, 90d, 1y
    const reportType = searchParams.get('type'); // 'kyc', 'aml', 'transactions', 'all'
    
    let metrics: any = {};
    
    // Calculate date range
    const now = new Date();
    const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
    
    switch (reportType) {
      case 'kyc':
        const kycProfilesInPeriod = kycProfiles.filter(k => 
          new Date(k.createdAt) >= startDate
        );
        
        metrics = {
          period,
          reportType: 'kyc',
          data: {
            totalProfiles: kycProfilesInPeriod.length,
            approvedProfiles: kycProfilesInPeriod.filter(k => k.status === 'approved').length,
            pendingProfiles: kycProfilesInPeriod.filter(k => k.status === 'pending' || k.status === 'in_review').length,
            rejectedProfiles: kycProfilesInPeriod.filter(k => k.status === 'rejected').length,
            approvalRate: kycProfilesInPeriod.length > 0 ? 
              (kycProfilesInPeriod.filter(k => k.status === 'approved').length / kycProfilesInPeriod.length) * 100 : 0,
            averageProcessingTime: 2.5 // hours (simulated)
          }
        };
        break;
        
      case 'aml':
        const amlScreeningsInPeriod = amlScreenings.filter(a => 
          new Date(a.lastChecked) >= startDate
        );
        
        metrics = {
          period,
          reportType: 'aml',
          data: {
            totalScreenings: amlScreeningsInPeriod.length,
            cleanScreenings: amlScreeningsInPeriod.filter(a => a.status === 'clean').length,
            flaggedScreenings: amlScreeningsInPeriod.filter(a => a.status === 'flagged').length,
            reportedScreenings: amlScreeningsInPeriod.filter(a => a.status === 'reported').length,
            cleanRate: amlScreeningsInPeriod.length > 0 ? 
              (amlScreeningsInPeriod.filter(a => a.status === 'clean').length / amlScreeningsInPeriod.length) * 100 : 0,
            highRiskScreenings: amlScreeningsInPeriod.filter(a => a.riskLevel === 'high' || a.riskLevel === 'critical').length
          }
        };
        break;
        
      case 'transactions':
        const transactionsInPeriod = transactionMonitorings.filter(t => 
          new Date(t.createdAt) >= startDate
        );
        
        metrics = {
          period,
          reportType: 'transactions',
          data: {
            totalTransactions: transactionsInPeriod.length,
            flaggedTransactions: transactionsInPeriod.filter(t => t.status === 'flagged').length,
            reportedTransactions: transactionsInPeriod.filter(t => t.status === 'reported').length,
            averageRiskScore: transactionsInPeriod.length > 0 ? 
              transactionsInPeriod.reduce((sum, t) => sum + t.riskScore, 0) / transactionsInPeriod.length : 0,
            totalVolume: transactionsInPeriod.reduce((sum, t) => sum + (t.flags.find(f => f.actualValue)?.actualValue || 0), 0)
          }
        };
        break;
        
      default:
        // Full metrics report
        const allMetrics = {
          overview: getComplianceOverview(),
          risks: getRiskMetrics(),
          period,
          generatedAt: new Date().toISOString()
        };
        
        metrics = allMetrics;
    }

    return NextResponse.json<ApiResponse<any>>({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard metrics error:', error);
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

// POST /api/compliance/dashboard/alerts - Create custom dashboard alert (admin only)
export async function POST(request: NextRequest) {
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
          message: 'Admin privileges required for creating alerts'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const body = await request.json();
    const { alertType, severity, title, description, targetUserId } = body;

    if (!alertType || !title || !description) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Alert type, title, and description are required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const complianceAlert: ComplianceAlert = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: targetUserId || 'system',
      alertType,
      severity: severity || 'warning',
      title,
      description,
      actionRequired: severity === 'critical' || severity === 'high',
      status: 'open',
      createdAt: new Date().toISOString()
    };

    complianceAlerts.push(complianceAlert);

    return NextResponse.json<ApiResponse<ComplianceAlert>>({
      success: true,
      data: complianceAlert,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard alert POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create dashboard alert'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PATCH /api/compliance/dashboard/alerts/:id - Update alert status (admin only)
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
          message: 'Admin privileges required for updating alerts'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');
    
    if (!alertId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Alert ID is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const body = await request.json();
    const { status, assignedTo, notes } = body;

    // Find alert in both risk alerts and compliance alerts
    let alert = riskAlerts.find(a => a.id === alertId) || 
                complianceAlerts.find(a => a.id === alertId);
    
    if (!alert) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Alert not found'
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Update alert
    if (status) {
      const validStatuses: ComplianceAlert['status'][] = ['open', 'in_progress', 'resolved', 'closed'];
      if (validStatuses.includes(status)) {
        alert.status = status;
      }
    }
    
    if (assignedTo) {
      alert.assignedTo = assignedTo;
    }

    // Update resolved timestamp if status is resolved or closed
    if (status === 'resolved' || status === 'closed') {
      alert.resolvedAt = new Date().toISOString();
    }

    // Add notes if provided
    if (notes) {
      (alert as any).notes = notes;
      (alert as any).lastUpdatedBy = userId;
      (alert as any).lastUpdatedAt = new Date().toISOString();
    }

    return NextResponse.json<ApiResponse<ComplianceAlert>>({
      success: true,
      data: alert as ComplianceAlert,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Dashboard alert PATCH error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update dashboard alert'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}