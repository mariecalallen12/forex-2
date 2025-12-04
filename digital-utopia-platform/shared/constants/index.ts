/**
 * Shared Constants for Digital Utopia Platform
 * 
 * Configuration constants used across client and admin applications.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

// ===== API CONFIGURATION =====
export const API_VERSION = 'v1';
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.digitalutopia.app';
export const API_TIMEOUT = 30000; // 30 seconds
export const API_RETRY_ATTEMPTS = 3;
export const API_RETRY_DELAY = 1000; // 1 second

// WebSocket Configuration
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'wss://ws.digitalutopia.app';
export const WS_RECONNECT_INTERVAL = 5000; // 5 seconds
export const WS_MAX_RECONNECT_ATTEMPTS = 10;

// ===== TRADING CONFIGURATION =====
export const TRADING_SYMBOLS = [
  // Major Forex Pairs
  'EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD',
  'EURJPY', 'GBPJPY', 'EURGBP', 'AUDJPY', 'CHFJPY', 'CADJPY', 'NZDJPY',
  
  // Minor Forex Pairs
  'EURAUD', 'EURCAD', 'EURNZD', 'AUDCAD', 'AUDCHF', 'AUDNZD', 'CADCHF',
  'CHFNZD', 'GBPAUD', 'GBPCAD', 'GBPCHF', 'GBPNZD', 'NZDCAD', 'NZDCHF',
  
  // Cryptocurrencies
  'BTCUSD', 'ETHUSD', 'ADAUSD', 'SOLUSD', 'DOTUSD', 'AVAXUSD', 'MATICUSD',
  'LINKUSD', 'UNIUSD', 'LTCUSD', 'BCHUSD', 'XRPUSD', 'XLMUSD', 'DOGEUSD',
  'BNBUSD', 'USDTUSD', 'USDCUSD', 'TRXUSD', 'SHIBUSD', 'ATOMUSD',
  
  // Stock Indices
  'US30', 'NAS100', 'SPX500', 'GER40', 'UK100', 'JPN225', 'AUS200',
  'FRA40', 'IT40', 'ESP35', 'HK50', 'EUSTX50', 'US2000',
  
  // Commodities
  'XAUUSD', 'XAGUSD', 'XPTUSD', 'XPDUSD', 'USOIL', 'BRENT', 'NATGAS',
  'COPPER', 'CORN', 'WHEAT', 'SOYBEANS', 'COFFEE', 'SUGAR', 'COCOA',
  
  // Bonds
  'US10Y', 'GER10Y', 'UK10Y', 'JPY10Y', 'US30Y', 'BUND', 'GILT', 'JGB',
] as const;

export const INSTRUMENT_TYPES = {
  FOREX: 'forex',
  CRYPTO: 'crypto',
  STOCKS: 'stocks',
  INDICES: 'indices',
  COMMODITIES: 'commodities',
  BONDS: 'bonds',
} as const;

export const ORDER_TYPES = {
  MARKET: 'market',
  LIMIT: 'limit',
  STOP: 'stop',
  STOP_LIMIT: 'stop_limit',
  TRAILING_STOP: 'trailing_stop',
} as const;

export const ORDER_STATUS = {
  PENDING: 'pending',
  PARTIAL_FILLED: 'partial_filled',
  FILLED: 'filled',
  CANCELLED: 'cancelled',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
} as const;

export const POSITION_SIDES = {
  LONG: 'long',
  SHORT: 'short',
} as const;

export const TRADING_HOURS = {
  FOREX: {
    OPEN: '00:00',
    CLOSE: '23:59',
    TIMEZONE: 'UTC',
  },
  STOCKS: {
    OPEN: '09:30',
    CLOSE: '16:00',
    TIMEZONE: 'America/New_York',
  },
  CRYPTO: {
    OPEN: '00:00',
    CLOSE: '23:59',
    TIMEZONE: 'UTC',
  },
  COMMODITIES: {
    OPEN: '08:30',
    CLOSE: '17:30',
    TIMEZONE: 'America/New_York',
  },
} as const;

export const DEFAULT_LEVERAGE = {
  FOREX: 100,
  CRYPTO: 10,
  STOCKS: 2,
  COMMODITIES: 10,
  INDICES: 5,
  BONDS: 20,
} as const;

export const MAX_LEVERAGE = {
  FOREX: 500,
  CRYPTO: 50,
  STOCKS: 5,
  COMMODITIES: 20,
  INDICES: 10,
  BONDS: 50,
} as const;

export const MIN_TRADE_SIZE = {
  FOREX: 0.01,
  CRYPTO: 0.001,
  STOCKS: 1,
  COMMODITIES: 0.01,
  INDICES: 0.1,
  BONDS: 1,
} as const;

export const MAX_TRADE_SIZE = {
  FOREX: 1000000,
  CRYPTO: 100,
  STOCKS: 10000,
  COMMODITIES: 10000,
  INDICES: 1000,
  BONDS: 10000,
} as const;

// ===== MARKET DATA CONFIGURATION =====
export const TIMEFRAMES = {
  '1m': 60,
  '3m': 180,
  '5m': 300,
  '15m': 900,
  '30m': 1800,
  '1h': 3600,
  '2h': 7200,
  '4h': 14400,
  '6h': 21600,
  '8h': 28800,
  '12h': 43200,
  '1d': 86400,
  '1w': 604800,
  '1M': 2629800,
} as const;

export const CHART_TYPES = {
  CANDLESTICK: 'candlestick',
  LINE: 'line',
  AREA: 'area',
  OHLC: 'ohlc',
  HEIKIN_ASHI: 'heikin_ashi',
  RENKO: 'renko',
  KAGI: 'kagi',
  POINT_FIGURE: 'point_figure',
} as const;

export const TECHNICAL_INDICATORS = {
  SMA: 'sma',
  EMA: 'ema',
  RSI: 'rsi',
  MACD: 'macd',
  BOLLINGER_BANDS: 'bb',
  STOCHASTIC: 'stoch',
  ADX: 'adx',
  WILLIAMS_R: 'wr',
  CCI: 'cci',
  MOMENTUM: 'mom',
  ROC: 'roc',
  TRIX: 'trix',
  PSAR: 'psar',
  ICHIMOKU: 'ichimoku',
} as const;

export const DRAWING_TOOLS = {
  TREND_LINE: 'trendline',
  HORIZONTAL_LINE: 'hline',
  VERTICAL_LINE: 'vline',
  RAY: 'ray',
  PARALLEL_CHANNEL: 'pchannel',
  FIBONACCI_RETRACEMENT: 'fib_retracement',
  FIBONACCI_FAN: 'fib_fan',
  FIBONACCI_ARCS: 'fib_arc',
  FIBONACCI_TIMEZONES: 'fib_timezone',
  SQUARE: 'rect',
  CIRCLE: 'circle',
  TRIANGLE: 'triangle',
} as const;

// ===== USER MANAGEMENT =====
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
  MODERATOR: 'moderator',
  SUPPORT: 'support',
  COMPLIANCE: 'compliance',
  TRADING: 'trading',
} as const;

export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  BANNED: 'banned',
  PENDING_VERIFICATION: 'pending_verification',
  DELETED: 'deleted',
} as const;

export const VERIFICATION_LEVELS = {
  NONE: 0,
  EMAIL: 1,
  PHONE: 2,
  KYC_BASIC: 3,
  KYC_FULL: 4,
  INSTITUTIONAL: 5,
} as const;

export const RISK_PROFILES = {
  CONSERVATIVE: 'conservative',
  MODERATE: 'moderate',
  AGGRESSIVE: 'aggressive',
} as const;

export const EXPERIENCE_LEVELS = {
  NONE: 'none',
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
  EXPERT: 'expert',
} as const;

export const TRADING_EXPERIENCE = {
  NO_EXPERIENCE: 'no_experience',
  LESS_THAN_1_YEAR: 'less_than_1_year',
  ONE_TO_THREE_YEARS: '1_to_3_years',
  THREE_TO_FIVE_YEARS: '3_to_5_years',
  MORE_THAN_FIVE_YEARS: 'more_than_5_years',
} as const;

export const INVESTMENT_GOALS = [
  'wealth_preservation',
  'income_generation',
  'capital_growth',
  'speculation',
  'hedging',
  'portfolio_diversification',
] as const;

export const FINANCIAL_SITUATIONS = [
  'retired',
  'unemployed',
  'student',
  'employed_part_time',
  'employed_full_time',
  'self_employed',
  'business_owner',
] as const;

export const INVESTMENT_HORIZONS = [
  'less_than_1_year',
  '1_to_3_years',
  '3_to_5_years',
  '5_to_10_years',
  'more_than_10_years',
] as const;

// ===== PAYMENT CONFIGURATION =====
export const PAYMENT_METHODS = {
  BANK_TRANSFER: 'bank_transfer',
  CRYPTO: 'crypto',
  CREDIT_CARD: 'credit_card',
  DEBIT_CARD: 'debit_card',
  E_WALLET: 'e_wallet',
  PAYPAL: 'paypal',
  SKRILL: 'skrill',
  NETELLER: 'neteller',
  WEB_MONEY: 'web_money',
  QIWI: 'qiwi',
} as const;

export const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  DISPUTED: 'disputed',
} as const;

export const CRYPTOCURRENCIES = {
  BTC: 'Bitcoin',
  ETH: 'Ethereum',
  USDT: 'Tether',
  BNB: 'Binance Coin',
  ADA: 'Cardano',
  SOL: 'Solana',
  DOT: 'Polkadot',
  AVAX: 'Avalanche',
  MATIC: 'Polygon',
  LINK: 'Chainlink',
  UNI: 'Uniswap',
  LTC: 'Litecoin',
  BCH: 'Bitcoin Cash',
  XRP: 'XRP',
  XLM: 'Stellar',
  DOGE: 'Dogecoin',
  TRX: 'Tron',
  SHIB: 'Shiba Inu',
  ATOM: 'Cosmos',
  VET: 'VeChain',
  FIL: 'Filecoin',
  ETC: 'Ethereum Classic',
  XMR: 'Monero',
  ZEC: 'Zcash',
  DASH: 'Dash',
} as const;

export const FIAT_CURRENCIES = {
  USD: { name: 'US Dollar', symbol: '$', code: 'USD' },
  EUR: { name: 'Euro', symbol: '€', code: 'EUR' },
  GBP: { name: 'British Pound', symbol: '£', code: 'GBP' },
  JPY: { name: 'Japanese Yen', symbol: '¥', code: 'JPY' },
  CHF: { name: 'Swiss Franc', symbol: 'Fr', code: 'CHF' },
  CAD: { name: 'Canadian Dollar', symbol: 'C$', code: 'CAD' },
  AUD: { name: 'Australian Dollar', symbol: 'A$', code: 'AUD' },
  NZD: { name: 'New Zealand Dollar', symbol: 'NZ$', code: 'NZD' },
  CNY: { name: 'Chinese Yuan', symbol: '¥', code: 'CNY' },
  HKD: { name: 'Hong Kong Dollar', symbol: 'HK$', code: 'HKD' },
  SGD: { name: 'Singapore Dollar', symbol: 'S$', code: 'SGD' },
  KRW: { name: 'South Korean Won', symbol: '₩', code: 'KRW' },
  INR: { name: 'Indian Rupee', symbol: '₹', code: 'INR' },
  BRL: { name: 'Brazilian Real', symbol: 'R$', code: 'BRL' },
  MXN: { name: 'Mexican Peso', symbol: '$', code: 'MXN' },
  ZAR: { name: 'South African Rand', symbol: 'R', code: 'ZAR' },
} as const;

export const SUPPORTED_CURRENCIES = [
  ...Object.keys(FIAT_CURRENCIES),
  ...Object.keys(CRYPTOCURRENCIES),
] as const;

// ===== COMPLIANCE CONFIGURATION =====
export const KYC_DOCUMENT_TYPES = {
  PASSPORT: 'passport',
  DRIVERS_LICENSE: 'drivers_license',
  NATIONAL_ID: 'national_id',
  UTILITY_BILL: 'utility_bill',
  BANK_STATEMENT: 'bank_statement',
  SELFIE: 'selfie',
  PROOF_OF_ADDRESS: 'proof_of_address',
  PROOF_OF_INCOME: 'proof_of_income',
} as const;

export const KYC_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  FLAGGED: 'flagged',
} as const;

export const AML_RISK_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const SCREENING_TYPES = {
  PEP: 'pep', // Politically Exposed Person
  WATCHLIST: 'watchlist',
  ADVERSE_MEDIA: 'adverse_media',
  SANCTIONS: 'sanctions',
  CONVICTIONS: 'convictions',
} as const;

export const SCREENING_RESULTS = {
  CLEAR: 'clear',
  MATCH: 'match',
  REVIEW: 'review',
  REJECT: 'reject',
} as const;

export const JURISDICTIONS = [
  'United States',
  'United Kingdom',
  'European Union',
  'Switzerland',
  'Canada',
  'Australia',
  'Singapore',
  'Hong Kong',
  'Japan',
  'South Korea',
  'United Arab Emirates',
  'India',
  'Brazil',
  'Mexico',
  'South Africa',
] as const;

export const REGULATORS = {
  SEC: 'SEC', // Securities and Exchange Commission (US)
  CFTC: 'CFTC', // Commodity Futures Trading Commission (US)
  FINRA: 'FINRA', // Financial Industry Regulatory Authority (US)
  FCA: 'FCA', // Financial Conduct Authority (UK)
  ESMA: 'ESMA', // European Securities and Markets Authority
  FINMA: 'FINMA', // Swiss Financial Market Supervisory Authority
  IIROC: 'IIROC', // Investment Industry Regulatory Organization of Canada
  ASIC: 'ASIC', // Australian Securities and Investments Commission
  MAS: 'MAS', // Monetary Authority of Singapore
  SFC: 'SFC', // Securities and Futures Commission (Hong Kong)
  FSA: 'FSA', // Financial Services Agency (Japan)
  FSS: 'FSS', // Financial Supervisory Service (South Korea)
  SCA: 'SCA', // Securities and Commodities Authority (UAE)
} as const;

export const LICENSE_TYPES = {
  BROKER_DEALER: 'broker_dealer',
  FUTURES: 'futures',
  CRYPTO: 'crypto',
  INVESTMENT_ADVISOR: 'investment_advisor',
  CUSTODIAN: 'custodian',
  CLEARING: 'clearing',
  MARKET_MAKING: 'market_making',
} as const;

// ===== NOTIFICATION CONFIGURATION =====
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

export const NOTIFICATION_CHANNELS = {
  EMAIL: 'email',
  PUSH: 'push',
  SMS: 'sms',
  IN_APP: 'in_app',
} as const;

export const NOTIFICATION_CATEGORIES = {
  TRADING: 'trading',
  ACCOUNT: 'account',
  PAYMENT: 'payment',
  SECURITY: 'security',
  MARKET: 'market',
  SYSTEM: 'system',
  MARKETING: 'marketing',
} as const;

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// ===== UI CONFIGURATION =====
export const THEME_COLORS = {
  PRIMARY: '#3b82f6',
  PRIMARY_DARK: '#2563eb',
  PRIMARY_LIGHT: '#93c5fd',
  SECONDARY: '#64748b',
  SUCCESS: '#22c55e',
  WARNING: '#f59e0b',
  ERROR: '#ef4444',
  INFO: '#3b82f6',
  NEUTRAL: '#64748b',
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

export const LAYOUT_SIZES = {
  SIDEBAR_WIDTH: 280,
  HEADER_HEIGHT: 64,
  MOBILE_BREAKPOINT: 768,
  TABLET_BREAKPOINT: 1024,
} as const;

export const ANIMATION_DURATIONS = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
  EXTRA_SLOW: 1000,
} as const;

export const Z_INDEX_VALUES = {
  DROPDOWN: 1000,
  STICKY: 1020,
  FIXED: 1030,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  POPOVER: 1060,
  TOOLTIP: 1070,
  TOAST: 1080,
} as const;

// ===== PERFORMANCE CONFIGURATION =====
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
} as const;

export const CACHE = {
  DEFAULT_TTL: 300, // 5 minutes
  LONG_TTL: 3600, // 1 hour
  SHORT_TTL: 60, // 1 minute
  USER_PREFERENCES_TTL: 86400, // 24 hours
} as const;

export const RATE_LIMITS = {
  API: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 1000,
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 5,
  },
  TRADING: {
    WINDOW_MS: 60 * 1000, // 1 minute
    MAX_REQUESTS: 100,
  },
} as const;

// ===== FEATURE FLAGS =====
export const FEATURES = {
  MT5_INTEGRATION: true,
  CRYPTO_TRADING: true,
  SOCIAL_TRADING: false,
  COPY_TRADING: true,
  AI_SIGNALS: false,
  ADVANCED_CHARTS: true,
  MOBILE_APP: false,
  INSTITUTIONAL: false,
  API_TRADING: true,
  WEBHOOKS: true,
  ADVANCED_ORDERS: true,
  PORTFOLIO_ANALYTICS: true,
  RISK_MANAGEMENT: true,
  EDUCATIONAL_CONTENT: true,
  MARKET_NEWS: true,
  CALENDAR_EVENTS: true,
} as const;

// ===== ENVIRONMENT CONFIGURATION =====
export const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production',
} as const;

export const isDevelopment = process.env.NODE_ENV === 'development';
export const isProduction = process.env.NODE_ENV === 'production';
export const isStaging = process.env.NODE_ENV === 'staging';

// ===== APP CONFIGURATION =====
export const APP_CONFIG = {
  NAME: 'Digital Utopia',
  VERSION: '2.0.0',
  DESCRIPTION: 'Professional Trading Platform',
  SUPPORT_EMAIL: 'support@digitalutopia.app',
  SUPPORT_PHONE: '+1-555-0123',
  WEBSITE_URL: 'https://digitalutopia.app',
  DOCUMENTATION_URL: 'https://docs.digitalutopia.app',
  TERMS_URL: 'https://digitalutopia.app/terms',
  PRIVACY_URL: 'https://digitalutopia.app/privacy',
  RISK_DISCLOSURE_URL: 'https://digitalutopia.app/risk-disclosure',
} as const;

export const SOCIAL_LINKS = {
  TWITTER: 'https://twitter.com/digitalutopia',
  LINKEDIN: 'https://linkedin.com/company/digitalutopia',
  TELEGRAM: 'https://t.me/digitalutopia',
  DISCORD: 'https://discord.gg/digitalutopia',
  YOUTUBE: 'https://youtube.com/@digitalutopia',
  GITHUB: 'https://github.com/digitalutopia',
} as const;

// ===== EXPORTS =====
export default {
  // API
  API_VERSION,
  API_BASE_URL,
  API_TIMEOUT,
  WS_URL,
  
  // Trading
  TRADING_SYMBOLS,
  INSTRUMENT_TYPES,
  ORDER_TYPES,
  ORDER_STATUS,
  POSITION_SIDES,
  TRADING_HOURS,
  DEFAULT_LEVERAGE,
  MAX_LEVERAGE,
  MIN_TRADE_SIZE,
  MAX_TRADE_SIZE,
  
  // Market Data
  TIMEFRAMES,
  CHART_TYPES,
  TECHNICAL_INDICATORS,
  DRAWING_TOOLS,
  
  // User Management
  USER_ROLES,
  USER_STATUS,
  VERIFICATION_LEVELS,
  RISK_PROFILES,
  EXPERIENCE_LEVELS,
  TRADING_EXPERIENCE,
  INVESTMENT_GOALS,
  FINANCIAL_SITUATIONS,
  INVESTMENT_HORIZONS,
  
  // Payment
  PAYMENT_METHODS,
  PAYMENT_STATUS,
  CRYPTOCURRENCIES,
  FIAT_CURRENCIES,
  SUPPORTED_CURRENCIES,
  
  // Compliance
  KYC_DOCUMENT_TYPES,
  KYC_STATUS,
  AML_RISK_LEVELS,
  SCREENING_TYPES,
  SCREENING_RESULTS,
  JURISDICTIONS,
  REGULATORS,
  LICENSE_TYPES,
  
  // Notifications
  NOTIFICATION_TYPES,
  NOTIFICATION_CHANNELS,
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_PRIORITIES,
  
  // UI
  THEME_COLORS,
  BREAKPOINTS,
  LAYOUT_SIZES,
  ANIMATION_DURATIONS,
  Z_INDEX_VALUES,
  
  // Performance
  PAGINATION,
  CACHE,
  RATE_LIMITS,
  
  // Features
  FEATURES,
  
  // Environment
  ENVIRONMENTS,
  isDevelopment,
  isProduction,
  isStaging,
  
  // App
  APP_CONFIG,
  SOCIAL_LINKS,
};