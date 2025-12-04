// Phase 5: Risk Management & Compliance Types
// Author: MiniMax Agent
// Date: 2025-12-05
// Purpose: Comprehensive type definitions for Phase 5 features

// ============================================================================
// RISK MANAGEMENT TYPES
// ============================================================================

export interface RiskLimit {
  id: string;
  userId: string;
  symbol: string;
  limitType: 'position_size' | 'exposure' | 'leverage' | 'daily_loss' | 'daily_volume';
  limitValue: number;
  currentValue: number;
  status: 'active' | 'breached' | 'disabled';
  createdAt: string;
  updatedAt: string;
  autoClose?: boolean;
}

export interface PositionLimit extends RiskLimit {
  limitType: 'position_size' | 'exposure' | 'leverage';
  maxPosition: number;
  maxExposure: number;
  maxLeverage: number;
}

export interface DailyLimit extends RiskLimit {
  limitType: 'daily_loss' | 'daily_volume';
  dailyLossLimit: number;
  dailyVolumeLimit: number;
  currentDailyLoss: number;
  currentDailyVolume: number;
}

export interface RiskExposure {
  id: string;
  userId: string;
  symbol: string;
  positionValue: number;
  exposurePercentage: number;
  riskScore: number;
  leverageUsed: number;
  marginUsed: number;
  availableMargin: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  calculatedAt: string;
}

export interface PortfolioRisk {
  totalExposure: number;
  totalPortfolioValue: number;
  exposurePercentage: number;
  riskScore: number;
  maxDrawdown: number;
  sharpeRatio: number;
  var95: number; // Value at Risk 95%
  var99: number; // Value at Risk 99%
  concentrationRisk: number;
  correlationRisk: number;
  liquidityRisk: number;
  marketRisk: number;
  calculatedAt: string;
}

export interface RiskAlert {
  id: string;
  userId: string;
  alertType: 'position_limit' | 'exposure_limit' | 'margin_call' | 'risk_threshold' | 'compliance_violation';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  data: any;
  isRead: boolean;
  isResolved: boolean;
  createdAt: string;
  resolvedAt?: string;
}

export interface MarginCall {
  id: string;
  userId: string;
  positionId: string;
  symbol: string;
  marginRequired: number;
  marginAvailable: number;
  marginShortfall: number;
  liquidationPrice: number;
  currentPrice: number;
  status: 'pending' | 'resolved' | 'liquidated';
  issuedAt: string;
  resolvedAt?: string;
}

// ============================================================================
// KYC/AML COMPLIANCE TYPES
// ============================================================================

export interface KYCProfile {
  id: string;
  userId: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'expired';
  verificationLevel: 'basic' | 'intermediate' | 'advanced';
  personalInfo: PersonalInfo;
  addressInfo: AddressInfo;
  identityDocuments: IdentityDocument[];
  verificationHistory: VerificationHistory[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  middleName?: string;
  dateOfBirth: string;
  placeOfBirth: string;
  nationality: string;
  phoneNumber: string;
  email: string;
}

export interface AddressInfo {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressProofDocument?: string;
}

export interface IdentityDocument {
  id: string;
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement';
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  issuingAuthority: string;
  fileUrl: string;
  fileHash: string;
  status: 'pending' | 'approved' | 'rejected';
  verifiedAt?: string;
  rejectionReason?: string;
}

export interface VerificationHistory {
  id: string;
  action: 'submitted' | 'review_started' | 'approved' | 'rejected' | 'expired';
  performedBy: string;
  reason?: string;
  details?: any;
  timestamp: string;
}

export interface AMLScreening {
  id: string;
  userId: string;
  screeningType: 'initial' | 'periodic' | 'transaction' | 'enhanced_due_diligence';
  status: 'clean' | 'flagged' | 'investigating' | 'reported';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  findings: AMLFinding[];
  lastChecked: string;
  nextReview: string;
  reportedAt?: string;
  reportReference?: string;
}

export interface AMLFinding {
  category: 'sanctions' | 'pep' | 'adverse_media' | 'suspicious_activity' | 'negative_news';
  source: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number; // 0-100
  actionTaken: string;
  timestamp: string;
}

// ============================================================================
// TRANSACTION MONITORING TYPES
// ============================================================================

export interface TransactionMonitoring {
  id: string;
  transactionId: string;
  userId: string;
  monitoringType: 'real_time' | 'batch' | 'enhanced';
  status: 'clean' | 'flagged' | 'investigating' | 'reported';
  riskScore: number;
  flags: MonitoringFlag[];
  reviewed: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface MonitoringFlag {
  id: string;
  flagType: 'large_amount' | 'rapid_trading' | 'structuring' | 'unusual_pattern' | 'high_risk_jurisdiction' | 'suspicious_behavior';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  rule: string;
  threshold?: number;
  actualValue?: number;
  confidence: number;
}

export interface SuspiciousActivity {
  id: string;
  userId: string;
  activityType: 'wash_trading' | 'pump_dump' | 'money_laundering' | 'fraud' | 'market_manipulation';
  description: string;
  evidence: any;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  status: 'reported' | 'investigating' | 'resolved' | 'false_positive';
  reportedBy: string;
  reportedAt: string;
  assignedTo?: string;
  investigationNotes?: string;
  resolution?: string;
  resolvedAt?: string;
}

export interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  category: 'aml' | 'kyc' | 'transaction_monitoring' | 'sanctions' | 'market_abuse';
  severity: 'low' | 'medium' | 'high' | 'critical';
  isActive: boolean;
  conditions: RuleCondition[];
  actions: RuleAction[];
  lastTriggered?: string;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface RuleCondition {
  field: string;
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains' | 'regex' | 'in_range';
  value: any;
  threshold?: number;
}

export interface RuleAction {
  type: 'alert' | 'block' | 'flag' | 'report' | 'freeze_account';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  autoExecute: boolean;
}

// ============================================================================
// REGULATORY REPORTING TYPES
// ============================================================================

export interface RegulatoryReport {
  id: string;
  reportType: 'suspicious_activity' | 'large_transaction' | 'kyc_data' | 'compliance_summary' | 'risk_assessment';
  jurisdiction: string;
  status: 'draft' | 'submitted' | 'accepted' | 'rejected';
  data: any;
  submittedBy: string;
  submittedAt?: string;
  dueDate: string;
  referenceNumber?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface SARReport extends RegulatoryReport {
  reportType: 'suspicious_activity';
  sarNumber: string;
  suspiciousActivity: {
    activityType: string;
    description: string;
    timeline: string;
    parties: string[];
    amounts: number;
    indicators: string[];
  };
  narrative: string;
  recommendedAction: string;
}

export interface CTRReport extends RegulatoryReport {
  reportType: 'large_transaction';
  transactionDetails: {
    transactionId: string;
    amount: number;
    currency: string;
    transactionType: string;
    timestamp: string;
    origin: string;
    destination: string;
  };
  customerDetails: {
    name: string;
    accountNumber: string;
    address: string;
    identification: string;
  };
}

export interface ComplianceMetrics {
  totalReports: number;
  reportsByType: Record<string, number>;
  reportsByStatus: Record<string, number>;
  averageProcessingTime: number;
  complianceScore: number;
  riskMetrics: {
    highRiskUsers: number;
    flaggedTransactions: number;
    suspiciousActivities: number;
    kycCompletionRate: number;
  };
  auditFindings: AuditFinding[];
  calculatedAt: string;
}

export interface AuditFinding {
  id: string;
  category: 'process' | 'system' | 'data' | 'policy' | 'training';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  assignedTo?: string;
  dueDate?: string;
  resolvedAt?: string;
}

// ============================================================================
// MARGIN & LEVERAGE TYPES
// ============================================================================

export interface MarginAccount {
  id: string;
  userId: string;
  accountType: 'standard' | 'professional' | 'institutional';
  currency: string;
  totalBalance: number;
  availableBalance: number;
  marginUsed: number;
  marginAvailable: number;
  maintenanceMargin: number;
  initialMargin: number;
  leverage: number;
  marginLevel: number; // equity / margin_used
  status: 'active' | 'restricted' | 'liquidated' | 'closed';
  openedAt: string;
  updatedAt: string;
}

export interface Position {
  id: string;
  userId: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  currentPrice: number;
  marginUsed: number;
  unrealizedPnl: number;
  leverage: number;
  liquidationPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  openedAt: string;
  updatedAt: string;
}

export interface OrderBook {
  symbol: string;
  bids: [number, number][]; // [price, quantity]
  asks: [number, number][]; // [price, quantity]
  timestamp: string;
}

export interface LiquidationEvent {
  id: string;
  userId: string;
  positionId: string;
  symbol: string;
  side: 'long' | 'short';
  size: number;
  liquidationPrice: number;
  remainingBalance: number;
  lossAmount: number;
  executedAt: string;
}

// ============================================================================
// RISK MANAGEMENT API RESPONSES
// ============================================================================

export interface RiskAssessmentResponse {
  userId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  portfolioRisk: PortfolioRisk;
  positionRisks: RiskExposure[];
  recommendations: string[];
  actionRequired: boolean;
  calculatedAt: string;
}

export interface RiskLimitResponse {
  limits: RiskLimit[];
  currentExposures: RiskExposure[];
  breaches: RiskLimit[];
  recommendations: string[];
}

export interface ComplianceStatusResponse {
  userId: string;
  kycStatus: string;
  amlStatus: string;
  riskLevel: string;
  requiredActions: string[];
  nextReviewDate: string;
  documentsNeeded: string[];
}

// ============================================================================
// MONITORING & ALERTING TYPES
// ============================================================================

export interface RiskMonitoringConfig {
  userId: string;
  enabled: boolean;
  alertThresholds: {
    positionLimit: number;
    exposureLimit: number;
    dailyLossLimit: number;
    marginLevel: number;
  };
  notificationMethods: ('email' | 'sms' | 'push' | 'webhook')[];
  webhookUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComplianceAlert {
  id: string;
  userId: string;
  alertType: 'kyc_expired' | 'aml_flag' | 'transaction_flag' | 'sanctions_match' | 'pep_match';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  actionRequired: boolean;
  dueDate?: string;
  assignedTo?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdAt: string;
  resolvedAt?: string;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filter?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  RiskLimit,
  PositionLimit,
  DailyLimit,
  RiskExposure,
  PortfolioRisk,
  RiskAlert,
  MarginCall,
  KYCProfile,
  PersonalInfo,
  AddressInfo,
  IdentityDocument,
  VerificationHistory,
  AMLScreening,
  AMLFinding,
  TransactionMonitoring,
  MonitoringFlag,
  SuspiciousActivity,
  ComplianceRule,
  RuleCondition,
  RuleAction,
  RegulatoryReport,
  SARReport,
  CTRReport,
  ComplianceMetrics,
  AuditFinding,
  MarginAccount,
  Position,
  OrderBook,
  LiquidationEvent,
  RiskAssessmentResponse,
  RiskLimitResponse,
  ComplianceStatusResponse,
  RiskMonitoringConfig,
  ComplianceAlert,
  ApiResponse,
  PaginationParams,
  PaginatedResponse
};