/**
 * Enhanced Type Definitions for Digital Utopia Platform
 * 
 * This file contains all shared types between client and admin applications.
 * Types are designed for international trading standards compliance.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

// ===== BASE USER TYPES =====
export interface User {
  id: string;
  email: string;
  displayName: string;
  firstName?: string;
  lastName?: string;
  isAdmin: boolean;
  isDisabled: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  profile: UserProfile;
  preferences: UserPreferences;
  balances: UserBalances;
  kyc: KYCStatus;
  riskProfile: RiskProfile;
  trading: TradingSettings;
  auth: AuthenticationSettings;
}

export interface UserProfile {
  avatar?: string;
  phone?: string;
  country: string;
  timezone: string;
  language: string;
  dateOfBirth?: string;
  address?: Address;
  occupation?: string;
  annualIncome?: number;
  investmentExperience: 'none' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  tradingExperience: 'none' | 'beginner' | 'intermediate' | 'advanced' | 'expert';
  riskTolerance: 'low' | 'medium' | 'high';
  preferredCurrency: string;
  marketingConsent: boolean;
  termsAccepted: boolean;
  privacyAccepted: boolean;
}

export interface UserPreferences {
  theme: 'dark' | 'light' | 'auto';
  language: string;
  timezone: string;
  dateFormat: string;
  numberFormat: string;
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
  trading: TradingPreferences;
  chart: ChartPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  tradeExecution: boolean;
  priceAlerts: boolean;
  marketNews: boolean;
  systemUpdates: boolean;
  marketing: boolean;
}

export interface DashboardPreferences {
  layout: 'grid' | 'list';
  widgets: DashboardWidget[];
  defaultView: 'trading' | 'portfolio' | 'dashboard';
  showPnL: boolean;
  showBalance: boolean;
  currencyDisplay: 'USD' | 'EUR' | 'GBP' | 'native';
}

export interface TradingPreferences {
  defaultOrderType: 'market' | 'limit' | 'stop' | 'stopLimit';
  defaultOrderSide: 'buy' | 'sell';
  defaultLeverage: number;
  riskManagement: RiskManagementSettings;
  autoClosePositions: boolean;
  maxDrawdown: number;
  profitTarget: number;
}

export interface ChartPreferences {
  defaultTimeframe: '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';
  indicators: string[];
  drawingTools: string[];
  theme: 'dark' | 'light';
  chartStyle: 'candlestick' | 'line' | 'area' | 'ohlc';
}

export interface UserBalances {
  [currency: string]: {
    available: number;
    locked: number;
    total: number;
    pending: number;
    reserved: number;
  };
}

export interface KYCStatus {
  status: 'pending' | 'in_review' | 'verified' | 'rejected' | 'expired';
  level: 0 | 1 | 2 | 3; // 0 = none, 3 = full verification
  documents: KYCDocument[];
  verificationDate?: string;
  expiryDate?: string;
  reviewerNotes?: string;
  nextReviewDate?: string;
  aml: AMLStatus;
  sanctions: SanctionsCheck;
}

export interface KYCDocument {
  id: string;
  type: 'passport' | 'drivers_license' | 'national_id' | 'utility_bill' | 'bank_statement' | 'selfie';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  fileUrl?: string;
  notes?: string;
}

export interface AMLStatus {
  riskScore: number; // 0-100
  screeningResults: ScreeningResult[];
  enhancedDueDiligence: boolean;
  lastScreeningAt: string;
  nextScreeningDue: string;
  pepCheck: boolean;
  watchlistCheck: boolean;
}

export interface SanctionsCheck {
  checked: boolean;
  results: string[]; // Matched entities
  cleared: boolean;
  checkedAt: string;
}

export interface ScreeningResult {
  type: 'pep' | 'watchlist' | 'adverse_media' | 'sanctions';
  status: 'clear' | 'match' | 'review';
  details: string;
  checkedAt: string;
}

export interface RiskProfile {
  score: number; // 0-100
  category: 'conservative' | 'moderate' | 'aggressive';
  assessmentDate: string;
  questionnaire: RiskQuestionnaire;
  suitability: SuitabilityAnalysis;
}

export interface RiskQuestionnaire {
  age: number;
  investmentHorizon: string;
  financialSituation: string;
  investmentGoals: string[];
  riskTolerance: number; // 1-10
  experienceLevel: string;
  portfolioDiversification: string;
  liquidityNeeds: string;
  completedAt: string;
}

export interface SuitabilityAnalysis {
  recommendedProducts: string[];
  riskLevel: string;
  suitabilityScore: number; // 0-100
  recommendations: string[];
  warnings: string[];
  lastUpdated: string;
}

export interface TradingSettings {
  maxPositionSize: number;
  maxLeverage: number;
  stopLossDefault: number;
  takeProfitDefault: number;
  autoRiskManagement: boolean;
  notifications: TradingNotifications;
  allowedInstruments: string[];
  tradingHours: TradingHours;
}

export interface TradingNotifications {
  tradeExecution: boolean;
  positionChanges: boolean;
  marginCalls: boolean;
  riskWarnings: boolean;
  profitTargets: boolean;
  stopLossHit: boolean;
}

export interface TradingHours {
  forex: { open: string; close: string };
  stocks: { open: string; close: string };
  crypto: { open: string; close: string };
  commodities: { open: string; close: string };
}

export interface AuthenticationSettings {
  twoFactorEnabled: boolean;
  twoFactorMethod: 'sms' | 'email' | 'totp';
  sessionTimeout: number; // minutes
  ipWhitelist: string[];
  deviceTrust: DeviceTrust[];
  lastPasswordChange: string;
  passwordExpiryDays: number;
}

export interface DeviceTrust {
  deviceId: string;
  deviceName: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  trusted: boolean;
  firstSeenAt: string;
  lastSeenAt: string;
  ipAddress: string;
  location?: string;
}

// ===== TRADING TYPES =====
export interface Trade {
  id: string;
  userId: string;
  accountId: string;
  symbol: string;
  instrumentType: 'forex' | 'crypto' | 'stocks' | 'commodities' | 'indices';
  type: 'market' | 'limit' | 'stop' | 'stop_limit' | 'trailing_stop';
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage?: number;
  marginRequired?: number;
  status: 'pending' | 'partial_filled' | 'filled' | 'cancelled' | 'rejected' | 'expired';
  filledQuantity: number;
  averageFillPrice?: number;
  fees: TradeFees;
  pnl?: number;
  realizedPnl?: number;
  executedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  source: 'mt5' | 'mt4' | 'api' | 'manual';
  clientOrderId?: string;
  gatewayOrderId?: string;
  notes?: string;
  tags: string[];
  metadata: Record<string, any>;
}

export interface TradeFees {
  commission: number;
  spread: number;
  swap: number;
  total: number;
  currency: string;
}

export interface Position {
  id: string;
  userId: string;
  accountId: string;
  symbol: string;
  side: 'long' | 'short';
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  markPrice: number;
  pnl: number;
  unrealizedPnl: number;
  marginUsed: number;
  marginAvailable: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  openTime: string;
  updateTime: string;
  status: 'open' | 'partial_closed' | 'closed';
  source: 'mt5' | 'mt4' | 'manual';
}

export interface OrderBook {
  symbol: string;
  timestamp: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPercentage: number;
  midPrice: number;
  lastUpdateId: number;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  orders: number;
}

export interface Candlestick {
  symbol: string;
  timeframe: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: string;
  trades: number;
}

export interface PriceData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  timestamp: string;
  source: string;
}

// ===== FINANCIAL TYPES =====
export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'deposit' | 'withdrawal' | 'commission' | 'subscription' | 'other';
  status: 'draft' | 'pending' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
  amount: number;
  currency: string;
  description: string;
  userId: string;
  userEmail: string;
  userName: string;
  country: string;
  dueDate: string;
  paidDate?: string;
  createdAt: string;
  updatedAt: string;
  metadata: InvoiceMetadata;
  items: InvoiceItem[];
  taxes: TaxInfo[];
  discounts: DiscountInfo[];
  total: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  paymentMethod?: PaymentMethod;
  transactionId?: string;
  notes?: string;
}

export interface InvoiceMetadata {
  servicePeriod?: string;
  reference?: string;
  poNumber?: string;
  customFields?: Record<string, string>;
  internalNotes?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  taxRate?: number;
  taxAmount?: number;
  discount?: number;
  total: number;
}

export interface TaxInfo {
  name: string;
  rate: number;
  amount: number;
  jurisdiction: string;
}

export interface DiscountInfo {
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
  reason: string;
}

export interface Deposit {
  id: string;
  userId: string;
  userEmail: string;
  username: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded';
  method: PaymentMethod;
  transactionId?: string;
  reference?: string;
  blockchainTxId?: string;
  receiptUrl?: string;
  confirmationCount?: number;
  requiredConfirmations?: number;
  submittedAt: string;
  processedAt?: string;
  completedAt?: string;
  metadata: DepositMetadata;
}

export interface DepositMetadata {
  ipAddress: string;
  userAgent: string;
  location?: string;
  deviceInfo?: string;
  source: 'api' | 'manual' | 'admin';
  notes?: string;
}

export interface Withdrawal {
  id: string;
  userId: string;
  userEmail: string;
  username: string;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'rejected';
  method: PaymentMethod;
  destination: WithdrawalDestination;
  transactionId?: string;
  blockchainTxId?: string;
  submittedAt: string;
  processedAt?: string;
  completedAt?: string;
  reason?: string;
  adminNotes?: string;
  metadata: WithdrawalMetadata;
  twoFactorVerified: boolean;
  riskChecked: boolean;
}

export interface WithdrawalMetadata {
  ipAddress: string;
  userAgent: string;
  location?: string;
  deviceInfo?: string;
  source: 'api' | 'manual' | 'admin';
  reason?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export interface PaymentMethod {
  type: 'bank_transfer' | 'crypto' | 'credit_card' | 'debit_card' | 'e_wallet' | 'paypal';
  name: string;
  icon: string;
  enabled: boolean;
  limits: PaymentLimits;
  fees: PaymentFees;
  processingTime: ProcessingTime;
  supportedCurrencies: string[];
}

export interface PaymentLimits {
  min: number;
  max: number;
  daily: number;
  monthly: number;
  yearly: number;
}

export interface PaymentFees {
  fixed: number;
  percentage: number;
  minFee: number;
  maxFee: number;
  currency: string;
}

export interface ProcessingTime {
  min: number; // minutes
  max: number; // hours
  average: number; // minutes
}

export interface WithdrawalDestination {
  type: 'wallet' | 'bank' | 'card' | 'email';
  address?: string;
  bankDetails?: BankDetails;
  cardDetails?: CardDetails;
  email?: string;
}

export interface BankDetails {
  accountNumber: string;
  routingNumber?: string;
  swift?: string;
  iban?: string;
  bankName: string;
  accountHolderName: string;
  address: Address;
}

export interface CardDetails {
  lastFour: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

// ===== COMPLIANCE TYPES =====
export interface ComplianceStatus {
  overall: 'compliant' | 'partial' | 'non_compliant';
  lastAssessment: string;
  nextReview: string;
  kyc: KYCCompliance;
  aml: AMLCompliance;
  regulatory: RegulatoryCompliance;
  risk: RiskCompliance;
}

export interface KYCCompliance {
  status: 'compliant' | 'partial' | 'non_compliant';
  completionRate: number; // percentage
  pendingReviews: number;
  rejectedApplications: number;
  lastUpdated: string;
}

export interface AMLCompliance {
  status: 'compliant' | 'partial' | 'non_compliant';
  lastScreening: string;
  flaggedTransactions: number;
  falsePositives: number;
  enhancedDueDiligenceCases: number;
}

export interface RegulatoryCompliance {
  jurisdictions: RegulatoryJurisdiction[];
  licenses: License[];
  notifications: RegulatoryNotification[];
}

export interface RegulatoryJurisdiction {
  country: string;
  regulator: string;
  status: 'registered' | 'pending' | 'suspended' | 'revoked';
  licenseNumber?: string;
  validFrom?: string;
  validTo?: string;
  conditions?: string[];
}

export interface License {
  id: string;
  type: 'broker_dealer' | 'futures' | 'crypto' | 'investment_advisor';
  issuer: string;
  number: string;
  status: 'active' | 'suspended' | 'revoked' | 'expired';
  issuedDate: string;
  expiryDate: string;
  jurisdictions: string[];
}

export interface RegulatoryNotification {
  id: string;
  type: 'filing' | 'report' | 'update' | 'investigation';
  regulator: string;
  dueDate: string;
  status: 'pending' | 'submitted' | 'acknowledged' | 'overdue';
  description: string;
  submittedAt?: string;
}

export interface RiskCompliance {
  status: 'compliant' | 'partial' | 'non_compliant';
  lastAssessment: string;
  riskScore: number; // 0-100
  capitalRequirements: CapitalRequirement[];
  stressTests: StressTest[];
}

export interface CapitalRequirement {
  type: 'regulatory' | 'economic' | 'risk_based';
  amount: number;
  currency: string;
  status: 'met' | 'deficit';
  lastCalculated: string;
}

export interface StressTest {
  scenario: string;
  date: string;
  result: 'passed' | 'failed';
  capitalImpact: number;
  notes?: string;
}

// ===== ANALYTICS TYPES =====
export interface AnalyticsData {
  users: UserAnalytics;
  trading: TradingAnalytics;
  financial: FinancialAnalytics;
  performance: PerformanceAnalytics;
  risk: RiskAnalytics;
}

export interface UserAnalytics {
  total: number;
  active: number;
  new: number;
  churned: number;
  retention: number; // percentage
  demographics: UserDemographics;
  acquisition: AcquisitionData;
  engagement: EngagementMetrics;
}

export interface UserDemographics {
  byCountry: Record<string, number>;
  byAge: Record<string, number>;
  byGender: Record<string, number>;
  byIncome: Record<string, number>;
}

export interface AcquisitionData {
  channels: Record<string, number>;
  cost: Record<string, number>;
  conversion: Record<string, number>;
  roi: Record<string, number>;
}

export interface EngagementMetrics {
  sessionDuration: number;
  pageViews: number;
  features: Record<string, number>;
  retention: RetentionMetrics;
}

export interface RetentionMetrics {
  daily: number;
  weekly: number;
  monthly: number;
  cohort: CohortData[];
}

export interface CohortData {
  period: string;
  users: number;
  retention: Record<string, number>; // day -> percentage
}

export interface TradingAnalytics {
  volume: Record<string, number>;
  trades: TradeAnalytics;
  instruments: InstrumentAnalytics;
  performance: TradingPerformance;
}

export interface TradeAnalytics {
  total: number;
  successful: number;
  failed: number;
  averageSize: number;
  averageDuration: number;
  profitability: number; // percentage
}

export interface InstrumentAnalytics {
  [symbol: string]: {
    volume: number;
    trades: number;
    spread: number;
    volatility: number;
  };
}

export interface TradingPerformance {
  pnl: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
}

export interface FinancialAnalytics {
  revenue: RevenueData;
  costs: CostData;
  profitability: ProfitabilityData;
  cashflow: CashflowData;
}

export interface RevenueData {
  total: number;
  bySource: Record<string, number>;
  byPeriod: Record<string, number>;
  growth: number; // percentage
}

export interface CostData {
  total: number;
  byCategory: Record<string, number>;
  variable: number;
  fixed: number;
}

export interface ProfitabilityData {
  gross: number;
  net: number;
  margin: number; // percentage
  roi: number; // percentage
}

export interface CashflowData {
  operating: number;
  investing: number;
  financing: number;
  net: number;
}

export interface PerformanceAnalytics {
  uptime: number; // percentage
  latency: PerformanceMetrics;
  errors: ErrorMetrics;
  throughput: ThroughputMetrics;
}

export interface PerformanceMetrics {
  api: number; // milliseconds
  database: number;
  cache: number;
  thirdParty: number;
}

export interface ErrorMetrics {
  rate: number; // percentage
  byType: Record<string, number>;
  byEndpoint: Record<string, number>;
  resolution: number; // minutes average
}

export interface ThroughputMetrics {
  requests: number;
  data: number; // bytes
  peak: number;
  average: number;
}

export interface RiskAnalytics {
  exposure: ExposureMetrics;
  concentration: ConcentrationMetrics;
  stress: StressMetrics;
  scenario: ScenarioAnalysis;
}

export interface ExposureMetrics {
  byAsset: Record<string, number>;
  byRisk: Record<string, number>;
  byCounterparty: Record<string, number>;
  var: number; // Value at Risk
}

export interface ConcentrationMetrics {
  topPositions: Record<string, number>;
  topInstruments: Record<string, number>;
  byClient: Record<string, number>;
}

export interface StressMetrics {
  scenarios: Record<string, StressScenario>;
  results: Record<string, StressResult>;
}

export interface StressScenario {
  name: string;
  description: string;
  parameters: Record<string, number>;
}

export interface StressResult {
  pnl: number;
  liquidity: number;
  capital: number;
  margin: number;
}

export interface ScenarioAnalysis {
  baseline: BaselineScenario;
  stress: StressScenario[];
  monteCarlo: MonteCarloResult;
}

export interface BaselineScenario {
  expectedReturn: number;
  volatility: number;
  probability: number;
}

export interface MonteCarloResult {
  simulations: number;
  scenarios: number[];
  confidence: Record<string, number>;
}

// ===== DASHBOARD TYPES =====
export interface DashboardWidget {
  id: string;
  type: 'chart' | 'table' | 'metric' | 'alerts' | 'news';
  title: string;
  size: 'small' | 'medium' | 'large';
  position: { x: number; y: number };
  config: WidgetConfig;
  data?: any;
}

export interface WidgetConfig {
  refreshInterval?: number;
  timeframe?: string;
  chartType?: 'candlestick' | 'line' | 'area';
  indicators?: string[];
  filters?: Record<string, any>;
  display?: Record<string, any>;
}

// ===== API TYPES =====
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: APIError;
  meta?: APIMeta;
  timestamp: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: Record<string, any>;
  field?: string;
}

export interface APIMeta {
  total?: number;
  page?: number;
  limit?: number;
  hasMore?: boolean;
  requestId: string;
  rateLimit?: RateLimitInfo;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sort?: string;
  order?: 'asc' | 'desc';
  filters?: Record<string, any>;
}

export interface PaginatedResponse<T> extends APIResponse<T[]> {
  meta: APIMeta & {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ===== REAL-TIME TYPES =====
export interface WebSocketMessage {
  type: 'price' | 'order' | 'position' | 'notification' | 'system';
  channel: string;
  data: any;
  timestamp: string;
  sequence: number;
}

export interface PriceUpdate {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  bid: number;
  ask: number;
  timestamp: string;
}

export interface OrderUpdate {
  orderId: string;
  status: Trade['status'];
  filledQuantity: number;
  averageFillPrice?: number;
  fees: number;
  pnl?: number;
}

export interface PositionUpdate {
  positionId: string;
  pnl: number;
  unrealizedPnl: number;
  marginUsed: number;
  marginAvailable: number;
  currentPrice: number;
}

export interface NotificationMessage {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actions?: NotificationAction[];
}

export interface NotificationAction {
  label: string;
  action: string;
  primary?: boolean;
}

export interface SystemMessage {
  id: string;
  title: string;
  message: string;
  type: 'maintenance' | 'update' | 'alert' | 'announcement';
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  expiresAt?: string;
  target?: 'all' | string[]; // user IDs or 'all'
}

// ===== ENUMS =====
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  BANNED = 'banned',
  PENDING_VERIFICATION = 'pending_verification'
}

export enum OrderStatus {
  PENDING = 'pending',
  PARTIAL_FILLED = 'partial_filled',
  FILLED = 'filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  PARTIAL = 'partial',
  NON_COMPLIANT = 'non_compliant',
  UNDER_REVIEW = 'under_review'
}

// ===== UTILITY TYPES =====
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
export type DeepPartial<T> = { [P in keyof T]?: DeepPartial<T[P]> };
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;
export type Nullable<T> = T | null;
export type VoidFunction = () => void;

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  [key: string]: any;
}

export interface SearchOptions {
  query: string;
  fields: string[];
  fuzziness?: number;
}

export interface DateRange {
  from: string;
  to: string;
}

export interface TimeSeries {
  timestamp: string;
  value: number;
  [key: string]: any;
}

export interface ChartData {
  labels: string[];
  datasets: ChartDataset[];
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  fill?: boolean;
  tension?: number;
}

// ===== EXPORTS =====
export default {};