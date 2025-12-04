// Compliance Rules Engine API
// Author: MiniMax Agent
// Date: 2025-12-05
// Purpose: Configurable compliance rules engine and monitoring system

import { NextRequest, NextResponse } from 'next/server';
import {
  ComplianceRule,
  RuleCondition,
  RuleAction,
  ApiResponse,
  PaginatedResponse
} from '../../../../shared/types/risk-compliance';

// Rule execution result interface
interface RuleExecutionResult {
  id: string;
  ruleId: string;
  timestamp: string;
  triggerData: any;
  conditionsMet: boolean[];
  actionsExecuted: {
    action: RuleAction;
    success: boolean;
    error?: string;
  }[];
  executionTime: number;
  result: 'success' | 'failure' | 'partial_success';
}

// Rule execution log interface
interface RuleExecutionLog {
  id: string;
  ruleId: string;
  timestamp: string;
  triggerData: any;
  matched: boolean;
  conditionsEvaluated: {
    condition: RuleCondition;
    value: any;
    met: boolean;
  }[];
  actionsTaken: {
    action: RuleAction;
    executed: boolean;
    timestamp?: string;
    result?: any;
  }[];
  performance: {
    evaluationTime: number;
    actionExecutionTime: number;
  };
}

// In-memory storage (in production, use database)
let complianceRules: ComplianceRule[] = [];
let ruleExecutionResults: RuleExecutionResult[] = [];
let ruleExecutionLogs: RuleExecutionLog[] = [];

// Helper function to generate unique IDs
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Helper function to evaluate a single condition
const evaluateCondition = (condition: RuleCondition, data: any): { met: boolean; value: any } => {
  const fieldValue = data[condition.field];
  
  switch (condition.operator) {
    case 'equals':
      return { met: fieldValue === condition.value, value: fieldValue };
      
    case 'greater_than':
      return { met: Number(fieldValue) > Number(condition.value), value: fieldValue };
      
    case 'less_than':
      return { met: Number(fieldValue) < Number(condition.value), value: fieldValue };
      
    case 'contains':
      return { met: String(fieldValue).includes(String(condition.value)), value: fieldValue };
      
    case 'regex':
      try {
        const regex = new RegExp(String(condition.value));
        return { met: regex.test(String(fieldValue)), value: fieldValue };
      } catch (e) {
        return { met: false, value: fieldValue };
      }
      
    case 'in_range':
      const range = Array.isArray(condition.value) ? condition.value : [condition.value, condition.value];
      return { met: Number(fieldValue) >= Number(range[0]) && Number(fieldValue) <= Number(range[1]), value: fieldValue };
      
    default:
      return { met: false, value: fieldValue };
  }
};

// Helper function to execute rule actions
const executeActions = async (
  actions: RuleAction[], 
  rule: ComplianceRule, 
  data: any
): Promise<RuleExecutionResult['actionsExecuted']> => {
  const results: RuleExecutionResult['actionsExecuted'] = [];
  
  for (const action of actions) {
    try {
      let actionResult: any;
      
      switch (action.type) {
        case 'alert':
          // Create alert (implementation would depend on alert system)
          actionResult = { alertCreated: true, message: action.message };
          break;
          
        case 'flag':
          // Flag the entity (implementation would depend on flagging system)
          actionResult = { flagged: true, reason: action.message };
          break;
          
        case 'block':
          // Block the action (implementation would depend on blocking system)
          actionResult = { blocked: true, reason: action.message };
          break;
          
        case 'report':
          // Generate report (implementation would depend on reporting system)
          actionResult = { reportGenerated: true, type: action.type };
          break;
          
        case 'freeze_account':
          // Freeze account (implementation would depend on account management)
          actionResult = { accountFrozen: true, reason: action.message };
          break;
          
        default:
          actionResult = { unknownAction: true };
      }
      
      results.push({
        action,
        success: true,
        result: actionResult
      });
      
      // Simulate action execution delay
      if (action.autoExecute) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
    } catch (error) {
      results.push({
        action,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  return results;
};

// Helper function to evaluate all conditions for a rule
const evaluateRuleConditions = (
  rule: ComplianceRule, 
  data: any
): { conditionsMet: boolean[]; evaluations: RuleExecutionLog['conditionsEvaluated'] } => {
  const evaluations: RuleExecutionLog['conditionsEvaluated'] = [];
  const conditionsMet: boolean[] = [];
  
  for (const condition of rule.conditions) {
    const evaluation = evaluateCondition(condition, data);
    evaluations.push({
      condition,
      value: evaluation.value,
      met: evaluation.met
    });
    conditionsMet.push(evaluation.met);
  }
  
  return { conditionsMet, evaluations };
};

// Helper function to check if all conditions are met (AND logic)
const areAllConditionsMet = (conditionsMet: boolean[]): boolean => {
  return conditionsMet.length === 0 || conditionsMet.every(met => met);
};

// Initialize with default compliance rules
const initializeDefaultRules = () => {
  complianceRules = [
    {
      id: 'rule-001',
      name: 'Large Transaction Detection',
      description: 'Flag transactions above $50,000 for enhanced monitoring',
      category: 'transaction_monitoring',
      severity: 'high',
      isActive: true,
      conditions: [
        {
          field: 'amount',
          operator: 'greater_than',
          value: 50000,
          threshold: 50000
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 'warning',
          message: 'Large transaction detected',
          autoExecute: true
        },
        {
          type: 'flag',
          severity: 'warning',
          message: 'Enhanced monitoring required',
          autoExecute: true
        }
      ],
      triggerCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'rule-002',
      name: 'High-Risk Jurisdiction Check',
      description: 'Flag transactions from high-risk jurisdictions',
      category: 'aml',
      severity: 'critical',
      isActive: true,
      conditions: [
        {
          field: 'originCountry',
          operator: 'in_range',
          value: ['IR', 'KP', 'SY', 'CU', 'RU']
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 'error',
          message: 'High-risk jurisdiction detected',
          autoExecute: true
        },
        {
          type: 'flag',
          severity: 'critical',
          message: 'AML review required',
          autoExecute: true
        },
        {
          type: 'block',
          severity: 'critical',
          message: 'Transaction blocked - high-risk jurisdiction',
          autoExecute: false
        }
      ],
      triggerCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'rule-003',
      name: 'Rapid Trading Pattern',
      description: 'Detect and flag rapid trading patterns',
      category: 'transaction_monitoring',
      severity: 'medium',
      isActive: true,
      conditions: [
        {
          field: 'transactionCount',
          operator: 'greater_than',
          value: 50,
          threshold: 50
        },
        {
          field: 'timeWindow',
          operator: 'less_than',
          value: 3600, // 1 hour in seconds
          threshold: 3600
        }
      ],
      actions: [
        {
          type: 'alert',
          severity: 'warning',
          message: 'Rapid trading pattern detected',
          autoExecute: true
        }
      ],
      triggerCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ];
};

// Initialize rules on module load
initializeDefaultRules();

// GET /api/compliance/rules - Get compliance rules
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const severity = searchParams.get('severity');
    const isActive = searchParams.get('isActive');
    const ruleId = searchParams.get('id');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let filteredRules = [...complianceRules];
    
    // Apply filters
    if (ruleId) {
      filteredRules = filteredRules.filter(r => r.id === ruleId);
    }
    
    if (category) {
      filteredRules = filteredRules.filter(r => r.category === category);
    }
    
    if (severity) {
      filteredRules = filteredRules.filter(r => r.severity === severity);
    }
    
    if (isActive !== null) {
      const activeBool = isActive === 'true';
      filteredRules = filteredRules.filter(r => r.isActive === activeBool);
    }
    
    // Regular users can only see active rules
    if (adminRole !== 'compliance_officer' && adminRole !== 'admin') {
      filteredRules = filteredRules.filter(r => r.isActive);
    }
    
    // Sort by name
    filteredRules.sort((a, b) => a.name.localeCompare(b.name));
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedRules = filteredRules.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<ComplianceRule> = {
      data: paginatedRules,
      pagination: {
        page,
        limit,
        total: filteredRules.length,
        totalPages: Math.ceil(filteredRules.length / limit),
        hasNext: endIndex < filteredRules.length,
        hasPrevious: page > 1
      }
    };
    
    return NextResponse.json<ApiResponse<PaginatedResponse<ComplianceRule>>>({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Rules GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve compliance rules'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/compliance/rules - Create new compliance rule (admin only)
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
          message: 'Admin privileges required for creating rules'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const body = await request.json();
    const { 
      name, 
      description, 
      category, 
      severity, 
      conditions, 
      actions, 
      isActive = true 
    } = body;

    // Validate required fields
    if (!name || !description || !category || !conditions || !actions) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Name, description, category, conditions, and actions are required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validate category
    const validCategories: ComplianceRule['category'][] = [
      'aml', 'kyc', 'transaction_monitoring', 'sanctions', 'market_abuse'
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid category'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validate severity
    const validSeverities: ComplianceRule['severity'][] = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(severity)) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid severity level'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validate conditions
    if (!Array.isArray(conditions) || conditions.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one condition is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Validate actions
    if (!Array.isArray(actions) || actions.length === 0) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'At least one action is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Create new rule
    const newRule: ComplianceRule = {
      id: generateId(),
      name,
      description,
      category,
      severity,
      isActive,
      conditions,
      actions,
      triggerCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    complianceRules.push(newRule);

    return NextResponse.json<ApiResponse<ComplianceRule>>({
      success: true,
      data: newRule,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rules POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create compliance rule'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// PATCH /api/compliance/rules/:id - Update compliance rule (admin only)
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
          message: 'Admin privileges required for updating rules'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');
    
    if (!ruleId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rule ID is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, category, severity, conditions, actions, isActive } = body;

    const rule = complianceRules.find(r => r.id === ruleId);
    
    if (!rule) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Compliance rule not found'
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Update rule fields
    if (name) rule.name = name;
    if (description) rule.description = description;
    if (category) {
      const validCategories: ComplianceRule['category'][] = ['aml', 'kyc', 'transaction_monitoring', 'sanctions', 'market_abuse'];
      if (validCategories.includes(category)) {
        rule.category = category;
      }
    }
    if (severity) {
      const validSeverities: ComplianceRule['severity'][] = ['low', 'medium', 'high', 'critical'];
      if (validSeverities.includes(severity)) {
        rule.severity = severity;
      }
    }
    if (conditions) {
      if (Array.isArray(conditions) && conditions.length > 0) {
        rule.conditions = conditions;
      }
    }
    if (actions) {
      if (Array.isArray(actions) && actions.length > 0) {
        rule.actions = actions;
      }
    }
    if (typeof isActive === 'boolean') {
      rule.isActive = isActive;
    }

    rule.updatedAt = new Date().toISOString();

    return NextResponse.json<ApiResponse<ComplianceRule>>({
      success: true,
      data: rule,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rules PATCH error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update compliance rule'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// DELETE /api/compliance/rules/:id - Delete compliance rule (admin only)
export async function DELETE(request: NextRequest) {
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
          message: 'Admin privileges required for deleting rules'
        },
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ruleId = searchParams.get('id');
    
    if (!ruleId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rule ID is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const ruleIndex = complianceRules.findIndex(r => r.id === ruleId);
    
    if (ruleIndex === -1) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Compliance rule not found'
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    // Remove rule
    complianceRules.splice(ruleIndex, 1);

    return NextResponse.json<ApiResponse<null>>({
      success: true,
      data: null,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rules DELETE error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to delete compliance rule'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// POST /api/compliance/rules/:id/evaluate - Evaluate rule against data
export async function POST_evaluate(request: NextRequest) {
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
    const ruleId = searchParams.get('id');
    
    if (!ruleId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rule ID is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const body = await request.json();
    const { triggerData } = body;

    if (!triggerData) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Trigger data is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const rule = complianceRules.find(r => r.id === ruleId);
    
    if (!rule) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Compliance rule not found'
        },
        timestamp: new Date().toISOString()
      }, { status: 404 });
    }

    if (!rule.isActive) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'RULE_INACTIVE',
          message: 'Rule is not active'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const evaluationStartTime = Date.now();
    
    // Evaluate conditions
    const { conditionsMet, evaluations } = evaluateRuleConditions(rule, triggerData);
    const conditionsResult = areAllConditionsMet(conditionsMet);
    
    const evaluationTime = Date.now() - evaluationStartTime;
    let actionsExecuted: RuleExecutionResult['actionsExecuted'] = [];
    let executionTime = evaluationTime;
    
    // Execute actions if conditions are met
    if (conditionsResult) {
      const actionStartTime = Date.now();
      actionsExecuted = await executeActions(rule.actions, rule, triggerData);
      executionTime += Date.now() - actionStartTime;
      
      // Update rule trigger count
      rule.triggerCount += 1;
      rule.lastTriggered = new Date().toISOString();
      rule.updatedAt = new Date().toISOString();
    }

    // Create execution result
    const executionResult: RuleExecutionResult = {
      id: generateId(),
      ruleId,
      timestamp: new Date().toISOString(),
      triggerData,
      conditionsMet,
      actionsExecuted,
      executionTime,
      result: conditionsResult && actionsExecuted.every(a => a.success) ? 'success' : 
              conditionsResult && actionsExecuted.some(a => a.success) ? 'partial_success' : 'failure'
    };

    ruleExecutionResults.push(executionResult);

    // Create execution log
    const executionLog: RuleExecutionLog = {
      id: generateId(),
      ruleId,
      timestamp: new Date().toISOString(),
      triggerData,
      matched: conditionsResult,
      conditionsEvaluated: evaluations,
      actionsTaken: actionsExecuted.map(result => ({
        action: result.action,
        executed: result.success,
        timestamp: new Date().toISOString(),
        result: result.result
      })),
      performance: {
        evaluationTime,
        actionExecutionTime: executionTime - evaluationTime
      }
    };

    ruleExecutionLogs.push(executionLog);

    return NextResponse.json<ApiResponse<RuleExecutionResult>>({
      success: true,
      data: executionResult,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Rule evaluation POST error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to evaluate compliance rule'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// GET /api/compliance/rules/:id/executions - Get rule execution history
export async function GET_executions(request: NextRequest) {
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
    const ruleId = searchParams.get('id');
    const result = searchParams.get('result');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (!ruleId) {
      return NextResponse.json<ApiResponse<null>>({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rule ID is required'
        },
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    let filteredExecutions = ruleExecutionResults.filter(r => r.ruleId === ruleId);
    
    // Apply filters
    if (result) {
      filteredExecutions = filteredExecutions.filter(r => r.result === result);
    }
    
    // Sort by timestamp, newest first
    filteredExecutions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedExecutions = filteredExecutions.slice(startIndex, endIndex);
    
    const response: PaginatedResponse<RuleExecutionResult> = {
      data: paginatedExecutions,
      pagination: {
        page,
        limit,
        total: filteredExecutions.length,
        totalPages: Math.ceil(filteredExecutions.length / limit),
        hasNext: endIndex < filteredExecutions.length,
        hasPrevious: page > 1
      }
    };
    
    return NextResponse.json<ApiResponse<PaginatedResponse<RuleExecutionResult>>>({
      success: true,
      data: response,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Rule executions GET error:', error);
    return NextResponse.json<ApiResponse<null>>({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve rule execution history'
      },
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}