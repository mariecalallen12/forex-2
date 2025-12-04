/**
 * Shared Utilities for Digital Utopia Platform
 * 
 * Common utility functions used across client and admin applications.
 * 
 * @author MiniMax Agent
 * @version 1.0
 */

// ===== FORMAT UTILITIES =====
export const formatCurrency = (
  amount: number, 
  currency: string = 'USD', 
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(amount);
};

export const formatNumber = (
  value: number, 
  decimals: number = 2, 
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercentage = (
  value: number, 
  decimals: number = 2, 
  locale: string = 'en-US'
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
};

export const formatDate = (
  date: string | Date, 
  format: 'short' | 'medium' | 'long' | 'iso' = 'medium',
  locale: string = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'iso') {
    return dateObj.toISOString();
  }
  
  const options: Intl.DateTimeFormatOptions = {
    short: { dateStyle: 'short' },
    medium: { dateStyle: 'medium' },
    long: { dateStyle: 'long' },
  }[format];
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

export const formatTime = (
  date: string | Date,
  format: '12h' | '24h' = '24h',
  locale: string = 'en-US'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: format === '12h',
  };
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

export const formatDateTime = (
  date: string | Date,
  format: 'short' | 'medium' | 'long' = 'medium',
  locale: string = 'en-US',
  timeFormat: '12h' | '24h' = '24h'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    dateStyle: format === 'short' ? 'short' : format === 'medium' ? 'medium' : 'long',
    timeStyle: timeFormat === '12h' ? 'short' : 'medium',
  };
  
  return new Intl.DateTimeFormat(locale, options).format(dateObj);
};

// ===== VALIDATION UTILITIES =====
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhone = (phone: string, country?: string): boolean => {
  // Basic phone validation - can be enhanced with country-specific logic
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
};

export const validatePassword = (
  password: string,
  options: {
    minLength?: number;
    requireUppercase?: boolean;
    requireLowercase?: boolean;
    requireNumbers?: boolean;
    requireSymbols?: boolean;
  } = {}
): { valid: boolean; errors: string[] } => {
  const {
    minLength = 8,
    requireUppercase = true,
    requireLowercase = true,
    requireNumbers = true,
    requireSymbols = false,
  } = options;

  const errors: string[] = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }

  if (requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (requireNumbers && !/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one symbol');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

export const validateCurrency = (currency: string): boolean => {
  const supportedCurrencies = [
    'USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CAD', 'AUD', 'NZD',
    'CNY', 'HKD', 'SGD', 'KRW', 'INR', 'BRL', 'MXN', 'ZAR',
    'BTC', 'ETH', 'USDT', 'BNB', 'ADA', 'SOL', 'DOT', 'AVAX',
    'MATIC', 'LINK', 'UNI', 'LTC', 'BCH', 'XRP', 'XLM', 'DOGE'
  ];
  return supportedCurrencies.includes(currency.toUpperCase());
};

export const validateSymbol = (symbol: string): boolean => {
  // Basic symbol validation for trading instruments
  const symbolRegex = /^[A-Z]{2,10}([A-Z0-9]{1,10})?$/;
  return symbolRegex.test(symbol.toUpperCase());
};

export const validateAmount = (
  amount: number,
  options: {
    min?: number;
    max?: number;
    decimals?: number;
    positive?: boolean;
  } = {}
): boolean => {
  const { min = 0, max = Number.MAX_SAFE_INTEGER, decimals = 8, positive = true } = options;

  if (positive && amount <= 0) return false;
  if (amount < min) return false;
  if (amount > max) return false;

  // Check decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  return decimalPlaces <= decimals;
};

// ===== CALCULATION UTILITIES =====
export const calculatePercentageChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const calculatePercentage = (
  value: number,
  total: number
): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

export const calculateCommission = (
  amount: number,
  rate: number,
  type: 'percentage' | 'fixed' = 'percentage'
): number => {
  return type === 'percentage' ? amount * (rate / 100) : rate;
};

export const calculateSpread = (
  bid: number,
  ask: number
): number => {
  return ask - bid;
};

export const calculateSpreadPercentage = (
  bid: number,
  ask: number
): number => {
  if (bid === 0) return 0;
  return ((ask - bid) / bid) * 100;
};

export const calculatePnl = (
  side: 'long' | 'short',
  entryPrice: number,
  exitPrice: number,
  quantity: number
): number => {
  const priceDiff = side === 'long' ? exitPrice - entryPrice : entryPrice - exitPrice;
  return priceDiff * quantity;
};

export const calculateMargin = (
  notionalValue: number,
  leverage: number
): number => {
  return notionalValue / leverage;
};

export const calculateLeverage = (
  positionSize: number,
  margin: number
): number => {
  return margin > 0 ? positionSize / margin : 0;
};

export const calculateStopLoss = (
  entryPrice: number,
  stopLossPercent: number,
  side: 'long' | 'short'
): number => {
  const stopLossDecimal = stopLossPercent / 100;
  return side === 'long' 
    ? entryPrice * (1 - stopLossDecimal)
    : entryPrice * (1 + stopLossDecimal);
};

export const calculateTakeProfit = (
  entryPrice: number,
  takeProfitPercent: number,
  side: 'long' | 'short'
): number => {
  const takeProfitDecimal = takeProfitPercent / 100;
  return side === 'long' 
    ? entryPrice * (1 + takeProfitDecimal)
    : entryPrice * (1 - takeProfitDecimal);
};

export const calculateRiskReward = (
  risk: number,
  reward: number
): number => {
  return reward / risk;
};

// ===== ARRAY UTILITIES =====
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

export const groupBy = <T, K extends keyof T>(
  array: T[],
  key: K
): Record<string, T[]> => {
  return array.reduce((groups, item) => {
    const group = String(item[key]);
    groups[group] = groups[group] || [];
    groups[group].push(item);
    return groups;
  }, {} as Record<string, T[]>);
};

export const sortBy = <T>(
  array: T[],
  key: keyof T,
  direction: 'asc' | 'desc' = 'asc'
): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

export const uniqueBy = <T, K extends keyof T>(
  array: T[],
  key: K
): T[] => {
  const seen = new Set();
  return array.filter(item => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

export const findBy = <T>(
  array: T[],
  predicate: (item: T) => boolean
): T | undefined => {
  return array.find(predicate);
};

export const sum = (array: number[]): number => {
  return array.reduce((total, num) => total + num, 0);
};

export const average = (array: number[]): number => {
  return array.length > 0 ? sum(array) / array.length : 0;
};

export const max = (array: number[]): number => {
  return array.length > 0 ? Math.max(...array) : 0;
};

export const min = (array: number[]): number => {
  return array.length > 0 ? Math.min(...array) : 0;
};

export const range = (start: number, end: number, step: number = 1): number[] => {
  const result: number[] = [];
  for (let i = start; i < end; i += step) {
    result.push(i);
  }
  return result;
};

// ===== OBJECT UTILITIES =====
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> => {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
};

export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> => {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
};

export const isEmpty = (obj: any): boolean => {
  if (obj == null) return true;
  if (Array.isArray(obj) || typeof obj === 'string') return obj.length === 0;
  if (obj instanceof Map || obj instanceof Set) return obj.size === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  return false;
};

export const isEqual = (a: any, b: any): boolean => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!isEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
};

export const deepClone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as any;
  
  const cloned = {} as T;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

// ===== STRING UTILITIES =====
export const truncate = (
  str: string,
  length: number,
  suffix: string = '...'
): string => {
  if (str.length <= length) return str;
  return str.slice(0, length - suffix.length) + suffix;
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const camelCase = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, (word, index) => {
      return index === 0 ? word.toLowerCase() : word.toUpperCase();
    })
    .replace(/\s+/g, '');
};

export const kebabCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
};

export const snakeCase = (str: string): string => {
  return str
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();
};

export const pascalCase = (str: string): string => {
  return str
    .replace(/(?:^\w|[A-Z]|\b\w)/g, word => word.toUpperCase())
    .replace(/\s+/g, '');
};

export const titleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => capitalize(word))
    .join(' ');
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// ===== DATE UTILITIES =====
export const isToday = (date: string | Date): boolean => {
  const today = new Date();
  const compareDate = new Date(date);
  
  return (
    today.getFullYear() === compareDate.getFullYear() &&
    today.getMonth() === compareDate.getMonth() &&
    today.getDate() === compareDate.getDate()
  );
};

export const isYesterday = (date: string | Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const compareDate = new Date(date);
  
  return (
    yesterday.getFullYear() === compareDate.getFullYear() &&
    yesterday.getMonth() === compareDate.getMonth() &&
    yesterday.getDate() === compareDate.getDate()
  );
};

export const isThisWeek = (date: string | Date): boolean => {
  const now = new Date();
  const compareDate = new Date(date);
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
  
  return compareDate >= startOfWeek && compareDate <= endOfWeek;
};

export const isThisMonth = (date: string | Date): boolean => {
  const now = new Date();
  const compareDate = new Date(date);
  
  return (
    now.getFullYear() === compareDate.getFullYear() &&
    now.getMonth() === compareDate.getMonth()
  );
};

export const timeAgo = (date: string | Date): string => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  
  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  if (diffWeeks > 0) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  return 'Just now';
};

export const getTimezone = (): string => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

export const convertTimezone = (
  date: string | Date,
  timezone: string,
  format: 'iso' | 'local' = 'iso'
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (format === 'iso') {
    return new Date(dateObj.toLocaleString('en-US', { timeZone: timezone })).toISOString();
  }
  
  return dateObj.toLocaleString('en-US', { timeZone: timezone });
};

// ===== COLOR UTILITIES =====
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

export const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
};

export const getContrastColor = (hex: string): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return '#000000';
  
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

export const lighten = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const factor = 1 + (percent / 100);
  const r = Math.min(255, Math.round(rgb.r * factor));
  const g = Math.min(255, Math.round(rgb.g * factor));
  const b = Math.min(255, Math.round(rgb.b * factor));
  
  return rgbToHex(r, g, b);
};

export const darken = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const factor = 1 - (percent / 100);
  const r = Math.max(0, Math.round(rgb.r * factor));
  const g = Math.max(0, Math.round(rgb.g * factor));
  const b = Math.max(0, Math.round(rgb.b * factor));
  
  return rgbToHex(r, g, b);
};

// ===== GENERATOR UTILITIES =====
export const generateId = (prefix?: string): string => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 15);
  return prefix ? `${prefix}_${timestamp}_${randomStr}` : `${timestamp}_${randomStr}`;
};

export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export const generateInvoiceNumber = (): string => {
  const prefix = 'INV';
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export const generateTransactionId = (): string => {
  const prefix = 'TXN';
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 12).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

export const generateApiKey = (): string => {
  const prefix = 'du_';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 32);
  return `${prefix}${timestamp}${random}`;
};

export const generateSecretKey = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 64; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// ===== FORMATTER UTILITIES =====
export const formatFileSize = (bytes: number, decimals: number = 2): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
};

export const formatPhoneNumber = (phone: string, countryCode?: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  
  if (countryCode && cleaned.startsWith(countryCode.replace('+', ''))) {
    return `+${cleaned}`;
  }
  
  return `+${cleaned}`;
};

export const formatCardNumber = (cardNumber: string): string => {
  const cleaned = cardNumber.replace(/\s/g, '');
  const match = cleaned.match(/.{1,4}/g);
  return match ? match.join(' ') : cardNumber;
};

export const formatAccountNumber = (accountNumber: string, mask: boolean = true): string => {
  if (!mask) return accountNumber;
  
  const visible = accountNumber.slice(-4);
  const masked = '*'.repeat(accountNumber.length - 4);
  return `${masked}${visible}`;
};

// ===== CRYPTO UTILITIES =====
export const hashPassword = async (password: string): Promise<string> => {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for server-side or unsupported environments
  // In a real implementation, use bcrypt or similar
  return password; // This is a placeholder - implement proper hashing
};

export const generateSalt = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const encryptData = (data: string, key: string): string => {
  // Placeholder for encryption - implement proper encryption
  // In production, use libraries like crypto-js or node-forge
  return Buffer.from(data).toString('base64');
};

export const decryptData = (encryptedData: string, key: string): string => {
  // Placeholder for decryption - implement proper decryption
  // In production, use libraries like crypto-js or node-forge
  return Buffer.from(encryptedData, 'base64').toString('utf-8');
};

// ===== ERROR UTILITIES =====
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  
  constructor(
    message: string,
    code: string = 'UNKNOWN_ERROR',
    statusCode: number = 500,
    isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export const createError = (
  message: string,
  code: string = 'UNKNOWN_ERROR',
  statusCode: number = 500
): AppError => {
  return new AppError(message, code, statusCode);
};

export const handleError = (error: unknown): AppError => {
  if (error instanceof AppError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new AppError(
      error.message,
      'INTERNAL_ERROR',
      500
    );
  }
  
  return new AppError(
    'An unknown error occurred',
    'UNKNOWN_ERROR',
    500
  );
};

export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.includes('Network Error') ||
           error.message.includes('fetch') ||
           error.message.includes('timeout');
  }
  return false;
};

export const isValidationError = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return error.code.startsWith('VALIDATION_');
  }
  return false;
};

// ===== STORAGE UTILITIES =====
export const setLocalStorage = (key: string, value: any): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to localStorage:', error);
  }
};

export const getLocalStorage = <T = any>(key: string, defaultValue?: T): T | undefined => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to read from localStorage:', error);
    return defaultValue;
  }
};

export const removeLocalStorage = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Failed to remove from localStorage:', error);
  }
};

export const clearLocalStorage = (): void => {
  try {
    localStorage.clear();
  } catch (error) {
    console.error('Failed to clear localStorage:', error);
  }
};

export const setSessionStorage = (key: string, value: any): void => {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Failed to save to sessionStorage:', error);
  }
};

export const getSessionStorage = <T = any>(key: string, defaultValue?: T): T | undefined => {
  try {
    const item = sessionStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Failed to read from sessionStorage:', error);
    return defaultValue;
  }
};

// ===== EXPORTS =====
export default {
  // Format
  formatCurrency,
  formatNumber,
  formatPercentage,
  formatDate,
  formatTime,
  formatDateTime,
  
  // Validation
  validateEmail,
  validatePhone,
  validatePassword,
  validateCurrency,
  validateSymbol,
  validateAmount,
  
  // Calculations
  calculatePercentageChange,
  calculatePercentage,
  calculateCommission,
  calculateSpread,
  calculateSpreadPercentage,
  calculatePnl,
  calculateMargin,
  calculateLeverage,
  calculateStopLoss,
  calculateTakeProfit,
  calculateRiskReward,
  
  // Array operations
  chunk,
  groupBy,
  sortBy,
  unique,
  uniqueBy,
  findBy,
  sum,
  average,
  max,
  min,
  range,
  
  // Object operations
  omit,
  pick,
  isEmpty,
  isEqual,
  deepClone,
  
  // String operations
  truncate,
  capitalize,
  camelCase,
  kebabCase,
  snakeCase,
  pascalCase,
  titleCase,
  slugify,
  
  // Date operations
  isToday,
  isYesterday,
  isThisWeek,
  isThisMonth,
  timeAgo,
  getTimezone,
  convertTimezone,
  
  // Color operations
  hexToRgb,
  rgbToHex,
  getContrastColor,
  lighten,
  darken,
  
  // Generators
  generateId,
  generateUUID,
  generateInvoiceNumber,
  generateTransactionId,
  generateApiKey,
  generateSecretKey,
  
  // Formatters
  formatFileSize,
  formatDuration,
  formatPhoneNumber,
  formatCardNumber,
  formatAccountNumber,
  
  // Crypto
  hashPassword,
  generateSalt,
  encryptData,
  decryptData,
  
  // Error handling
  AppError,
  createError,
  handleError,
  isNetworkError,
  isValidationError,
  
  // Storage
  setLocalStorage,
  getLocalStorage,
  removeLocalStorage,
  clearLocalStorage,
  setSessionStorage,
  getSessionStorage,
};