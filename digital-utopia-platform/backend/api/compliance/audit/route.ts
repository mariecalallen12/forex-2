// Audit & Logging API
// Author: MiniMax Agent
// Date: 2025-12-05
// Purpose: Comprehensive audit trail and security event logging system

import { NextRequest, NextResponse } from 'next/server';
import {
  ApiResponse,
  PaginatedResponse
} from '../../../../shared/types/risk-compliance';

// Audit log entry interface
interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details: any;
  ipAddress: string;
  userAgent: string;
  sessionId?: string;
  result: 'success' | 'failure' | 'warning';
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'authentication' | 'authorization' | 'data_access' | 'system' | 'compliance' | 'security';
  previousValue?: any;
  newValue?: any;
  riskScore?: number;
}

// Security event interface
interface SecurityEvent {
  id: string;
  timestamp: string;
  eventType: 'login_attempt' | 'failed_login' | 'password_change' | 'suspicious_activity' | 'data_breach' | 'system_breach';
  userId?: string;
  ipAddress: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: any;
  mitigated: boolean;
  mitigationActions?: string[];
  resolvedAt?: string;
}

// Compliance event interface
interface ComplianceEvent {
  id: string;
  timestamp: string;
  eventType: 'kyc_submission' | 'kyc_approval' | 'aml_screening' | 'transaction_flag' | 'report_generation' | 'audit_trail';
  userId?: string;
  adminId?: string;
  details: any;
  jurisdiction?: string;
  regulatoryImpact: 'low' | 'medium' | 'high';
  requiresAction: boolean;
  actionCompleted: boolean;
  completedAt?: string;
}

// In-memory storage (in production, use database)
let auditLogs: AuditLogEntry[] = [];
let securityEvents: SecurityEvent[] = [];
let complianceEvents: ComplianceEvent[] = [];

// Helper function to generate unique IDs
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to create audit log entry
const createAuditLog = (
  userId: string,
  action: string,
  resource: string,
  details: any,
  request: NextRequest,
  severity: AuditLogEntry['severity'] = 'medium',
  category: AuditLogEntry['category'] = 'system'
): AuditLogEntry => {
  const ipAddress = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    userId,
    userRole: request.headers.get('admin-role') || 'user',
    action,
    resource,
    details,
    ipAddress,
    userAgent,
    sessionId: request.headers.get('session-id') || undefined,
    result: 'success',
    severity,
    category
  };
};

// Helper function to create security event
const createSecurityEvent = (
  eventType: SecurityEvent['eventType'],
  ipAddress: string,
  details: any,
  severity: SecurityEvent['severity'] = 'medium'
): SecurityEvent => {
  return {
    id: generateId(),
    timestamp: new Date().toISOString(),
    eventType,
    ipAddress,
    severity,
    description: getSecurityEventDescription(eventType, details),
    details,
    mitigated: false
  };
};

// Helper function to get security event description
const getSecurityEventDescription = (eventType: SecurityEvent['eventType'], details: any): string => {
  switch (eventType) {
    case 'login_attempt':
      return `User login attempt for ${details.username}`;
    case 'failed_login':
      return `Failed login attempt for ${details.username} - ${details.reason}`;
    case 'password_change':
      return `Password changed for user ${details.userId}`;
    case 'suspicious_activity':
      return `Suspicious activity detected: ${details.description}`;
    case 'data_breach':
      return `Data breach attempt detected from ${details.source}`;
    case 'system_breach':
      return `System breach attempt detected: ${details.attackType}`;
    default:
      return 'Security event detected';
  }
};

// Middleware-like function to log API requests
const logApiRequest = (request: NextRequest, userId?: string) => {
  if (!userId) return;
  
  const url = new URL(request.url);
  const method = request.method;
  
  const auditLog = createAuditLog(
    userId,
    `${method} ${url.pathname}`,
    url.pathname,
    {
      method,
      queryParams: Object.fromEntries(url.searchParams.entries()),
      headers: Object.fromEntries(request.headers.entries())
    },
    request,
    method === 'GET' ? 'low' : 'medium',
    'data_access'
  );
  
  auditLogs.push(auditLog);
};

// GET /api/compliance/audit - Get audit logs
export async function GET(request: NextRequest) {
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

    // Only admins can view all audit logs, users can only view their own
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const result = searchParams.get('result');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    
    let filteredLogs = [...auditLogs];
    
    // Apply user permissions
    if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
      // Regular users can only see their own logs
      filteredLogs = filteredLogs.filter(log => log.userId === userId);
    } else if (targetUserId) {
      // Admins can filter by specific user
      filteredLogs = filteredLogs.filter(log => log.userId === targetUserId);
    }
    
    // Apply filters
    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }
    
    if (severity) {
      filteredLogs = filteredLogs.filter(log => log.severity === severity);
    }
    
    if (result) {
      filteredLogs = filteredLogs.filter(log => log.result === result);
    }
    
    if (startDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= new Date(startDate));
    }
    
    if (endDate) {
      filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) <= new Date(endDate));
    }
    
    // Sort by timestamp, newest first
    filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedLogs = filteredLogs.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<AuditLogEntry> = {
      data: paginatedLogs,
      pagination: {
        page,
        limit,
        total: filteredLogs.length,
        totalPages: Math.ceil(filteredLogs.length / limit),
        hasNext: endIndex < filteredLogs.length,
        hasPrevious: page > 1
      }
    };
    
    return NextResponse.json<ApiResponse<PaginatedResponse<AuditLogEntry>>>({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Audit logs GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve audit logs'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/compliance/audit - Create audit log entry
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
      action, 
      resource, 
      details, 
      severity = 'medium', 
      category = 'system',
      previousValue,
      newValue,
      resourceId 
    } = body;

    if (!action || !resource) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Action and resource are required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const auditLog = createAuditLog(
      userId,
      action,
      resource,
      details,
      request,
      severity,
      category
    );
    
    auditLog.previousValue = previousValue;
    auditLog.newValue = newValue;
    auditLog.resourceId = resourceId;

    auditLogs.push(auditLog);

    return NextResponse.json<ApiResponse<AuditLogEntry>>({
      success: true,
      data: auditLog,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Audit log POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create audit log entry'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET /api/compliance/audit/security - Get security events
export async function GET_security(request: NextRequest) {
  try {
    const adminRole = request.headers.get('admin-role');
    
    if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Admin privileges required for security events'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventType = searchParams.get('eventType');
    const severity = searchParams.get('severity');
    const mitigated = searchParams.get('mitigated');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let filteredEvents = [...securityEvents];
    
    // Apply filters
    if (eventType) {
      filteredEvents = filteredEvents.filter(e => e.eventType === eventType);
    }
    
    if (severity) {
      filteredEvents = filteredEvents.filter(e => e.severity === severity);
    }
    
    if (mitigated !== null) {
      const isMitigated = mitigated === 'true';
      filteredEvents = filteredEvents.filter(e => e.mitigated === isMitigated);
    }
    
    // Sort by timestamp, newest first
    filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<SecurityEvent> = {
      data: paginatedEvents,
      pagination: {
        page,
        limit,
        total: filteredEvents.length,
        totalPages: Math.ceil(filteredEvents.length / limit),
        hasNext: endIndex < filteredEvents.length,
        hasPrevious: page > 1
      }
    };
    
    return NextResponse.json<ApiResponse<PaginatedResponse<SecurityEvent>>>({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Security events GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve security events'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/compliance/audit/security - Create security event
export async function POST_security(request: NextRequest) {
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
    const { eventType, details, severity = 'medium', targetUserId } = body;

    if (!eventType) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Event type is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';

    const securityEvent = createSecurityEvent(
      eventType,
      ipAddress,
      { ...details, createdBy: userId, targetUserId },
      severity
    );
    
    if (targetUserId) {
      securityEvent.userId = targetUserId;
    }

    securityEvents.push(securityEvent);

    // Also create audit log for security events
    const auditLog = createAuditLog(
      userId,
      `SECURITY_EVENT_${eventType.toUpperCase()}`,
      'security',
      securityEvent,
      request,
      severity,
      'security'
    );
    
    auditLogs.push(auditLog);

    return NextResponse.json<ApiResponse<SecurityEvent>>({
      success: true,
      data: securityEvent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Security event POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create security event'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PATCH /api/compliance/audit/security/:id - Update security event (admin only)
export async function PATCH_security(request: NextRequest) {
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
          message: 'Admin privileges required for updating security events'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    
    if (!eventId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Event ID is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const body = await request.json();
    const { mitigated, mitigationActions, notes } = body;

    const securityEvent = securityEvents.find(e => e.id === eventId);
    
    if (!securityEvent) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Security event not found'
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Update security event
    if (typeof mitigated === 'boolean') {
      securityEvent.mitigated = mitigated;
    }
    
    if (mitigationActions && Array.isArray(mitigationActions)) {
      securityEvent.mitigationActions = mitigationActions;
    }
    
    if (mitigated) {
      securityEvent.resolvedAt = new Date().toISOString();
    }

    // Add notes
    if (notes) {
      securityEvent.details.notes = notes;
      securityEvent.details.lastUpdatedBy = userId;
      securityEvent.details.lastUpdatedAt = new Date().toISOString();
    }

    return NextResponse.json<ApiResponse<SecurityEvent>>({
      success: true,
      data: securityEvent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Security event PATCH error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update security event'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET /api/compliance/audit/compliance - Get compliance events
export async function GET_compliance(request: NextRequest) {
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

    // Only admins can view all compliance events, users can only view their own
    const { searchParams } = new URL(request.url);
    const targetUserId = searchParams.get('userId');
    const eventType = searchParams.get('eventType');
    const jurisdiction = searchParams.get('jurisdiction');
    const requiresAction = searchParams.get('requiresAction');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let filteredEvents = [...complianceEvents];
    
    // Apply user permissions
    if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
      // Regular users can only see their own events
      filteredEvents = filteredEvents.filter(e => e.userId === userId || e.adminId === userId);
    } else if (targetUserId) {
      // Admins can filter by specific user
      filteredEvents = filteredEvents.filter(e => e.userId === targetUserId);
    }
    
    // Apply filters
    if (eventType) {
      filteredEvents = filteredEvents.filter(e => e.eventType === eventType);
    }
    
    if (jurisdiction) {
      filteredEvents = filteredEvents.filter(e => e.jurisdiction === jurisdiction);
    }
    
    if (requiresAction !== null) {
      const requiresActionBool = requiresAction === 'true';
      filteredEvents = filteredEvents.filter(e => e.requiresAction === requiresActionBool);
    }
    
    // Sort by timestamp, newest first
    filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedEvents = filteredEvents.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<ComplianceEvent> = {
      data: paginatedEvents,
      pagination: {
        page,
        limit,
        total: filteredEvents.length,
        totalPages: Math.ceil(filteredEvents.length / limit),
        hasNext: endIndex < filteredEvents.length,
        hasPrevious: page > 1
      }
    };
    
    return NextResponse.json<ApiResponse<PaginatedResponse<ComplianceEvent>>>({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Compliance events GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve compliance events'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/compliance/audit/compliance - Create compliance event
export async function POST_compliance(request: NextRequest) {
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

    const body = await request.json();
    const { 
      eventType, 
      details, 
      jurisdiction = 'US', 
      regulatoryImpact = 'medium',
      targetUserId 
    } = body;

    if (!eventType) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Event type is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const complianceEvent: ComplianceEvent = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      eventType,
      details: { ...details, createdBy: userId },
      jurisdiction,
      regulatoryImpact,
      requiresAction: regulatoryImpact === 'high' || regulatoryImpact === 'critical',
      actionCompleted: false
    };

    if (targetUserId) {
      complianceEvent.userId = targetUserId;
    }
    
    if (adminRole === 'compliance_officer' || adminRole === 'admin') {
      complianceEvent.adminId = userId;
    }

    complianceEvents.push(complianceEvent);

    // Also create audit log for compliance events
    const auditLog = createAuditLog(
      userId,
      `COMPLIANCE_EVENT_${eventType.toUpperCase()}`,
      'compliance',
      complianceEvent,
      request,
      regulatoryImpact === 'critical' ? 'critical' : regulatoryImpact === 'high' ? 'high' : 'medium',
      'compliance'
    );
    
    auditLogs.push(auditLog);

    return NextResponse.json<ApiResponse<ComplianceEvent>>({
      success: true,
      data: complianceEvent,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Compliance event POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create compliance event'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}